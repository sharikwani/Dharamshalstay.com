import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Mountain } from 'lucide-react';
import { DestinationCard, Breadcrumb, BlogCard, HotelCard, FAQSection, SectionHeading } from '@/components/ui/Cards';
import JsonLd from '@/components/seo/JsonLd';
import { getDestinations, getDestinationBySlug, getPropertiesByDestination } from '@/lib/db';
import { blogPosts } from '@/data/blog';
import { generateSEO, breadcrumbSchema, itemListSchema, faqSchema, touristDestinationSchema } from '@/lib/seo';
import { serverT } from '@/lib/i18n/server';
import { fmt } from '@/lib/i18n/dict';
import { localizeDestination, localizeHotel, localizePost } from '@/lib/i18n/content';
import type { Lang } from '@/lib/i18n/core';

const GUIDE_SLUGS = ['dharamshala-vs-mcleod-ganj', 'places-to-visit-in-dharamshala', 'places-to-visit-in-kangra', 'palampur-travel-guide'];

export function destinationsMetadata(lang: Lang): Metadata {
  const t = serverT(lang).t.destinations;
  return generateSEO({ title: t.metaTitle, description: t.metaDescription, path: '/destinations', lang });
}

export async function DestinationsListView({ lang }: { lang: Lang }) {
  const { t, href } = serverT(lang);
  const d = t.destinations;
  const destinations = (await getDestinations()).map((x: any) => localizeDestination(x, lang));
  const guides = GUIDE_SLUGS.map((s) => blogPosts.find((b) => b.slug === s)).filter((b): b is (typeof blogPosts)[number] => !!b).map((p) => localizePost(p, lang));

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([{ name: t.common.home, href: '/' }, { name: t.common.destinations, href: '/destinations' }], lang),
        itemListSchema(destinations.map((x: any) => ({ name: x.name, href: '/destinations/' + x.slug })), lang),
      ]} />
      <section className="bg-brand-900 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Breadcrumb lang={lang} items={[{ label: t.common.home, href: '/' }, { label: t.common.destinations }]} />
          <h1 className="text-3xl font-heading font-bold mt-2">{d.h1}</h1>
          <p className="text-brand-200 max-w-3xl mt-2">{d.intro}</p>
        </div>
      </section>
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {destinations.map((x: any) => <DestinationCard key={x.id} destination={x} lang={lang} />)}
          </div>
          <p className="text-slate-600 mt-8 max-w-3xl">
            {d.notSure}{' '}
            <Link href={href('/blog/dharamshala-vs-mcleod-ganj')} className="text-brand-600 underline">{t.footer.dharamshalaVsMcleod}</Link>
            {' · '}<Link href={href('/hotels')} className="text-brand-600 underline">{t.common.browseHotels}</Link>
            {' · '}<Link href={href('/faq')} className="text-brand-600 underline">{t.common.qa}</Link>
          </p>
        </div>
      </section>
      {guides.length > 0 && (
        <section className="py-8 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl font-heading font-bold mb-5">{d.areaGuides}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {guides.map((p) => <BlogCard key={p.id} post={p} lang={lang} />)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

export async function destinationMetadata(slug: string, lang: Lang): Promise<Metadata> {
  const raw = await getDestinationBySlug(slug);
  if (!raw) return {};
  const d = localizeDestination(raw, lang);
  return generateSEO({ title: d.meta_title || d.name, description: d.meta_description || d.description, path: '/destinations/' + d.slug, image: d.image, lang });
}

export async function DestinationDetailView({ slug, lang }: { slug: string; lang: Lang }) {
  const raw = await getDestinationBySlug(slug);
  if (!raw) notFound();
  const dest = localizeDestination(raw, lang);
  const { t, href } = serverT(lang);
  const d = t.destinations;

  const [hotels, allDests] = await Promise.all([getPropertiesByDestination(dest.slug), getDestinations()]);
  const others = allDests.filter((x: any) => x.slug !== dest.slug).map((x: any) => localizeDestination(x, lang));
  const nameRe = new RegExp(raw.name.replace(/\s+/g, '\\s*'), 'i');
  // Rank by how specifically a post is ABOUT this place, not by array order: a
  // guide named after it beats one merely tagged with it, which beats one that
  // only links here. Without this, the dozen posts that link to a destination
  // crowded its own dedicated guide out of the three slots.
  const guides = blogPosts
    .map((b) => ({
      post: b,
      score: nameRe.test(b.title) ? 2 : b.tags.some((tag) => nameRe.test(tag)) ? 1 : b.content.includes('/destinations/' + dest.slug) ? 0 : -1,
    }))
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => localizePost(x.post, lang));

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([{ name: t.common.home, href: '/' }, { name: t.common.destinations, href: '/destinations' }, { name: dest.name, href: '/destinations/' + dest.slug }], lang),
        touristDestinationSchema({ name: dest.name, description: dest.description, slug: dest.slug, image: dest.image }, lang),
        ...(dest.faqs?.length ? [faqSchema(dest.faqs)] : []),
      ]} />

      <section className="relative h-[300px]">
        <Image src={dest.image} alt={dest.image_alt || dest.name} fill className="object-cover" priority sizes="100vw" />
        <div className="absolute inset-0 bg-brand-950/60" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 h-full flex flex-col justify-end pb-8 text-white">
          <Breadcrumb lang={lang} items={[{ label: t.common.home, href: '/' }, { label: t.common.destinations, href: '/destinations' }, { label: dest.name }]} />
          <h1 className="text-3xl sm:text-4xl font-heading font-bold">{dest.name}</h1>
          <p className="text-brand-200 italic">{dest.tagline}</p>
          <p className="text-sm text-slate-300 mt-1">{d.altitude}: {dest.altitude} · {d.best}: {dest.best_time}</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="max-w-3xl mb-10">
          <h2 className="text-2xl font-heading font-bold mb-3">{fmt(d.about, { name: dest.name })}</h2>
          <p className="text-slate-600 whitespace-pre-line">{dest.long_description}</p>
        </div>

        {(dest.how_to_reach || dest.best_time) && (
          <div className="max-w-3xl mb-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {dest.how_to_reach && (
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                <h2 className="font-heading font-semibold text-lg mb-2">{fmt(d.howToReach, { name: dest.name })}</h2>
                <p className="text-sm text-slate-600 leading-relaxed">{dest.how_to_reach}</p>
                <Link href={href('/taxi')} className="text-sm text-brand-600 font-medium mt-2 inline-block">{d.bookTaxi} &rarr;</Link>
              </div>
            )}
            {dest.best_time && (
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                <h2 className="font-heading font-semibold text-lg mb-2">{d.bestTime}</h2>
                <p className="text-sm text-slate-600 leading-relaxed">{dest.best_time}</p>
                <Link href={href('/blog/best-time-to-visit-dharamshala')} className="text-sm text-brand-600 font-medium mt-2 inline-block">{t.home.monthGuide} &rarr;</Link>
              </div>
            )}
          </div>
        )}

        {dest.things_to_do?.length > 0 && (
          <div className="max-w-3xl mb-10">
            <h2 className="text-2xl font-heading font-bold mb-3">{d.thingsToDo}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {dest.things_to_do.map((x: string) => (
                <div key={x} className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 px-3 py-2.5 rounded-lg">
                  <Mountain className="h-4 w-4 text-brand-500 shrink-0" />{x}
                </div>
              ))}
            </div>
          </div>
        )}

        {hotels.length > 0 && (
          <>
            <SectionHeading title={fmt(t.footer.hotelsIn, { place: dest.name })} align="left" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
              {hotels.map((h: any) => <HotelCard key={h.id} hotel={localizeHotel(h, lang)} lang={lang} />)}
            </div>
          </>
        )}

        {dest.faqs?.length > 0 && (
          <div className="max-w-3xl mb-10">
            <h2 className="text-2xl font-heading font-bold mb-3">{t.common.faqs}</h2>
            <FAQSection faqs={dest.faqs} />
          </div>
        )}

        {guides.length > 0 && (
          <div className="mb-10">
            <h2 className="text-2xl font-heading font-bold mb-4">{fmt(d.guidesFor, { name: dest.name })}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {guides.map((p) => <BlogCard key={p.id} post={p} lang={lang} />)}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-xl font-heading font-bold mb-3">{d.others}</h2>
          <div className="flex flex-wrap gap-2">
            {others.map((x: any) => (
              <Link key={x.slug} href={href('/destinations/' + x.slug)} className="px-4 py-2 bg-slate-100 rounded-full text-sm font-medium hover:bg-brand-50">{x.name}</Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
