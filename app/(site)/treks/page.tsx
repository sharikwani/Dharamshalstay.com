import { TreksListView, treksMetadata } from '@/components/pages/TrekViews';

export const revalidate = 600;
export const metadata = treksMetadata('en');

export default function TreksPage() {
  return <TreksListView lang="en" />;
}
