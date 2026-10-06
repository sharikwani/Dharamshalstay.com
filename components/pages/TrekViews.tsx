import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MessageCircle, Calendar, Ruler, Mountain, Backpack } from 'lucide-react';
import { Breadcrumb, FAQSection, TrekCard } from '@/components/ui/Cards';
import BookingForm from '@/components/forms/BookingForm';
import JsonLd from '@/components/seo/JsonLd';
import { getTrekBySlug, getPublishedTreks } from '@/lib/db';
import { generateSEO, breadcrumbSchema, faqSchema, itemListSchema } from '@/lib/seo';
import { placeImage } from '@/lib/place-images';
import { formatPrice, getWhatsAppLink, cn } from '@/lib/utils';
import { serverT } from '@/lib/i18n/server';
import { fmt } from '@/lib/i18n/dict';
import { localizeTrek } from '@/lib/i18n/content';
import type { Lang } from '@/lib/i18n/core';

/** Full written guide for each bookable trek, where one exists. */
const TREK_GUIDES: Record<string, string> = {
  'triund-trek': 'triund-trek-complete-guide',
  'kareri-lake-trek': 'kareri-lake-trek-guide',
  'indrahar-pass-trek': 'indrahar-pass-trek-guide',
  'triund-snowline-laka-got-trek': 'snowline-laka-glacier-trek',
  'bir-billing-rajgundha-trek': 'bir-billing-rajgundha-trek',
  'guna-devi-temple-hike': 'easy-hikes-near-mcleod-ganj',
  'dharamkot-gallu-devi-sunrise-hike': 'easy-hikes-near-mcleod-ganj',
  'thatharana-trek': 'easy-hikes-near-mcleod-ganj',
};

const DIFF_COLORS: Record<string, string> = { easy: 'bg-green-100 text-green-700', moderate: 'bg-amber-100 text-amber-700', hard: 'bg-red-100 text-red-700', expert: 'bg-purple-100 text-purple-700' };

export function treksMetadata(lang: Lang): Metadata {
  const t = serverT(lang).t.treks;
  return generateSEO({ title: t.metaTitle, description: t.metaDescription, path: '/treks', image: placeImage('triund'), lang });
}

export async function TreksListView({ lang }: { lang: Lang }) {
  const { t, href } = serverT(lang);
  const treks = (await getPublishedTreks()).map((x: any) => localizeTrek(x, lang));
  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([{ name: t.common.home, href: '/' }, { name: t.common.treks, href: '/treks' }], lang),
        itemListSchema(treks.map((x: any) => ({ name: x.name, href: '/treks/' + x.slug })), lang),
      ]} />
      <section className="bg-brand-900 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Breadcrumb lang={lang} items={[{ label: t.common.home, href: '/' }, { label: t.common.treks }]} />
          <h1 className="text-3xl font-heading font-bold mt-2">{t.treks.h1}</h1>
          <p className="text-brand-200 max-w-2xl">{t.treks.intro}</p>
        </div>
      </section>
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {treks.map((x: any) => <TrekCard key={x.id} trek={x} lang={lang} />)}
          </div>
          <p className="text-sm text-slate-600 mt-8">
            {t.treks.rulesNote}{' '}
            <Link href={href('/blog/rules-permits-dos-donts-dharamshala')} className="text-brand-600 underline">{t.treks.rulesLink}</Link>
          </p>
        </div>
      </section>
    </>
  );
}

export async function trekMetadata(slug: string, lang: Lang): Promise<Metadata> {
  const raw = await getTrekBySlug(slug);
  if (!raw) return {};
  const x = localizeTrek(raw, lang);
  return generateSEO({ title: x.meta_title || x.name, description: x.meta_description || x.short_description, path: '/treks/' + x.slug, image: x.images?.[0], lang, ogTag: [x.duration, x.difficulty].filter(Boolean).join(' · ') || undefined, markdown: true });
}

export async function TrekDetailView({ slug, lang }: { slug: string; lang: Lang }) {
  const raw = await getTrekBySlug(slug);
  if (!raw) notFound();
  const trek = localizeTrek(raw, lang);
  const { t, href } = serverT(lang);
  const k = t.treks;
  const others = (await getPublishedTreks()).filter((x: any) => x.slug !== trek.slug).slice(0, 4).map((x: any) => localizeTrek(x, lang));
  const guide = TREK_GUIDES[trek.slug];

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([{ name: t.common.home, href: '/' }, { name: t.common.treks, href: '/treks' }, { name: trek.name, href: '/treks/' + trek.slug }], lang),
        ...(trek.faqs?.length ? [faqSchema(trek.faqs)] : []),
      ]} />

      <section className="relative h-[300px]">
        <Image src={trek.images?.[0] || '/images/places/dhauladhar-hero.jpg'} alt={trek.name} fill className="object-cover" priority sizes="100vw" />
        <div className="absolute inset-0 bg-brand-950/60" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 h-full flex flex-col justify-end pb-8 text-white">
          <Breadcrumb lang={lang} items={[{ label: t.common.home, href: '/' }, { label: t.common.treks, href: '/treks' }, { label: trek.name }]} />
          <h1 className="text-3xl font-heading font-bold">{trek.name}</h1>
          <div className="flex flex-wrap gap-3 mt-2 text-sm">
            <span className={cn('px-2 py-0.5 rounded-full font-medium', DIFF_COLORS[trek.difficulty] || '')}>{t.common.difficulty[trek.difficulty] || trek.difficulty}</span>
            <span className="text-slate-300">{trek.duration}</span>
            <span className="text-slate-300">{trek.max_altitude}</span>
          </div>
          {trek.price_per_person > 0 && (
            <p className="mt-2 text-xl font-bold">{formatPrice(trek.price_per_person)} <span className="text-sm font-normal text-slate-300">{t.common.perPerson}</span></p>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Calendar, label: k.duration, value: trek.duration },
                { icon: Ruler, label: k.distance, value: trek.distance },
                { icon: Mountain, label: k.maxAltitude, value: trek.max_altitude },
                { icon: Calendar, label: k.bestSeason, value: trek.best_season },
              ].filter((s) => s.value).map((s) => (
                <div key={s.label} className="bg-slate-50 rounded-xl p-3">
                  <s.icon className="h-4 w-4 text-brand-600 mb-1" />
                  <p className="text-[11px] text-slate-500">{s.label}</p>
                  <p className="text-sm font-semibold text-slate-900">{s.value}</p>
                </div>
              ))}
            </div>

            <div><h2 className="text-xl font-heading font-semibold mb-3">{k.overview}</h2><p className="text-slate-600 whitespace-pre-line leading-relaxed">{trek.description}</p></div>

            {trek.itinerary?.length > 0 && (
              <div>
                <h2 className="text-xl font-heading font-semibold mb-3">{k.itinerary}</h2>
                {trek.itinerary.map((d: any) => (
                  <div key={d.day} className="border border-slate-200 rounded-xl p-4 mb-3">
                    <h3 className="font-semibold">{fmt(k.day, { n: d.day })}: {d.title}</h3>
                    <p className="text-sm text-slate-600">{d.description}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {trek.includes?.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">{k.included}</h3>
                  <ul className="space-y-1">{trek.includes.map((i: string) => <li key={i} className="text-sm flex gap-2"><span className="text-green-500">✓</span>{i}</li>)}</ul>
                </div>
              )}
              {trek.excludes?.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">{k.notIncluded}</h3>
                  <ul className="space-y-1">{trek.excludes.map((e: string) => <li key={e} className="text-sm flex gap-2"><span className="text-red-400">✗</span>{e}</li>)}</ul>
                </div>
              )}
            </div>

            {trek.things_to_carry?.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2"><Backpack className="h-4 w-4 text-brand-600" />{k.carry}</h3>
                <div className="flex flex-wrap gap-2">{trek.things_to_carry.map((c: string) => <span key={c} className="text-sm bg-slate-100 px-3 py-1 rounded-full">{c}</span>)}</div>
              </div>
            )}

            {guide && (
              <p className="bg-brand-50 rounded-xl p-4 text-sm text-slate-700">
                {k.readGuide}{' '}<Link href={href('/blog/' + guide)} className="text-brand-700 font-semibold underline">{k.fullGuide} &rarr;</Link>
              </p>
            )}

            {trek.faqs?.length > 0 && <div><h2 className="text-xl font-heading font-semibold mb-3">{t.common.faqs}</h2><FAQSection faqs={trek.faqs} /></div>}
          </div>
          <div>
            <div id="book" className="sticky top-20 space-y-4">
              <BookingForm category="trek" entityId={trek.id} entityName={trek.name} defaultAmount={trek.price_per_person} />
              <a href={getWhatsAppLink(fmt(k.whatsappMsg, { name: raw.name }))} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-green-700 text-white py-3 rounded-xl font-medium hover:bg-green-800 w-full">
                <MessageCircle className="h-4 w-4" /> {t.common.whatsapp}
              </a>
            </div>
          </div>
        </div>
        {others.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-heading font-bold mb-4">{k.more}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">{others.map((x: any) => <TrekCard key={x.id} trek={x} lang={lang} />)}</div>
          </div>
        )}
      </div>
    </>
  );
}
