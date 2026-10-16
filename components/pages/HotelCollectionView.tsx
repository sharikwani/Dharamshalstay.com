import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Breadcrumb, FAQSection, HotelCard } from '@/components/ui/Cards';
import JsonLd from '@/components/seo/JsonLd';
import { getPublishedProperties } from '@/lib/db';
import { getCollection, walkMinutes, AREA_ORDER, COLLECTIONS } from '@/lib/hotels/collections';
import { areaName } from '@/lib/listing';
import { breadcrumbSchema, faqSchema, generateSEO, itemListSchema } from '@/lib/seo';
import { placeImage } from '@/lib/place-images';
import { getDict } from '@/lib/i18n/dict';

const BAND: Record<string, string> = { budget: '₹ Budget', 'mid-range': '₹₹ Mid-range', upscale: '₹₹₹ Upscale' };

export function hotelCollectionMetadata(slug: string): Metadata {
  const c = getCollection(slug);
  if (!c) return {};
  return generateSEO({ title: c.metaTitle, description: c.metaDescription, path: '/hotels/' + c.slug, image: placeImage('mcleod-ganj'), hindi: false });
}

/** A landing page for one kind of stay, built from the listings we hold (English only). */
export default async function HotelCollectionView({ slug }: { slug: string }) {
  const c = getCollection(slug);
  if (!c) notFound();
  const t = getDict('en').common;
  const rows = c.pick(await getPublishedProperties());
  const areas = Array.from(new Set(rows.map((r) => r.hotel.destination_slug as string))).sort((a, b) => AREA_ORDER.indexOf(a) - AREA_ORDER.indexOf(b));
  // The temple page reads best nearest-first; the others group by area.
  const byArea = c.slug !== 'near-dalai-lama-temple';
  const others = COLLECTIONS.filter((x) => x.slug !== c.slug);

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([{ name: t.home, href: '/' }, { name: t.hotels, href: '/hotels' }, { name: c.title, href: '/hotels/' + c.slug }]),
        itemListSchema(rows.map((r) => ({ name: r.hotel.name, href: '/hotels/' + r.hotel.slug }))),
        faqSchema(c.faqs),
      ]} />
      <section className="relative text-white overflow-hidden">
        <Image src={placeImage('mcleod-ganj')} alt="" fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-950/90 via-brand-900/75 to-brand-900/40" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-12">
          <div className="[&_*]:!text-brand-100 [&_a:hover]:!text-white"><Breadcrumb items={[{ label: t.home, href: '/' }, { label: t.hotels, href: '/hotels' }, { label: c.title }]} /></div>
          <h1 className="text-3xl sm:text-4xl font-heading font-bold mt-2 mb-2">{c.h1}</h1>
          <p className="text-brand-100 max-w-2xl">{c.lede} <b className="text-white">{rows.length} {rows.length === 1 ? 'stay' : 'stays'}.</b></p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="max-w-3xl space-y-4 text-slate-700 leading-relaxed mb-8">
          {c.intro.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}
        </div>

        <h2 className="text-2xl font-heading font-bold text-slate-900 mb-4">At a glance</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 mb-3">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th scope="col" className="px-3 py-2.5 font-semibold">Stay</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Area</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Type</th>
                {c.distanceLabel && <th scope="col" className="px-3 py-2.5 font-semibold whitespace-nowrap">{c.distanceLabel}</th>}
                <th scope="col" className="px-3 py-2.5 font-semibold">Price level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ hotel: h, km }) => (
                <tr key={h.id}>
                  <th scope="row" className="px-3 py-2.5 font-medium"><Link href={'/hotels/' + h.slug} className="text-brand-600 hover:underline">{h.name}</Link></th>
                  <td className="px-3 py-2.5 whitespace-nowrap">{areaName(h.destination_slug)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{t.propertyTypes[h.type] || h.type}</td>
                  {c.distanceLabel && (
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {km === null ? '—' : c.slug === 'near-dalai-lama-temple' ? `about ${walkMinutes(km)} min (${km.toFixed(1)} km)` : `${km.toFixed(1)} km`}
                    </td>
                  )}
                  <td className="px-3 py-2.5 whitespace-nowrap">{h.price_min > 0 && h.listing_type !== 'directory' ? 'From ₹' + Number(h.price_min).toLocaleString('en-IN') : BAND[h.price_band] || 'On request'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 mb-10">
          {c.distanceLabel ? "Distances are straight-line from each stay's map pin; hill lanes are longer, and walking times are rough. " : ''}
          Price levels are a guide; ask for your dates.
        </p>

        {byArea ? areas.map((a) => {
          const list = rows.filter((r) => r.hotel.destination_slug === a);
          return (
            <section key={a} className="mb-10">
              <div className="flex items-baseline justify-between gap-3 mb-4">
                <h2 className="text-2xl font-heading font-bold text-slate-900">{areaName(a)} <span className="text-base font-normal text-slate-500">({list.length})</span></h2>
                <Link href={'/destinations/' + a} className="text-sm text-brand-600 font-medium hover:underline shrink-0">All stays in {areaName(a)} →</Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {list.map((r) => <HotelCard key={r.hotel.id} hotel={r.hotel} />)}
              </div>
            </section>
          );
        }) : (
          <section className="mb-10">
            <h2 className="text-2xl font-heading font-bold text-slate-900 mb-4">The stays, nearest first</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {rows.map((r) => <HotelCard key={r.hotel.id} hotel={r.hotel} />)}
            </div>
          </section>
        )}

        <section className="max-w-3xl mb-10 bg-amber-50 border border-amber-100 rounded-2xl p-6">
          <h2 className="text-xl font-heading font-bold text-slate-900 mb-3">{c.notesTitle}</h2>
          <ul className="list-disc pl-5 space-y-2 text-slate-700">{c.notes.map((n) => <li key={n.slice(0, 24)}>{n}</li>)}</ul>
        </section>

        <section className="max-w-3xl mb-10">
          <h2 className="text-2xl font-heading font-bold text-slate-900 mb-4">Questions people ask</h2>
          <FAQSection faqs={c.faqs} />
        </section>

        <section className="grid sm:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-heading font-bold text-slate-900 mb-3">Useful guides</h2>
            <ul className="space-y-2">{c.links.map((l) => <li key={l.href}><Link href={l.href} className="text-brand-600 hover:underline">{l.label}</Link></li>)}</ul>
          </div>
          <div>
            <h2 className="text-lg font-heading font-bold text-slate-900 mb-3">More ways to find a stay</h2>
            <ul className="space-y-2">
              {others.map((o) => <li key={o.slug}><Link href={'/hotels/' + o.slug} className="text-brand-600 hover:underline">{o.title}</Link></li>)}
              <li><Link href="/hotels" className="text-brand-600 hover:underline">All stays, with map and filters</Link></li>
            </ul>
          </div>
        </section>
      </div>
    </>
  );
}
