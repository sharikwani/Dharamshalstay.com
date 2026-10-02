import { AboutView, aboutMetadata } from '@/components/pages/AboutContactViews';

export const metadata = aboutMetadata('en');

export default function AboutPage() {
  return <AboutView lang="en" />;
}
