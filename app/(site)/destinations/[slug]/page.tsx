import type { Metadata } from 'next';
import { DestinationDetailView, destinationMetadata } from '@/components/pages/DestinationViews';
import { getDestinations } from '@/lib/db';

export const revalidate = 60;
export const dynamicParams = true;

interface Props { params: { slug: string } }

export async function generateStaticParams() {
  return (await getDestinations()).map((d: any) => ({ slug: d.slug }));
}

export function generateMetadata({ params }: Props): Promise<Metadata> {
  return destinationMetadata(params.slug, 'en');
}

export default function DestinationPage({ params }: Props) {
  return <DestinationDetailView slug={params.slug} lang="en" />;
}
