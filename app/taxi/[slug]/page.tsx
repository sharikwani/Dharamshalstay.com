import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Car, Clock, Route, Users, CheckCircle, XCircle, MessageCircle } from 'lucide-react';
import { Breadcrumb, FAQSection } from '@/components/ui/Cards';
import InquiryForm from '@/components/forms/InquiryForm';
import MarkdownContent from '@/components/blog/MarkdownContent';
import JsonLd from '@/components/seo/JsonLd';
import { getTaxiRouteGroup, getTaxiRouteGroups, getRouteNotes } from '@/lib/taxi';
import { generateSEO, breadcrumbSchema, faqSchema } from '@/lib/seo';
import { formatPrice, getWhatsAppLink } from '@/lib/utils';
import { placeImage } from '@/lib/place-images';
import { siteConfig } from '@/lib/config';

export const revalidate = 3600;
export const dynamicParams = true;

interface Props { params: { slug: string } }

export async function generateStaticParams() {
  return (await getTaxiRouteGroups()).map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = await getTaxiRouteGroup(params.slug);
  if (!g) return {};
  return generateSEO({
    title: g.from + ' to ' + g.to + ' Taxi - Fare from Rs.' + g.minPrice.toLocaleString('en-IN'),
    description: ('Book a ' + g.from + ' to ' + g.to + ' taxi from Rs.' + g.minPrice.toLocaleString('en-IN') + ' (fixed fare). '
      + (g.distanceKm ? 'About ' + g.distanceKm + ' km' : '') + (g.duration ? ', ' + g.duration + '. ' : '. ')
      + 'Local drivers, flight tracking and WhatsApp support.').slice(0, 158),
    path: '/taxi/' + g.slug,
    image: placeImage('mountain-road'),
    keywords: [g.from + ' to ' + g.to + ' taxi', g.from + ' to ' + g.to + ' taxi fare', g.to + ' taxi', 'dharamshala taxi'],
  });
}

export default async function TaxiRoutePage({ params }: Props) {
  const g = await getTaxiRouteGroup(params.slug);
  if (!g) notFound();

  const others = (await getTaxiRouteGroups()).filter((o) => o.slug !== g.slug);
  const notes = getRouteNotes(g.from, g.to);
  const cheapest = g.vehicles[0];
  const includes = Array.from(new Set(g.vehicles.flatMap((v) => v.includes)));
  const excludes = Array.from(new Set(g.vehicles.flatMap((v) => v.excludes)));

  const faqs = [
    { question: 'How much is a taxi from ' + g.from + ' to ' + g.to + '?', answer: 'Our fixed fare starts at ' + formatPrice(g.minPrice) + ' for a ' + cheapest.name + ' (up to ' + cheapest.maxPassengers + ' passengers).' + (excludes.length ? ' Not included: ' + excludes.join(', ').toLowerCase() + '.' : '') + ' The price is confirmed when you book.' },
    ...(g.distanceKm || g.duration ? [{ question: 'How long does the drive from ' + g.from + ' to ' + g.to + ' take?', answer: (g.distanceKm ? 'The distance is about ' + g.distanceKm + ' km' : 'The drive') + (g.duration ? ' and usually takes ' + g.duration.toLowerCase() : '') + ', depending on traffic, weather and stops.' }] : []),
    { question: 'How do I book this taxi?', answer: 'Send the enquiry form on this page or message us on WhatsApp with your date, pickup time, number of passengers and pickup point. We confirm the car and driver details before your trip.' },
    { question: 'Can I stop on the way?', answer: 'Short stops for food, photos or a viewpoint are fine. For longer detours or sightseeing stops, tell us when booking so we can quote correctly.' },
  ];

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([{ name: 'Home', href: '/' }, { name: 'Taxi', href: '/taxi' }, { name: g.from + ' to ' + g.to, href: '/taxi/' + g.slug }]),
        {
          '@context': 'https://schema.org',
          '@type': 'TaxiService',
          name: g.from + ' to ' + g.to + ' Taxi',
          provider: { '@type': 'TravelAgency', name: siteConfig.name, url: siteConfig.url, telephone: siteConfig.phone },
          areaServed: [g.from, g.to],
          url: siteConfig.url + '/taxi/' + g.slug,
          offers: g.vehicles.map((v) => ({ '@type': 'Offer', name: v.name, price: v.price, priceCurrency: 'INR' })),
        },
        faqSchema(faqs),
      ]} />

      <section className="relative h-[260px]">
        <Image src={placeImage('mountain-road')} alt="Hill road in Kangra district near Dharamshala" fill className="object-cover" priority sizes="100vw" />
        <div className="absolute inset-0 bg-brand-950/70" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 h-full flex flex-col justify-end pb-8 text-white">
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Taxi', href: '/taxi' }, { label: g.from + ' to ' + g.to }]} />
          <h1 className="text-3xl font-heading font-bold">{g.from} to {g.to} Taxi</h1>
          <p className="text-blue-100 mt-1">Fixed fare from <strong className="text-white">{formatPrice(g.minPrice)}</strong>
            {g.distanceKm ? ' · ' + g.distanceKm + ' km' : ''}{g.duration ? ' · ' + g.duration : ''}</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Route, label: 'Distance', value: g.distanceKm ? g.distanceKm + ' km' : 'On request' },
              { icon: Clock, label: 'Drive time', value: g.duration || 'Varies' },
              { icon: Car, label: 'Fare from', value: formatPrice(g.minPrice) },
            ].map((s) => (
              <div key={s.label} className="bg-slate-50 rounded-xl p-4">
                <s.icon className="h-5 w-5 text-brand-600 mb-1" />
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className="font-semibold text-slate-900">{s.value}</p>
              </div>
            ))}
          </div>

          <section>
            <h2 className="text-xl font-heading font-bold text-slate-900 mb-3">Fares by vehicle</h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50"><tr><th className="px-4 py-3">Vehicle</th><th className="px-4 py-3">Seats</th><th className="px-4 py-3">Fare</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {g.vehicles.map((v) => (
                    <tr key={v.name + v.price}>
                      <td className="px-4 py-3 font-medium text-slate-800">{v.name} <span className="text-slate-400 capitalize">({v.category})</span></td>
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
              <h2 className="text-xl font-heading font-bold text-slate-900 mb-3">About this route</h2>
              <MarkdownContent content={notes.join('\n\n')} />
            </section>
          )}

          {(includes.length > 0 || excludes.length > 0) && (
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {includes.length > 0 && (
                <div><h2 className="font-heading font-semibold mb-2">Included</h2>
                  <ul className="space-y-1.5 text-sm text-slate-700">{includes.map((i) => <li key={i} className="flex gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />{i}</li>)}</ul></div>
              )}
              {excludes.length > 0 && (
                <div><h2 className="font-heading font-semibold mb-2">Not included</h2>
                  <ul className="space-y-1.5 text-sm text-slate-700">{excludes.map((i) => <li key={i} className="flex gap-2"><XCircle className="h-4 w-4 text-slate-400 mt-0.5" />{i}</li>)}</ul></div>
              )}
            </section>
          )}

          <section>
            <h2 className="text-xl font-heading font-bold text-slate-900 mb-3">Frequently asked questions</h2>
            <FAQSection faqs={faqs} />
          </section>

          {others.length > 0 && (
            <section>
              <h2 className="text-xl font-heading font-bold text-slate-900 mb-3">Other taxi routes</h2>
              <div className="flex flex-wrap gap-2">
                {others.map((o) => (
                  <Link key={o.slug} href={'/taxi/' + o.slug} className="text-sm px-3 py-2 bg-slate-100 rounded-full hover:bg-blue-50">
                    {o.from} → {o.to} · {formatPrice(o.minPrice)}
                  </Link>
                ))}
              </div>
            </section>
          )}
          <p className="text-sm text-slate-600">
            Planning the whole trip? See <Link href="/blog/how-to-reach-dharamshala" className="text-brand-600 underline">how to reach Dharamshala</Link> and
            {' '}<Link href="/hotels" className="text-brand-600 underline">where to stay</Link>.
          </p>
        </div>

        <aside className="lg:sticky lg:top-24 self-start space-y-4">
          <InquiryForm type="taxi" contextNote={'Taxi: ' + g.from + ' to ' + g.to} title="Book this taxi" subtitle="Share your date and pickup time -- we confirm quickly." />
          <a href={getWhatsAppLink('Hi! I want to book a taxi from ' + g.from + ' to ' + g.to + '.')} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-green-500 text-white py-3 rounded-xl font-semibold hover:bg-green-600">
            <MessageCircle className="h-4 w-4" /> Book on WhatsApp
          </a>
        </aside>
      </div>
    </>
  );
}
