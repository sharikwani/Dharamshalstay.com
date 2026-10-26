import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BadgeCheck, Languages, MapPin, ShieldCheck } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/Cards';
import JsonLd from '@/components/seo/JsonLd';
import InquiryForm from '@/components/forms/InquiryForm';
import { generateSEO, breadcrumbSchema } from '@/lib/seo';
import { guideBySlug, publishedGuides } from '@/lib/guides/store';
import { siteConfig } from '@/lib/config';
import { formatPrice } from '@/lib/utils';

export const revalidate = 600;

type Props = { params: { slug: string } };

export async function generateStaticParams() {
  return (await publishedGuides()).map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = await guideBySlug(params.slug);
  if (!g) return {};
  const where = g.areas[0] || 'McLeod Ganj';
  return generateSEO({
    title: `${g.name}: Local Guide in ${where}`.slice(0, 60),
    description: `${g.name}, local guide in ${g.areas.slice(0, 2).join(' and ') || 'McLeod Ganj'}: ${g.experience_years} years, ${g.languages.slice(0, 3).join(', ')}${g.price_per_day ? `, from ${formatPrice(g.price_per_day)} a day` : ''}. Book through Dharamshala Stay.`.slice(0, 155),
    path: '/local-guides/' + g.slug, lang: 'en', image: g.photo || undefined, ogTag: 'Local guide',
  });
}

export default async function GuideProfilePage({ params }: Props) {
  const g = await guideBySlug(params.slug);
  if (!g) notFound();
  const url = siteConfig.url.replace(/\/$/, '') + '/local-guides/' + g.slug;
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <JsonLd data={[
        breadcrumbSchema([{ name: 'Home', href: '/' }, { name: 'Local guides', href: '/local-guides' }, { name: g.name, href: '/local-guides/' + g.slug }]),
        {
          '@context': 'https://schema.org', '@type': 'Person', name: g.name, url, jobTitle: 'Local tour guide',
          ...(g.photo ? { image: g.photo } : {}), description: g.bio || undefined, knowsLanguage: g.languages,
          workLocation: g.areas.map((a) => ({ '@type': 'Place', name: `${a}, Himachal Pradesh, India` })),
          ...(g.price_per_day ? { makesOffer: { '@type': 'Offer', name: 'Guided day', price: g.price_per_day, priceCurrency: 'INR', seller: { '@type': 'TravelAgency', name: siteConfig.name, url: siteConfig.url } } } : {}),
        },
      ]} />
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Local guides', href: '/local-guides' }, { label: g.name }]} />
      <div className="mt-4 grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={g.photo!} alt={`${g.name}, local guide in ${g.areas[0] || 'McLeod Ganj'}`} className="aspect-square w-full max-w-md rounded-3xl object-cover shadow-md" />
          <h1 className="mt-6 font-heading text-3xl font-bold text-slate-900 sm:text-4xl">{g.name}</h1>
          <p className="mt-1 text-lg text-slate-600">Local guide in {g.areas[0] || 'McLeod Ganj'}{g.areas.length > 1 ? ` (also ${g.areas.slice(1).join(', ')})` : ''}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {g.verified && <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-sm font-semibold text-green-700"><BadgeCheck className="h-4 w-4" />Verified by Dharamshala Stay</span>}
            {g.hp_registration_verified && <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-sm font-semibold text-blue-700"><ShieldCheck className="h-4 w-4" />Registered with HP Tourism</span>}
          </div>

          <dl className="mt-6 divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white text-slate-700 ring-1 ring-slate-200">
            {([
              ['Experience', `${g.experience_years} years guiding`],
              ...(g.price_per_day ? [['Day rate', `From ${formatPrice(g.price_per_day)} for a full day (final price confirmed before you book)`]] : []),
              ['Tours', g.specializations.join(', ')],
              ['Areas', g.areas.join(', ')],
              ['Languages', g.languages.join(', ')],
              ['How to book', 'Send a request with your date and plan; we confirm the guide and the full price on WhatsApp'],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="grid grid-cols-[7.5rem_1fr] gap-3 p-4 sm:grid-cols-[9rem_1fr]">
                <dt className="flex items-start gap-1.5 font-semibold text-slate-900">{k === 'Areas' ? <MapPin className="mt-1 h-4 w-4" /> : k === 'Languages' ? <Languages className="mt-1 h-4 w-4" /> : null}{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-6 text-lg text-slate-700"><strong>Short answer:</strong> {g.name} is a local guide with {g.experience_years} years of experience, offering {g.specializations.slice(0, 3).join('; ')}. Areas: {g.areas.join(', ')}. Languages: {g.languages.join(', ')}. Send a request with your date and plan; we confirm the guide, the plan and the full price with you on WhatsApp before you book.</p>
          {g.bio && <><h2 className="mt-8 font-heading text-xl font-bold text-slate-900">About {g.name.split(/\s+/)[0]}</h2><p className="mt-2 whitespace-pre-line text-slate-700">{g.bio}</p></>}
          <p className="mt-8 text-sm text-slate-600">Planning the day: <Link href="/monasteries-meditation" className="text-brand-600 underline">monasteries</Link>, <Link href="/blog/things-to-do-in-mcleod-ganj" className="text-brand-600 underline">things to do in McLeod Ganj</Link>, <Link href="/blog/triund-trek-complete-guide" className="text-brand-600 underline">Triund trek</Link>, <Link href="/hotels" className="text-brand-600 underline">where to stay</Link> and <Link href="/local-guides" className="text-brand-600 underline">all local guides</Link>.</p>
        </div>
        <aside className="self-start lg:sticky lg:top-24">
          <InquiryForm type="general" withDates contextNote={'Local guide: ' + g.name + ' (/local-guides/' + g.slug + ')'} title={'Book ' + g.name.split(/\s+/)[0]} subtitle="Share your date, group size and plan. We confirm the guide and price on WhatsApp." />
        </aside>
      </div>
    </div>
  );
}
