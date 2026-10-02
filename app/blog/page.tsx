import { BlogIndexView, blogIndexMetadata } from '@/components/pages/BlogViews';

export const metadata = blogIndexMetadata('en');

export default function BlogPage() {
  return <BlogIndexView lang="en" />;
}
