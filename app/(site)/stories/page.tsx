import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BookOpen, Clock, Eye, Globe2, Heart, Instagram, MapPin, PenLine, Sparkles } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/Cards';
import JsonLd from '@/components/seo/JsonLd';
import StoriesBrowser from '@/components/stories/StoriesBrowser';
import Countdown from '@/components/stories/Countdown';
import { FlagCount, KindBadge } from '@/components/stories/StoryCard';
import { breadcrumbSchema, generateSEO } from '@/lib/seo';
import { siteConfig } from '@/lib/config';
import { display } from '@/lib/fonts';
import { FLAG_COLORS, excerptOf } from '@/lib/stories/rules';
import { hubStats, listPublicStories, spotlightStory } from '@/lib/stories/store';
import '@/components/stories/stories.css';

export const revalidate = 600;

export const metadata = generateSEO({
  title: 'Dharamshala Stories: Travellers & Locals in Their Own Words',
  description: 'Real stories and photos from Dharamshala and McLeod Ganj, shared by travellers and locals. One is chosen every day for our homepage and Instagram. Share yours.',
  path: '/stories',
});

const n = (x: number) => (x >= 1000 ? (x / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(x));

export default async function StoriesPage() {
  const [stories, spot, stats] = await Promise.all([listPublicStories(90), spotlightStory(), hubStats()]);
  const s = spot?.story;
  const rest = s ? stories.filter((x) => x.id !== s.id) : stories;

  return (
    <div className={display.variable + ' bg-[#f7f5f0]'}>
      <JsonLd data={breadcrumbSchema([{ name: 'Home', href: '/' }, { name: 'Stories', href: '/stories' }])} />

      {/* HERO: a string of prayer flags over the night sky */}
      <section className="relative overflow-hidden bg-[#0c1726] text-white">
        <div className="pointer-events-none absolute inset-x-0 top-0" aria-hidden="true">
          <div className="st-flags big" style={{ justifyContent: 'center' }}>
            {Array.from({ length: 40 }, (_, i) => <span key={i} className="st-flag" style={{ background: FLAG_COLORS[i % 5].hex }} />)}
          </div>
        </div>
        <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-24 sm:px-6 sm:pt-28">
          <div className="[&_nav]:text-brand-200 [&_a]:text-brand-100"><Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Stories' }]} /></div>
          <p className="st-rise text-xs font-semibold uppercase tracking-[.3em] text-[#e3b76a]">Dharamshala, in your words</p>
          <h1 className="st-display st-rise mt-3 max-w-3xl text-4xl leading-[1.05] sm:text-6xl">Every journey here leaves a story. <em className="text-[#e3b76a]">Tell us yours.</em></h1>
          <p className="st-rise mt-5 max-w-2xl text-lg text-brand-100">
            Real moments from McLeod Ganj, Dharamkot, Triund and beyond, shared by the people who live here and the people who fell in love with it.
            Every day we choose one story for our homepage and our Instagram, with the storyteller’s name on it.
          </p>
          <div className="st-rise mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/stories/share" className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-orange-900/30 hover:bg-orange-600"><PenLine className="h-5 w-5" />Share your story</Link>
            <a href="#read" className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-7 py-3.5 text-base font-semibold text-white ring-1 ring-white/20 hover:bg-white/15"><BookOpen className="h-5 w-5" />Read the stories</a>
          </div>
          {stats.stories >= 3 && <dl className="mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [n(stats.stories), stats.stories === 1 ? 'story shared' : 'stories shared', BookOpen],
              [n(stats.reads), 'reads', Eye],
              [n(stats.cities), stats.cities === 1 ? 'city reached' : 'cities reached', Globe2],
              [n(stats.flags), stats.flags === 1 ? 'prayer flag tied' : 'prayer flags tied', Sparkles],
            ].map(([v, label, Icon]: any) => (
              <div key={label} className="rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
                <dt className="flex items-center gap-1.5 text-xs text-brand-200"><Icon className="h-3.5 w-3.5 text-[#e3b76a]" />{label}</dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>}
        </div>
      </section>

      {/* STORY OF THE DAY */}
      {s && (
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6" aria-labelledby="spot-h">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <h2 id="spot-h" className="st-display text-3xl text-slate-900">{spot!.live ? 'Story of the day' : 'Most recent Story of the day'}</h2>
            {spot!.live && s.featured_until && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0c1726] px-3 py-1 text-xs font-semibold text-[#e3b76a]"><Clock className="h-3.5 w-3.5" />In the spotlight for another <Countdown until={s.featured_until} /></span>
            )}
          </div>
          <Link href={`/stories/${s.slug}`} className="st-spot group block">
            <div className="grid overflow-hidden rounded-3xl bg-white shadow-xl md:grid-cols-2">
              <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[420px]">
                {s.photos[0] && <Image src={s.photos[0]} alt={s.title} fill priority sizes="(max-width:768px) 100vw, 50vw" className="object-cover transition duration-700 group-hover:scale-105" />}
              </div>
              <div className="flex flex-col p-6 sm:p-10">
                <div className="flex items-center gap-2 text-sm text-slate-500"><MapPin className="h-4 w-4 text-orange-500" />{s.place}{s.visited ? ' · ' + s.visited : ''}</div>
                <h3 className="st-display mt-3 text-3xl leading-tight text-slate-900 sm:text-4xl">{s.title}</h3>
                <p className="mt-4 text-lg leading-relaxed text-slate-600">{excerptOf(s.body, 280)}</p>
                <div className="mt-6 flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-900 font-semibold text-white">{s.author_name.slice(0, 1).toUpperCase()}</span>
                  <div>
                    <p className="font-semibold text-slate-900">{s.author_name}{s.author_from ? <span className="font-normal text-slate-500"> from {s.author_from}</span> : null}</p>
                    <div className="flex items-center gap-2"><KindBadge kind={s.author_kind} />{s.instagram && <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Instagram className="h-3.5 w-3.5" />@{s.instagram}</span>}</div>
                  </div>
                </div>
                <div className="mt-auto flex items-center justify-between pt-6">
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-1"><Eye className="h-4 w-4" />{n(s.views)}</span>
                    <span className="inline-flex items-center gap-1"><Heart className="h-4 w-4" />{n(s.likes)}</span>
                    <FlagCount count={s.flags} />
                  </div>
                  <span className="inline-flex items-center gap-1 font-semibold text-brand-600 group-hover:gap-2">Read the story<ArrowRight className="h-4 w-4 transition-all" /></span>
                </div>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6" aria-labelledby="how-h">
        <h2 id="how-h" className="sr-only">How it works</h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {[
            ['1', 'Share your moment', 'A sunrise at Triund, a chai with a monk, the friend you made in Bhagsu. Add your photos and, if you like, your Instagram.'],
            ['2', 'We read every story', 'Our team in Dharamshala reads each one. Once it is approved it gets its own page, and readers can like it, comment on it and tie prayer flags to it.'],
            ['3', 'One becomes Story of the day', `Every day one story goes on our homepage and our Instagram (@${siteConfig.instagramHandle}) for 24 hours. You get a featured card to share.`],
          ].map(([k, t, d]) => (
            <li key={k} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <span className="st-display flex h-10 w-10 items-center justify-center rounded-full bg-[#e3b76a] text-xl text-[#0c1726]">{k}</span>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{t}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ALL STORIES */}
      <section id="read" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-12 sm:px-6" aria-labelledby="all-h">
        <h2 id="all-h" className="st-display mb-6 text-3xl text-slate-900">All stories</h2>
        <StoriesBrowser stories={rest} />
      </section>

      {/* CLOSING CALL */}
      <section className="bg-[#0c1726] text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="st-display text-3xl sm:text-4xl">Tomorrow&rsquo;s Story of the day could be yours.</h2>
            <p className="mt-2 max-w-xl text-brand-100">It takes five minutes. Write it the way you would tell a friend.</p>
          </div>
          <Link href="/stories/share" className="inline-flex flex-none items-center gap-2 rounded-full bg-orange-500 px-7 py-3.5 font-semibold text-white hover:bg-orange-600"><PenLine className="h-5 w-5" />Share your story</Link>
        </div>
      </section>
    </div>
  );
}
