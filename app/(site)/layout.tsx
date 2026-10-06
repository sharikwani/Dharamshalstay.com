import RootDocument from '@/components/layout/RootDocument';
import { rootMetadata } from '@/lib/site-metadata';

export const metadata = rootMetadata('en');

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <RootDocument lang="en">{children}</RootDocument>;
}
