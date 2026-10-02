import Link from 'next/link';
import { DestinationCard, Breadcrumb, BlogCard } from '@/components/ui/Cards';
import JsonLd from '@/components/seo/JsonLd';
import { getDestinations } from '@/lib/db';
import { blogPosts } from '@/data/blog';
import { generateSEO, breadcrumbSchema, itemListSchema } from '@/lib/seo';
import { Metadata } from 'next';

export const revalidate = 300;
export const metadata: Metadata = generateSEO({
  title: 'Where to Stay Around Dharamshala - McLeod Ganj, Bhagsu, Dharamkot & Naddi',
  description: 'Compare Dharamshala, McLeod Ganj, Bhagsu, Dharamkot and Naddi: altitude, vibe, best time to visit, things to do and hotels in each area of the Kangra Valley.',
  path: '/destinations',
});

const GUIDE_SLUGS = ['dharamshala-vs-mcleod-ganj', 'places-to-visit-in-dharamshala', 'places-to-visit-in-kangra', 'palampur-travel-guide'];

export default async function DestinationsPage() {
  const destinations = await getDestinations();
  const guides = GUIDE_SLUGS.map((s) => blogPosts.find((b) => b.slug === s)).filter((b): b is (typeof blogPosts)[number] => !!b);

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([{ name: 'Home', href: '/' }, { name: 'Destinations', href: '/destinations' }]),
        itemListSchema(destinations.map((d: any) => ({ name: d.name, href: '/destinations/' + d.slug }))),
      ]} />
      <section className="bg-brand-900 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Destinations' }]} />
          <h1 className="text-3xl font-heading font-bold mt-2">Where to Stay Around Dharamshala</h1>
          <p className="text-blue-200 max-w-3xl mt-2">
            Dharamshala is really a cluster of hill neighbourhoods strung up the slope of the Dhauladhar range -- from busy
            lower Dharamshala at about 1,450 m to Tibetan McLeod Ganj, waterfall-side Bhagsu, yoga-village Dharamkot and quiet Naddi.
            Each has a different character; pick the one that matches your trip.
          </p>
        </div>
      </section>
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {destinations.map((d: any) => <DestinationCard key={d.id} destination={d} />)}
          </div>
          <p className="text-slate-600 mt-8 max-w-3xl">
            Not sure which to choose? Read our <Link href="/blog/dharamshala-vs-mcleod-ganj" className="text-brand-600 underline">Dharamshala vs McLeod Ganj comparison</Link>,
            browse <Link href="/hotels" className="text-brand-600 underline">all hotels</Link>, or check the <Link href="/faq" className="text-brand-600 underline">travel FAQ</Link>.
          </p>
        </div>
      </section>
      {guides.length > 0 && (
        <section className="py-8 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl font-heading font-bold mb-5">Area Guides</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {guides.map((p) => <BlogCard key={p.id} post={p} />)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
