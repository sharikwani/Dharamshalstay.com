import type { Metadata } from 'next';
import UnsubscribeForm from '@/components/email/UnsubscribeForm';

export const metadata: Metadata = { title: 'Email preferences', robots: { index: false, follow: false }, referrer: 'no-referrer' };

/** Linked from every marketing email. A button (not the link itself) unsubscribes, so mail scanners can't do it by accident. */
export default function UnsubscribePage({ searchParams }: { searchParams: { t?: string } }) {
  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-14">
      <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900 mb-3">Email preferences</h1>
      {searchParams.t
        ? <UnsubscribeForm token={searchParams.t} />
        : <p className="text-slate-600">This link is incomplete. Please use the unsubscribe link at the bottom of our email, or reply to it with &quot;unsubscribe&quot;.</p>}
      <p className="text-sm text-slate-500 mt-8">Booking confirmations and messages about your trips are always sent, whatever you choose here.</p>
    </div>
  );
}
