import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Car, Clock, Route, Users, CheckCircle, XCircle, MessageCircle } from 'lucide-react';
import { Breadcrumb, FAQSection } from '@/components/ui/Cards';
import TaxiSearch from '@/components/sections/TaxiSearch';
import InquiryForm from '@/components/forms/InquiryForm';
import MarkdownContent from '@/components/blog/MarkdownContent';
import JsonLd from '@/components/seo/JsonLd';
import { getActiveTaxiRoutes } from '@/lib/db';
import { getTaxiRouteGroup, getTaxiRouteGroups, getRouteNotes } from '@/lib/taxi';
import { generateSEO, breadcrumbSchema, faqSchema } from '@/lib/seo';
import { formatPrice, getWhatsAppLink } from '@/lib/utils';
import { placeImage } from '@/lib/place-images';
import { siteConfig } from '@/lib/config';
import { UNSPLASH_IMAGES } from '@/types';
import { serverT } from '@/lib/i18n/server';
import { fmt } from '@/lib/i18n/dict';
import type { Lang } from '@/lib/i18n/core';
import { localizeUnits } from '@/lib/i18n/units';

export function taxiMetadata(lang: Lang): Metadata {
  const x = serverT(lang).t.taxi;
  return generateSEO({ title: x.metaTitle, description: x.metaDescription, path: '/taxi', lang });
}

export async function TaxiListView({ lang }: { lang: Lang }) {
  const { t, href } = serverT(lang);
  const x = t.taxi;
  const place = (p: string) => t.taxiPlaces[p] || p;
  const [taxiRoutes, routeGroups] = await Promise.all([getActiveTaxiRoutes(), getTaxiRouteGroups()]);

  return (
    <>
      <section className="relative h-[280px]">
        <Image src={UNSPLASH_IMAGES.taxi} alt={x.heroAlt} fill className="object-cover" priority sizes="100vw" />
        <div className="absolute inset-0 bg-brand-950/70" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 h-full flex flex-col justify-end pb-8 text-white">
          <Breadcrumb lang={lang} items={[{ label: t.common.home, href: '/' }, { label: t.common.taxi }]} />
          <h1 className="text-3xl font-heading font-bold mt-2">{x.h1}</h1>
          <p className="text-brand-200 max-w-2xl">{x.intro}</p>
        </div>
      </section>
      <TaxiSearch taxiRoutes={taxiRoutes} />
      {routeGroups.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <h2 className="text-2xl font-heading font-bold text-slate-900 mb-4">{x.popular}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {routeGroups.map((g) => (
              <Link key={g.slug} href={href('/taxi/' + g.slug)} className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 hover:shadow-md">
                <span className="font-medium text-slate-800">{place(g.from)} → {place(g.to)}</span>
                <span className="text-sm font-semibold text-brand-700">{fmt(x.from_price, { price: formatPrice(g.minPrice) })}</span>
              </Link>
            ))}
          </div>
          <p className="text-sm text-slate-600 mt-6">
            {x.arriving}{' '}<Link href={href('/blog/how-to-reach-dharamshala')} className="text-brand-600 underline">{t.footer.guides['how-to-reach-dharamshala']}</Link>
          </p>
        </section>
      )}
    </>
  );
}

export async function taxiRouteMetadata(slug: string, lang: Lang): Promise<Metadata> {
  const g = await getTaxiRouteGroup(slug);
  if (!g) return {};
  const { t } = serverT(lang);
  const x = t.taxi;
  const from = t.taxiPlaces[g.from] || g.from;
  const to = t.taxiPlaces[g.to] || g.to;
  const price = g.minPrice.toLocaleString('en-IN');
  return generateSEO({
    title: fmt(x.routeMetaTitle, { from, to, price }),
    description: fmt(x.routeMetaDescription, { from, to, price, km: g.distanceKm || '', duration: g.duration || '' }).slice(0, 158),
    path: '/taxi/' + g.slug,
    image: placeImage('mountain-road'),
    lang,
    keywords: [g.from + ' to ' + g.to + ' taxi', g.from + ' to ' + g.to + ' taxi fare', g.to + ' taxi', 'dharamshala taxi'],
  });
}

export async function TaxiRouteView({ slug, lang }: { slug: string; lang: Lang }) {
  const g = await getTaxiRouteGroup(slug);
  if (!g) notFound();
  const { t, href } = serverT(lang);
  const x = t.taxi;
  const place = (p: string) => t.taxiPlaces[p] || p;
  const from = place(g.from);
  const to = place(g.to);

  const others = (await getTaxiRouteGroups()).filter((o) => o.slug !== g.slug);
  g.duration = localizeUnits(g.duration, lang);
  const notes = getRouteNotes(g.from, g.to, lang);
  const cheapest = g.vehicles[0];
  const includes = Array.from(new Set(g.vehicles.flatMap((v) => v.includes)));
  const excludes = Array.from(new Set(g.vehicles.flatMap((v) => v.excludes)));
  const vars = { from, to, price: formatPrice(g.minPrice), vehicle: cheapest.name, n: cheapest.maxPassengers, km: g.distanceKm || '', duration: g.duration || '' };

  const faqs = [
    { question: fmt(x.faqFareQ, vars), answer: fmt(x.faqFareA, vars) + (excludes.length ? ' ' + fmt(x.faqNotIncluded, { list: excludes.map((e) => t.amenities[e] || e).join(', ') }) : '') },
    ...(g.distanceKm || g.duration ? [{ question: fmt(x.faqTimeQ, vars), answer: fmt(x.faqTimeA, vars) }] : []),
    { question: x.faqBookQ, answer: x.faqBookA },
    { question: x.faqStopQ, answer: x.faqStopA },
  ];

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([{ name: t.common.home, href: '/' }, { name: t.common.taxi, href: '/taxi' }, { name: from + ' → ' + to, href: '/taxi/' + g.slug }], lang),
        {
          '@context': 'https://schema.org',
          '@type': 'TaxiService',
          name: g.from + ' to ' + g.to + ' Taxi',
          provider: { '@type': 'TravelAgency', name: siteConfig.name, url: siteConfig.url, telephone: siteConfig.phone },
          areaServed: [g.from, g.to],
          url: siteConfig.url + href('/taxi/' + g.slug),
          offers: g.vehicles.map((v) => ({ '@type': 'Offer', name: v.name, price: v.price, priceCurrency: 'INR' })),
        },
        faqSchema(faqs),
      ]} />

      <section className="relative h-[260px]">
        <Image src={placeImage('mountain-road')} alt={x.heroAlt} fill className="object-cover" priority sizes="100vw" />
        <div className="absolute inset-0 bg-brand-950/70" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 h-full flex flex-col justify-end pb-8 text-white">
          <Breadcrumb lang={lang} items={[{ label: t.common.home, href: '/' }, { label: t.common.taxi, href: '/taxi' }, { label: from + ' → ' + to }]} />
          <h1 className="text-3xl font-heading font-bold">{fmt(x.routeH1, { from, to })}</h1>
          <p className="text-brand-100 mt-1">{x.fixedFrom} <strong className="text-white">{formatPrice(g.minPrice)}</strong>
            {g.distanceKm ? ' · ' + g.distanceKm + ' km' : ''}{g.duration ? ' · ' + g.duration : ''}</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Route, label: x.distance, value: g.distanceKm ? g.distanceKm + ' km' : x.onRequest },
              { icon: Clock, label: x.driveTime, value: g.duration || x.varies },
              { icon: Car, label: x.fareFrom, value: formatPrice(g.minPrice) },
            ].map((s) => (
              <div key={s.label} className="bg-slate-50 rounded-xl p-4">
                <s.icon className="h-5 w-5 text-brand-600 mb-1" />
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className="font-semibold text-slate-900">{s.value}</p>
              </div>
            ))}
          </div>

          <section>
            <h2 className="text-xl font-heading font-bold text-slate-900 mb-3">{x.faresByVehicle}</h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50"><tr><th className="px-4 py-3">{x.vehicle}</th><th className="px-4 py-3">{x.seats}</th><th className="px-4 py-3">{x.fare}</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {g.vehicles.map((v) => (
                    <tr key={v.name + v.price}>
                      <td className="px-4 py-3 font-medium text-slate-800">{v.name} <span className="text-slate-400">({t.vehicles[v.category] || v.category})</span></td>
                      <td className="px-4 py-3"><span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{v.maxPassengers}</span></td>
                      <td className="px-4 py-3 font-semibold">{formatPrice(v.price)}{v.priceType === 'per_km' ? ' / km' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {notes.length > 0 && (
            <section>
              <h2 className="text-xl font-heading font-bold text-slate-900 mb-3">{x.aboutRoute}</h2>
              <MarkdownContent content={notes.join('\n\n')} lang={lang} />
            </section>
          )}

          {(includes.length > 0 || excludes.length > 0) && (
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {includes.length > 0 && (
                <div><h2 className="font-heading font-semibold mb-2">{x.included}</h2>
                  <ul className="space-y-1.5 text-sm text-slate-700">{includes.map((i) => <li key={i} className="flex gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />{t.amenities[i] || i}</li>)}</ul></div>
              )}
              {excludes.length > 0 && (
                <div><h2 className="font-heading font-semibold mb-2">{x.notIncluded}</h2>
                  <ul className="space-y-1.5 text-sm text-slate-700">{excludes.map((i) => <li key={i} className="flex gap-2"><XCircle className="h-4 w-4 text-slate-400 mt-0.5" />{t.amenities[i] || i}</li>)}</ul></div>
              )}
            </section>
          )}

          <section>
            <h2 className="text-xl font-heading font-bold text-slate-900 mb-3">{t.common.faqs}</h2>
            <FAQSection faqs={faqs} />
          </section>

          {others.length > 0 && (
            <section>
              <h2 className="text-xl font-heading font-bold text-slate-900 mb-3">{x.otherRoutes}</h2>
              <div className="flex flex-wrap gap-2">
                {others.map((o) => (
                  <Link key={o.slug} href={href('/taxi/' + o.slug)} className="text-sm px-3 py-2 bg-slate-100 rounded-full hover:bg-brand-50">
                    {place(o.from)} → {place(o.to)} · {formatPrice(o.minPrice)}
                  </Link>
                ))}
              </div>
            </section>
          )}
          <p className="text-sm text-slate-600">
            {x.planning}{' '}<Link href={href('/blog/how-to-reach-dharamshala')} className="text-brand-600 underline">{t.footer.guides['how-to-reach-dharamshala']}</Link>
            {' · '}<Link href={href('/hotels')} className="text-brand-600 underline">{t.footer.whereToStay}</Link>
          </p>
        </div>

        <aside className="lg:sticky lg:top-24 self-start space-y-4">
          <InquiryForm type="taxi" contextNote={'Taxi: ' + g.from + ' to ' + g.to} title={x.bookThis} subtitle={x.bookThisSub} />
          <a href={getWhatsAppLink(fmt(x.whatsappRoute, { from: g.from, to: g.to }))} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-green-700 text-white py-3 rounded-xl font-semibold hover:bg-green-800">
            <MessageCircle className="h-4 w-4" /> {t.common.bookWhatsApp}
          </a>
        </aside>
      </div>
    </>
  );
}
