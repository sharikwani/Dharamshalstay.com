import { Metadata } from 'next';
import Image from 'next/image';
import { Breadcrumb } from '@/components/ui/Cards';
import TaxiSearch from '@/components/sections/TaxiSearch';
import { getActiveTaxiRoutes } from '@/lib/db';
import { generateSEO } from '@/lib/seo';
import { UNSPLASH_IMAGES } from '@/types';

export const revalidate = 60;

export const metadata: Metadata = generateSEO({
  title: 'Dharamshala Taxi – Airport Transfers, Local & Outstation',
  description: 'Book reliable taxis in Dharamshala. Airport pickups, sightseeing, outstation. Transparent pricing.',
  path: '/taxi',
});

export default async function TaxiPage() {
  const taxiRoutes = await getActiveTaxiRoutes();

  return (
    <>
      <section className="relative h-[280px]">
        <Image src={UNSPLASH_IMAGES.taxi} alt="Mountain road Dharamshala" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-brand-950/70" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 h-full flex flex-col justify-end pb-8 text-white">
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Taxi' }]} />
          <h1 className="text-3xl font-heading font-bold mt-2">Taxi & Transfers</h1>
          <p className="text-blue-200 max-w-2xl">Reliable taxis. Transparent pricing. Local drivers who know the mountain roads.</p>
        </div>
      </section>
      <TaxiSearch taxiRoutes={taxiRoutes} />
    </>
  );
}

