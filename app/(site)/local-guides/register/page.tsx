import Link from 'next/link';
import { Breadcrumb } from '@/components/ui/Cards';
import { generateSEO } from '@/lib/seo';
import GuideSignupForm from '@/components/guides/GuideSignupForm';

export const metadata = generateSEO({
  title: 'Register as a Local Guide in McLeod Ganj (Free)',
  description: 'Local guide in McLeod Ganj, Dharamshala or Kangra? Register free on Dharamshala Stay, get a profile page and receive guide bookings. 15% commission.',
  path: '/local-guides/register', lang: 'en',
});

export default function RegisterGuidePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Local guides', href: '/local-guides' }, { label: 'Register' }]} />
      <h1 className="font-heading text-3xl font-bold text-slate-900">Register as a local guide</h1>
      <p className="mt-3 text-slate-600"><strong>Short answer:</strong> fill in this free form. Our team calls you on WhatsApp, checks your ID (and your HP Tourism registration certificate, if you have one) and publishes your profile on <Link href="/local-guides" className="text-brand-600 underline">Local guides</Link>. Travellers book you through Dharamshala Stay; we send you each booking on WhatsApp and keep a 15% commission.</p>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-600">
        <li>Your phone number and email are never shown on the website.</li>
        <li>You set your own day rate and can change it any time by messaging us.</li>
        <li>Trekking guides must follow the Kangra district rules (SP permission for Triund, Kareri and Adi Himani Chamunda; up to 10 trekkers per guide).</li>
      </ul>
      <div className="mt-8"><GuideSignupForm /></div>
    </div>
  );
}
