import { TrekCard, Breadcrumb } from '@/components/ui/Cards';
import { getPublishedTreks } from '@/lib/db';
import { generateSEO } from '@/lib/seo';
import { Metadata } from 'next';

export const revalidate = 60;
export const metadata: Metadata = generateSEO({ title: 'Treks near Dharamshala – Triund, Kareri & More', description: 'Book guided treks near Dharamshala. Triund, Kareri Lake, and more.', path: '/treks' });

export default async function TreksPage() {
  const treks = await getPublishedTreks();
  return (
    <>
      <section className="bg-brand-900 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Treks' }]} />
          <h1 className="text-3xl font-heading font-bold mt-2">Treks & Experiences</h1>
          <p className="text-blue-200 max-w-2xl">From the iconic Triund ridge to hidden glacial lakes — book your next Himalayan adventure.</p>
        </div>
      </section>
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {treks.map((t: any) => <TrekCard key={t.id} trek={t} />)}
          </div>
        </div>
      </section>
    </>
  );
}
