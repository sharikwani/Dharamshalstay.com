import Link from 'next/link';
import { Metadata } from 'next';
import { BlogCard, Breadcrumb } from '@/components/ui/Cards';
import JsonLd from '@/components/seo/JsonLd';
import { blogPosts, getBlogCategories } from '@/data/blog';
import { generateSEO, breadcrumbSchema, itemListSchema } from '@/lib/seo';

export const metadata: Metadata = generateSEO({
  title: 'Dharamshala & Himachal Travel Guides 2026 - Local Tips',
  description: 'Local travel guides for Dharamshala, McLeod Ganj, Kangra, Palampur and Bir: places to visit, how to reach, best time, budgets, treks, food and itineraries.',
  path: '/blog',
  keywords: ['dharamshala travel guide', 'mcleod ganj travel guide', 'places to visit in dharamshala', 'kangra travel', 'palampur travel guide', 'himachal itinerary'],
});

export default function BlogPage() {
  const categories = getBlogCategories();
  const [latest, ...rest] = blogPosts;

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([{ name: 'Home', href: '/' }, { name: 'Travel Guides', href: '/blog' }]),
        itemListSchema(blogPosts.map((p) => ({ name: p.title, href: '/blog/' + p.slug }))),
      ]} />
      <section className="bg-brand-900 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Travel Guides' }]} />
          <h1 className="text-3xl sm:text-4xl font-heading font-bold mt-2">Dharamshala &amp; Kangra Valley Travel Guides</h1>
          <p className="text-blue-200 max-w-3xl mt-2">
            Written by our local team in Dharamshala: where to go, how to get here, what it costs, when to visit and what to
            eat -- covering McLeod Ganj, Bhagsu, Dharamkot, Naddi, Kangra, Palampur and Bir Billing.
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            {categories.map((c) => (
              <a key={c} href={'#' + c.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
                className="text-xs font-medium bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full">{c}</a>
            ))}
            <Link href="/faq" className="text-xs font-semibold bg-orange-500 hover:bg-orange-600 px-3 py-1.5 rounded-full">Questions &amp; Answers</Link>
          </div>
        </div>
      </section>

      {latest && (
        <section className="pt-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[latest, ...rest.slice(0, 5)].map((p) => <BlogCard key={p.id} post={p} />)}
            </div>
          </div>
        </section>
      )}

      {categories.map((c) => {
        const posts = blogPosts.filter((p) => p.category === c);
        return (
          <section key={c} id={c.toLowerCase().replace(/[^a-z0-9]+/g, '-')} className="py-8 scroll-mt-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
              <h2 className="text-2xl font-heading font-bold text-slate-900 mb-5">{c}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map((p) => <BlogCard key={p.id} post={p} />)}
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
}
