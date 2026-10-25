import Link from 'next/link';
import { BadgeCheck, Luggage, MapPin, Phone, Plus } from 'lucide-react';
import { Breadcrumb, FAQSection } from '@/components/ui/Cards';
import JsonLd from '@/components/seo/JsonLd';
import { generateSEO, faqSchema, breadcrumbSchema, itemListSchema } from '@/lib/seo';
import { publishedServices, VERIFIED_SERVICES } from '@/lib/services/store';

export const revalidate = 3600;

export const metadata = generateSEO({
  title: 'Luggage Storage in Dharamshala & McLeod Ganj (2026)',
  description: 'Where to leave your bags in Dharamshala and McLeod Ganj: local luggage storage from about Rs 80-100 per bag per day, with pick-up and drop. Call or WhatsApp.',
  path: '/luggage-storage', lang: 'en', ogTag: 'Luggage storage',
});

const FAQS = [
  { question: 'Where can I store my luggage in Dharamshala?', answer: 'Makkar Luggage Storage in Kandi, lower Dharamshala, holds all types of luggage for about Rs 80 to 100 per bag per day, with pick-up and drop within 5 km at extra cost. Call Viren Makkar on +91 78330 00062. More local storage services are listed on this page as they join.' },
  { question: 'How much does luggage storage cost in Dharamshala?', answer: 'About Rs 80 to 100 per bag per day at the services listed here (October 2026). Pick-up and drop from your hotel or the bus stand is charged extra. Confirm the rate when you call.' },
  { question: 'Can I leave my bags while trekking Triund?', answer: 'Yes. Leave your main bag at a luggage storage service for the day or overnight and carry only a daypack on the trek. If you booked a guided trek, ask the operator too: many store clients’ bags.' },
  { question: 'Is there a cloakroom at the Dharamshala or McLeod Ganj bus stand?', answer: 'Do not rely on one. Use a luggage storage service listed here, and ask about pick-up from the bus stand.' },
  { question: 'I run a luggage storage service. How do I get listed?', answer: 'Fill in the free form on /luggage-storage/list-your-service with your business name, area, price and phone. Our team checks the details and your listing goes live after approval.' },
];

const wa = (n: string) => `https://wa.me/${n}?text=${encodeURIComponent('Hi, I found you on Dharamshala Stay. I would like to store my luggage.')}`;

export default async function LuggageStoragePage() {
  const services = await publishedServices('luggage_storage');
  return (
    <div>
      <JsonLd data={[
        breadcrumbSchema([{ name: 'Home', href: '/' }, { name: 'Essentials', href: '/essentials' }, { name: 'Luggage storage', href: '/luggage-storage' }]),
        itemListSchema(services.map((s) => ({ name: s.name, href: '/luggage-storage/' + s.slug }))),
        faqSchema(FAQS),
      ]} />
      <section className="bg-brand-900 text-white">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Essentials', href: '/essentials' }, { label: 'Luggage storage' }]} />
          <h1 className="mt-2 font-heading text-3xl font-bold sm:text-4xl">Luggage Storage in Dharamshala &amp; McLeod Ganj</h1>
          <p className="mt-3 max-w-3xl text-lg text-brand-100"><strong className="text-white">Short answer:</strong> leave your bags for a few hours or a few days at a local luggage storage service, from about <strong className="text-white">Rs 80 to 100 per bag per day</strong>, with pick-up and drop available nearby at extra cost. Call or WhatsApp the service directly below.</p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h2 className="font-heading text-2xl font-bold text-slate-900">Luggage storage services</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {services.map((s) => (
            <article key={s.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="rounded-xl bg-orange-50 p-2.5 text-orange-600"><Luggage className="h-6 w-6" /></span>
                <div>
                  <h3 className="font-heading text-lg font-bold text-slate-900"><Link href={'/luggage-storage/' + s.slug} className="hover:underline">{s.name}</Link></h3>
                  <p className="flex items-center gap-1 text-sm text-slate-500"><MapPin className="h-4 w-4" />{s.area}</p>
                  {VERIFIED_SERVICES.has(s.slug) && <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700"><BadgeCheck className="h-3.5 w-3.5" />Verified by Dharamshala Stay</p>}
                </div>
              </div>
              {s.price_text && <p className="mt-3 font-semibold text-slate-900">{s.price_text}</p>}
              <ul className="mt-2 space-y-1 text-sm text-slate-600">{s.features.slice(0, 4).map((f) => <li key={f}>• {f}</li>)}</ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href={'tel:+' + s.phone} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white"><Phone className="h-4 w-4" />Call{s.owner_name ? ' ' + s.owner_name.split(' ')[0] : ''}</a>
                <a href={wa(s.whatsapp || s.phone)} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white">WhatsApp</a>
                <Link href={'/luggage-storage/' + s.slug} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Details</Link>
              </div>
            </article>
          ))}
          <Link href="/luggage-storage/list-your-service" className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-5 text-center text-slate-600 hover:border-brand-500 hover:text-brand-700">
            <Plus className="h-8 w-8" />
            <span className="mt-2 font-semibold">Run a luggage storage service?</span>
            <span className="text-sm">List it here for free</span>
          </Link>
        </div>

        <h2 className="mt-12 font-heading text-2xl font-bold text-slate-900">Quick facts</h2>
        <table className="mt-4 w-full overflow-hidden rounded-xl bg-white text-sm ring-1 ring-slate-200">
          <tbody className="divide-y divide-slate-100">
            {[
              ['Typical price', 'About Rs 80 to 100 per bag per day (October 2026)'],
              ['Pick-up and drop', 'Available within about 5 km, charged extra'],
              ['What is accepted', 'All types of luggage at the listed service; keep passport, cash and electronics with you'],
              ['Good for', 'Triund and other treks, late check-out before a night bus, day trips'],
            ].map(([k, v]) => <tr key={k}><th scope="row" className="w-40 p-3 text-left align-top font-semibold text-slate-800">{k}</th><td className="p-3 text-slate-700">{v}</td></tr>)}
          </tbody>
        </table>
        <p className="mt-6 text-sm text-slate-600">More practical tips: <Link href="/blog/laundry-luggage-storage-water-dharamshala" className="text-brand-600 underline">laundry, luggage and drinking water in Dharamshala</Link>, <Link href="/essentials" className="text-brand-600 underline">travel essentials</Link>, <Link href="/blog/triund-trek-complete-guide" className="text-brand-600 underline">Triund trek guide</Link> and <Link href="/taxi" className="text-brand-600 underline">taxis</Link>.</p>
      </div>

      <section className="bg-slate-50 py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="mb-6 text-center font-heading text-2xl font-bold text-slate-900">Luggage storage questions</h2>
          <FAQSection faqs={FAQS} />
        </div>
      </section>
    </div>
  );
}
