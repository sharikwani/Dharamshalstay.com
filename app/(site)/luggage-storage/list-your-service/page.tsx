import { Breadcrumb } from '@/components/ui/Cards';
import { generateSEO } from '@/lib/seo';
import ServiceSignupForm from '@/components/services/ServiceSignupForm';

export const metadata = generateSEO({
  title: 'List Your Luggage Storage Service in Dharamshala (Free)',
  description: 'Run a luggage storage or luggage holding service in Dharamshala, McLeod Ganj or nearby? List it free on Dharamshala Stay and get calls from travellers.',
  path: '/luggage-storage/list-your-service', lang: 'en',
});

export default function ListYourServicePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Luggage storage', href: '/luggage-storage' }, { label: 'List your service' }]} />
      <h1 className="font-heading text-3xl font-bold text-slate-900">List your luggage storage service</h1>
      <p className="mt-3 text-slate-600">Free for local businesses in Dharamshala, McLeod Ganj, Bhagsu, Dharamkot and nearby. Travellers see your price and call or WhatsApp you directly. Our team checks every listing before it goes live.</p>
      <div className="mt-8"><ServiceSignupForm /></div>
    </div>
  );
}
