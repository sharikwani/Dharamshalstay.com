import type { Metadata } from 'next';
import { TaxiRouteView, taxiRouteMetadata } from '@/components/pages/TaxiViews';
import { getTaxiRouteGroups } from '@/lib/taxi';

export const revalidate = 3600;
export const dynamicParams = true;

interface Props { params: { slug: string } }

export async function generateStaticParams() {
  return (await getTaxiRouteGroups()).map((g) => ({ slug: g.slug }));
}

export function generateMetadata({ params }: Props): Promise<Metadata> {
  return taxiRouteMetadata(params.slug, 'hi');
}

export default function TaxiRoutePage({ params }: Props) {
  return <TaxiRouteView slug={params.slug} lang="hi" />;
}
