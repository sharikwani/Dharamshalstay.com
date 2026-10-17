'use client';
/**
 * The live parts of a story page, sharing one state: prayer flags, likes, comments, sharing and reach.
 * <StoryLive> wraps the page; the parts can sit anywhere inside it.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Download, Eye, Globe2, Heart, Loader2, MessageCircle, Send, Share2, X } from 'lucide-react';
import { FLAG_COLORS, countryFlag, type FlagColor } from '@/lib/stories/rules';
import { compact, storyAction, visitorId } from './visitor';
import './stories.css';

type Item = { id: string; name: string; text: string; created_at: string; color?: string };
type Place = { city: string; country: string; readers: number; last_at: string };
type Live = {
  views: number; likes: number; comments: number; flags: number; liked: boolean;
  commentList: Item[]; flagList: Item[]; cities: number; countries: number; top: Place[]; latest: Place | null;
};
type StoryInfo = { id: string; slug: string; title: string; author_name: string; url: string };

const Ctx = createContext<{
  story: StoryInfo; live: Live; newFlag: string | null;
  like: () => void; addComment: (name: string, text: string) => Promise<string>; tieFlag: (name: string, text: string, color: FlagColor) => Promise<string>;
  openFlag: () => void; openShare: () => void;
} | null>(null);
const useLive = () => { const c = useContext(Ctx); if (!c) throw new Error('StoryLive missing'); return c; };

const hex = (c?: string) => FLAG_COLORS.find((f) => f.key === c)?.hex || FLAG_COLORS[0].hex;
const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`;
};
const savedName = () => { try { return localStorage.getItem('ds_name') || ''; } catch { return ''; } };
const saveName = (n: string) => { try { localStorage.setItem('ds_name', n); } catch { /* private mode */ } };

export default function StoryLive({ story, initial, children }: { story: StoryInfo; initial: Pick<Live, 'views' | 'likes' | 'comments' | 'flags'>; children: React.ReactNode }) {
  const [live, setLive] = useState<Live>({ ...initial, liked: false, commentList: [], flagList: [], cities: 0, countries: 0, top: [], latest: null });
  const [newFlag, setNewFlag] = useState<string | null>(null);
  const [flagOpen, setFlagOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/stories/${story.id}?v=${visitorId()}`, { cache: 'no-store' }).catch(() => null);
    if (res?.ok) setLive(await res.json());
  }, [story.id]);

  useEffect(() => {
    const key = 'ds_read_' + story.id;
    let seen = false;
    try { seen = sessionStorage.getItem(key) === '1'; sessionStorage.setItem(key, '1'); } catch { /* ignore */ }
    (seen ? Promise.resolve() : storyAction(story.id, { action: 'view' }).catch(() => {})).then(refresh);
    const t = setInterval(refresh, 45000);
    return () => clearInterval(t);
  }, [story.id, refresh]);

  const like = useCallback(() => {
    setLive((l) => ({ ...l, liked: !l.liked, likes: l.likes + (l.liked ? -1 : 1) }));
    storyAction(story.id, { action: 'like', on: !live.liked }).then((r) => setLive((l) => ({ ...l, likes: r.likes }))).catch(() => refresh());
  }, [story.id, live.liked, refresh]);

  const addComment = useCallback(async (name: string, text: string) => {
    const r = await storyAction(story.id, { action: 'comment', name, text, website: '' });
    saveName(name);
    if (r.status === 'visible') setLive((l) => ({ ...l, comments: l.comments + 1, commentList: [r.item, ...l.commentList] }));
    return r.status as string;
  }, [story.id]);

  const tieFlag = useCallback(async (name: string, text: string, color: FlagColor) => {
    const r = await storyAction(story.id, { action: 'flag', name, text, color, website: '' });
    saveName(name);
    if (r.status === 'visible') {
      setLive((l) => ({ ...l, flags: l.flags + 1, flagList: [...l.flagList, r.item] }));
      setNewFlag(r.item.id);
    }
    return r.status as string;
  }, [story.id]);

  const value = useMemo(() => ({ story, live, newFlag, like, addComment, tieFlag, openFlag: () => setFlagOpen(true), openShare: () => setShareOpen(true) }), [story, live, newFlag, like, addComment, tieFlag]);
  return (
    <Ctx.Provider value={value}>
      {children}
      {flagOpen && <FlagDialog onClose={() => setFlagOpen(false)} />}
      {shareOpen && <ShareDialog onClose={() => setShareOpen(false)} />}
    </Ctx.Provider>
  );
}

// ---------- Prayer flags ----------

/** The string of flags readers have tied. Tap one to read its wish. */
export function LiveFlags({ light = false }: { light?: boolean }) {
  const { live, newFlag, openFlag, story } = useLive();
  const [shown, setShown] = useState<Item | null>(null);
  const flags = live.flagList;
  // An empty string still shows five plain flags, so the idea is clear at a glance.
  const placeholders = flags.length ? [] : FLAG_COLORS.map((c) => ({ id: c.key, name: '', text: '', created_at: '', color: c.key }));
  return (
    <div className="relative">
      <div className={'st-flags big ' + (light ? 'on-light' : '')} aria-label={`${flags.length} prayer flags tied to this story`}>
        {[...flags, ...placeholders].slice(-48).map((f) => (
          <button key={f.id} type="button" className={'st-flag' + (f.id === newFlag ? ' new' : '')} style={{ background: hex(f.color), opacity: f.name ? 1 : 0.35 }}
            onClick={() => (f.name ? setShown(f) : openFlag())} aria-label={f.name ? `Prayer flag from ${f.name}: ${f.text}` : 'Tie the first prayer flag'} />
        ))}
      </div>
      <div className={'mt-3 flex flex-wrap items-center gap-3 text-sm ' + (light ? 'text-slate-600' : 'text-brand-100')}>
        <span>{flags.length ? `${flags.length} prayer flag${flags.length === 1 ? '' : 's'} tied for ${story.author_name}` : `Be the first to tie a prayer flag for ${story.author_name}`}</span>
        <button type="button" onClick={openFlag} className="rounded-full bg-[#e3b76a] px-4 py-1.5 font-semibold text-[#0c1726] hover:brightness-105">Tie a prayer flag</button>
      </div>
      {shown && (
        <div role="dialog" aria-label="Prayer flag" className="st-rise absolute left-0 top-16 z-20 w-72 rounded-2xl bg-white p-4 text-slate-800 shadow-2xl ring-1 ring-black/5">
          <div className="flex items-start gap-3">
            <span className="mt-1 h-8 w-6 flex-none rounded-sm" style={{ background: hex(shown.color) }} />
            <div className="min-w-0">
              <p className="st-display text-lg leading-snug">&ldquo;{shown.text}&rdquo;</p>
              <p className="mt-1 text-xs text-slate-500">{shown.name} · {ago(shown.created_at)}</p>
            </div>
            <button type="button" onClick={() => setShown(null)} className="ml-auto text-slate-400 hover:text-slate-700" aria-label="Close"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

function FlagDialog({ onClose }: { onClose: () => void }) {
  const { tieFlag, story } = useLive();
  const [color, setColor] = useState<FlagColor>('blue');
  const [name, setName] = useState(savedName);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<string | null>(null);
  const c = FLAG_COLORS.find((f) => f.key === color)!;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    try { setDone(await tieFlag(name, text, color)); } catch (err: any) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <Modal onClose={onClose} title="Tie a prayer flag">
      {done ? (
        <div className="text-center">
          <div className="st-flags big justify-center"><span className="st-flag new" style={{ background: c.hex }} /></div>
          <p className="st-display mt-4 text-2xl text-slate-900">{done === 'visible' ? 'Your flag is flying.' : 'Thank you.'}</p>
          <p className="mt-2 text-slate-600">{done === 'visible' ? `In McLeod Ganj, people believe the wind carries the wishes on prayer flags to everyone it touches. Yours now flies for ${story.author_name}.` : 'Your flag will appear once our team has had a quick look at it.'}</p>
          <button type="button" onClick={onClose} className="mt-5 rounded-full bg-brand-900 px-6 py-2.5 font-semibold text-white">Back to the story</button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-slate-600">On the hills above McLeod Ganj, prayer flags carry wishes on the wind. Leave a short wish for {story.author_name}, and it joins the string on this story.</p>
          <fieldset>
            <legend className="text-sm font-semibold text-slate-800">Choose a colour</legend>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {FLAG_COLORS.map((f) => (
                <button key={f.key} type="button" onClick={() => setColor(f.key)} aria-pressed={color === f.key}
                  className={'rounded-xl border-2 p-2 text-center text-[11px] leading-tight transition ' + (color === f.key ? 'border-brand-600 bg-brand-50' : 'border-transparent hover:bg-slate-50')}>
                  <span className="mx-auto mb-1 block h-8 w-6 rounded-sm shadow" style={{ background: f.hex, outline: f.key === 'white' ? '1px solid #ddd' : undefined }} />
                  <b className="block text-slate-800">{f.label}</b><span className="text-slate-500">{f.means}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <label className="block text-sm font-semibold text-slate-800">Your wish
            <input value={text} onChange={(e) => setText(e.target.value.slice(0, 60))} required minLength={2} maxLength={60} placeholder="May the mountains always call you back"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal focus:border-brand-500 focus:outline-none" />
            <span className="mt-1 block text-right text-xs font-normal text-slate-400">{text.length}/60</span>
          </label>
          <label className="block text-sm font-semibold text-slate-800">Your name
            <input value={name} onChange={(e) => setName(e.target.value.slice(0, 60))} required minLength={2} maxLength={60}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal focus:border-brand-500 focus:outline-none" />
          </label>
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#e3b76a] py-3 font-semibold text-[#0c1726] disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}Tie my flag
          </button>
        </form>
      )}
    </Modal>
  );
}

// ---------- Reactions bar ----------

export function LiveActions({ sticky = false }: { sticky?: boolean }) {
  const { live, like, openFlag, openShare } = useLive();
  const [pop, setPop] = useState(false);
  const btn = 'flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-semibold transition sm:flex-none sm:px-5';
  return (
    <div className={sticky ? 'fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-3 py-2 backdrop-blur sm:hidden' : ''}>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => { like(); if (!live.liked) { setPop(true); setTimeout(() => setPop(false), 500); } }} aria-pressed={live.liked}
          className={btn + (live.liked ? ' bg-orange-50 text-orange-600' : ' bg-slate-100 text-slate-700 hover:bg-slate-200')}>
          <span className={'st-heart' + (pop ? ' pop' : '')}><Heart className="h-5 w-5" fill={live.liked ? 'currentColor' : 'none'} /></span>{compact(live.likes)}
          <span className="sr-only">likes</span>
        </button>
        <a href="#comments" className={btn + ' bg-slate-100 text-slate-700 hover:bg-slate-200'}><MessageCircle className="h-5 w-5" />{compact(live.comments)}<span className="sr-only">comments</span></a>
        <button type="button" onClick={openFlag} className={btn + ' bg-slate-100 text-slate-700 hover:bg-slate-200'} title="Tie a prayer flag">
          <span className="flex gap-[2px]" aria-hidden="true">{FLAG_COLORS.map((f) => <i key={f.key} className="block h-4 w-[5px] rounded-[1px]" style={{ background: f.hex, outline: f.key === 'white' ? '1px solid #ccc' : undefined }} />)}</span>
          {compact(live.flags)}<span className="sr-only">prayer flags</span>
        </button>
        <button type="button" onClick={openShare} className={btn + ' bg-brand-900 text-white hover:bg-brand-800'}><Share2 className="h-5 w-5" /><span className="hidden sm:inline">Share</span></button>
      </div>
    </div>
  );
}

function ShareDialog({ onClose }: { onClose: () => void }) {
  const { story } = useLive();
  const [copied, setCopied] = useState(false);
  const text = `"${story.title}" by ${story.author_name}, a Dharamshala story`;
  const links = [
    { label: 'WhatsApp', href: 'https://wa.me/?text=' + encodeURIComponent(text + ' ' + story.url), bg: '#25d366' },
    { label: 'Facebook', href: 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(story.url), bg: '#1877f2' },
    { label: 'X', href: 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(story.url), bg: '#111' },
  ];
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'share' in navigator && window.matchMedia('(pointer: coarse)').matches) {
      navigator.share({ title: story.title, text, url: story.url }).then(onClose).catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Modal onClose={onClose} title="Share this story">
      <p className="text-sm text-slate-600">Every share carries {story.author_name}&rsquo;s story a little further. You can watch it travel on the map below the story.</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {links.map((l) => <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="rounded-xl py-3 text-center text-sm font-semibold text-white" style={{ background: l.bg }}>{l.label}</a>)}
      </div>
      <button type="button" onClick={() => { navigator.clipboard?.writeText(story.url).then(() => setCopied(true)).catch(() => {}); }}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
        {copied ? <><Check className="h-4 w-4 text-green-600" />Link copied</> : <><Copy className="h-4 w-4" />Copy link</>}
      </button>
      <a href={`/stories/card/${story.slug}?f=og`} target="_blank" rel="noopener" className="mt-3 flex items-center justify-center gap-2 text-sm text-brand-600 hover:underline"><Download className="h-4 w-4" />Story card image</a>
    </Modal>
  );
}

// ---------- Reach ----------

function useCountUp(target: number) {
  const [n, setN] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now(), a = from.current, d = 900;
    let raf = 0;
    const step = (t: number) => { const p = Math.min(1, (t - start) / d); setN(Math.round(a + (target - a) * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(step); else from.current = target; };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return n;
}

/** "Heard in 23 cities": how far the story has travelled, live. */
export function LiveReach() {
  const { live, story } = useLive();
  const reads = useCountUp(live.views), cities = useCountUp(live.cities), countries = useCountUp(live.countries);
  return (
    <section aria-labelledby="reach-h" className="overflow-hidden rounded-3xl bg-[#0c1726] p-6 text-white sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[.25em] text-[#e3b76a]">Where this story has travelled</p>
      <h2 id="reach-h" className="st-display mt-2 text-3xl sm:text-4xl">{live.cities > 0 ? <>Heard in {cities} {live.cities === 1 ? 'city' : 'cities'}{live.countries > 1 ? <> across {countries} countries</> : null}</> : <>Its journey starts with you</>}</h2>
      <div className="mt-6 grid grid-cols-3 gap-3 text-center">
        {[[reads, 'readers', Eye], [cities, live.cities === 1 ? 'city' : 'cities', Globe2], [countries, live.countries === 1 ? 'country' : 'countries', Globe2]].map(([n, label, Icon]: any) => (
          <div key={label} className="rounded-2xl bg-white/5 px-2 py-4 ring-1 ring-white/10">
            <Icon className="mx-auto h-5 w-5 text-[#e3b76a]" aria-hidden="true" />
            <div className="mt-1 text-2xl font-bold tabular-nums sm:text-3xl">{compact(n)}</div>
            <div className="text-xs text-brand-200">{label}</div>
          </div>
        ))}
      </div>
      {live.latest && (
        <p className="mt-5 flex items-center gap-3 text-sm text-brand-100">
          <span className="st-pulse gold" aria-hidden="true" />
          Latest reader: {[live.latest.city, live.latest.country].filter(Boolean).join(', ')} {countryFlag(live.latest.country)} · {ago(live.latest.last_at)}
        </p>
      )}
      {live.top.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-2">
          {live.top.map((p, i) => (
            <li key={p.city + p.country} className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm">
              <span className={'st-pulse' + (i === 0 ? ' gold' : '')} aria-hidden="true" />
              <span>{countryFlag(p.country)} {p.city || p.country}</span>
              <span className="text-brand-300">{p.readers}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-5 text-xs text-brand-300">Each reader counts once. We see only the city a connection comes from, never who you are. Share it and watch {story.author_name}&rsquo;s story reach a new city.</p>
    </section>
  );
}

// ---------- Comments ----------

export function LiveComments() {
  const { live, addComment, story } = useLive();
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  useEffect(() => setName(savedName()), []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError(''); setNote('');
    try {
      const status = await addComment(name, text);
      setText('');
      setNote(status === 'visible' ? '' : 'Thanks! Your comment will appear after a quick check.');
    } catch (err: any) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <section id="comments" aria-labelledby="comments-h" className="scroll-mt-24">
      <h2 id="comments-h" className="st-display text-3xl text-slate-900">{live.comments ? `${live.comments} ${live.comments === 1 ? 'comment' : 'comments'}` : 'Say something to ' + story.author_name}</h2>
      <form onSubmit={submit} className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 500))} required minLength={2} rows={3} placeholder={`What did ${story.author_name}'s story make you feel?`}
          className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 focus:border-brand-500 focus:outline-none" aria-label="Your comment" />
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input value={name} onChange={(e) => setName(e.target.value.slice(0, 60))} required minLength={2} placeholder="Your name" aria-label="Your name"
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 focus:border-brand-500 focus:outline-none" />
          <button disabled={busy} className="flex items-center justify-center gap-2 rounded-full bg-brand-900 px-6 py-2.5 font-semibold text-white disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Post
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600" role="alert">{error}</p>}
        {note && <p className="mt-2 text-sm text-green-700">{note}</p>}
      </form>
      <ul className="mt-6 space-y-4">
        {live.commentList.map((c) => (
          <li key={c.id} className="st-rise flex gap-3">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-800">{c.name.slice(0, 1).toUpperCase()}</span>
            <div className="min-w-0 rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-sm"><b className="text-slate-900">{c.name}</b> <span className="text-slate-400">· {ago(c.created_at)}</span></p>
              <p className="mt-1 whitespace-pre-line text-slate-700">{c.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------- Modal ----------

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        className="st-rise max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-3xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="st-display text-2xl text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
