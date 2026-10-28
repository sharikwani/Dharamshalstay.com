import Link from 'next/link';
import type { Metadata } from 'next';
import { BadgeCheck, ExternalLink, ArrowRight, CalendarClock } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/Cards';
import JsonLd from '@/components/seo/JsonLd';
import { getAllFacts, ALL_TOPICS, type FactWithTopic } from '@/lib/facts';
import { travelUpdates, updatesChecked, type UpdateStatus } from '@/data/travel-updates';
import { breadcrumbSchema, faqSchema, generateSEO } from '@/lib/seo';
import { siteConfig } from '@/lib/config';

const ORG = { '@id': siteConfig.url + '/#organization' };
const nice = (d: string) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const latest = (fs: FactWithTopic[]) => fs.reduce((m, f) => (f.verified > m ? f.verified : m), '2026-01-01');

export function factsMetadata(): Metadata {
  return generateSEO({
    title: 'Dharamshala Facts & Figures, Verified',
    description: 'Dated, sourced answers for Dharamshala and McLeod Ganj: Triund distance and fees, temple and museum timings, meditation courses, ropeway, taxi fares.',
    path: '/facts',
    hindi: false,
  });
}

export async function FactsView() {
  const all = await getAllFacts();
  const updated = latest(all);
  const topics = ALL_TOPICS.filter((t) => all.some((f) => f.topic === t.id));

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([{ name: 'Home', href: '/' }, { name: 'Facts & figures', href: '/facts' }]),
        {
          '@context': 'https://schema.org',
          '@type': 'Dataset',
          '@id': siteConfig.url + '/facts#dataset',
          name: 'Dharamshala and McLeod Ganj travel facts',
          description: 'Short, verified answers about travel in Dharamshala, McLeod Ganj and the Kangra Valley, each with the date it was checked and its source.',
          url: siteConfig.url + '/facts',
          creator: { '@type': 'Organization', ...ORG, name: siteConfig.name, url: siteConfig.url },
          publisher: ORG,
          dateModified: updated,
          inLanguage: 'en-IN',
          isAccessibleForFree: true,
          license: 'https://creativecommons.org/licenses/by/4.0/',
          spatialCoverage: { '@type': 'Place', name: 'Dharamshala, Kangra District, Himachal Pradesh, India', geo: { '@type': 'GeoCoordinates', latitude: 32.219, longitude: 76.3234 } },
          keywords: ['Dharamshala', 'McLeod Ganj', 'Triund', 'Dalai Lama Temple', 'Tibet Museum', 'Tushita', 'Vipassana', 'Dharamshala Skyway', 'taxi fares'],
          distribution: { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: siteConfig.url + '/facts.json' },
        },
        faqSchema(all.map((f) => ({ question: f.question, answer: f.answer }))),
      ]} />

      <section className="bg-brand-900 text-white py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Facts & figures' }]} />
          <h1 className="text-3xl sm:text-4xl font-heading font-bold mt-2">Dharamshala Facts & Figures, Verified</h1>
          <p className="text-brand-100 max-w-3xl mt-3">
            Quick, checked answers about Dharamshala and McLeod Ganj. Every figure shows when we last verified it and where it comes from.
            Our team lives here, so we re-check after every change on the ground.
          </p>
          <p className="text-sm text-brand-200 mt-3 flex items-center gap-2"><BadgeCheck className="h-4 w-4" />Last updated {nice(updated)} · {all.length} facts · <a href="/facts.json" className="underline">JSON</a></p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <nav aria-label="Topics" className="flex flex-wrap gap-2 mb-10">
          {topics.map((t) => <a key={t.id} href={'#' + t.id} className="text-sm bg-slate-100 hover:bg-brand-50 rounded-full px-3 py-1.5">{t.title}</a>)}
          <Link href="/travel-updates" className="text-sm bg-amber-100 hover:bg-amber-200 rounded-full px-3 py-1.5">Latest travel updates →</Link>
        </nav>

        {topics.map((t) => (
          <section key={t.id} id={t.id} className="mb-12 scroll-mt-24">
            <h2 className="text-2xl font-heading font-bold text-slate-900 mb-5">{t.title}</h2>
            <div className="space-y-4">
              {all.filter((f) => f.topic === t.id).map((f) => (
                <article key={f.id} id={f.id} className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="font-heading font-semibold text-lg text-slate-900"><a href={'#' + f.id} className="hover:text-brand-700">{f.question}</a></h3>
                  <p className="text-slate-700 mt-2 leading-relaxed">{f.answer}</p>
                  <p className="text-xs text-slate-500 mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="inline-flex items-center gap-1"><BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />Verified {nice(f.verified)}</span>
                    <span>Source: {f.sources.map((s, i) => (
                      <span key={s.url}>{i > 0 && ', '}<a href={s.url} className="underline hover:text-slate-700" {...(s.url.startsWith(siteConfig.url) ? {} : { target: '_blank', rel: 'noopener noreferrer' })}>{s.label}</a></span>
                    ))}</span>
                    {f.page && <Link href={f.page} className="inline-flex items-center gap-1 text-brand-600 font-medium hover:underline">Full guide <ArrowRight className="h-3 w-3" /></Link>}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ))}

        <section className="rounded-2xl bg-slate-50 border border-slate-200 p-6 text-sm text-slate-600">
          <h2 className="text-lg font-heading font-bold text-slate-900 mb-2">Using these facts</h2>
          <p>You are welcome to quote any fact here with a link to its anchor (for example {siteConfig.url}/facts#triund-fees). Prices are indicative and change; confirm on the linked page or with <Link href="/contact" className="underline">our team</Link>. Spotted something out of date? Tell us and we will re-check it.</p>
        </section>
      </div>
    </>
  );
}

const STATUS: Record<UpdateStatus, { label: string; cls: string }> = {
  open: { label: 'Open', cls: 'bg-emerald-100 text-emerald-800' },
  changed: { label: 'Changed', cls: 'bg-sky-100 text-sky-800' },
  restricted: { label: 'Restricted', cls: 'bg-amber-100 text-amber-800' },
  closed: { label: 'Closed', cls: 'bg-red-100 text-red-800' },
  seasonal: { label: 'Seasonal', cls: 'bg-violet-100 text-violet-800' },
};

export function travelUpdatesMetadata(): Metadata {
  return generateSEO({
    title: 'Dharamshala Travel Updates: Latest News & Status',
    description: 'Latest Dharamshala and McLeod Ganj travel updates, each dated: Skyway ropeway status, Triund rules and fees, meditation course dates, seasonal tips.',
    path: '/travel-updates',
    hindi: false,
  });
}

/** Direct answers built from the update list itself, so they never go stale (shown on the page and as FAQPage). */
function updateAnswers(items: typeof travelUpdates) {
  const latest = items.slice(0, 4).map((u) => u.title).join('; ');
  const limits = items.filter((u) => u.status === 'restricted' || u.status === 'closed');
  return [
    { question: 'What is the latest travel information for McLeod Ganj and Dharamshala?',
      answer: `As of ${nice(updatesChecked)}: ${latest}. Each update below has its date, the date we last checked it and its official source.` },
    { question: 'Is anything closed or restricted in Dharamshala right now?',
      answer: limits.length
        ? `Yes: ${limits.map((u) => u.title).join('; ')}. Everything else on this page is open, seasonal or a changed rule. Last checked ${nice(updatesChecked)}.`
        : `Nothing on our list is closed or restricted right now (last checked ${nice(updatesChecked)}). Seasonal notes and changed rules are listed below.` },
    { question: 'How up to date are these Dharamshala travel updates?',
      answer: `Every entry shows when the change happened and when our team in Dharamshala last checked it against an official or news source. The whole page was last checked on ${nice(updatesChecked)}.` },
  ];
}

export function TravelUpdatesView() {
  const items = [...travelUpdates].sort((a, b) => b.checked.localeCompare(a.checked) || b.date.localeCompare(a.date));
  const answers = updateAnswers(items);
  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([{ name: 'Home', href: '/' }, { name: 'Travel updates', href: '/travel-updates' }]),
        faqSchema(answers),
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Dharamshala travel updates',
          url: siteConfig.url + '/travel-updates',
          dateModified: updatesChecked,
          publisher: ORG,
          about: { '@type': 'Place', name: 'Dharamshala and McLeod Ganj, Himachal Pradesh, India' },
          mainEntity: {
            '@type': 'ItemList',
            itemListElement: items.map((u, i) => ({
              '@type': 'ListItem', position: i + 1,
              item: { '@type': 'Article', headline: u.title, articleBody: u.body, datePublished: u.date, dateModified: u.checked, url: siteConfig.url + '/travel-updates#' + u.id, author: ORG, publisher: ORG },
            })),
          },
        },
      ]} />

      <section className="bg-brand-900 text-white py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Travel updates' }]} />
          <h1 className="text-3xl sm:text-4xl font-heading font-bold mt-2">Dharamshala Travel Updates</h1>
          <p className="text-brand-100 max-w-3xl mt-3">What has changed on the ground in Dharamshala, McLeod Ganj and the Kangra Valley: closures, trekking rules, fees and seasonal notes. Each entry shows when it happened and when we last checked it.</p>
          <p className="text-sm text-brand-200 mt-3 flex items-center gap-2"><CalendarClock className="h-4 w-4" />Last checked {nice(updatesChecked)}</p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <section aria-labelledby="quick-answers" className="mb-10 rounded-xl bg-brand-50 p-5">
          <h2 id="quick-answers" className="font-heading font-bold text-xl text-slate-900">Quick answers</h2>
          <dl className="mt-3 space-y-4">
            {answers.map((a) => (
              <div key={a.question}>
                <dt className="font-semibold text-slate-900">{a.question}</dt>
                <dd className="mt-1 text-slate-700 leading-relaxed">{a.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
        <ol className="space-y-5">
          {items.map((u) => (
            <li key={u.id} id={u.id} className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={'text-xs font-semibold rounded-full px-2.5 py-1 ' + STATUS[u.status].cls}>{STATUS[u.status].label}</span>
                <time dateTime={u.date} className="text-xs text-slate-500">{nice(u.date)}</time>
                {u.checked !== u.date && <span className="text-xs text-slate-500">· checked {nice(u.checked)}</span>}
              </div>
              <h2 className="font-heading font-semibold text-lg text-slate-900"><a href={'#' + u.id} className="hover:text-brand-700">{u.title}</a></h2>
              <p className="text-slate-700 mt-2 leading-relaxed">{u.body}</p>
              <p className="text-xs text-slate-500 mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>Source: {u.sources.map((s, i) => (
                  <span key={s.url}>{i > 0 && ', '}<a href={s.url} className="underline hover:text-slate-700" {...(s.url.startsWith(siteConfig.url) ? {} : { target: '_blank', rel: 'noopener noreferrer' })}>{s.label}<ExternalLink className="inline h-3 w-3 ml-0.5" /></a></span>
                ))}</span>
                {u.page && <Link href={u.page} className="inline-flex items-center gap-1 text-brand-600 font-medium hover:underline">More <ArrowRight className="h-3 w-3" /></Link>}
              </p>
            </li>
          ))}
        </ol>
        <p className="text-sm text-slate-600 mt-8">Need a quick number instead? See <Link href="/facts" className="text-brand-600 underline">Dharamshala facts & figures</Link>. Planning a trip? <Link href="/contact" className="text-brand-600 underline">Ask our local team</Link>.</p>
      </div>
    </>
  );
}
