import Link from 'next/link';
import { Breadcrumb, FAQSection } from '@/components/ui/Cards';
import JsonLd from '@/components/seo/JsonLd';
import { generateSEO, faqSchema } from '@/lib/seo';
import ServiceSignupForm from '@/components/services/ServiceSignupForm';

export const metadata = generateSEO({
  title: 'List Your Luggage Storage Service in Dharamshala (Free)',
  description: 'Run a luggage storage or luggage holding service in Dharamshala, McLeod Ganj or nearby? List it free on Dharamshala Stay and get calls from travellers.',
  path: '/luggage-storage/list-your-service', lang: 'en',
});

const FAQS = [
  { question: 'Is the listing really free?', answer: 'Yes. Listing a luggage storage service on Dharamshala Stay is free. Travellers call or WhatsApp you directly and pay you directly.' },
  { question: 'Who can list?', answer: 'Shops, guesthouses, cafes and travel desks in Dharamshala, McLeod Ganj, Bhagsu, Dharamkot and nearby that keep travellers’ bags safely for a fee.' },
  { question: 'How long before my listing goes live?', answer: 'Our team checks every listing before it is published, usually by calling or messaging you on WhatsApp. You get a profile page with your price, area, timings and a share card for WhatsApp.' },
  { question: 'What is the Verified badge?', answer: 'Businesses our team has checked get a "Verified by Dharamshala Stay" badge on their profile.' },
  { question: 'How do I change my price or timings?', answer: 'Message us on WhatsApp with the new details and we update your profile.' },
];

export default function ListYourServicePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <JsonLd data={faqSchema(FAQS)} />
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Luggage storage', href: '/luggage-storage' }, { label: 'List your service' }]} />
      <h1 className="font-heading text-3xl font-bold text-slate-900">List your luggage storage service</h1>
      <p className="mt-3 text-slate-600">Free for local businesses in Dharamshala, McLeod Ganj, Bhagsu, Dharamkot and nearby. Travellers see your price and call or WhatsApp you directly. Our team checks every listing before it goes live.</p>
      <h2 className="mt-8 font-heading text-xl font-bold text-slate-900">How it works</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-slate-700">
        <li>Fill in the form below with your business name, area, price per bag and phone number.</li>
        <li>Our team checks your details, then publishes your profile on the <Link href="/luggage-storage" className="text-brand-600 underline">luggage storage page</Link>.</li>
        <li>Travellers going on a <Link href="/blog/triund-trek-complete-guide" className="text-brand-600 underline">Triund trek</Link> or catching a late bus call or WhatsApp you directly.</li>
      </ol>
      <div className="mt-8"><ServiceSignupForm /></div>
      <section className="mt-12">
        <h2 className="font-heading text-2xl font-bold text-slate-900 mb-4">Questions from businesses</h2>
        <FAQSection faqs={FAQS} />
      </section>
    </div>
  );
}
