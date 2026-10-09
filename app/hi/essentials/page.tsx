import EssentialsView, { essentialsMetadata } from '@/components/pages/EssentialsView';

export const revalidate = 3600;
export const metadata = essentialsMetadata('hi');

export default function EssentialsPage() {
  return <EssentialsView lang="hi" />;
}
