import { DestinationCard, Breadcrumb } from '@/components/ui/Cards';
import { destinations } from '@/data/destinations';
import { generateSEO } from '@/lib/seo';
import { Metadata } from 'next';
export const metadata: Metadata = generateSEO({ title: 'Destinations in Dharamshala Region', description: 'Explore all destinations near Dharamshala.', path: '/destinations/dharamshala' });
export default function DestinationsPage() {
  return (<><section className="bg-brand-900 text-white py-10"><div className="max-w-7xl mx-auto px-4 sm:px-6"><Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Destinations' }]} /><h1 className="text-3xl font-heading font-bold mt-2">Destinations</h1></div></section><section className="py-8"><div className="max-w-7xl mx-auto px-4 sm:px-6"><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">{destinations.map(d => <DestinationCard key={d.id} destination={d} />)}</div></div></section></>);
}
