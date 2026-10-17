'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Clock, Eye, Heart, Instagram, MapPin, PenLine } from 'lucide-react';
import { FLAG_COLORS, timeLeft } from '@/lib/stories/rules';
import '@/components/stories/stories.css';

type Today = {
  live: boolean;
  story: null | {
    slug: string; title: string; excerpt: string; place: string; author_name: string; author_kind: string; author_from: string | null;
    instagram: string | null; photo: string | null; views: number; likes: number; flags: number; featured_until: string | null;
  };
};

/**
 * Homepage "Story of the day": the featured traveller or local story for its 24 hours. Loaded in the
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
  if (!d) return <div className="wrap" style={{ paddingBlock: 'clamp(40px,5vw,72px)' }} aria-hidden="true"><div className="h-[300px] rounded-3xl bg-slate-100/60" /></div>;
  const s = d.story;
  const live = d.live && s?.featured_until && Date.parse(s.featured_until) > now;

  return (
    <section className="wrap" style={{ paddingBlock: 'clamp(40px,5vw,72px)' }} aria-labelledby="sotd-h">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.3em] text-orange-600">Dharamshala, in your words</p>
          <h2 id="sotd-h" className="pt-1 text-3xl text-slate-900" style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>{s ? (live ? 'Story of the day' : 'From our storytellers') : 'Your story could be here tomorrow'}</h2>
        </div>
        <Link href="/stories" className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:gap-2">All stories<ArrowRight className="h-4 w-4" /></Link>
      </div>

      {s ? (
        <Link href={`/stories/${s.slug}`} className="st-spot group block">
          <div className="grid overflow-hidden rounded-3xl bg-[#0c1726] text-white shadow-xl md:grid-cols-[1.1fr_1fr]">
            <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[360px]">
              {s.photo && <Image src={s.photo} alt={s.title} fill sizes="(max-width:768px) 100vw, 55vw" className="object-cover transition duration-700 group-hover:scale-105" />}
              <div className="absolute inset-x-0 top-0"><div className="st-flags">{Array.from({ length: 16 }, (_, i) => <span key={i} className="st-flag" style={{ background: FLAG_COLORS[i % 5].hex, width: 22, height: 28 }} />)}</div></div>
              {live && s.featured_until && (
                <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-[#e3b76a] px-3 py-1 text-xs font-bold text-[#0c1726]"><Clock className="h-3.5 w-3.5" />Featured for another {timeLeft(s.featured_until, now)}</span>
              )}
            </div>
            <div className="flex flex-col p-6 sm:p-8">
              <p className="flex items-center gap-1.5 text-sm text-brand-200"><MapPin className="h-4 w-4 text-orange-400" />{s.place}</p>
              <h3 className="pt-2 text-2xl leading-tight sm:text-3xl" style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>{s.title}</h3>
              <p className="pt-3 leading-relaxed text-brand-100">{s.excerpt}</p>
              <p className="pt-5 font-semibold">{s.author_name}<span className="font-normal text-brand-200"> · {s.author_kind === 'local' ? 'Local' : 'Traveller'}{s.author_from ? ' from ' + s.author_from : ''}</span></p>
              {s.instagram && <p className="pt-0.5 inline-flex items-center gap-1 text-sm text-[#e3b76a]"><Instagram className="h-4 w-4" />@{s.instagram}</p>}
              <div className="mt-auto flex items-center justify-between gap-3 pt-6 text-sm">
                <span className="flex items-center gap-4 text-brand-200"><span className="inline-flex items-center gap-1"><Eye className="h-4 w-4" />{s.views}</span><span className="inline-flex items-center gap-1"><Heart className="h-4 w-4" />{s.likes}</span><span>{s.flags} prayer flags</span></span>
                <span className="inline-flex items-center gap-1 font-semibold text-[#e3b76a]">Read it<ArrowRight className="h-4 w-4" /></span>
              </div>
            </div>
          </div>
        </Link>
      ) : (
        <div className="relative overflow-hidden rounded-3xl bg-[#0c1726] p-8 text-white sm:p-12">
          <div className="pointer-events-none absolute inset-x-0 top-0" aria-hidden="true"><div className="st-flags" style={{ justifyContent: 'center' }}>{Array.from({ length: 70 }, (_, i) => <span key={i} className="st-flag" style={{ background: FLAG_COLORS[i % 5].hex }} />)}</div></div>
          <p className="relative max-w-2xl pt-12 text-lg text-brand-100">Every day we feature one real story from a traveller or a local, here on our homepage and on our Instagram, with their name on it. Share your Dharamshala moment and it could be the next one.</p>
          <Link href="/stories/share" className="relative mt-6 inline-flex items-center gap-2 rounded-full bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600"><PenLine className="h-5 w-5" />Share your story</Link>
        </div>
      )}
    </section>
  );
}
