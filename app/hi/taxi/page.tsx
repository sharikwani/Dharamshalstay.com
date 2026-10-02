import { TaxiListView, taxiMetadata } from '@/components/pages/TaxiViews';

export const revalidate = 60;
export const metadata = taxiMetadata('hi');

export default function TaxiPage() {
  return <TaxiListView lang="hi" />;
}
