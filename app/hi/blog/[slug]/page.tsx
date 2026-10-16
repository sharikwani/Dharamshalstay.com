import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { BlogPostView, blogPostMetadata } from '@/components/pages/BlogViews';
import { getAllBlogSlugs } from '@/data/blog';
import { hasHindiPost } from '@/lib/i18n/content';

interface Props { params: { slug: string } }

// true so unknown slugs reach notFound() and get the styled 404 inside the layout
// (false would 404 at the router, outside any root layout, as a bare page).
export const dynamicParams = true;

export function generateStaticParams() {
  return getAllBlogSlugs().filter(hasHindiPost).map(slug => ({ slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  return blogPostMetadata(params.slug, 'hi');
}

export default function BlogPostPage({ params }: Props) {
  // Not translated yet: send readers (and Google) to the English guide instead of an English page under /hi.
  if (getAllBlogSlugs().includes(params.slug) && !hasHindiPost(params.slug)) permanentRedirect('/blog/' + params.slug);
  return <BlogPostView slug={params.slug} lang="hi" />;
}
