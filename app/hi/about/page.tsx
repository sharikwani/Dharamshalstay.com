import { AboutView, aboutMetadata } from '@/components/pages/AboutContactViews';

export const metadata = aboutMetadata('hi');

export default function AboutPage() {
  return <AboutView lang="hi" />;
}
