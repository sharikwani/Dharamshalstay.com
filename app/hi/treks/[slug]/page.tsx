import type { Metadata } from 'next';
import { TrekDetailView, trekMetadata } from '@/components/pages/TrekViews';
import { getPublishedTreks } from '@/lib/db';

export const revalidate = 60;
export const dynamicParams = true;

interface Props { params: { slug: string } }

export async function generateStaticParams() {
  return (await getPublishedTreks()).map((t: any) => ({ slug: t.slug }));
}

export function generateMetadata({ params }: Props): Promise<Metadata> {
  return trekMetadata(params.slug, 'hi');
}

export default function TrekPage({ params }: Props) {
  return <TrekDetailView slug={params.slug} lang="hi" />;
}
