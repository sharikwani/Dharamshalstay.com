// lib/offers/rules.ts
import { ONLINE_HOLD_MS } from '@/lib/availability/calc';
/** Pure rules for WhatsApp-only hotel offers. No database access here. */

export type Offer = {
  id: string; property_id: string; name: string; active: boolean; default_percent: number;
  plan_percents: Record<string, number>; valid_hours: number; code_prefix: string;
  created_at?: string; updated_at?: string;
};
export type CodeStatus = 'issued' | 'booked' | 'redeemed' | 'cancelled';
export type CodeState = CodeStatus | 'expired';
export type OfferCode = {
  id: string; offer_id: string; code: string; phone: string; conversation_id: string | null; percent: number;
  issued_at: string; expires_at: string; booking_id: string | null; booked_percent: number | null; status: CodeStatus;
  redeemed_at: string | null; redeemed_by: string | null; notes: string | null;
};
export type CodeBooking = {
  id: string; booking_ref: string; status: string; payment_status: string | null; created_at: string;
  guest_name: string | null; guest_phone: string | null;
};
export type CheckReason = 'not_found' | 'expired' | 'cancelled' | 'already_used' | 'awaiting_payment';
export type CodePath = 'paid_booking' | 'walk_in';
export type Verdict = { valid: boolean; reason: CheckReason | null; path: CodePath | null; percent: number | null };
export type CheckResult = Verdict & {
  code: string; status: CodeStatus | null; default_percent: number | null; plan_percents: Record<string, number> | null;
  guest: { name: string | null; phone: string } | null; expires_at: string | null; booking_ref: string | null;
  property_name: string | null; redeemed_at: string | null;
};

export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 5;
export const OFFER_NEEDS_ONLINE = 'This offer needs online payment in full';
export const REASON_TEXT: Record<CheckReason, string> = {
  not_found: 'Code not found',
  expired: 'This code has expired',
  cancelled: 'This code was cancelled',
  already_used: 'This code was already used',
  awaiting_payment: 'This code is linked to a booking that is not paid yet',
};
const DEAD_BOOKING = ['cancelled', 'failed', 'no_show'];

export function makeCode(prefix: string, randomIndex: (n: number) => number): string {
  let s = '';
  for (let i = 0; i < CODE_LENGTH; i++) s += CODE_ALPHABET[randomIndex(CODE_ALPHABET.length)];
  return `${prefix}-${s}`;
}

/** "pnv 7k3q9", "PNV7K3Q9" and "pnv-7k3q9" all become "PNV-7K3Q9". */
export function normalizeCode(input: unknown): string {
  const t = String(input ?? '').toUpperCase().replace(/[\s_]/g, '');
  const m = /^([A-Z]{2,5})-?([A-Z0-9]{5})$/.exec(t);
  return m ? `${m[1]}-${m[2]}` : t;
}

export const planKey = (room: string, plan: string) => `${room}|${plan}`;
const okPercent = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 90;

export function maxPercent(o: Pick<Offer, 'default_percent' | 'plan_percents'>): number {
  return Math.max(o.default_percent, ...Object.values(o.plan_percents || {}).filter(okPercent));
}

export function planPercent(o: Pick<Offer, 'default_percent' | 'plan_percents'>, room?: string | null, plan?: string | null): number {
  const v = room && plan ? (o.plan_percents || {})[planKey(room, plan)] : undefined;
  return okPercent(v) ? v : o.default_percent;
}

export function cappedPlanPercents(o: Pick<Offer, 'plan_percents'>, cap: number): Record<string, number> {
  return Object.fromEntries(Object.entries(o.plan_percents || {}).filter(([, v]) => okPercent(v)).map(([k, v]) => [k, Math.min(v, cap)]));
}

export const discounted = (amount: number, percent: number) => Math.round((amount * (100 - percent)) / 100);
export const isExpired = (c: Pick<OfferCode, 'expires_at'>, now = Date.now()) => Date.parse(c.expires_at) <= now;
export const hoursLeft = (expiresAt: string, now = Date.now()) => Math.max(1, Math.ceil((Date.parse(expiresAt) - now) / 3600e3));

/** A booked code goes back to 'issued' when its booking is dead, or online and still unpaid past ONLINE_HOLD_MS. */
export function shouldRelease(c: Pick<OfferCode, 'status' | 'booking_id' | 'expires_at'>, b: CodeBooking | null, now = Date.now()): boolean {
  if (c.status !== 'booked') return false;
  if (!c.booking_id) return isExpired(c, now); // claimed but never linked (crashed mid-booking)
  if (!b || DEAD_BOOKING.includes(b.status)) return true;
  return b.payment_status !== 'paid' && now - Date.parse(b.created_at) > ONLINE_HOLD_MS;
}

export function judgeCode(c: Pick<OfferCode, 'status' | 'expires_at' | 'percent' | 'booked_percent' | 'booking_id'>, b: CodeBooking | null, now = Date.now()): Verdict {
  if (c.status === 'cancelled') return { valid: false, reason: 'cancelled', path: null, percent: c.percent };
  if (c.status === 'redeemed') return { valid: false, reason: 'already_used', path: c.booking_id ? 'paid_booking' : 'walk_in', percent: c.booked_percent ?? c.percent };
  if (c.status === 'booked') {
    const paid = b?.payment_status === 'paid';
    return { valid: paid, reason: paid ? null : 'awaiting_payment', path: 'paid_booking', percent: c.booked_percent ?? c.percent };
  }
  if (isExpired(c, now)) return { valid: false, reason: 'expired', path: 'walk_in', percent: c.percent };
  return { valid: true, reason: null, path: 'walk_in', percent: c.percent };
}

export function codeState(c: Pick<OfferCode, 'status' | 'expires_at'>, now = Date.now()): CodeState {
  return c.status === 'issued' && isExpired(c, now) ? 'expired' : c.status;
}

export function formatIST(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
}

export const upToText = (o: Pick<Offer, 'default_percent' | 'plan_percents'>) => `Up to ${maxPercent(o)}% off, only through this WhatsApp chat`;

export function offerNeedsOnline(expiresAt: string, now = Date.now()): string {
  const n = hoursLeft(expiresAt, now);
  return `This offer needs online payment, which isn't available right now; show the code at reception within ${n} hour${n === 1 ? '' : 's'} instead`;
}

export function rulesLine(c: Pick<OfferCode, 'expires_at' | 'percent'>, online: boolean): string {
  const until = formatIST(c.expires_at);
  return online
    ? `Up to ${c.percent}% off. Book in this chat with the code and pay online in full before ${until} and the discount covers your whole stay, or show the code at the hotel reception before ${until}. Not valid with pay later.`
    : `Up to ${c.percent}% off. Show the code at the hotel reception before ${until}. Online payment isn't available right now.`;
}

export function roomPlans(rooms: unknown): { room: string; plans: string[] }[] {
  return (Array.isArray(rooms) ? rooms : [])
    .filter((r: any) => r && r.is_active !== false && typeof r.name === 'string' && r.name.trim())
    .map((r: any) => ({
      room: r.name as string,
      plans: (Array.isArray(r.rate_plans) ? r.rate_plans : []).map((p: any) => p?.name).filter((n: unknown): n is string => typeof n === 'string' && !!n.trim()),
    }));
}
