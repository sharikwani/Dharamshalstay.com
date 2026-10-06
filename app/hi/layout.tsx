import RootDocument from '@/components/layout/RootDocument';
import { rootMetadata } from '@/lib/site-metadata';
import { deva } from '@/lib/fonts-hindi';

export const metadata = rootMetadata('hi');

export default function HindiRootLayout({ children }: { children: React.ReactNode }) {
  return <RootDocument lang="hi" fontClassName={deva.variable}>{children}</RootDocument>;
}
