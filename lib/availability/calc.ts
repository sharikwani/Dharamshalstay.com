// Pure room-availability maths (spec 2026-10-13-room-availability). No database access here.

const DAY_MS = 86400e3;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_DAYS = 366;
export const ONLINE_HOLD_MS = 30 * 60e3;
const PAY_LATER = ['offline', 'pay_at_hotel'];
const LIVE = ['pending', 'confirmed', 'completed'];
const PAID = ['paid', 'partially_paid'];

export type StayBooking = {
  id?: string;
  status: string | null;
  payment_method: string | null;
  payment_status: string | null;
  created_at: string;
  check_in: string | null;
  check_out: string | null;
  room_key?: string | null;
  room_name?: string | null;
};

const ms = (date: string) => Date.parse(`${date}T00:00:00Z`);

/** A real calendar date written YYYY-MM-DD. */
export function isDate(s: unknown): s is string {
  if (typeof s !== 'string' || !DATE.test(s)) return false;
  const t = ms(s);
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === s;
}

export function addDays(date: string, n: number): string {
  return new Date(ms(date) + n * DAY_MS).toISOString().slice(0, 10);
}

/** Days from `from` to `to`, both counted (20th to 25th = 6). */
export function dayCount(from: string, to: string): number {
  return Math.round((ms(to) - ms(from)) / DAY_MS) + 1;
}

/** Each night of a stay: check-in day up to, not including, check-out day. Empty for bad or reversed dates. */
export function nightsOf(checkIn: string, checkOut: string): string[] {
  if (!isDate(checkIn) || !isDate(checkOut) || checkOut <= checkIn) return [];
  const out: string[] = [];
  for (let d = checkIn; d < checkOut && out.length < MAX_DAYS; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Does this booking keep a room off sale right now? Spec section 2, "What holds a room". */
export function holdsRoom(b: Pick<StayBooking, 'status' | 'payment_method' | 'payment_status' | 'created_at'>, now = new Date()): boolean {
  if (!LIVE.includes(b.status || 'pending')) return false;
  if (PAY_LATER.includes(b.payment_method || 'offline')) return true;
  if (PAID.includes(b.payment_status || '')) return true;
  const created = Date.parse(b.created_at);
  return Number.isFinite(created) && now.getTime() - created < ONLINE_HOLD_MS;
}

/** Is this booking for room type `key`? New bookings carry room_key; old ones only "Room" or "Room - Plan". */
export function matchesRoom(b: Pick<StayBooking, 'room_key' | 'room_name'>, key: string): boolean {
  if (b.room_key) return b.room_key === key;
  const name = b.room_name || '';
  return name === key || name.startsWith(`${key} - `);
}

/** True when `b` was made after `ref` (same instant: higher id), so it cannot have taken ref's room. */
export function createdAfter(b: { id?: string; created_at: string }, ref: { id: string; created_at: string }): boolean {
  const tb = Date.parse(b.created_at);
  const tr = Date.parse(ref.created_at);
  if (tb !== tr) return tb > tr;
  return String(b.id ?? '') > ref.id;
}
