import { Metadata } from 'next';
import HotelsView from '@/components/pages/HotelsView';
import { generateSEO } from '@/lib/seo';
import { placeImage } from '@/lib/place-images';
import { getDict } from '@/lib/i18n/dict';

export const revalidate = 60;
const t = getDict('hi').hotels;
export const metadata: Metadata = generateSEO({ title: t.metaTitle, description: t.metaDescription, path: '/hotels', image: placeImage('dharamshala-town'), lang: 'hi', keywords: ['धर्मशाला होटल', 'मैक्लोडगंज होटल', 'धर्मशाला होमस्टे'] });

export default function HindiHotelsPage() {
  return <HotelsView lang="hi" />;
}
