import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Clock, ArrowLeft, MessageCircle } from 'lucide-react';
import { Breadcrumb, BlogCard } from '@/components/ui/Cards';
import JsonLd from '@/components/seo/JsonLd';
import { getBlogBySlug, getAllBlogSlugs, blogPosts } from '@/data/blog';
import { generateSEO, articleSchema } from '@/lib/seo';
import { formatDate, getWhatsAppLink } from '@/lib/utils';
interface Props { params: { slug: string } }
export function generateStaticParams() { return getAllBlogSlugs().map(slug => ({ slug })); }
export function generateMetadata({ params }: Props): Metadata { const p = getBlogBySlug(params.slug); if (!p) return {}; return generateSEO({ title: p.meta_title, description: p.meta_description, path: `/blog/${p.slug}`, type: 'article', publishedTime: p.published_at }); }
export default function BlogPostPage({ params }: Props) {
  const post = getBlogBySlug(params.slug);
  if (!post) notFound();
  const related = post.related_slugs.map(s => blogPosts.find(b => b.slug === s)).filter(Boolean) as typeof blogPosts;
  return (<><JsonLd data={articleSchema(post)} /><article className="max-w-3xl mx-auto px-4 sm:px-6 py-8"><Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Blog', href: '/blog' }, { label: post.title }]} /><div className="flex items-center gap-3 mb-4 mt-3"><span className="text-xs font-medium text-brand-600 bg-blue-50 px-2 py-0.5 rounded-full">{post.category}</span><span className="text-xs text-slate-500 flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{formatDate(post.published_at)}</span><span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{post.read_time} min</span></div><h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900 mb-4">{post.title}</h1><p className="text-lg text-slate-600 mb-6">{post.excerpt}</p><div className="relative aspect-[16/9] rounded-xl overflow-hidden mb-8"><Image src={post.image} alt={post.image_alt} fill className="object-cover" /></div><div className="prose prose-slate prose-lg max-w-none mb-10">{post.content.split('\n\n').map((p, i) => p.startsWith('## ') ? <h2 key={i} className="text-xl font-heading font-bold mt-6 mb-2">{p.replace('## ', '')}</h2> : <p key={i}>{p}</p>)}</div><div className="bg-blue-50 rounded-xl p-6 text-center mb-8"><h3 className="font-heading font-bold text-lg mb-2">Need Help Planning?</h3><div className="flex justify-center gap-3"><Link href="/contact" className="bg-brand-600 text-white px-5 py-2.5 rounded-lg font-medium">Inquire</Link><a href={getWhatsAppLink('Hi! Just read your blog.')} target="_blank" rel="noopener noreferrer" className="bg-green-500 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-1"><MessageCircle className="h-4 w-4" /> WhatsApp</a></div></div>{related.length > 0 && <div><h2 className="text-xl font-heading font-bold mb-4">Related Guides</h2><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{related.map(r => <BlogCard key={r.id} post={r} />)}</div></div>}<Link href="/blog" className="inline-flex items-center gap-1 text-brand-600 font-medium mt-6"><ArrowLeft className="h-4 w-4" /> All guides</Link></article></>);
}
