import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BadgeCheck, Check, Clock, Luggage, MapPin, Phone } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/Cards';
import JsonLd from '@/components/seo/JsonLd';
import { generateSEO, breadcrumbSchema } from '@/lib/seo';
import { siteConfig } from '@/lib/config';
import { serviceBySlug, VERIFIED_SERVICES } from '@/lib/services/store';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const s = await serviceBySlug(params.slug);
  if (!s) return {};
  const meta = generateSEO({
    // Google cuts titles near 60 characters: long names are cut at ' and ' (e.g. '... and Luggage Holding Services').
    title: `${s.name.length > 30 ? s.name.split(' and ')[0] : s.name}, ${s.area}`.slice(0, 60),
    description: `${s.name}, ${s.area}: ${s.price_text || 'luggage storage'}. ${s.features.slice(0, 2).join('. ')}. Call or WhatsApp.`.slice(0, 155),
    path: '/luggage-storage/' + s.slug, lang: 'en', ogTag: 'Luggage storage',
  });
  // The link preview (WhatsApp, Facebook) shows the business's own share card.
  const card = { url: `${siteConfig.url.replace(/\/$/, '')}/luggage-storage/card/${s.slug}`, width: 1080, height: 1350, alt: s.name };
  return { ...meta, openGraph: { ...(meta.openGraph || {}), images: [card] }, twitter: { ...(meta.twitter || {}), images: [card.url] } };
}

export default async function ServiceProfilePage({ params }: { params: { slug: string } }) {
  const s = await serviceBySlug(params.slug);
  if (!s) notFound();
  const wa = `https://wa.me/${s.whatsapp || s.phone}?text=${encodeURIComponent('Hi, I found you on Dharamshala Stay. I would like to store my luggage.')}`;
  const display = '+' + s.phone.replace(/^91(\d{5})(\d{5})$/, '91 $1 $2');
  return (
    <div>
      <JsonLd data={[
        breadcrumbSchema([{ name: 'Home', href: '/' }, { name: 'Luggage storage', href: '/luggage-storage' }, { name: s.name, href: '/luggage-storage/' + s.slug }]),
        {
          '@context': 'https://schema.org', '@type': 'LocalBusiness', name: s.name, url: siteConfig.url + '/luggage-storage/' + s.slug,
          telephone: '+' + s.phone, description: s.description || undefined, priceRange: s.price_text || undefined,
          address: { '@type': 'PostalAddress', streetAddress: s.address || undefined, addressLocality: s.area, addressRegion: 'Himachal Pradesh', addressCountry: 'IN' },
          ...(s.maps_url ? { hasMap: s.maps_url } : {}),
          ...(s.owner_name ? { founder: { '@type': 'Person', name: s.owner_name } } : {}),
        },
      ]} />
      <section className="bg-brand-900 text-white">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Luggage storage', href: '/luggage-storage' }, { label: s.name }]} />
          <div className="mt-2 flex items-start gap-3">
            <span className="rounded-xl bg-white/10 p-3"><Luggage className="h-7 w-7 text-orange-300" /></span>
            <div>
              <h1 className="font-heading text-3xl font-bold">{s.name}</h1>
              <p className="mt-1 flex items-center gap-1 text-brand-100"><MapPin className="h-4 w-4" />{s.area}{s.address ? ', ' + s.address : ''}</p>
              {VERIFIED_SERVICES.has(s.slug) && <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-500/20 px-3 py-1 text-sm font-semibold text-green-100"><BadgeCheck className="h-4 w-4" />Verified by Dharamshala Stay</p>}
            </div>
          </div>
          {s.price_text && <p className="mt-4 text-xl font-semibold">{s.price_text}</p>}
          <div className="mt-5 flex flex-wrap gap-3">
            <a href={'tel:+' + s.phone} className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-brand-900"><Phone className="h-5 w-5" />Call {display}</a>
            <a href={wa} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white">WhatsApp</a>
            {s.maps_url && <a href={s.maps_url} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-white/40 px-5 py-3 font-semibold">Directions</a>}
            <a href={`/luggage-storage/card/${s.slug}`} download={`${s.slug}-card.jpg`} className="rounded-xl border border-white/40 px-5 py-3 font-semibold">Download share card</a>
            <a href={`https://wa.me/?text=${encodeURIComponent(`${s.name}, ${s.area}: ${s.price_text || 'luggage storage'}. Verified by Dharamshala Stay. See details and contact: ${siteConfig.url.replace(/\/$/, '')}/luggage-storage/${s.slug}`)}`} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-white/40 px-5 py-3 font-semibold">Share on WhatsApp</a>
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        {s.description && <p className="text-lg text-slate-700">{s.description}</p>}
        {s.features.length > 0 && (
          <>
            <h2 className="mt-8 font-heading text-xl font-bold text-slate-900">Services</h2>
            <ul className="mt-3 space-y-2">{s.features.map((f) => <li key={f} className="flex gap-2 text-slate-700"><Check className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />{f}</li>)}</ul>
          </>
        )}
        <h2 className="mt-8 font-heading text-xl font-bold text-slate-900">Details</h2>
        <table className="mt-3 w-full overflow-hidden rounded-xl bg-white text-sm ring-1 ring-slate-200">
          <tbody className="divide-y divide-slate-100">
            {[
              ['Area', s.area],
              ['Price', s.price_text || 'Ask when you call'],
              ['Hours', s.hours || 'Call to confirm'],
              ['Run by', s.owner_name || '—'],
              ['Phone', display],
            ].map(([k, v]) => <tr key={k}><th scope="row" className="w-32 p-3 text-left font-semibold text-slate-800">{k}</th><td className="p-3 text-slate-700">{v}</td></tr>)}
          </tbody>
        </table>
        <p className="mt-6 flex gap-2 text-sm text-slate-500"><Clock className="h-4 w-4 shrink-0 mt-0.5" />{VERIFIED_SERVICES.has(s.slug) ? 'Business verified by the Dharamshala Stay team.' : 'Details provided by the business.'} Confirm the rate and timings when you call, and keep your passport, cash and electronics with you.</p>
        <p className="mt-6 text-sm text-slate-600">See all <Link href="/luggage-storage" className="text-brand-600 underline">luggage storage in Dharamshala</Link>, or plan your <Link href="/blog/triund-trek-complete-guide" className="text-brand-600 underline">Triund trek</Link> and <Link href="/taxi" className="text-brand-600 underline">taxi</Link>.</p>
      </div>
    </div>
  );
}
