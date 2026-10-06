import { Metadata } from 'next';
import HotelsView from '@/components/pages/HotelsView';
import { generateSEO } from '@/lib/seo';
import { getDict } from '@/lib/i18n/dict';

export const revalidate = 60;
const t = getDict('en').hotels;
export const metadata: Metadata = generateSEO({ title: t.metaTitle, description: t.metaDescription, path: '/hotels', keywords: ['dharamshala hotels', 'mcleod ganj hotels', 'homestay dharamshala', 'budget hotels dharamshala'] });

export default function HotelsPage() {
  return <HotelsView lang="en" />;
}
