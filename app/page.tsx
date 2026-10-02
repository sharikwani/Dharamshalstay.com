import type { Metadata } from 'next';
import HomeView from '@/components/pages/HomeView';
import { generateSEO } from '@/lib/seo';
import { getDict } from '@/lib/i18n/dict';

export const revalidate = 3600;

const t = getDict('en').home;
export const metadata: Metadata = generateSEO({ title: t.metaTitle, description: t.metaDescription, path: '/' });

export default function HomePage() {
  return <HomeView lang="en" />;
}
