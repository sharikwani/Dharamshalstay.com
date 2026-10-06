import type { Metadata } from 'next';
import { BlogPostView, blogPostMetadata } from '@/components/pages/BlogViews';
import { getAllBlogSlugs } from '@/data/blog';

interface Props { params: { slug: string } }

// true so unknown slugs reach notFound() and get the styled 404 inside the layout
// (false would 404 at the router, outside any root layout, as a bare page).
export const dynamicParams = true;

export function generateStaticParams() {
  return getAllBlogSlugs().map(slug => ({ slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  return blogPostMetadata(params.slug, 'hi');
}

export default function BlogPostPage({ params }: Props) {
  return <BlogPostView slug={params.slug} lang="hi" />;
}
