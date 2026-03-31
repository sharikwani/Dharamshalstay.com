import { Metadata } from 'next';
import { Breadcrumb } from '@/components/ui/Cards';
import HotelFilters from '@/components/hotels/HotelFilters';
import { getPublishedProperties, getDestinations } from '@/lib/db';
import { generateSEO } from '@/lib/seo';

export const revalidate = 60;

export const metadata: Metadata = generateSEO({
  title: 'Hotels in Dharamshala & McLeod Ganj - Best Stays',
  description: 'Browse curated hotels, homestays, hostels in Dharamshala, McLeod Ganj, Bhagsu, Dharamkot & Naddi. Rs.500 less than MakeMyTrip.',
  path: '/hotels',
  keywords: ['dharamshala hotels', 'mcleod ganj hotels', 'homestay dharamshala', 'budget hotels dharamshala'],
});

export default async function HotelsPage() {
  const [hotels, destinations] = await Promise.all([
    getPublishedProperties(),
    getDestinations(),
  ]);

  return (
    <>
      <section className="bg-brand-900 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Hotels' }]} />
          <h1 className="text-3xl font-heading font-bold mt-2 mb-2">Hotels & Stays in Dharamshala</h1>
          <p className="text-blue-200 max-w-2xl mb-6">
            From luxury resorts with valley views to budget hostels near the Triund trail. Every property personally vetted. All prices Rs.500 less than MakeMyTrip.
          </p>
        </div>
      </section>

      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <HotelFilters hotels={hotels} destinations={destinations} />
        </div>
      </section>
    </>
  );
}
