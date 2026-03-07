import Link from 'next/link';
import { Breadcrumb } from '@/components/ui/Cards';
import { getPublishedProperties, getDestinations, getPublishedTreks } from '@/lib/db';
import { blogPosts } from '@/data/blog';

export const revalidate = 300;

export default async function SitemapHTML() {
  const [hotels, destinations, treks] = await Promise.all([
    getPublishedProperties(),
    getDestinations(),
    getPublishedTreks(),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Sitemap' }]} />
      <h1 className="text-3xl font-heading font-bold mb-8">Sitemap</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div><h2 className="text-lg font-semibold mb-3">Main Pages</h2><ul className="space-y-1 text-sm">{[['/', 'Home'], ['/hotels', 'Hotels'], ['/treks', 'Treks'], ['/paragliding', 'Paragliding'], ['/taxi', 'Taxi'], ['/blog', 'Blog'], ['/about', 'About'], ['/contact', 'Contact']].map(([h, l]) => <li key={h}><Link href={h} className="text-brand-600 hover:underline">{l}</Link></li>)}</ul></div>
        <div><h2 className="text-lg font-semibold mb-3">Destinations</h2><ul className="space-y-1 text-sm">{destinations.map((d: any) => <li key={d.slug}><Link href={`/destinations/${d.slug}`} className="text-brand-600 hover:underline">{d.name}</Link></li>)}</ul></div>
        <div><h2 className="text-lg font-semibold mb-3">Hotels</h2><ul className="space-y-1 text-sm">{hotels.map((h: any) => <li key={h.slug}><Link href={`/hotels/${h.slug}`} className="text-brand-600 hover:underline">{h.name}</Link></li>)}</ul></div>
        <div><h2 className="text-lg font-semibold mb-3">Treks</h2><ul className="space-y-1 text-sm">{treks.map((t: any) => <li key={t.slug}><Link href={`/treks/${t.slug}`} className="text-brand-600 hover:underline">{t.name}</Link></li>)}</ul></div>
        <div><h2 className="text-lg font-semibold mb-3">Blog</h2><ul className="space-y-1 text-sm">{blogPosts.map(b => <li key={b.slug}><Link href={`/blog/${b.slug}`} className="text-brand-600 hover:underline">{b.title}</Link></li>)}</ul></div>
        <div><h2 className="text-lg font-semibold mb-3">Portals</h2><ul className="space-y-1 text-sm"><li><Link href="/partner/register" className="text-brand-600 hover:underline">List Your Property</Link></li><li><Link href="/partner/login" className="text-brand-600 hover:underline">Partner Login</Link></li></ul></div>
      </div>
    </div>
  );
}
