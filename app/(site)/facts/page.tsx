import { FactsView, factsMetadata } from '@/components/pages/FactsViews';

export const revalidate = 3600;
export const metadata = factsMetadata();

export default function FactsPage() {
  return <FactsView />;
}
