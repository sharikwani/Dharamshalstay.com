import Link from 'next/link';
import { Breadcrumb, FAQSection } from '@/components/ui/Cards';
import JsonLd from '@/components/seo/JsonLd';
import { generateSEO, faqSchema } from '@/lib/seo';
import GuideSignupForm from '@/components/guides/GuideSignupForm';

export const metadata = generateSEO({
  title: 'Register as a Local Guide in McLeod Ganj (Free)',
  description: 'Local guide in McLeod Ganj, Dharamshala or Kangra? Register free on Dharamshala Stay, get a profile page and receive guide bookings. 15% commission.',
  path: '/local-guides/register', lang: 'en',
});

const FAQS = [
  { question: 'Does it cost anything to register as a guide?', answer: 'No. Registering and having a profile on Dharamshala Stay is free. We only keep a 15% commission on bookings that come through us.' },
  { question: 'Do I need an HP Tourism guide registration?', answer: 'It is not required to register with us, but guides who show their HP Tourism registration certificate get a "Registered with HP Tourism" badge. We check the certificate privately and never publish your registration number.' },
  { question: 'How do I get bookings?', answer: 'Travellers find your profile on our Local guides page and in our McLeod Ganj and Triund guides, and book through Dharamshala Stay. We send each booking to you on WhatsApp; tap Accept to confirm it.' },
  { question: 'How long does approval take?', answer: 'Our team calls or messages you on WhatsApp to check your ID and details. Once approved, your profile with your photo goes live and you get an email with the link.' },
  { question: 'Why is a photo required?', answer: 'Travellers want to know who will meet them. Profiles without a clear photo of the guide are not published.' },
  { question: 'Can I change my rate or details later?', answer: 'Yes. Message us on WhatsApp to change your day rate, photo, languages or the areas you cover.' },
];

export default function RegisterGuidePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <JsonLd data={faqSchema(FAQS)} />
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Local guides', href: '/local-guides' }, { label: 'Register' }]} />
      <h1 className="font-heading text-3xl font-bold text-slate-900">Register as a local guide</h1>
      <p className="mt-3 text-slate-600"><strong>Short answer:</strong> fill in this free form. Our team calls you on WhatsApp, checks your ID (and your HP Tourism registration certificate, if you have one) and publishes your profile on <Link href="/local-guides" className="text-brand-600 underline">Local guides</Link>. Travellers book you through Dharamshala Stay; we send you each booking on WhatsApp and keep a 15% commission.</p>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-600">
        <li>Your phone number and email are never shown on the website.</li>
        <li>You set your own day rate and can change it any time by messaging us.</li>
        <li>Trekking guides must follow the Kangra district rules (SP permission for Triund, Kareri and Adi Himani Chamunda; up to 10 trekkers per guide).</li>
      </ul>
      <div className="mt-8"><GuideSignupForm /></div>
      <section className="mt-12">
        <h2 className="font-heading text-2xl font-bold text-slate-900 mb-4">Questions from guides</h2>
        <FAQSection faqs={FAQS} />
      </section>
      <p className="mt-8 text-sm text-slate-600">Travellers: see our <Link href="/local-guides" className="text-brand-600 underline">local guides</Link>, the <Link href="/blog/triund-trek-complete-guide" className="text-brand-600 underline">Triund trek guide</Link> and <Link href="/monasteries-meditation" className="text-brand-600 underline">monasteries and meditation</Link>.</p>
    </div>
  );
}
