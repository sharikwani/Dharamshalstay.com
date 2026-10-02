import { BlogIndexView, blogIndexMetadata } from '@/components/pages/BlogViews';

export const metadata = blogIndexMetadata('hi');

export default function BlogPage() {
  return <BlogIndexView lang="hi" />;
}
