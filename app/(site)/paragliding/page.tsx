import ParaglidingView, { paraglidingMetadata } from '@/components/pages/ParaglidingView';

export const revalidate = 300;
export const metadata = paraglidingMetadata('en');

export default function ParaglidingPage() {
  return <ParaglidingView lang="en" />;
}
