import MonasteriesView, { monasteriesMetadata } from '@/components/pages/MonasteriesView';

export const revalidate = 86400;
export const metadata = monasteriesMetadata();

export default function MonasteriesPage() {
  return <MonasteriesView />;
}
