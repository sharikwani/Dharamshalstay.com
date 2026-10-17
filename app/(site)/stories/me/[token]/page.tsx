import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check, Clock, Download, Eye, Globe2, Heart, MessageCircle, Sparkles } from 'lucide-react';
import RemoveStory from '@/components/stories/RemoveStory';
import { display } from '@/lib/fonts';
import { siteConfig } from '@/lib/config';
import { FLAG_COLORS, countryFlag, featureState, timeLeft } from '@/lib/stories/rules';
import { reachSummary, storyByToken, storyFlags, storyReach } from '@/lib/stories/store';
import '@/components/stories/stories.css';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const metadata: Metadata = { title: 'Your story', robots: { index: false, follow: false } };

const n = (x: number) => x.toLocaleString('en-IN');
const hex = (c?: string) => FLAG_COLORS.find((f) => f.key === c)?.hex || FLAG_COLORS[0].hex;

/** The storyteller's private page: where their story stands and how far it has travelled. */
export default async function MyStoryPage({ params }: { params: { token: string } }) {
  const s = await storyByToken(params.token);
  if (!s) notFound();
  const live = s.status === 'approved';
  const [reach, flags] = live ? await Promise.all([storyReach(s.id), storyFlags(s.id)]) : [[], []];
  const r = reachSummary(reach);
  const feat = featureState(s);
  const url = `${siteConfig.url}/stories/${s.slug}`;
  const steps = [
    { done: true, label: 'Received', note: 'Your story reached our team.' },
    { done: live, label: s.status === 'rejected' || s.status === 'hidden' ? 'Not published' : 'Live on the site', note: live ? 'Anyone can read it now.' : s.status === 'pending' ? 'We read every story, usually within a day.' : 'Our team decided not to publish this one. Thank you for sharing it with us.' },
    { done: !!feat, label: 'Story of the day', note: feat === 'live' ? `On our homepage and Instagram now, for another ${timeLeft(s.featured_until!)}.` : feat === 'past' ? 'You were featured on our homepage and Instagram.' : 'Each day we feature one story. Yours could be next.' },
  ];

  return (
    <div className={display.variable + ' min-h-screen bg-[#f7f5f0] pb-16'}>
      <section className="bg-[#0c1726] text-white">
        <div className="mx-auto max-w-4xl px-4 pb-10 pt-8 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[.3em] text-[#e3b76a]">Your private story page</p>
          <h1 className="st-display mt-2 text-4xl leading-tight sm:text-5xl">{s.title}</h1>
          <p className="mt-2 text-brand-100">by {s.author_name} · {s.place}</p>
          {feat === 'live' && <p className="st-rise mt-5 inline-flex items-center gap-2 rounded-full bg-[#e3b76a] px-4 py-2 text-sm font-bold text-[#0c1726]"><Sparkles className="h-4 w-4" />You are today&rsquo;s Story of the day</p>}
          <ol className="mt-8 grid gap-3 sm:grid-cols-3">
            {steps.map((st, i) => (
              <li key={i} className={'rounded-2xl p-4 ring-1 ' + (st.done ? 'bg-white/10 ring-[#e3b76a]/50' : 'bg-white/5 ring-white/10')}>
                <p className="flex items-center gap-2 font-semibold">{st.done ? <Check className="h-4 w-4 text-[#e3b76a]" /> : <Clock className="h-4 w-4 text-brand-300" />}{st.label}</p>
                <p className="mt-1 text-sm text-brand-200">{st.note}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-8 px-4 pt-8 sm:px-6">
        {live && (
          <>
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[[Eye, n(s.views), 'readers'], [Globe2, n(r.cities), r.cities === 1 ? 'city' : 'cities'], [Heart, n(s.likes), 'likes'], [MessageCircle, n(s.comments), 'comments']].map(([Icon, v, l]: any) => (
                <div key={l} className="rounded-3xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-200">
                  <Icon className="mx-auto h-5 w-5 text-orange-500" /><p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{v}</p><p className="text-sm text-slate-500">{l}</p>
                </div>
              ))}
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="st-display text-2xl text-slate-900">{r.cities ? `People in ${r.cities} ${r.cities === 1 ? 'city' : 'cities'}${r.countries > 1 ? ` and ${r.countries} countries` : ''} have read your story` : 'Your first readers are on their way'}</h2>
              {r.top.length > 0 ? (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {r.top.map((p) => <li key={p.city + p.country} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700">{countryFlag(p.country)} {p.city || p.country} <b className="text-slate-900">{p.readers}</b></li>)}
                </ul>
              ) : <p className="mt-2 text-slate-600">Share your story link with friends and watch this fill up.</p>}
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="st-display text-2xl text-slate-900">{flags.length ? `${flags.length} prayer flag${flags.length === 1 ? '' : 's'} tied for you` : 'No prayer flags yet'}</h2>
              <p className="mt-1 text-sm text-slate-500">Readers tie a flag with a short wish for you. In McLeod Ganj, the wind is said to carry each wish to everyone it touches.</p>
              {flags.length > 0 && (
                <ul className="mt-4 space-y-3">
                  {flags.slice(0, 40).map((f) => (
                    <li key={f.id} className="flex items-start gap-3"><span className="mt-0.5 h-7 w-5 flex-none rounded-sm shadow" style={{ background: hex(f.color) }} /><p className="text-slate-700"><span className="st-display text-lg">&ldquo;{f.text}&rdquo;</span> <span className="text-sm text-slate-500">from {f.name}</span></p></li>
                  ))}
                </ul>
              )}
            </section>

            <section className="grid gap-6 rounded-3xl bg-[#0c1726] p-6 text-white sm:grid-cols-[200px_1fr] sm:p-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/stories/card/${s.slug}?f=fame`} alt="Your story card" className="w-full rounded-2xl shadow-2xl sm:w-[200px]" loading="lazy" />
              <div>
                <h2 className="st-display text-3xl">Your story card</h2>
                <p className="mt-2 text-brand-100">Post it on your Instagram story{feat ? '' : ' or WhatsApp status'} and tag @{siteConfig.instagramHandle}. We reshare the ones we are tagged in.</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <a href={`/stories/card/${s.slug}?f=fame`} download="my-dharamshala-story.jpg" className="inline-flex items-center gap-2 rounded-full bg-[#e3b76a] px-5 py-2.5 font-semibold text-[#0c1726]"><Download className="h-4 w-4" />Download card</a>
                  <Link href={`/stories/${s.slug}`} className="rounded-full bg-white/10 px-5 py-2.5 font-semibold ring-1 ring-white/20">Open my story</Link>
                </div>
                <p className="mt-4 break-all text-sm text-brand-200">Your story link: {url}</p>
              </div>
            </section>
          </>
        )}

        <section className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Your story, your choice</h2>
          <p className="mt-1 text-sm text-slate-600">Keep this page&rsquo;s link private: anyone with it can take the story down. If you change your mind, remove it here and we delete it and its photos from our site.</p>
          <div className="mt-4"><RemoveStory token={s.manage_token} /></div>
        </section>
      </div>
    </div>
  );
}
