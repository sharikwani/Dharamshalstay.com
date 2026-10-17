// lib/retention/rules.ts
/** Pure rules for keeping a booking the guest wants to cancel. No database access here. */

export const STEPS = ['date_change', 'next_25', 'instant_5'] as const;
export type Step = (typeof STEPS)[number];
export type Outcome = 'offered' | 'accepted' | 'declined';
export type Choice = 'refund' | 'at_hotel' | 'credit';
export type OfferRow = { step: Step; outcome: Outcome; choice?: Choice | null; amount?: number | null };

/** Only change-of-plans style reasons get offers; never medical or family emergencies, never a duplicate booking. */
export const RETENTION_REASONS = ['travel_disruption', 'weather_road', 'other'];

export const NEXT_PERCENT = 25;
export const NEXT_MAX = 2000;
export const INSTANT_PERCENT = 5;
export const VALID_MONTHS = 6;
export const COUPON_PREFIX = 'DSK';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export type RetentionBooking = {
  status: string; amount: number | null; payment_status: string | null; payment_method: string | null;
  razorpay_payment_id?: string | null; stripe_payment_intent?: string | null;
  check_in: string | null; check_out: string | null; activity_date: string | null;
};

export const isPaidOnline = (b: RetentionBooking) =>
  b.payment_status === 'paid' || b.payment_status === 'partially_paid' || !!b.razorpay_payment_id || !!b.stripe_payment_intent;

export const instantAmount = (b: RetentionBooking) => (b.amount && b.amount > 0 ? Math.round((b.amount * INSTANT_PERCENT) / 100) : 0);

/** Steps that make sense for this booking (no 5% when its price is unknown). */
export function stepsFor(b: RetentionBooking): Step[] {
  return STEPS.filter((s) => s !== 'instant_5' || instantAmount(b) > 0);
}

/**
 * What to do next: an offer still waiting for the guest's answer, the next offer to make, or null when every offer
 * was declined (then the normal cancellation rules apply). Accepted offers end the flow ('kept').
 */
export function nextStep(b: RetentionBooking, rows: OfferRow[]): { step: Step; pending: boolean } | 'kept' | null {
  if (rows.some((r) => r.outcome === 'accepted')) return 'kept';
  for (const step of stepsFor(b)) {
    const r = rows.find((x) => x.step === step);
    if (!r) return { step, pending: false };
    if (r.outcome === 'offered') return { step, pending: true };
  }
  return null;
}

/** The day a coupon starts working: the kept booking's checkout, or its activity / start day. */
export function activeFrom(b: RetentionBooking): string | null {
  return b.check_out || b.activity_date || b.check_in || null;
}

export function addMonths(isoDay: string, months: number): string {
  const d = new Date(`${isoDay}T00:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  if (d.getUTCDate() < day) d.setUTCDate(0); // 31 Aug + 6 months -> 28/29 Feb, not 3 Mar
  return d.toISOString().slice(0, 10);
}

export function makeCouponCode(randomIndex: (n: number) => number): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += ALPHABET[randomIndex(ALPHABET.length)];
  return `${COUPON_PREFIX}-${s}`;
}

/** Choices the 5% may take for this booking. */
export function instantChoices(b: RetentionBooking): Choice[] {
  return isPaidOnline(b) ? ['refund', 'credit'] : ['at_hotel', 'credit'];
}

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** The offer in plain words for the assistant to pass on. */
export function offerText(step: Step, b: RetentionBooking): string {
  if (step === 'date_change') return 'Instead of cancelling, we can move this booking to new dates free of charge (subject to availability). Would they like that?';
  if (step === 'next_25') {
    const from = activeFrom(b);
    return `If they keep this booking, they get ${NEXT_PERCENT}% off their next hotel booking with Dharamshala Stay (up to ${rupees(NEXT_MAX)}), as a coupon code that works from ${from ? day(from) : 'their checkout day'} for ${VALID_MONTHS} months. Would they like to keep the booking?`;
  }
  const amt = rupees(instantAmount(b));
  return isPaidOnline(b)
    ? `If they keep this booking, they get ${INSTANT_PERCENT}% (${amt}) back now: either refunded to their original payment within 3-5 business days, or as a ${amt} credit coupon for their next booking. Which would they prefer, or do they still want to cancel?`
    : `If they keep this booking, they get ${INSTANT_PERCENT}% (${amt}) off: either taken off what they pay at the property, or as a ${amt} credit coupon for their next booking. Which would they prefer, or do they still want to cancel?`;
}

export type CouponState = 'waiting' | 'active' | 'expired' | 'reserved' | 'used' | 'void';

/** A coupon's state today. A coupon whose kept booking was cancelled anyway is void. */
export function couponState(c: { status: string; active_from: string; valid_until: string }, bookingStatus: string | null, today: string): CouponState {
  if (c.status === 'used' || c.status === 'reserved' || c.status === 'void') return c.status as CouponState;
  if (bookingStatus === 'cancelled' || bookingStatus === 'no_show' || bookingStatus === 'failed') return 'void';
  if (today > c.valid_until) return 'expired';
  return today < c.active_from ? 'waiting' : 'active';
}

/** Rupees off a booking of `amount` with this coupon. */
export function couponDiscount(c: { kind: string; percent: number | null; amount: number | null; max_discount: number | null }, amount: number): number {
  if (c.kind === 'credit_5') return Math.min(c.amount || 0, Math.max(0, amount));
  const raw = Math.round((Math.max(0, amount) * (c.percent || 0)) / 100);
  return c.max_discount ? Math.min(raw, c.max_discount) : raw;
}
