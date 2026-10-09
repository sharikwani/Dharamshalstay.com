import Link from 'next/link';
import { Breadcrumb, FAQSection } from '@/components/ui/Cards';
import HotelFilters from '@/components/hotels/HotelFilters';
import JsonLd from '@/components/seo/JsonLd';
import { getPublishedProperties, getDestinations } from '@/lib/db';
import { serverT } from '@/lib/i18n/server';
import { fmt } from '@/lib/i18n/dict';
import { getFaqCategories, localizeDestination, localizeHotel } from '@/lib/i18n/content';
import { breadcrumbSchema, faqSchema, itemListSchema } from '@/lib/seo';
import type { Lang } from '@/lib/i18n/core';

export default async function HotelsView({ lang }: { lang: Lang }) {
  const { t, href } = serverT(lang);
  const [hotels, rawDestinations] = await Promise.all([getPublishedProperties(), getDestinations()]);
  const destinations = rawDestinations.map((d: any) => localizeDestination(d, lang));
  // "Where to stay" answers from /faq, so this page can rank for "hotels in dharamshala" questions too.
  const faqs = (getFaqCategories(lang).find((c) => c.id === 'where-to-stay')?.faqs || []).slice(0, 8);
  const countIn = (slug: string) => hotels.filter((h) => h.destination_slug === slug).length;
  const guideLink = (slug: string, label: string) => (
    <Link key={slug} href={href('/blog/' + slug)} className="text-brand-600 underline">{label}</Link>
  );
  const [before, middle, after] = t.hotels.guidesLine.split(/\{a\}|\{b\}/);

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([{ name: t.common.home, href: '/' }, { name: t.common.hotels, href: '/hotels' }], lang),
        itemListSchema(hotels.map((h) => ({ name: h.name, href: '/hotels/' + h.slug })), lang),
        ...(faqs.length ? [faqSchema(faqs)] : []),
      ]} />
      <section className="bg-brand-900 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Breadcrumb lang={lang} items={[{ label: t.common.home, href: '/' }, { label: t.common.hotels }]} />
          <h1 className="text-3xl font-heading font-bold mt-2 mb-2">{t.hotels.h1}</h1>
          <p className="text-brand-200 max-w-2xl mb-3">{t.hotels.intro}</p>
          <Link href={href('/blog/budget-hotels-in-dharamshala')} className="inline-block text-sm font-semibold text-white underline underline-offset-4 hover:text-brand-200 mb-6">{t.hotels.budgetLink} &rarr;</Link>
        </div>
      </section>
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <HotelFilters hotels={hotels.map((h) => localizeHotel(h, lang))} destinations={destinations} />
        </div>
      </section>

      <section className="py-10 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-heading font-bold text-slate-900 mb-2">{t.hotels.areasTitle}</h2>
          <p className="text-slate-600 max-w-3xl mb-6">{t.hotels.areasIntro}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {destinations.map((d: any) => (
              <div key={d.slug} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-heading font-semibold text-lg text-slate-900">{d.name}</h3>
                  {countIn(d.slug) > 0 && <span className="text-xs text-slate-500 shrink-0">{fmt(t.hotels.areaStays, { n: countIn(d.slug) })}</span>}
                </div>
                {d.tagline && <p className="text-sm text-brand-700 font-medium mt-0.5">{d.tagline}</p>}
                <p className="text-sm text-slate-600 mt-2 line-clamp-4">{d.description}</p>
                <Link href={href('/destinations/' + d.slug)} className="inline-block text-sm text-brand-600 font-medium mt-3 hover:underline">
                  {t.hotels.areaGuide}: {d.name} →
                </Link>
              </div>
            ))}
          </div>
          <p className="text-slate-700 mt-6">
            {before}{guideLink('best-hotels-in-dharamshala', t.hotels.guideA)}{middle}{guideLink('best-hotels-in-mcleod-ganj', t.hotels.guideB)}{after}
          </p>
        </div>
      </section>

      {faqs.length > 0 && (
        <section className="py-10">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl font-heading font-bold text-slate-900 mb-4">{t.hotels.faqTitle}</h2>
            <FAQSection faqs={faqs} />
          </div>
        </section>
      )}
    </>
  );
}
