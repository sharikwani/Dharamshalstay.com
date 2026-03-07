import { Metadata } from 'next';
import Link from 'next/link';
import { HotelCard, Breadcrumb } from '@/components/ui/Cards';
import { hotels } from '@/data/hotels';
import { destinations } from '@/data/destinations';
import { generateSEO } from '@/lib/seo';

export const metadata: Metadata = generateSEO({ title: 'Hotels in Dharamshala & McLeod Ganj – Best Stays', description: 'Browse curated hotels, homestays, hostels in Dharamshala, McLeod Ganj, Bhagsu, Dharamkot & Naddi.', path: '/hotels' });

export default function HotelsPage() {
  return (
    <>
      <section className="bg-brand-900 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Hotels' }]} />
          <h1 className="text-3xl font-heading font-bold mt-2 mb-2">Hotels & Stays in Dharamshala</h1>
          <p className="text-blue-200 max-w-2xl">From luxury resorts with valley views to budget hostels near the Triund trail. Every property personally vetted by our team.</p>
        </div>
      </section>
      <section className="border-b border-slate-200 bg-white sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-2 py-3 overflow-x-auto scrollbar-hide">
          <Link href="/hotels" className="shrink-0 px-4 py-2 text-sm font-semibold bg-brand-600 text-white rounded-full">All</Link>
          {destinations.map(d => <Link key={d.slug} href={`/destinations/${d.slug}`} className="shrink-0 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-blue-50 rounded-full">{d.name}</Link>)}
        </div>
      </section>
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <p className="text-sm text-slate-500 mb-6">{hotels.length} properties</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{hotels.map(h => <HotelCard key={h.id} hotel={h} />)}</div>
        </div>
      </section>
    </>
  );
}
