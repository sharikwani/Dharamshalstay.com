'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Check, Copy, Eye, Globe2, Heart, Instagram, Loader2, MapPin, PenLine, Sparkles } from 'lucide-react';
import { FLAG_COLORS, timeLeft } from '@/lib/stories/rules';
import '@/components/stories/stories.css';

type Story = {
  slug: string; title: string; excerpt: string; place: string; author_name: string; author_kind: string; author_from: string | null;
  instagram: string | null; photo: string | null; photos?: string[]; views: number; likes: number; flags: number; comments?: number;
  cities?: number; featured_until: string | null;
};
type Today = { live: boolean; story: Story | null };

const DISPLAY = { fontFamily: 'var(--font-display), Georgia, serif' };
const IG_HANDLE = 'dharamshala.stay';

/**
 * Homepage "Story of the day": the featured traveller or local story for its 24 hours, with its photos
 * rolling (a different motion each time), a soft prayer-flag glow, and one-tap sharing. Loaded in the
 * browser so it changes on time without rebuilding the homepage. Before the first feature, an invitation.
 */
export default function StoryOfTheDay() {
  const [d, setD] = useState<Today | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    fetch('/api/stories/today').then((r) => (r.ok ? r.json() : null)).then(setD).catch(() => setD({ live: false, story: null }));
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  if (!d) return <div className="wrap" style={{ paddingBlock: 'clamp(36px,4vw,56px)' }} aria-hidden="true"><div className="h-[420px] rounded-[28px] bg-slate-100/70" /></div>;
  const s = d.story;
  const live = !!(d.live && s?.featured_until && Date.parse(s.featured_until) > now);

  return (
    <section className="wrap" style={{ paddingBlock: 'clamp(36px,4vw,56px)' }} aria-labelledby="sotd-h">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.3em] text-orange-600">
            {live && <span className="sotd-live" aria-hidden="true" />}{live ? 'Live now · Dharamshala in your words' : 'Dharamshala, in your words'}
          </p>
          <h2 id="sotd-h" className="pt-1 text-3xl text-slate-900 sm:text-4xl" style={DISPLAY}>{s ? (live ? 'Story of the day' : 'From our storytellers') : 'Your story could be here tomorrow'}</h2>
        </div>
        <Link href="/stories" className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:gap-2">All stories<ArrowRight className="h-4 w-4" /></Link>
      </div>

      {s ? <Board s={s} live={live} now={now} /> : <Invite />}
    </section>
  );
}

function Board({ s, live, now }: { s: Story; live: boolean; now: number }) {
  const photos = (s.photos?.length ? s.photos : [s.photo]).filter((p): p is string => !!p);
  const href = `/stories/${s.slug}`;
  return (
    <div className="sotd-board">
      <div className="overflow-hidden rounded-[26px] bg-[#0c1726] text-white">
        <div className="grid md:grid-cols-[1.15fr_1fr]">
          <Slideshow photos={photos} title={s.title} href={href} badge={live && s.featured_until ? `Featured for another ${timeLeft(s.featured_until, now)}` : null} />

          <div className="flex flex-col p-6 sm:p-9">
            <p className="flex items-center gap-1.5 text-sm text-brand-200"><MapPin className="h-4 w-4 text-orange-400" />{s.place}</p>
            <h3 className="pt-3 text-3xl leading-[1.1] sm:text-4xl" style={DISPLAY}><Link href={href} className="hover:text-[#e3b76a]">{s.title}</Link></h3>
            <p className="pt-4 text-[1.05rem] leading-relaxed text-brand-100">{s.excerpt}</p>

            <div className="flex items-center gap-3 pt-6">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[#e3b76a] text-lg font-semibold text-[#0c1726]">{s.author_name.slice(0, 1).toUpperCase()}</span>
              <div className="min-w-0">
                <p className="font-semibold">{s.author_name}<span className="font-normal text-brand-200"> · {s.author_kind === 'local' ? 'Local' : 'Traveller'}{s.author_from ? ' from ' + s.author_from : ''}</span></p>
                {s.instagram && <a href={`https://www.instagram.com/${s.instagram}/`} target="_blank" rel="nofollow ugc noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-[#e3b76a] hover:underline"><Instagram className="h-4 w-4" />@{s.instagram}</a>}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-5 text-sm text-brand-200">
              <span className="inline-flex items-center gap-1.5"><Eye className="h-4 w-4" />{s.views} reads</span>
              {!!s.cities && <span className="inline-flex items-center gap-1.5"><Globe2 className="h-4 w-4" />{s.cities} {s.cities === 1 ? 'city' : 'cities'}</span>}
              <span className="inline-flex items-center gap-1.5"><Heart className="h-4 w-4" />{s.likes}</span>
              <span className="inline-flex items-center gap-1.5"><span className="flex gap-[2px]" aria-hidden="true">{FLAG_COLORS.map((f) => <i key={f.key} className="block h-3.5 w-[4px] rounded-[1px]" style={{ background: f.hex }} />)}</span>{s.flags} prayer flags</span>
            </div>

            <div className="mt-auto pt-7">
              <Link href={href} className="inline-flex items-center gap-2 rounded-full bg-[#e3b76a] px-6 py-3 font-semibold text-[#0c1726] transition hover:brightness-105">Read {s.author_name.split(' ')[0]}&rsquo;s story<ArrowRight className="h-4 w-4" /></Link>
              <ShareRow s={s} />
            </div>
          </div>
        </div>

        {/* The nudge: seeing someone featured is the moment people want to share their own */}
        <div className="flex flex-col items-start gap-4 border-t border-white/10 bg-gradient-to-r from-[#13243b] to-[#0c1726] px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-9">
          <p className="flex items-center gap-3 text-brand-100">
            <Sparkles className="h-5 w-5 flex-none text-[#e3b76a]" />
            <span><b className="text-white">Tomorrow, this could be you.</b> Share your Dharamshala moment, and it could be on our homepage and Instagram with your name on it.</span>
          </p>
          <Link href="/stories/share" className="inline-flex flex-none items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 font-semibold text-white hover:bg-orange-600"><PenLine className="h-4 w-4" />Share your story</Link>
        </div>
      </div>
    </div>
  );
}

/** The story's photos rolling one after another, each with its own motion, under Instagram-style progress bars. */
function Slideshow({ photos, title, href, badge }: { photos: string[]; title: string; href: string; badge: string | null }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const next = useCallback(() => setI((x) => (x + 1) % Math.max(1, photos.length)), [photos.length]);
  // Stop when the tab is hidden; the bar animation drives the timing, so it pauses with it.
  useEffect(() => {
    const v = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', v);
    return () => document.removeEventListener('visibilitychange', v);
  }, []);
  const many = photos.length > 1;

  return (
    <div className={'relative aspect-[4/5] min-h-[300px] sm:aspect-[4/3] md:aspect-auto md:min-h-[520px] ' + (paused ? 'sotd-paused' : '')}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <Link href={href} className="sotd-slides block" aria-label={`Read: ${title}`}>
        {photos.map((src, k) => (
          <div key={src} className={'sotd-slide' + (k === i ? ` on fx-${k % 5}` : '')} aria-hidden={k !== i}>
            <Image src={src} alt={k === i ? title : ''} fill sizes="(max-width:768px) 100vw, 55vw" className="object-cover" priority={k === 0} />
          </div>
        ))}
      </Link>
      <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-b from-black/45 via-transparent to-black/50" />

      <div className="absolute inset-x-0 top-0 z-[3] p-4">
        {many && (
          <div className="sotd-bars" role="tablist" aria-label="Photos">
            {photos.map((_, k) => (
              <button key={k} type="button" role="tab" aria-selected={k === i} aria-label={`Photo ${k + 1} of ${photos.length}`}
                className={'sotd-bar' + (k < i ? ' done' : k === i ? ' on' : '')} onClick={() => setI(k)}>
                {/* key restarts the fill when this bar becomes active again */}
                <i key={k === i ? 'run-' + i : 'idle'} onAnimationEnd={k === i ? next : undefined} />
              </button>
            ))}
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#e3b76a] px-3 py-1 text-[11px] font-bold uppercase tracking-[.18em] text-[#0c1726]">Story of the day</span>
          {badge && <span className="rounded-full bg-black/45 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">{badge}</span>}
        </div>
      </div>
      {many && <p className="pointer-events-none absolute bottom-3 right-4 z-[3] text-xs font-semibold tabular-nums text-white/80">{i + 1} / {photos.length}</p>}
    </div>
  );
}

/** One tap to share the story: WhatsApp, Instagram (the story card), Facebook, X, or copy the link. */
function ShareRow({ s }: { s: Story }) {
  const [copied, setCopied] = useState(false);
  const [ig, setIg] = useState<'idle' | 'busy' | 'saved'>('idle');
  const url = (typeof window !== 'undefined' ? window.location.origin : 'https://www.dharamshalastay.com') + `/stories/${s.slug}`;
  const text = `"${s.title}" by ${s.author_name}, today's Story of the day on Dharamshala Stay`;
  const card = `/stories/card/${s.slug}?f=story`;

  async function instagram() {
    setIg('busy');
    try {
      // Phones: share the card image straight to Instagram (or anywhere) from the share sheet.
      const blob = await (await fetch(card)).blob();
      const file = new File([blob], 'dharamshala-story.jpg', { type: 'image/jpeg' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: s.title, text: `${text} ${url}` });
        setIg('idle');
        return;
      }
      // Computers: save the card to post later.
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'dharamshala-story.jpg';
      document.body.appendChild(a); a.click(); a.remove();
      setIg('saved');
    } catch { setIg('idle'); }
  }

  const btn = 'flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white';
  return (
    <div className="pt-5">
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-brand-300">Share this story</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <a href={'https://wa.me/?text=' + encodeURIComponent(`${text} ${url}`)} target="_blank" rel="noopener noreferrer" className={btn} style={{ background: '#25d366' }} aria-label="Share on WhatsApp">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5.3-.5c.1-.2 0-.4 0-.5l-.9-2.1c-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3 2.4 1 2.9.8 3.5.7.5-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4C2.7 15.6 2.2 13.8 2.2 12 2.2 6.6 6.6 2.2 12 2.2c2.6 0 5.1 1 6.9 2.9 1.8 1.8 2.9 4.3 2.9 6.9 0 5.4-4.4 9.8-9.8 9.8zM20.5 3.5A11.8 11.8 0 0 0 12 0C5.4 0 0 5.4 0 12c0 2.1.6 4.2 1.6 6L0 24l6.2-1.6c1.8 1 3.8 1.5 5.8 1.5 6.6 0 12-5.4 12-12 0-3.2-1.2-6.2-3.5-8.4z" /></svg>
        </a>
        <button type="button" onClick={instagram} className={btn} style={{ background: 'linear-gradient(45deg,#f58529,#dd2a7b,#8134af)' }} aria-label="Share the story card on Instagram">
          {ig === 'busy' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Instagram className="h-5 w-5" />}
        </button>
        <a href={'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url)} target="_blank" rel="noopener noreferrer" className={btn} style={{ background: '#1877f2' }} aria-label="Share on Facebook">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M13.5 22v-8.2h2.8l.4-3.2h-3.2V8.5c0-.9.3-1.6 1.6-1.6h1.7V4.1c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.4H7.3v3.2h2.8V22h3.4z" /></svg>
        </a>
        <a href={'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url)} target="_blank" rel="noopener noreferrer" className={btn} style={{ background: '#000' }} aria-label="Share on X">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true"><path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.3L5.3 21H2.2l7.3-8.3L1.9 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z" /></svg>
        </a>
        <button type="button" onClick={() => navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {})}
          className={btn + ' bg-white/10 ring-1 ring-white/20'} aria-label="Copy the link">
          {copied ? <Check className="h-5 w-5 text-green-400" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      {ig === 'saved' && <p className="pt-2 text-xs text-brand-200">Story card saved. Post it to your Instagram story and tag @{IG_HANDLE}.</p>}
      {copied && <p className="pt-2 text-xs text-green-300">Link copied.</p>}
    </div>
  );
}

function Invite() {
  return (
    <div className="sotd-board">
      <div className="relative overflow-hidden rounded-[26px] bg-[#0c1726] p-8 text-white sm:p-12">
        <div className="pointer-events-none absolute inset-x-0 top-0" aria-hidden="true"><div className="st-flags" style={{ justifyContent: 'center' }}>{Array.from({ length: 70 }, (_, i) => <span key={i} className="st-flag" style={{ background: FLAG_COLORS[i % 5].hex }} />)}</div></div>
        <p className="relative max-w-2xl pt-12 text-lg text-brand-100">Every day we feature one real story from a traveller or a local, here on our homepage and on our Instagram, with their name on it. Share your Dharamshala moment and it could be the next one.</p>
        <Link href="/stories/share" className="relative mt-6 inline-flex items-center gap-2 rounded-full bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600"><PenLine className="h-5 w-5" />Share your story</Link>
      </div>
    </div>
  );
}
