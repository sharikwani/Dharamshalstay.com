import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowRight, CalendarDays, Clock, Instagram, MapPin, PenLine } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/Cards';
import JsonLd from '@/components/seo/JsonLd';
import StoryLive, { FlagsPanel, HeroFlags, LiveActions, LiveComments, LiveReach } from '@/components/stories/StoryLive';
import StoryCard, { KindBadge } from '@/components/stories/StoryCard';
import Countdown from '@/components/stories/Countdown';
import StoryGallery, { CoverButton, PhotoGrid } from '@/components/stories/StoryGallery';
import { breadcrumbSchema, generateSEO } from '@/lib/seo';
import { siteConfig } from '@/lib/config';
import { display } from '@/lib/fonts';
import { excerptOf, featureState } from '@/lib/stories/rules';
import { getPublicStory, listPublicStories } from '@/lib/stories/store';

export const revalidate = 600;

const STORY_TAIL = 'A traveller story from Dharamshala and McLeod Ganj, shared on Dharamshala Stay.';

// Short stories get a standard sentence appended so the meta description is not left thin; capped at 155 chars on a word boundary.
function storyDescription(body: string): string {
  const ex = excerptOf(body, 155);
  if (ex.length >= 120) return ex;
  const full = (ex.replace(/[\s…]+$/, '') + (/[.!?]$/.test(ex) ? ' ' : '. ') + STORY_TAIL).replace(/\s+/g, ' ').trim();
  if (full.length <= 155) return full;
  return full.slice(0, 155).replace(/\s+\S*$/, '').replace(/[,;:\s-]+$/, '');
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const s = await getPublicStory(params.slug);
  if (!s) return { title: 'Story not found', robots: { index: false } };
  return generateSEO({
    title: `${s.title}: a Dharamshala story by ${s.author_name}`,
    description: storyDescription(s.body),
    path: `/stories/${s.slug}`,
    image: `${siteConfig.url}/stories/card/${s.slug}?f=og`,
    type: 'article',
    publishedTime: s.approved_at || s.created_at,
  });
}

export default async function StoryPage({ params }: { params: { slug: string } }) {
  const s = await getPublicStory(params.slug);
  if (!s) notFound();
  const more = (await listPublicStories(12)).filter((x) => x.id !== s.id).slice(0, 3);
  const url = `${siteConfig.url}/stories/${s.slug}`;
  const spotlight = featureState(s) === 'live';
  const paragraphs = s.body.split(/\n+/).filter(Boolean);

  return (
    <div className={display.variable + ' bg-[#f7f5f0] pb-20 sm:pb-0'}>
      <JsonLd data={[
        breadcrumbSchema([{ name: 'Home', href: '/' }, { name: 'Stories', href: '/stories' }, { name: s.title, href: `/stories/${s.slug}` }]),
        {
          '@context': 'https://schema.org', '@type': 'Article', headline: s.title, url,
          image: s.photos.slice(0, 3), datePublished: s.approved_at || s.created_at,
          author: { '@type': 'Person', name: s.author_name, ...(s.instagram ? { sameAs: `https://www.instagram.com/${s.instagram}/` } : {}) },
          publisher: { '@id': siteConfig.url + '/#organization' },
          contentLocation: { '@type': 'Place', name: `${s.place}, Himachal Pradesh, India` },
          interactionStatistic: [
            { '@type': 'InteractionCounter', interactionType: 'https://schema.org/LikeAction', userInteractionCount: s.likes },
            { '@type': 'InteractionCounter', interactionType: 'https://schema.org/CommentAction', userInteractionCount: s.comments },
          ],
        },
      ]} />

      <StoryLive story={{ id: s.id, slug: s.slug, title: s.title, author_name: s.author_name, url }} initial={{ views: s.views, likes: s.likes, comments: s.comments, flags: s.flags }}>
        {/* The readers' prayer flags, strung across the top */}
        <div className="bg-[#0c1726] text-white">
          <div className="mx-auto max-w-5xl px-4 pb-1 pt-4 sm:px-6">
            <div className="[&_nav]:text-brand-200 [&_a]:text-brand-100"><Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Stories', href: '/stories' }, { label: s.title }]} /></div>
          </div>
        </div>

        <StoryGallery photos={s.photos} title={s.title}>
        <article>
          <header className="relative">
            <div className="relative h-[58vh] min-h-[340px] w-full overflow-hidden bg-brand-900 sm:h-[68vh]">
              {s.photos[0] && <Image src={s.photos[0]} alt={s.title} fill priority sizes="100vw" className="object-cover" />}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c1726] via-[#0c1726]/30 to-transparent" />
              {s.photos[0] && <CoverButton title={s.title} count={s.photos.length} />}
              <HeroFlags />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 [&_a]:pointer-events-auto">
                <div className="mx-auto max-w-5xl px-4 pb-8 text-white sm:px-6 sm:pb-12">
                  {spotlight && s.featured_until && (
                    <p className="st-rise mb-4 inline-flex items-center gap-2 rounded-full bg-[#e3b76a] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#0c1726]">
                      <Clock className="h-3.5 w-3.5" />Story of the day · <Countdown until={s.featured_until} /> left
                    </p>
                  )}
                  <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-brand-100">
                    <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4 text-orange-400" />{s.place}</span>
                    {s.visited && <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" />{s.visited}</span>}
                  </p>
                  <h1 className="st-display st-rise mt-3 max-w-4xl text-4xl leading-[1.05] sm:text-6xl">{s.title}</h1>
                  <div className="mt-5 flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-lg font-semibold text-brand-900">{s.author_name.slice(0, 1).toUpperCase()}</span>
                    <div>
                      <p className="text-lg font-semibold">{s.author_name}{s.author_from ? <span className="font-normal text-brand-200"> from {s.author_from}</span> : null}</p>
                      <KindBadge kind={s.author_kind} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="sticky top-16 z-30 -mx-4 hidden border-b border-slate-200 bg-[#f7f5f0]/95 px-4 py-3 backdrop-blur sm:block"><LiveActions /></div>

            <div className="mx-auto max-w-2xl py-10">
              {paragraphs.map((p, i) => (
                <p key={i} className={'mb-5 text-lg leading-[1.8] text-slate-800 ' + (i === 0 ? 'first-letter:[font-family:var(--font-display)] first-letter:float-left first-letter:mr-2 first-letter:text-6xl first-letter:leading-[.9] first-letter:text-brand-800' : '')}>{p}</p>
              ))}
            </div>

            <PhotoGrid photos={s.photos} title={s.title} />

            <div className="mx-auto max-w-3xl pt-10"><FlagsPanel /></div>

            <div className="mx-auto max-w-2xl py-10">
              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <p className="text-xs font-semibold uppercase tracking-[.2em] text-slate-500">The storyteller</p>
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-900 text-xl font-semibold text-white">{s.author_name.slice(0, 1).toUpperCase()}</span>
                  <div className="min-w-0 flex-1">
                    <p className="st-display text-2xl text-slate-900">{s.author_name}</p>
                    <p className="text-sm text-slate-600">{s.author_kind === 'local' ? 'Lives in the Dharamshala area' : 'Travelled to Dharamshala'}{s.author_from ? ` · from ${s.author_from}` : ''}</p>
                  </div>
                  {s.instagram && (
                    <a href={`https://www.instagram.com/${s.instagram}/`} target="_blank" rel="nofollow ugc noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] px-5 py-2.5 text-sm font-semibold text-white">
                      <Instagram className="h-4 w-4" />Follow @{s.instagram}
                    </a>
                  )}
                </div>
              </div>
              <div className="mt-6 sm:hidden"><LiveActions /></div>
            </div>

            <div className="mx-auto max-w-3xl space-y-12 pb-14">
              <LiveReach />
              <LiveComments />
            </div>
          </div>
        </article>
        </StoryGallery>

        <LiveActions sticky />
      </StoryLive>

      {more.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6" aria-labelledby="more-h">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 id="more-h" className="st-display text-3xl text-slate-900">More stories</h2>
            <Link href="/stories" className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:gap-2">All stories<ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{more.map((m) => <StoryCard key={m.id} s={m} />)}</div>
        </section>
      )}

      <section className="bg-[#0c1726] text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-5 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between">
          <h2 className="st-display text-3xl">Have a Dharamshala story of your own?</h2>
          <Link href="/stories/share" className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-7 py-3.5 font-semibold text-white hover:bg-orange-600"><PenLine className="h-5 w-5" />Share your story</Link>
        </div>
      </section>
    </div>
  );
}
