import { DestinationsListView, destinationsMetadata } from '@/components/pages/DestinationViews';

export const revalidate = 300;
export const metadata = destinationsMetadata('en');

export default function DestinationsPage() {
  return <DestinationsListView lang="en" />;
}
