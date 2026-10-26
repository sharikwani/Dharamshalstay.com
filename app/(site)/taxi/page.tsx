import { TaxiListView, taxiMetadata } from '@/components/pages/TaxiViews';

export const revalidate = 600;
export const metadata = taxiMetadata('en');

export default function TaxiPage() {
  return <TaxiListView lang="en" />;
}
