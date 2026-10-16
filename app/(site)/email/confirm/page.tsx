import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { serviceClient } from '@/lib/server-auth';
import { CONSENT_TEXT } from '@/lib/email/contacts';
import { deliver } from '@/lib/email/send';
import { newsletterWelcome } from '@/lib/email/templates';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Subscription confirmed', robots: { index: false, follow: false }, referrer: 'no-referrer' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Double opt-in: the link in the confirmation email lands here and turns marketing consent on. */
export default async function ConfirmPage({ searchParams }: { searchParams: { t?: string } }) {
  let ok = false;
  const t = searchParams.t || '';
  if (UUID.test(t)) {
    const sb = serviceClient();
    const now = new Date().toISOString();
    const { data } = await sb.from('contacts')
      .update({ marketing_consent: true, consent_at: now, consent_source: 'newsletter-double-opt-in', consent_text: CONSENT_TEXT.newsletter, unsubscribed_at: null, double_opt_in_token: null, updated_at: now })
      .eq('double_opt_in_token', t).is('suppressed_reason', null).select('email,name');
    ok = !!data?.length;
    if (ok && data![0].email) {
      const { subject, doc } = newsletterWelcome(data![0].name);
      await deliver({ to: data![0].email, subject, doc, kind: 'marketing', template: 'newsletter_welcome' });
    }
  }
  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-14">
      {ok ? (
        <>
          <p className="flex items-center gap-2 text-green-800 bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-6"><CheckCircle className="h-5 w-5" /> Your subscription is confirmed.</p>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900 mb-3">Welcome to Dharamshala Stay!</h1>
          <p className="text-slate-600 mb-6">Expect the occasional email, never more than one a week, with festival plans, snow alerts, seasonal guides and offers.</p>
        </>
      ) : (
        <>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900 mb-3">This link has expired</h1>
          <p className="text-slate-600 mb-6">It may have been used already. If you are not receiving our emails, sign up again at the bottom of any page.</p>
        </>
      )}
      <div className="flex gap-3">
        <Link href="/hotels" className="bg-brand-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-brand-700">Browse stays</Link>
        <Link href="/blog" className="border border-slate-300 px-5 py-2.5 rounded-xl font-semibold text-slate-700 hover:bg-slate-50">Read travel guides</Link>
      </div>
    </div>
  );
}
