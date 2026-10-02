import ParaglidingView, { paraglidingMetadata } from '@/components/pages/ParaglidingView';

export const revalidate = 300;
export const metadata = paraglidingMetadata('hi');

export default function ParaglidingPage() {
  return <ParaglidingView lang="hi" />;
}
