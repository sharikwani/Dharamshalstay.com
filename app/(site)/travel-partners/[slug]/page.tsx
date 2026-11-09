import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Cards';
import JsonLd from '@/components/seo/JsonLd';
import InquiryForm from '@/components/forms/InquiryForm';
import PartnerBadges from '@/components/partners/PartnerBadges';
import { generateSEO, breadcrumbSchema } from '@/lib/seo';
import { SERVICE_INFO, TRAVEL_PARTNERS, partnerBySlug } from '@/data/travel-partners';
import { loadPartnerRating } from '@/lib/partner-reviews';
import { siteConfig } from '@/lib/config';
import { Star } from 'lucide-react';

export const revalidate = 600;

const Stars = ({ n, size = 'h-4 w-4' }: { n: number; size?: string }) => (
  <span className="inline-flex" aria-label={n + ' out of 5'}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} className={size + ' ' + (i <= Math.round(n) ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />)}</span>
);
const monthYear = (d: string) => new Date(d).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return TRAVEL_PARTNERS.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const p = partnerBySlug(params.slug);
  if (!p) return {};
  const services = p.services.map((s) => SERVICE_INFO[s].label.toLowerCase()).join(', ');
  return generateSEO({
    title: `${p.name}: Verified Partner in Dharamshala`.slice(0, 60),
    description: `${p.name}: ${services} in Dharamshala and McLeod Ganj. Verified by Dharamshala Stay, ${p.groupsCompleted} group trips completed with us. Book through our team.`.slice(0, 155),
    path: '/travel-partners/' + p.slug, lang: 'en', noindex: !p.indexable, image: p.photo,
  });
}

export default async function TravelPartnerPage({ params }: Props) {
  const p = partnerBySlug(params.slug);
  if (!p) notFound();
  const rating = await loadPartnerRating(p.partnerId);
  const url = siteConfig.url.replace(/\/$/, '') + '/travel-partners/' + p.slug;
  const services = p.services.map((s) => SERVICE_INFO[s].label.toLowerCase());
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {rating.count > 0 && <JsonLd data={{
        '@context': 'https://schema.org', '@type': 'LocalBusiness', name: p.name, url, areaServed: 'Dharamshala, Himachal Pradesh',
        aggregateRating: { '@type': 'AggregateRating', ratingValue: rating.average, reviewCount: rating.count, bestRating: 5, worstRating: 1 },
        review: rating.reviews.slice(0, 10).map((r) => ({ '@type': 'Review', author: { '@type': 'Person', name: r.name }, datePublished: r.created_at.slice(0, 10), reviewBody: r.body || undefined, reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 } })),
      }} />}
      <JsonLd data={[breadcrumbSchema([{ name: 'Home', href: '/' }, { name: 'Verified travel partners', href: '/travel-partners' }, { name: p.name, href: '/travel-partners/' + p.slug }])]} />
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Verified travel partners', href: '/travel-partners' }, { label: p.name }]} />
      <div className="mt-4 grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {p.photo && <img src={p.photo} alt={p.name} className="mb-6 aspect-video w-full rounded-3xl object-cover" />}
          <h1 className="font-heading text-3xl font-bold text-slate-900 sm:text-4xl">{p.name}</h1>
          {p.area && <p className="mt-1 text-lg text-slate-600">{p.area}</p>}
          {rating.count > 0 && (
            <a href="#reviews" className="mt-2 inline-flex items-center gap-2 text-slate-700"><Stars n={rating.average} size="h-5 w-5" /><strong>{rating.average.toFixed(1)}</strong><span className="text-sm">({rating.count} customer rating{rating.count > 1 ? 's' : ''})</span></a>
          )}
          <div className="mt-3"><PartnerBadges p={p} large /></div>
          <p className="mt-6 text-lg text-slate-700"><strong>Short answer:</strong> {p.name} runs {services.join(', ').replace(/, ([^,]*)$/, ' and $1')} for our guests{p.topPartner ? ' and is a Dharamshala Stay Top Partner, highly recommended by our team' : p.verified ? ' and is verified by Dharamshala Stay' : ''}{p.groupsCompleted > 0 ? `, with ${p.groupsCompleted} group trips completed with us` : ''}{rating.count > 0 ? `. Customers rate ${p.name} ${rating.average.toFixed(1)} out of 5 from ${rating.count} rating${rating.count > 1 ? 's' : ''}` : ''}. Send a request and we confirm the plan and the full price on WhatsApp before you book.</p>
          {p.bio && <p className="mt-4 whitespace-pre-line text-slate-700">{p.bio}</p>}
          <h2 className="mt-8 font-heading text-xl font-bold text-slate-900">What can you book with {p.name}?</h2>
          <ul className="mt-3 space-y-2">
            {p.services.map((s) => (
              <li key={s}><Link href={SERVICE_INFO[s].href} className="font-medium text-brand-600 underline">{SERVICE_INFO[s].label}</Link></li>
            ))}
          </ul>
          <h2 id="reviews" className="mt-10 font-heading text-xl font-bold text-slate-900">Customer ratings for {p.name}</h2>
          {rating.count === 0 ? (
            <p className="mt-2 text-slate-600">No ratings yet. Every customer who books {p.name} through us gets a private link to rate the trip, so only real customers can leave a rating.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {rating.reviews.map((r) => (
                <li key={r.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-2"><Stars n={r.rating} /><span className="font-semibold text-slate-900">{r.name}</span><span className="text-xs text-slate-500">{monthYear(r.created_at)}</span><span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">Verified booking</span></div>
                  {(r.item || r.vehicle) && <p className="mt-1 text-xs text-slate-500">{[r.item, r.vehicle].filter(Boolean).join(' · ')}</p>}
                  {r.body && <p className="mt-2 whitespace-pre-line text-slate-700">{r.body}</p>}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-8 text-sm text-slate-600">Badges are our own endorsement and record. Star ratings come only from customers who booked through us. <Link href="/travel-partners" className="text-brand-600 underline">All verified partners</Link></p>
        </div>
        <aside className="self-start lg:sticky lg:top-24">
          <InquiryForm type="general" withDates contextNote={'Partner: ' + p.name} title={'Book with ' + p.name} subtitle="Share your date, group size and plan. We confirm everything on WhatsApp." />
        </aside>
      </div>
    </div>
  );
}
