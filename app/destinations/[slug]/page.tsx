import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Mountain } from 'lucide-react';
import { HotelCard, Breadcrumb, FAQSection, SectionHeading, BlogCard } from '@/components/ui/Cards';
import { blogPosts } from '@/data/blog';
import JsonLd from '@/components/seo/JsonLd';
import { getDestinationBySlug, getDestinations, getPropertiesByDestination } from '@/lib/db';
import { generateSEO, breadcrumbSchema, faqSchema, touristDestinationSchema } from '@/lib/seo';

export const revalidate = 60;
export const dynamicParams = true;

interface Props { params: { slug: string } }

export async function generateStaticParams() {
  const dests = await getDestinations();
  return dests.map((d: any) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = await getDestinationBySlug(params.slug);
  if (!d) return {};
  return generateSEO({ title: d.meta_title || d.name, description: d.meta_description || d.description, path: `/destinations/${d.slug}`, image: d.image });
}

export default async function DestPage({ params }: Props) {
  const dest = await getDestinationBySlug(params.slug);
  if (!dest) notFound();

  const [hotels, allDests] = await Promise.all([
    getPropertiesByDestination(dest.slug),
    getDestinations(),
  ]);
  const others = allDests.filter((d: any) => d.slug !== dest.slug);
  // "McLeod Ganj" should also match "McLeodganj"
  const nameRe = new RegExp(dest.name.replace(/\s+/g, '\\s*'), 'i');
  const guides = blogPosts
    .filter((b) => nameRe.test(b.title) || b.tags.some((t) => nameRe.test(t)) || b.content.includes('/destinations/' + dest.slug))
    .slice(0, 3);

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([{ name: 'Home', href: '/' }, { name: 'Destinations', href: '/destinations' }, { name: dest.name, href: `/destinations/${dest.slug}` }]),
        touristDestinationSchema({ name: dest.name, description: dest.description, slug: dest.slug, image: dest.image }),
        ...(dest.faqs?.length ? [faqSchema(dest.faqs)] : []),
      ]} />

      <section className="relative h-[300px]">
        <Image src={dest.image} alt={dest.image_alt || dest.name} fill className="object-cover" priority sizes="100vw" />
        <div className="absolute inset-0 bg-brand-950/60" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 h-full flex flex-col justify-end pb-8 text-white">
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Destinations', href: '/destinations' }, { label: dest.name }]} />
          <h1 className="text-3xl sm:text-4xl font-heading font-bold">{dest.name}</h1>
          <p className="text-blue-200 italic">{dest.tagline}</p>
          <p className="text-sm text-slate-300 mt-1">
            Altitude: {dest.altitude} · Best: {dest.best_time} · {hotels.length}+ stays
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="max-w-3xl mb-10">
          <h2 className="text-2xl font-heading font-bold mb-3">About {dest.name}</h2>
          <p className="text-slate-600 whitespace-pre-line">{dest.long_description}</p>
        </div>

        {(dest.how_to_reach || dest.best_time) && (
          <div className="max-w-3xl mb-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {dest.how_to_reach && (
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                <h2 className="font-heading font-semibold text-lg mb-2">How to Reach {dest.name}</h2>
                <p className="text-sm text-slate-600 leading-relaxed">{dest.how_to_reach}</p>
                <Link href="/taxi" className="text-sm text-brand-600 font-medium mt-2 inline-block">Book a taxi transfer &rarr;</Link>
              </div>
            )}
            {dest.best_time && (
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                <h2 className="font-heading font-semibold text-lg mb-2">Best Time to Visit</h2>
                <p className="text-sm text-slate-600 leading-relaxed">{dest.best_time}</p>
                <Link href="/blog/best-time-to-visit-dharamshala" className="text-sm text-brand-600 font-medium mt-2 inline-block">Month-by-month guide &rarr;</Link>
              </div>
            )}
          </div>
        )}

        {dest.things_to_do?.length > 0 && (
          <div className="max-w-3xl mb-10">
            <h2 className="text-2xl font-heading font-bold mb-3">Things to Do</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {dest.things_to_do.map((t: string) => (
                <div key={t} className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 px-3 py-2.5 rounded-lg">
                  <Mountain className="h-4 w-4 text-brand-500 shrink-0" />{t}
                </div>
              ))}
            </div>
          </div>
        )}

        {hotels.length > 0 && (
          <>
            <SectionHeading title={`Hotels in ${dest.name}`} align="left" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
              {hotels.map((h: any) => <HotelCard key={h.id} hotel={h} />)}
            </div>
          </>
        )}

        {dest.faqs?.length > 0 && (
          <div className="max-w-3xl mb-10">
            <h2 className="text-2xl font-heading font-bold mb-3">FAQs</h2>
            <FAQSection faqs={dest.faqs} />
          </div>
        )}

        {guides.length > 0 && (
          <div className="mb-10">
            <h2 className="text-2xl font-heading font-bold mb-4">{dest.name} Travel Guides</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {guides.map((p) => <BlogCard key={p.id} post={p} />)}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-xl font-heading font-bold mb-3">Explore Other Destinations</h2>
          <div className="flex flex-wrap gap-2">
            {others.map((d: any) => (
              <Link key={d.slug} href={`/destinations/${d.slug}`}
                className="px-4 py-2 bg-slate-100 rounded-full text-sm font-medium hover:bg-blue-50">
                {d.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
