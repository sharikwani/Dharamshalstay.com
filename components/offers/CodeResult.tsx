// components/offers/CodeResult.tsx
import { cn } from '@/lib/utils';

export type CodeCheck = {
  valid: boolean; reason: string | null; code: string; status: string | null; path: 'paid_booking' | 'walk_in' | null;
  percent: number | null; default_percent: number | null; plan_percents: Record<string, number> | null;
  guest: { name: string | null; phone: string } | null; expires_at: string | null; booking_ref: string | null;
  property_name: string | null; redeemed_at: string | null;
};

const REASONS: Record<string, string> = {
  not_found: 'Code not found', expired: 'Expired', cancelled: 'Cancelled', already_used: 'Already used', awaiting_payment: 'Booking not paid yet',
};
const when = (s: string) => new Date(s).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** What staff need at the desk: is it valid, which kind, how much, for whom, until when. */
export default function CodeResult({ r }: { r: CodeCheck }) {
  const plans = Object.entries(r.plan_percents || {});
  return (
    <div className={cn('rounded-xl border p-4 text-sm', r.valid ? 'border-green-300 bg-green-50' : 'border-red-200 bg-red-50')}>
      <p className={cn('font-semibold text-base', r.valid ? 'text-green-800' : 'text-red-800')}>
        {r.code} — {r.valid ? 'Valid' : REASONS[r.reason || ''] || 'Not valid'}
      </p>
      {r.reason !== 'not_found' && (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-slate-700">
          {r.property_name && <><dt className="text-slate-500">Hotel</dt><dd>{r.property_name}</dd></>}
          <dt className="text-slate-500">Type</dt>
          <dd>{r.path === 'paid_booking'
            ? `Paid online booking${r.booking_ref ? ` ${r.booking_ref}` : ''} – discount already in the price, no further discount`
            : 'Walk-in coupon – apply the discount at the desk'}</dd>
          {r.percent != null && <><dt className="text-slate-500">Discount</dt><dd>{r.path === 'walk_in' ? `Up to ${r.percent}%` : `${r.percent}%`}</dd></>}
          {r.path === 'walk_in' && r.default_percent != null && (
            <><dt className="text-slate-500">By rate plan</dt>
              <dd>{plans.map(([k, v]) => `${k.replace('|', ' – ')}: ${v}%`).concat(`Other plans: ${r.default_percent}%`).join(' · ')}</dd></>
          )}
          {r.guest && <><dt className="text-slate-500">Guest</dt><dd>{r.guest.name || 'WhatsApp customer'} · {r.guest.phone}</dd></>}
          {r.path === 'walk_in' && r.expires_at && <><dt className="text-slate-500">Valid until</dt><dd>{when(r.expires_at)}</dd></>}
          {r.redeemed_at && <><dt className="text-slate-500">Used at</dt><dd>{when(r.redeemed_at)}</dd></>}
        </dl>
      )}
    </div>
  );
}
