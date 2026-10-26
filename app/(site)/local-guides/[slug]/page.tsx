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
          <div className="flex items-center gap-5">
            {g.photo
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={g.photo} alt={`${g.name}, local guide`} className="h-24 w-24 rounded-full object-cover" />
              : <span className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-100 font-heading text-3xl font-bold text-brand-700">{g.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}</span>}
            <div>
              <h1 className="font-heading text-3xl font-bold text-slate-900">{g.name}</h1>
              <p className="text-slate-600">Local guide · {g.experience_years} years{g.price_per_day ? ` · from ${formatPrice(g.price_per_day)} a day` : ''}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {g.verified && <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700"><BadgeCheck className="h-3.5 w-3.5" />Verified by Dharamshala Stay</span>}
                {g.hp_registration_verified && <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700"><ShieldCheck className="h-3.5 w-3.5" />Registered with HP Tourism</span>}
              </div>
            </div>
          </div>
          <p className="mt-6 text-lg text-slate-700"><strong>Short answer:</strong> {g.name} guides {g.specializations.slice(0, 3).join(', ').toLowerCase()} in {g.areas.slice(0, 3).join(', ')}, in {g.languages.join(', ')}. Send a request with your date and plan; we confirm the guide, the plan and the full price with you on WhatsApp before you book.</p>
          {g.bio && <><h2 className="mt-8 font-heading text-xl font-bold text-slate-900">About {g.name.split(/\s+/)[0]}</h2><p className="mt-2 whitespace-pre-line text-slate-700">{g.bio}</p></>}
          <h2 className="mt-8 font-heading text-xl font-bold text-slate-900">Tours and areas</h2>
          <div className="mt-3 flex flex-wrap gap-2">{g.specializations.map((s) => <span key={s} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700">{s}</span>)}</div>
          <p className="mt-3 flex items-start gap-1.5 text-slate-700"><MapPin className="mt-1 h-4 w-4 shrink-0" />{g.areas.join(' · ')}</p>
          <p className="mt-1 flex items-start gap-1.5 text-slate-700"><Languages className="mt-1 h-4 w-4 shrink-0" />{g.languages.join(', ')}</p>
          <p className="mt-8 text-sm text-slate-600">Planning the day: <Link href="/monasteries-meditation" className="text-brand-600 underline">monasteries</Link>, <Link href="/blog/things-to-do-in-mcleod-ganj" className="text-brand-600 underline">things to do in McLeod Ganj</Link>, <Link href="/blog/triund-trek-complete-guide" className="text-brand-600 underline">Triund trek</Link>, <Link href="/hotels" className="text-brand-600 underline">where to stay</Link> and <Link href="/local-guides" className="text-brand-600 underline">all local guides</Link>.</p>
        </div>
        <aside className="self-start lg:sticky lg:top-24">
          <InquiryForm type="general" withDates contextNote={'Local guide: ' + g.name + ' (/local-guides/' + g.slug + ')'} title={'Book ' + g.name.split(/\s+/)[0]} subtitle="Share your date, group size and plan. We confirm the guide and price on WhatsApp." />
        </aside>
      </div>
    </div>
  );
}
