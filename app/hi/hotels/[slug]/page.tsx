import type { Metadata } from 'next';
import HotelDetailView, { hotelMetadata } from '@/components/pages/HotelDetailView';
import { getAllPublishedSlugs } from '@/lib/db';

export const revalidate = 60;
export const dynamicParams = true;

interface Props { params: { slug: string } }

export async function generateStaticParams() {
  return (await getAllPublishedSlugs()).map(slug => ({ slug }));
}

export function generateMetadata({ params }: Props): Promise<Metadata> {
  return hotelMetadata(params.slug, 'hi');
}

export default function HindiHotelDetailPage({ params }: Props) {
  return <HotelDetailView slug={params.slug} lang="hi" />;
}
