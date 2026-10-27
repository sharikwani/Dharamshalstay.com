import Link from 'next/link';
import { Breadcrumb, FAQSection } from '@/components/ui/Cards';
import JsonLd from '@/components/seo/JsonLd';
import PartnerBadges from '@/components/partners/PartnerBadges';
import { generateSEO, faqSchema, breadcrumbSchema, itemListSchema } from '@/lib/seo';
import { SERVICE_INFO, TRAVEL_PARTNERS } from '@/data/travel-partners';

export const metadata = generateSEO({
  title: 'Verified Travel Partners in Dharamshala (2026)',
  description: 'Local trek, paragliding and taxi operators verified by Dharamshala Stay, with the group trips they have completed with us. Book through our team.',
  path: '/travel-partners', lang: 'en', ogTag: 'Verified partners',
});

const FAQS = [
  { question: 'What does "Verified by Dharamshala Stay" mean?', answer: 'Our team has checked the business and works with it on real bookings. We only list operators we are happy to send our own guests to.' },
  { question: 'What is a Top Partner?', answer: 'A partner our team recommends most, based on the trips they have run for our guests. It is our own recommendation, not a customer rating; customer reviews appear separately once guests post them.' },
  { question: 'How do I book a verified partner?', answer: 'Open the partner’s profile and send a request with your date, group size and plan. Our team confirms the partner, the plan and the full price with you on WhatsApp before you book.' },
  { question: 'Do you list treks, paragliding and taxis?', answer: 'Yes. Partners are listed with the services they run: guided treks such as Triund and Kareri, tandem paragliding, and taxis for airport transfers, sightseeing and outstation trips.' },
];

export default function TravelPartnersPage() {
  return (
    <div>
      <JsonLd data={[
        breadcrumbSchema([{ name: 'Home', href: '/' }, { name: 'Verified travel partners', href: '/travel-partners' }]),
        itemListSchema(TRAVEL_PARTNERS.map((p) => ({ name: p.name, href: '/travel-partners/' + p.slug }))),
        faqSchema(FAQS),
      ]} />
      <section className="bg-brand-900 text-white">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Verified travel partners' }]} />
          <h1 className="mt-2 font-heading text-3xl font-bold sm:text-4xl">Verified Travel Partners in Dharamshala</h1>
          <p className="mt-3 max-w-3xl text-lg text-brand-100"><strong className="text-white">Short answer:</strong> these are the local trek, paragliding and taxi operators we work with and send our own guests to. Each one is verified by our team and shows the group trips completed with us. Book through Dharamshala Stay and we confirm the plan and price on WhatsApp.</p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h2 className="font-heading text-2xl font-bold text-slate-900">Who are our verified partners?</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {TRAVEL_PARTNERS.map((p) => (
            <article key={p.slug} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-heading text-xl font-bold text-slate-900"><Link href={'/travel-partners/' + p.slug} className="hover:underline">{p.name}</Link></h3>
              {p.area && <p className="text-sm text-slate-500">{p.area}</p>}
              <div className="mt-2"><PartnerBadges p={p} /></div>
              <p className="mt-3 text-sm text-slate-700"><strong>Services:</strong> {p.services.map((s) => SERVICE_INFO[s].label).join(', ')}</p>
              <Link href={'/travel-partners/' + p.slug} className="mt-4 rounded-lg bg-brand-700 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-brand-800">See profile and book</Link>
            </article>
          ))}
        </div>
        <p className="mt-8 text-sm text-slate-600">Also see our <Link href="/treks" className="text-brand-600 underline">guided treks</Link>, <Link href="/paragliding" className="text-brand-600 underline">paragliding</Link>, <Link href="/taxi" className="text-brand-600 underline">taxi fares</Link>, <Link href="/local-guides" className="text-brand-600 underline">local guides</Link> and <Link href="/luggage-storage" className="text-brand-600 underline">luggage storage</Link>.</p>
      </div>

      <section className="bg-slate-50 py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="mb-6 text-center font-heading text-2xl font-bold text-slate-900">Questions about our partners</h2>
          <FAQSection faqs={FAQS} />
        </div>
      </section>
    </div>
  );
}
