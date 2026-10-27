import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Cards';
import JsonLd from '@/components/seo/JsonLd';
import InquiryForm from '@/components/forms/InquiryForm';
import PartnerBadges from '@/components/partners/PartnerBadges';
import { generateSEO, breadcrumbSchema } from '@/lib/seo';
import { SERVICE_INFO, TRAVEL_PARTNERS, partnerBySlug } from '@/data/travel-partners';

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

export default function TravelPartnerPage({ params }: Props) {
  const p = partnerBySlug(params.slug);
  if (!p) notFound();
  const services = p.services.map((s) => SERVICE_INFO[s].label.toLowerCase());
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <JsonLd data={[breadcrumbSchema([{ name: 'Home', href: '/' }, { name: 'Verified travel partners', href: '/travel-partners' }, { name: p.name, href: '/travel-partners/' + p.slug }])]} />
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Verified travel partners', href: '/travel-partners' }, { label: p.name }]} />
      <div className="mt-4 grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {p.photo && <img src={p.photo} alt={p.name} className="mb-6 aspect-video w-full rounded-3xl object-cover" />}
          <h1 className="font-heading text-3xl font-bold text-slate-900 sm:text-4xl">{p.name}</h1>
          {p.area && <p className="mt-1 text-lg text-slate-600">{p.area}</p>}
          <div className="mt-3"><PartnerBadges p={p} large /></div>
          <p className="mt-6 text-lg text-slate-700"><strong>Short answer:</strong> {p.name} runs {services.join(', ').replace(/, ([^,]*)$/, ' and $1')} for our guests and is a Dharamshala Stay Top Partner, highly recommended by our team, with {p.groupsCompleted} group trips completed with us. Send a request and we confirm the plan and the full price on WhatsApp before you book.</p>
          {p.bio && <p className="mt-4 whitespace-pre-line text-slate-700">{p.bio}</p>}
          <h2 className="mt-8 font-heading text-xl font-bold text-slate-900">What can you book with {p.name}?</h2>
          <ul className="mt-3 space-y-2">
            {p.services.map((s) => (
              <li key={s}><Link href={SERVICE_INFO[s].href} className="font-medium text-brand-600 underline">{SERVICE_INFO[s].label}</Link></li>
            ))}
          </ul>
          <p className="mt-8 text-sm text-slate-600">Badges are our own endorsement and record. Customer reviews will appear here as guests post them. <Link href="/travel-partners" className="text-brand-600 underline">All verified partners</Link></p>
        </div>
        <aside className="self-start lg:sticky lg:top-24">
          <InquiryForm type="general" withDates contextNote={'Partner: ' + p.name} title={'Book with ' + p.name} subtitle="Share your date, group size and plan. We confirm everything on WhatsApp." />
        </aside>
      </div>
    </div>
  );
}
