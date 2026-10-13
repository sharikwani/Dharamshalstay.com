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

/** A room count typed by a person or given by an import source: a positive whole number, else null (not tracked). */
export function roomCount(v: unknown): number | null {
  if (typeof v !== 'number' && typeof v !== 'string') return null;
  if (typeof v === 'string' && !v.trim()) return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export type RoomSummary = { key: string; tracked: boolean; total: number };

/** Room types of a property row's `rooms` JSON. Tracked only when it has a room count (total_inventory > 0). */
export function roomSummaries(rooms: unknown): RoomSummary[] {
  const out: RoomSummary[] = [];
  for (const r of Array.isArray(rooms) ? rooms : []) {
    const key = typeof r?.name === 'string' ? r.name : '';
    if (!key.trim() || out.some((o) => o.key === key)) continue;
    const n = Math.floor(Number(r.total_inventory));
    const tracked = Number.isFinite(n) && n > 0;
    out.push({ key, tracked, total: tracked ? n : 0 });
  }
  return out;
}

export type LeftInput = { total: number; overrides: Record<string, number>; bookings: StayBooking[]; nights: string[]; now?: Date };

const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

/** Rooms left per night (open minus holding bookings on that night) and for the whole stay (lowest night). */
export function roomsLeft({ total, overrides, bookings, nights, now = new Date() }: LeftInput): { left: number; byNight: Record<string, number> } {
  const holding = bookings.filter((b) => holdsRoom(b, now));
  const byNight: Record<string, number> = {};
  for (const n of nights) {
    const open = has(overrides, n) ? overrides[n] : total;
    const used = holding.filter((b) => !!b.check_in && !!b.check_out && b.check_in <= n && n < b.check_out).length;
    byNight[n] = open - used;
  }
  const values = nights.map((n) => byNight[n]);
  return { left: values.length ? Math.min(...values) : total, byNight };
}

export type DayCell = { date: string; open: number; booked: number; left: number; override: boolean };

/** One calendar cell per date in `input.nights`. */
export function dayCells(input: LeftInput): DayCell[] {
  const { byNight } = roomsLeft(input);
  return input.nights.map((date) => {
    const override = has(input.overrides, date);
    const open = override ? input.overrides[date] : input.total;
    return { date, open, booked: open - byNight[date], left: byNight[date], override };
  });
}

/** Every date of a 'YYYY-MM' month. */
export function monthDates(month: string): string[] {
  const first = `${month}-01`;
  if (!isDate(first)) return [];
  const out: string[] = [];
  for (let d = first; d.startsWith(month); d = addDays(d, 1)) out.push(d);
  return out;
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const i = y * 12 + (m - 1) + delta;
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
}

/** Blank cells before the 1st in a Monday-first week. */
export function weekdayOffset(month: string): number {
  return (new Date(`${month}-01T00:00:00Z`).getUTCDay() + 6) % 7;
}

export type RoomInfo = { tracked: boolean; left: number | null };
export const FEW_LEFT = 3;

/** What the hotel page shows on a room card for the chosen dates. */
export function roomBadge(info: RoomInfo | undefined): { kind: 'sold_out' } | { kind: 'few'; left: number } | null {
  if (!info?.tracked || info.left === null) return null;
  if (info.left <= 0) return { kind: 'sold_out' };
  if (info.left <= FEW_LEFT) return { kind: 'few', left: info.left };
  return null;
}
