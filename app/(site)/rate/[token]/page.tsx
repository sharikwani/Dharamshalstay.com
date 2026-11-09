import type { Metadata } from 'next';
import Link from 'next/link';
import { Car, Mountain, Wind } from 'lucide-react';
import RateForm from '@/components/partners/RateForm';
import { rateContext } from '@/lib/partner-reviews';
import { TRAVEL_PARTNERS } from '@/data/travel-partners';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Rate your trip', robots: { index: false, follow: false } };

const ICON = { taxi: Car, trek: Mountain, paragliding: Wind } as Record<string, typeof Car>;
const fmtDate = (d: string | null) => (d ? new Date(d + 'T00:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '');

export default async function RatePage({ params }: { params: { token: string } }) {
  const ctx = await rateContext(params.token).catch(() => null);
  if (!ctx) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-heading text-2xl font-bold text-slate-900">This rating link has expired or is not valid</h1>
        <p className="mt-2 text-slate-600">Please send us your feedback on WhatsApp instead. Thank you for travelling with us.</p>
        <Link href="/contact" className="mt-4 inline-block font-semibold text-brand-700 underline">Contact us</Link>
      </div>
    );
  }
  const profile = TRAVEL_PARTNERS.find((p) => p.partnerId === ctx.partnerId);
  const profileHref = profile ? '/travel-partners/' + profile.slug : null;
  const Icon = ICON[ctx.category] || Car;
  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Thank you for booking with Dharamshala Stay</p>
      <h1 className="mt-1 font-heading text-3xl font-bold text-slate-900">How was your trip with {ctx.partnerName}?</h1>
      <div className="mt-4 flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
        <div>
          <p className="font-semibold text-slate-900">{ctx.item}</p>
          <p>{[fmtDate(ctx.date), ctx.vehicle].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
      <div className="mt-6">
        {ctx.alreadyRated ? (
          <div className="rounded-2xl bg-green-50 p-6 text-center">
            <p className="font-semibold text-slate-900">You have already rated this trip. Thank you!</p>
            {profileHref && <Link href={profileHref} className="mt-3 inline-block font-semibold text-brand-700 underline">See {ctx.partnerName}&rsquo;s profile &rarr;</Link>}
          </div>
        ) : (
          <RateForm token={params.token} partnerName={ctx.partnerName} firstName={ctx.firstName} profile={profileHref} />
        )}
      </div>
      <p className="mt-6 text-xs text-slate-500">Your rating and first name appear on {ctx.partnerName}&rsquo;s public profile. We never show your phone number or email.</p>
    </div>
  );
}
