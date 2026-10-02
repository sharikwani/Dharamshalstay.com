import type { Metadata } from 'next';
import { BlogPostView, blogPostMetadata } from '@/components/pages/BlogViews';
import { getAllBlogSlugs } from '@/data/blog';

interface Props { params: { slug: string } }

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllBlogSlugs().map(slug => ({ slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  return blogPostMetadata(params.slug, 'hi');
}

export default function BlogPostPage({ params }: Props) {
  return <BlogPostView slug={params.slug} lang="hi" />;
}
