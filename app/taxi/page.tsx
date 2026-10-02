import { Metadata } from 'next';
import Image from 'next/image';
import { Breadcrumb } from '@/components/ui/Cards';
import TaxiSearch from '@/components/sections/TaxiSearch';
import { getActiveTaxiRoutes } from '@/lib/db';
import { generateSEO } from '@/lib/seo';
import { UNSPLASH_IMAGES } from '@/types';
import Link from 'next/link';
import { getTaxiRouteGroups } from '@/lib/taxi';
import { formatPrice } from '@/lib/utils';

export const revalidate = 60;

export const metadata: Metadata = generateSEO({
  title: 'Dharamshala Taxi - Airport Transfers, Local & Outstation',
  description: 'Book reliable taxis in Dharamshala. Airport pickups, sightseeing, outstation. Transparent pricing.',
  path: '/taxi',
});

export default async function TaxiPage() {
  const [taxiRoutes, routeGroups] = await Promise.all([getActiveTaxiRoutes(), getTaxiRouteGroups()]);

  return (
    <>
      <section className="relative h-[280px]">
        <Image src={UNSPLASH_IMAGES.taxi} alt="Hill road in Kangra district near Dharamshala" fill className="object-cover" priority sizes="100vw" />
        <div className="absolute inset-0 bg-brand-950/70" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 h-full flex flex-col justify-end pb-8 text-white">
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Taxi' }]} />
          <h1 className="text-3xl font-heading font-bold mt-2">Taxi & Transfers</h1>
          <p className="text-blue-200 max-w-2xl">Reliable taxis. Transparent pricing. Local drivers who know the mountain roads.</p>
        </div>
      </section>
      <TaxiSearch taxiRoutes={taxiRoutes} />
      {routeGroups.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <h2 className="text-2xl font-heading font-bold text-slate-900 mb-4">Popular taxi routes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {routeGroups.map((g) => (
              <Link key={g.slug} href={'/taxi/' + g.slug} className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 hover:shadow-md">
                <span className="font-medium text-slate-800">{g.from} → {g.to}</span>
                <span className="text-sm font-semibold text-brand-700">from {formatPrice(g.minPrice)}</span>
              </Link>
            ))}
          </div>
          <p className="text-sm text-slate-600 mt-6">
            Arriving soon? Read <Link href="/blog/how-to-reach-dharamshala" className="text-brand-600 underline">how to reach Dharamshala</Link> for flights, trains and buses.
          </p>
        </section>
      )}
    </>
  );
}
