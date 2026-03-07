import { BlogCard, Breadcrumb } from '@/components/ui/Cards';
import { blogPosts } from '@/data/blog';
import { generateSEO } from '@/lib/seo';
import { Metadata } from 'next';
export const metadata: Metadata = generateSEO({ title: 'Dharamshala Travel Blog – Guides & Tips', description: 'Travel guides, hotel reviews, trek tips from our local Dharamshala team.', path: '/blog' });
export default function BlogPage() {
  return (<><section className="bg-brand-900 text-white py-10"><div className="max-w-7xl mx-auto px-4 sm:px-6"><Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Blog' }]} /><h1 className="text-3xl font-heading font-bold mt-2">Travel Blog</h1><p className="text-blue-200">Local insights and honest guides for Dharamshala.</p></div></section><section className="py-8"><div className="max-w-7xl mx-auto px-4 sm:px-6"><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{blogPosts.map(p => <BlogCard key={p.id} post={p} />)}</div></div></section></>);
}
