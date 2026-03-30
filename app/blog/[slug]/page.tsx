import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Clock, ArrowLeft, MessageCircle, Tag, User } from 'lucide-react';
import { Breadcrumb, BlogCard } from '@/components/ui/Cards';
import JsonLd from '@/components/seo/JsonLd';
import { getBlogBySlug, getAllBlogSlugs, blogPosts } from '@/data/blog';
import { generateSEO, articleSchema } from '@/lib/seo';
import { formatDate, getWhatsAppLink } from '@/lib/utils';

interface Props { params: { slug: string } }

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

/**
 * Renders blog content with support for:
 * - ## Headings
 * - HTML <a> tags (for do-follow external links)
 * - [text](/path) markdown links (for internal links)
 * - Paragraph splits on \n\n
 */
function renderContent(content: string) {
  return content.split('\n\n').map((block, i) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    // Heading
    if (trimmed.startsWith('## ')) {
      return (
        <h2 key={i} className="text-xl font-heading font-bold text-slate-900 mt-8 mb-3">
          {trimmed.replace('## ', '')}
        </h2>
      );
    }

    // Process inline elements (HTML links and markdown links)
    // If block contains HTML tags, render with dangerouslySetInnerHTML
    if (trimmed.includes('<a ') || trimmed.includes('</a>')) {
      // Also convert markdown [text](/path) to HTML links
      let html = trimmed.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" class="text-brand-600 font-medium hover:text-brand-700 underline">$1</a>'
      );
      return (
        <p key={i} className="text-slate-600 leading-relaxed mb-4"
          dangerouslySetInnerHTML={{ __html: html }} />
      );
    }

    // Convert markdown links [text](/path) to JSX
    if (trimmed.includes('[') && trimmed.includes('](/')) {
      const parts = trimmed.split(/(\[[^\]]+\]\([^)]+\))/g);
      return (
        <p key={i} className="text-slate-600 leading-relaxed mb-4">
          {parts.map((part, pi) => {
            const match = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
            if (match) {
              return (
                <Link key={pi} href={match[2]} className="text-brand-600 font-medium hover:text-brand-700 underline">
                  {match[1]}
                </Link>
              );
            }
            return <span key={pi}>{part}</span>;
          })}
        </p>
      );
    }

    // Bold text **text**
    if (trimmed.includes('**')) {
      const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
      return (
        <p key={i} className="text-slate-600 leading-relaxed mb-4">
          {parts.map((part, pi) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={pi} className="text-slate-800">{part.slice(2, -2)}</strong>;
            }
            return <span key={pi}>{part}</span>;
          })}
        </p>
      );
    }

    // Regular paragraph
    return (
      <p key={i} className="text-slate-600 leading-relaxed mb-4">{trimmed}</p>
    );
  });
}

export default function BlogPostPage({ params }: Props) {
  const post = getBlogBySlug(params.slug);
  if (!post) notFound();

  const related = post.related_slugs
    .map(s => blogPosts.find(b => b.slug === s))
    .filter(Boolean) as typeof blogPosts;

  return (
    <>
      <JsonLd data={articleSchema(post)} />

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'Blog', href: '/blog' },
          { label: post.title },
        ]} />

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-3 mb-4 mt-3">
          <span className="text-xs font-semibold text-brand-600 bg-blue-50 px-2.5 py-1 rounded-full flex items-center gap-1">
            <Tag className="h-3 w-3" />{post.category}
          </span>
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />{formatDate(post.published_at)}
          </span>
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />{post.read_time} min read
          </span>
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <User className="h-3.5 w-3.5" />{post.author}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-slate-900 mb-4 leading-tight">
          {post.title}
        </h1>

        {/* Excerpt */}
        <p className="text-lg text-slate-600 mb-6 leading-relaxed">{post.excerpt}</p>

        {/* Featured image */}
        <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-10">
          <Image src={post.image} alt={post.image_alt} fill className="object-cover" priority sizes="(max-width:768px) 100vw, 768px" />
        </div>

        {/* Content */}
        <div className="prose-custom">
          {renderContent(post.content)}
        </div>

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-slate-200">
            {post.tags.map(tag => (
              <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full">#{tag}</span>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="bg-gradient-to-br from-brand-50 to-blue-50 rounded-2xl p-8 text-center mt-10 mb-10">
          <h3 className="font-heading font-bold text-xl text-slate-900 mb-2">Need Help Planning Your Dharamshala Trip?</h3>
          <p className="text-slate-600 mb-5">Our local team can help with hotels, treks, taxis, and custom itineraries.</p>
          <div className="flex justify-center gap-3">
            <Link href="/contact" className="bg-brand-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-brand-700 transition-colors">
              Get in Touch
            </Link>
            <a href={getWhatsAppLink('Hi! I just read your blog post: ' + post.title)} target="_blank" rel="noopener noreferrer"
              className="bg-green-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-green-600 transition-colors flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-heading font-bold text-slate-900 mb-4">Related Guides</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {related.map(r => <BlogCard key={r.id} post={r} />)}
            </div>
          </div>
        )}

        <Link href="/blog" className="inline-flex items-center gap-1.5 text-brand-600 font-medium mt-4 hover:text-brand-700">
          <ArrowLeft className="h-4 w-4" /> All blog posts
        </Link>
      </article>
    </>
  );
}
