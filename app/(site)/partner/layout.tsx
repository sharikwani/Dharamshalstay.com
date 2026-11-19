import type { Metadata } from 'next';
import PasswordChangeGate from '@/components/partner/PasswordChangeGate';

// Private/transactional pages: keep them out of search results and stop them
// inheriting the homepage canonical from the root layout.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return <><PasswordChangeGate />{children}</>;
}
