'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Camera, Check, Copy, ImagePlus, Instagram, Loader2, MapPin, Sparkles, Star, X } from 'lucide-react';
import { shrinkImage } from '@/lib/client-image';
import { FLAG_COLORS, LIMITS, MAX_STORY_PHOTOS, PLACES, excerptOf, normalizeInstagram } from '@/lib/stories/rules';
import './stories.css';

type Photo = { id: string; blob: Blob; url: string };
const PROMPTS = ['The moment you arrived', 'A person you will never forget', 'Something that surprised you', 'The view that stopped you', 'A meal, a chai, a conversation'];

export default function ShareStoryForm() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [f, setF] = useState({ title: '', body: '', place: '', visited: '', author_name: '', author_kind: 'traveller', author_from: '', instagram: '', email: '' });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shrinking, setShrinking] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const hp = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  async function addFiles(list: FileList | null) {
    if (!list?.length) return;
    setError(''); setShrinking(true);
    const room = MAX_STORY_PHOTOS - photos.length;
    const picked = Array.from(list).filter((x) => /^image\/(jpeg|png|webp|heic|heif)$/i.test(x.type) || /\.(jpe?g|png|webp|heic)$/i.test(x.name)).slice(0, room);
    const next: Photo[] = [];
    for (const file of picked) {
      try {
        const blob = await shrinkImage(file, 1600, 0.82, true);
        next.push({ id: Math.random().toString(36).slice(2), blob, url: URL.createObjectURL(blob) });
      } catch { setError('One photo could not be read. Please choose a JPG, PNG or WebP photo.'); }
    }
    setPhotos((p) => [...p, ...next]);
    if (Array.from(list).length > room) setError(`You can add up to ${MAX_STORY_PHOTOS} photos.`);
    setShrinking(false);
  }
  const remove = (id: string) => setPhotos((p) => { const x = p.find((q) => q.id === id); if (x) URL.revokeObjectURL(x.url); return p.filter((q) => q.id !== id); });
  const makeCover = (id: string) => setPhotos((p) => [...p.filter((q) => q.id === id), ...p.filter((q) => q.id !== id)]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!photos.length) { setError('Add at least one photo from your trip.'); return; }
    if (normalizeInstagram(f.instagram) === false) { setError('That does not look like an Instagram username. Leave it empty if you prefer.'); return; }
    if (!consent) { setError('Please tick the box at the end so we can share your story.'); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(f).forEach(([k, v]) => fd.append(k, v));
      fd.append('consent', 'yes');
      fd.append('website', hp.current?.value || '');
      photos.forEach((p, i) => fd.append('photos', p.blob, `photo-${i + 1}.${p.blob.type === 'image/webp' ? 'webp' : 'jpg'}`));
      const res = await fetch('/api/stories', { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Something went wrong. Please try again.');
      setDone(json.manage_url || '/stories');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) { setError(err.message); } finally { setBusy(false); }
  }

  if (done) {
    const full = (typeof window !== 'undefined' ? window.location.origin : '') + done;
    return (
      <div className="st-rise mx-auto max-w-2xl rounded-3xl bg-white p-8 text-center shadow-xl ring-1 ring-slate-200 sm:p-12">
        <div className="st-flags big justify-center on-light">{Array.from({ length: 10 }, (_, i) => <span key={i} className="st-flag new" style={{ background: FLAG_COLORS[i % 5].hex, animationDelay: i * 0.08 + 's' }} />)}</div>
        <h2 className="st-display mt-6 text-4xl text-slate-900">Thank you, {f.author_name.split(' ')[0] || 'friend'}.</h2>
        <p className="mt-3 text-lg text-slate-600">Your story is with our team in Dharamshala. We read every one, usually within a day. Once it is approved it goes live on the site, and it could be chosen as Story of the day for our homepage and Instagram.</p>
        <div className="mt-8 rounded-2xl bg-[#0c1726] p-5 text-left text-white">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#e3b76a]">Your private story page</p>
          <p className="mt-2 text-sm text-brand-100">Save this link. It shows how many people read your story, which cities they are in, and every prayer flag tied to it. You can also take your story down from there at any time.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <code className="min-w-0 flex-1 truncate rounded-xl bg-white/10 px-3 py-2.5 text-sm">{full}</code>
            <button type="button" onClick={() => navigator.clipboard?.writeText(full).then(() => setCopied(true)).catch(() => {})}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#e3b76a] px-4 py-2.5 text-sm font-semibold text-[#0c1726]">{copied ? <><Check className="h-4 w-4" />Copied</> : <><Copy className="h-4 w-4" />Copy link</>}</button>
          </div>
          {f.email && <p className="mt-3 text-xs text-brand-200">We will also email you at {f.email} when it goes live.</p>}
        </div>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href={done} className="rounded-full bg-brand-900 px-6 py-3 font-semibold text-white">Open my story page</Link>
          <Link href="/stories" className="rounded-full bg-slate-100 px-6 py-3 font-semibold text-slate-800">Read other stories</Link>
        </div>
      </div>
    );
  }

  const input = 'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100';
  const label = 'block text-sm font-semibold text-slate-800';
  const bodyLen = Array.from(f.body).length;
  const handle = normalizeInstagram(f.instagram);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <form onSubmit={submit} className="space-y-8" noValidate>
        <input ref={hp} name="website" tabIndex={-1} autoComplete="off" className="absolute -left-[9999px] h-0 w-0 opacity-0" aria-hidden="true" />

        <Step n={1} title="Your photos" hint={`Up to ${MAX_STORY_PHOTOS}. The first one is the cover. Only photos you took yourself, please.`}>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {photos.map((p, i) => (
              <div key={p.id} className="group relative aspect-square overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                {i === 0 ? <span className="absolute left-1.5 top-1.5 rounded-full bg-[#e3b76a] px-2 py-0.5 text-[10px] font-bold uppercase text-[#0c1726]">Cover</span>
                  : <button type="button" onClick={() => makeCover(p.id)} className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white"><Star className="mr-0.5 inline h-3 w-3" />Cover</button>}
                <button type="button" onClick={() => remove(p.id)} className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white" aria-label={`Remove photo ${i + 1}`}><X className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            {photos.length < MAX_STORY_PHOTOS && (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={shrinking}
                onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
                className={'flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-slate-300 bg-white text-slate-500 transition hover:border-brand-400 hover:text-brand-600 ' + (photos.length ? 'aspect-square' : 'col-span-full py-10')}>
                {shrinking ? <Loader2 className="h-7 w-7 animate-spin" /> : photos.length ? <ImagePlus className="h-7 w-7" /> : <Camera className="h-9 w-9" />}
                <span className="text-sm font-semibold">{photos.length ? 'Add more' : 'Add your photos'}</span>
                {!photos.length && <span className="text-xs">Tap to choose, or drop them here</span>}
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
        </Step>

        <Step n={2} title="Your story" hint="Write it the way you would tell a friend. Real moments beat perfect words.">
          <label className={label}>Title
            <input className={input} value={f.title} onChange={set('title')} maxLength={LIMITS.title[1]} required placeholder="The monk who taught me to slow down" />
          </label>
          <div className="mt-5">
            <label htmlFor="st-body" className={label}>Your story</label>
            <div className="mt-2 flex flex-wrap gap-2" aria-label="Ideas to start">
              {PROMPTS.map((p) => <span key={p} className="rounded-full bg-brand-50 px-3 py-1 text-xs text-brand-800">{p}</span>)}
            </div>
            <textarea id="st-body" className={input + ' min-h-[220px] leading-relaxed'} value={f.body} onChange={set('body')} maxLength={LIMITS.body[1]} required
              placeholder="It was our second morning in McLeod Ganj. The fog had not lifted yet when..." />
            <p className={'mt-1 text-right text-xs ' + (bodyLen < LIMITS.body[0] ? 'text-slate-400' : 'text-green-700')}>
              {bodyLen < LIMITS.body[0] ? `${LIMITS.body[0] - bodyLen} more characters to go` : `${bodyLen.toLocaleString()} characters ✓`}
            </p>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className={label}>Where did it happen?
              <select className={input} value={f.place} onChange={set('place')} required>
                <option value="">Choose a place</option>
                {PLACES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label className={label}>When? <span className="font-normal text-slate-400">(optional)</span>
              <input className={input} value={f.visited} onChange={set('visited')} maxLength={LIMITS.visited[1]} placeholder="March 2026" />
            </label>
          </div>
        </Step>

        <Step n={3} title="About you" hint="This is how you are credited when your story is shared.">
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="I am">
            {[['traveller', 'I am a traveller', 'I visited Dharamshala'], ['local', 'I am a local', 'I live in the area']].map(([k, t, d]) => (
              <button key={k} type="button" role="radio" aria-checked={f.author_kind === k} onClick={() => setF((x) => ({ ...x, author_kind: k }))}
                className={'rounded-2xl border-2 p-4 text-left transition ' + (f.author_kind === k ? 'border-brand-600 bg-brand-50' : 'border-slate-200 bg-white hover:border-slate-300')}>
                <b className="block text-slate-900">{t}</b><span className="text-sm text-slate-500">{d}</span>
              </button>
            ))}
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className={label}>Your name
              <input className={input} value={f.author_name} onChange={set('author_name')} maxLength={LIMITS.name[1]} required autoComplete="name" placeholder="Priya Sharma" />
            </label>
            <label className={label}>{f.author_kind === 'local' ? 'Your village or area' : 'Where are you from?'} <span className="font-normal text-slate-400">(optional)</span>
              <input className={input} value={f.author_from} onChange={set('author_from')} maxLength={LIMITS.from[1]} placeholder={f.author_kind === 'local' ? 'Naddi' : 'Pune'} />
            </label>
            <label className={label}>Instagram <span className="font-normal text-slate-400">(optional, only if you are comfortable)</span>
              <div className="relative">
                <Instagram className="pointer-events-none absolute left-3.5 top-1/2 mt-[3px] h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input className={input + ' pl-11'} value={f.instagram} onChange={set('instagram')} maxLength={60} placeholder="@yourname" autoCapitalize="none" autoCorrect="off" />
              </div>
              <span className="mt-1 block text-xs font-normal text-slate-500">We credit you with it when your story is featured, so new people can find you.</span>
            </label>
            <label className={label}>Email <span className="font-normal text-slate-400">(optional)</span>
              <input className={input} type="email" value={f.email} onChange={set('email')} maxLength={120} autoComplete="email" placeholder="you@example.com" />
              <span className="mt-1 block text-xs font-normal text-slate-500">Only to tell you when your story goes live or is featured. Never shown, never used for marketing.</span>
            </label>
          </div>
        </Step>

        <div className="rounded-3xl bg-white p-5 ring-1 ring-slate-200 sm:p-6">
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5 flex-none rounded border-slate-300 text-brand-600" />
            <span>I took these photos myself (or have the photographer&rsquo;s permission), and Dharamshala Stay may show my story, photos, name and Instagram handle on its website and social media, with credit to me. I can ask for it to be taken down at any time from my private story page. See our <Link href="/privacy" className="text-brand-600 underline">privacy policy</Link>.</span>
          </label>
        </div>

        {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
        <button disabled={busy || shrinking} className="flex w-full items-center justify-center gap-2 rounded-full bg-orange-500 py-4 text-lg font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-600 disabled:opacity-60">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}{busy ? 'Sending your story…' : 'Share my story'}
        </button>
      </form>

      {/* Live preview: how it looks as Story of the day */}
      <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Preview">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[.2em] text-slate-500">Preview: you as Story of the day</p>
        <div className="st-spot">
          <div className="overflow-hidden rounded-3xl bg-[#0c1726] text-white shadow-2xl">
            <div className="relative aspect-[4/5] bg-brand-900">
              {photos[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photos[0].url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-brand-300"><Camera className="h-12 w-12" /></div>
              )}
              <div className="absolute inset-x-0 top-0"><div className="st-flags">{Array.from({ length: 12 }, (_, i) => <span key={i} className="st-flag" style={{ background: FLAG_COLORS[i % 5].hex, width: 18, height: 23 }} />)}</div></div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c1726] via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <span className="rounded-full bg-[#e3b76a] px-3 py-1 text-[10px] font-bold uppercase tracking-[.2em] text-[#0c1726]">Story of the day</span>
                <p className="st-display mt-3 text-2xl leading-tight">{f.title || 'Your title here'}</p>
                <p className="mt-2 text-sm text-brand-100">{f.author_name || 'Your name'} · {f.author_kind === 'local' ? 'Local' : 'Traveller'}{f.author_from ? ' from ' + f.author_from : ''}</p>
                {handle && <p className="text-sm font-semibold text-[#e3b76a]">@{handle}</p>}
              </div>
            </div>
            <div className="p-5">
              {f.place && <p className="mb-2 flex items-center gap-1 text-xs text-brand-200"><MapPin className="h-3.5 w-3.5 text-orange-400" />{f.place}{f.visited ? ' · ' + f.visited : ''}</p>}
              <p className="text-sm leading-relaxed text-brand-100">{f.body ? excerptOf(f.body, 160) : 'The first lines of your story appear here, on our homepage and on your story card.'}</p>
            </div>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-600">Featured stories stay on our homepage and Instagram story for 24 hours, and the storyteller gets a card to share.</p>
      </aside>
    </div>
  );
}

function Step({ n, title, hint, children }: { n: number; title: string; hint: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
      <legend className="sr-only">{title}</legend>
      <div className="mb-5 flex items-start gap-3">
        <span className="st-display flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#0c1726] text-lg text-[#e3b76a]">{n}</span>
        <div><h2 className="text-lg font-semibold text-slate-900">{title}</h2><p className="text-sm text-slate-500">{hint}</p></div>
      </div>
      {children}
    </fieldset>
  );
}
