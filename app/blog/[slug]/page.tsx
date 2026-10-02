import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Clock, ArrowLeft, MessageCircle, Tag, User, RefreshCw } from 'lucide-react';
import { Breadcrumb, BlogCard, FAQSection } from '@/components/ui/Cards';
import MarkdownContent, { extractHeadings } from '@/components/blog/MarkdownContent';
import JsonLd from '@/components/seo/JsonLd';
import { getBlogBySlug, getAllBlogSlugs, getRelatedPosts } from '@/data/blog';
import { generateSEO, articleSchema, breadcrumbSchema, faqSchema } from '@/lib/seo';
import { formatDate, getWhatsAppLink } from '@/lib/utils';

interface Props { params: { slug: string } }

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllBlogSlugs().map(slug => ({ slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const p = getBlogBySlug(params.slug);
  if (!p) return {};
  return generateSEO({
    title: p.meta_title,
    description: p.meta_description,
    path: '/blog/' + p.slug,
    type: 'article',
    publishedTime: p.published_at,
    modifiedTime: p.updated_at,
    image: p.image,
    keywords: p.tags,
  });
}

export default function BlogPostPage({ params }: Props) {
  const post = getBlogBySlug(params.slug);
  if (!post) notFound();

  const related = getRelatedPosts(post, 4);
  const headings = extractHeadings(post.content);

  return (
    <>
      <JsonLd data={[
        articleSchema(post),
        breadcrumbSchema([
          { name: 'Home', href: '/' },
          { name: 'Travel Guides', href: '/blog' },
          { name: post.title, href: '/blog/' + post.slug },
        ]),
        ...(post.faqs?.length ? [faqSchema(post.faqs)] : []),
      ]} />

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'Travel Guides', href: '/blog' },
          { label: post.title },
        ]} />

        <div className="flex flex-wrap items-center gap-3 mb-4 mt-3">
          <span className="text-xs font-semibold text-brand-600 bg-blue-50 px-2.5 py-1 rounded-full flex items-center gap-1">
            <Tag className="h-3 w-3" />{post.category}
          </span>
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />Published <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
          </span>
          {post.updated_at && post.updated_at !== post.published_at && (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <RefreshCw className="h-3.5 w-3.5" />Updated <time dateTime={post.updated_at}>{formatDate(post.updated_at)}</time>
            </span>
          )}
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />{post.read_time} min read
          </span>
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <User className="h-3.5 w-3.5" />{post.author}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-slate-900 mb-4 leading-tight">
          {post.title}
        </h1>

        <p className="text-lg text-slate-600 mb-6 leading-relaxed">{post.excerpt}</p>

        <figure className="mb-10">
          <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-slate-100">
            <Image src={post.image} alt={post.image_alt} fill className="object-cover" priority sizes="(max-width:768px) 100vw, 768px" />
          </div>
          <figcaption className="text-xs text-slate-400 mt-2">
            {post.image_alt}. Photo: Wikimedia Commons (<Link href="/photo-credits" className="underline hover:text-slate-600">credits</Link>).
          </figcaption>
        </figure>

        {headings.length >= 4 && (
          <nav aria-label="Table of contents" className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8">
            <p className="font-heading font-semibold text-slate-900 mb-2">In this guide</p>
            <ol className="list-decimal pl-5 space-y-1 text-sm">
              {headings.map(h => (
                <li key={h.id}><a href={'#' + h.id} className="text-brand-600 hover:text-brand-700 hover:underline">{h.text}</a></li>
              ))}
            </ol>
          </nav>
        )}

        <div className="prose-custom">
          <MarkdownContent content={post.content} />
        </div>

        {post.faqs && post.faqs.length > 0 && (
          <section className="mt-10">
            <h2 className="text-2xl font-heading font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
            <FAQSection faqs={post.faqs} />
            <p className="text-sm text-slate-500 mt-4">
              More answers on our <Link href="/faq" className="text-brand-600 underline">Dharamshala travel Q&amp;A page</Link>.
            </p>
          </section>
        )}

        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-slate-200">
            {post.tags.map(tag => (
              <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full">#{tag}</span>
            ))}
          </div>
        )}

        <div className="bg-gradient-to-br from-brand-50 to-blue-50 rounded-2xl p-8 text-center mt-10 mb-10">
          <h2 className="font-heading font-bold text-xl text-slate-900 mb-2">Need Help Planning Your Dharamshala Trip?</h2>
          <p className="text-slate-600 mb-5">Our local team can help with hotels, treks, taxis, and custom itineraries.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link href="/hotels" className="bg-brand-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-brand-700 transition-colors">
              Browse Hotels
            </Link>
            <a href={getWhatsAppLink('Hi! I just read your guide: ' + post.title)} target="_blank" rel="noopener noreferrer"
              className="bg-green-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-green-600 transition-colors flex items-center justify-center gap-1.5">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          </div>
        </div>

        {related.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-heading font-bold text-slate-900 mb-4">Related Guides</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {related.map(r => <BlogCard key={r.id} post={r} />)}
            </div>
          </div>
        )}

        <Link href="/blog" className="inline-flex items-center gap-1.5 text-brand-600 font-medium mt-4 hover:text-brand-700">
          <ArrowLeft className="h-4 w-4" /> All travel guides
        </Link>
      </article>
    </>
  );
}
