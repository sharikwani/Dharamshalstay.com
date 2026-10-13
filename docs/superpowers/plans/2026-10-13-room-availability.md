# Room Availability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Partners and admins set how many rooms of each room type are open per date; the hotel page and the WhatsApp assistant show/refuse sold-out room types, and `createBooking` refuses (and race-checks) bookings for a room type with nothing left.

**Architecture:** All counting is pure code in `lib/availability/calc.ts` (nights, the "holds a room" rule, rooms left, month grid cells) plus input rules in `lib/availability/validate.ts`. `lib/availability/store.ts` is the only code that reads/writes `room_availability` and the overlapping bookings (service role). `createBooking`, the WhatsApp `quote_booking` tool, three API routes (partner, admin, public) and one shared calendar component sit on top of those. Room types without a room count (`total_inventory` null/0) are never looked up, so existing behaviour is unchanged for them.

**Tech Stack:** Next.js 14 route handlers and client pages, TypeScript, Supabase (Postgres, service role client), Vitest, Tailwind, lucide-react.

**Spec:** `docs/superpowers/specs/2026-10-13-room-availability-design.md`

## Global Constraints

- Migration file: `supabase/migration-v21-room-availability.sql`. It must be applied in Supabase **before** the code is deployed (`createBooking` writes `bookings.room_key`).
- Room key = the room type's exact `name` from `properties.rooms`. Old bookings (`room_key` null) match by `room_name = key` or `room_name` starting with `key || ' - '`.
- Room types with no `total_inventory` (null or 0) are **not tracked**: always bookable, as today, and no availability query is made for them.
- Default rooms open per date = the room type's `total_inventory`; a `room_availability` row for that date overrides it.
- A booking holds a room when it is not cancelled/failed/no_show and either: pay later (`offline`, `pay_at_hotel`), any status pending/confirmed/completed; or `online` and paid; or `online`, unpaid, created in the last 30 minutes.
- One booking = one room (`num_rooms` is always 1). Sold out = `left < 1`.
- Sold-out result from `createBooking`: `{ ok: false, error: 'Sold out for these dates', status: 409 }`. Race loser: `status: 'failed'`, `cancelled_reason: 'Sold out (race)'`, same 409. Emails only after the re-check passes.
- Calendar input: units 0-999 (whole numbers), `room_key` one of the property's room names, dates `YYYY-MM-DD`, from <= to, range <= 366 days, not before today in IST (`todayIST()` from `lib/bookings/timing.ts`).
- Partner edits only properties whose `owner_id` = caller (`requireCaller(['partner'])` + `assertActive`); admin (`requireCaller(['admin'])`) edits any. `room_availability` writes only through the service role in API routes.
- Public `GET /api/availability` returns only `{ rooms: { [roomKey]: { tracked, left } } }` — no booking details.
- Prices unchanged; no per-date pricing; no channel sync; no minimum stay.
- Existing tests must keep passing. `tests/api/bookings.test.ts` stays **unchanged** (its rooms have no `total_inventory`, so the availability store is never loaded). `tests/wa-chat/booking-tools.test.ts` gets a store mock, one extra fixture hotel and new tests appended; its existing assertions are not edited.
- Commands (Windows Git Bash, repo root): tests `npx vitest run`, typecheck `npx tsc --noEmit -p .`. Quote paths containing `(` or `[` in shell commands.

## Review Focus

- A guest checking in on the day another guest checks out → the check-out day is free; it must not count as booked (test: Task 2, "a check-out day is free for the next guest").
- Two customers book the last room in the same second → only the later booking is marked failed; the first stays (tests: Task 1 `createdAfter`, Task 5 "excludeAfter … only the later of two racing bookings fails").
- Old bookings stored as `"Standard - Breakfast"` with no `room_key`, next to a room type called `"Standard Plus"` → counted for Standard only, never for Standard Plus (tests: Task 1 `matchesRoom`, Task 5 "matches old bookings by room name").
- Partner clears the "Rooms open" box and presses Save → nothing is saved (an empty box must not become 0 = sold out) (test: Task 3 `parseUnits`).
- Database hiccup during the availability check → no unchecked booking is created before insert (503 with a clear message), and a booking that passed the pre-check is kept if only the re-check fails (tests: Task 6 "pre-check failure" and "re-check failure").

Each line above has a test in the task that owns it.

---

### Task 1: Dates and the "holds a room" rule

**Files:**
- Create: `lib/availability/calc.ts`
- Test: `tests/availability/calc.test.ts`

**Interfaces:**
- Produces (all exported from `lib/availability/calc.ts`):
  - `MAX_DAYS = 366`, `ONLINE_HOLD_MS = 30 * 60e3`
  - `type StayBooking = { id?: string; status: string | null; payment_method: string | null; payment_status: string | null; created_at: string; check_in: string | null; check_out: string | null; room_key?: string | null; room_name?: string | null }`
  - `isDate(s: unknown): s is string`
  - `addDays(date: string, n: number): string`
  - `dayCount(from: string, to: string): number` (both days counted)
  - `nightsOf(checkIn: string, checkOut: string): string[]`
  - `holdsRoom(b: Pick<StayBooking, 'status' | 'payment_method' | 'payment_status' | 'created_at'>, now?: Date): boolean`
  - `matchesRoom(b: Pick<StayBooking, 'room_key' | 'room_name'>, key: string): boolean`
  - `createdAfter(b: { id?: string; created_at: string }, ref: { id: string; created_at: string }): boolean`

- [ ] **Step 1: Write the failing test**

```ts
// tests/availability/calc.test.ts
import { describe, expect, it } from 'vitest';
import { addDays, createdAfter, dayCount, holdsRoom, isDate, matchesRoom, nightsOf } from '@/lib/availability/calc';

const NOW = new Date('2026-10-13T12:00:00Z');
const bk = (over: Record<string, any> = {}) => ({
  status: 'pending', payment_method: 'online', payment_status: 'pending', created_at: '2026-10-13T11:50:00Z', ...over,
});

describe('dates', () => {
  it('isDate accepts only real calendar dates', () => {
    expect(isDate('2026-10-13')).toBe(true);
    expect(isDate('2028-02-29')).toBe(true);
    expect(isDate('2026-02-29')).toBe(false);
    expect(isDate('2026-13-01')).toBe(false);
    expect(isDate('13-10-2026')).toBe(false);
    expect(isDate(null)).toBe(false);
  });
  it('addDays and dayCount cross month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(dayCount('2026-10-20', '2026-10-25')).toBe(6);
    expect(dayCount('2026-10-20', '2026-10-20')).toBe(1);
  });
  it('nightsOf lists each night, not the check-out day', () => {
    expect(nightsOf('2026-12-30', '2027-01-02')).toEqual(['2026-12-30', '2026-12-31', '2027-01-01']);
    expect(nightsOf('2026-10-21', '2026-10-21')).toEqual([]);
    expect(nightsOf('2026-10-22', '2026-10-21')).toEqual([]);
    expect(nightsOf('2026-02-30', '2026-03-02')).toEqual([]);
  });
});

describe('holdsRoom', () => {
  it('pay-later bookings hold in every live status, whatever their age', () => {
    for (const m of ['offline', 'pay_at_hotel']) for (const s of ['pending', 'confirmed', 'completed'])
      expect(holdsRoom(bk({ payment_method: m, status: s, created_at: '2026-01-01T00:00:00Z' }), NOW)).toBe(true);
  });
  it('cancelled, failed and no-show bookings never hold', () => {
    for (const s of ['cancelled', 'failed', 'no_show']) {
      expect(holdsRoom(bk({ status: s, payment_method: 'pay_at_hotel' }), NOW)).toBe(false);
      expect(holdsRoom(bk({ status: s, payment_status: 'paid' }), NOW)).toBe(false);
    }
  });
  it('paid online bookings hold at any age', () => {
    expect(holdsRoom(bk({ payment_status: 'paid', created_at: '2026-01-01T00:00:00Z' }), NOW)).toBe(true);
    expect(holdsRoom(bk({ payment_method: 'partial_online', payment_status: 'partially_paid', created_at: '2026-01-01T00:00:00Z' }), NOW)).toBe(true);
  });
  it('unpaid online bookings hold for 30 minutes only', () => {
    expect(holdsRoom(bk({ created_at: '2026-10-13T11:30:01Z' }), NOW)).toBe(true);
    expect(holdsRoom(bk({ created_at: '2026-10-13T11:30:00Z' }), NOW)).toBe(false);
    expect(holdsRoom(bk({ created_at: '2026-10-13T09:00:00Z', payment_status: 'failed' }), NOW)).toBe(false);
    expect(holdsRoom(bk({ payment_method: 'partial_online', created_at: '2026-10-13T09:00:00Z' }), NOW)).toBe(false);
  });
  it('treats a missing status as pending and a missing method as pay later', () => {
    expect(holdsRoom(bk({ status: null, payment_method: null, created_at: '2026-01-01T00:00:00Z' }), NOW)).toBe(true);
  });
});

describe('matchesRoom', () => {
  it('uses room_key when it is set', () => {
    expect(matchesRoom({ room_key: 'Standard', room_name: 'Deluxe - Breakfast' }, 'Standard')).toBe(true);
    expect(matchesRoom({ room_key: 'Standard Plus', room_name: 'Standard - Breakfast' }, 'Standard')).toBe(false);
  });
  it('falls back to the room name and its plan suffix for old bookings', () => {
    expect(matchesRoom({ room_key: null, room_name: 'Standard' }, 'Standard')).toBe(true);
    expect(matchesRoom({ room_key: null, room_name: 'Standard - Breakfast' }, 'Standard')).toBe(true);
    expect(matchesRoom({ room_key: null, room_name: 'Standard Plus - Breakfast' }, 'Standard')).toBe(false);
    expect(matchesRoom({ room_key: null, room_name: 'Standard Plus' }, 'Standard')).toBe(false);
    expect(matchesRoom({ room_key: null, room_name: null }, 'Standard')).toBe(false);
  });
});

describe('createdAfter', () => {
  const ref = { id: 'b', created_at: '2026-10-13T10:00:00.000Z' };
  it('orders by time, then by id for the same instant', () => {
    expect(createdAfter({ id: 'a', created_at: '2026-10-13T10:00:01Z' }, ref)).toBe(true);
    expect(createdAfter({ id: 'z', created_at: '2026-10-13T09:59:59Z' }, ref)).toBe(false);
    expect(createdAfter({ id: 'c', created_at: '2026-10-13T10:00:00Z' }, ref)).toBe(true);
    expect(createdAfter({ id: 'a', created_at: '2026-10-13T10:00:00Z' }, ref)).toBe(false);
    expect(createdAfter(ref, ref)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/availability/calc.test.ts`
Expected: FAIL, cannot resolve `@/lib/availability/calc`.

- [ ] **Step 3: Implement**

```ts
// lib/availability/calc.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/availability/calc.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/availability/calc.ts tests/availability/calc.test.ts
git commit -m "Add room availability date helpers and hold rule"
```

---

### Task 2: Rooms left, month grid cells and room badges

**Files:**
- Modify: `lib/availability/calc.ts` (append)
- Test: `tests/availability/rooms-left.test.ts`

**Interfaces:**
- Consumes: `StayBooking`, `holdsRoom`, `isDate`, `addDays` (Task 1).
- Produces (appended to `lib/availability/calc.ts`):
  - `type RoomSummary = { key: string; tracked: boolean; total: number }`
  - `roomSummaries(rooms: unknown): RoomSummary[]` (unique non-blank names, in order; `tracked` = `total_inventory > 0`)
  - `type LeftInput = { total: number; overrides: Record<string, number>; bookings: StayBooking[]; nights: string[]; now?: Date }`
  - `roomsLeft(input: LeftInput): { left: number; byNight: Record<string, number> }` (may be negative)
  - `type DayCell = { date: string; open: number; booked: number; left: number; override: boolean }`
  - `dayCells(input: LeftInput): DayCell[]` (one per entry of `input.nights`)
  - `monthDates(month: string): string[]` (`'YYYY-MM'` → every date of that month)
  - `shiftMonth(month: string, delta: number): string`
  - `weekdayOffset(month: string): number` (blank cells before day 1, Monday-first)
  - `type RoomInfo = { tracked: boolean; left: number | null }`, `FEW_LEFT = 3`
  - `roomBadge(info: RoomInfo | undefined): { kind: 'sold_out' } | { kind: 'few'; left: number } | null`

- [ ] **Step 1: Write the failing test**

```ts
// tests/availability/rooms-left.test.ts
import { describe, expect, it } from 'vitest';
import { dayCells, monthDates, nightsOf, roomBadge, roomSummaries, roomsLeft, shiftMonth, weekdayOffset } from '@/lib/availability/calc';

const NOW = new Date('2099-10-13T12:00:00Z');
const stay = (check_in: string, check_out: string, over: Record<string, any> = {}) => ({
  status: 'confirmed', payment_method: 'pay_at_hotel', payment_status: 'pending', created_at: '2099-10-01T00:00:00Z', check_in, check_out, ...over,
});

describe('roomSummaries', () => {
  it('keeps unique named room types; only a positive room count is tracked', () => {
    expect(roomSummaries([
      { name: 'Standard', total_inventory: 3 }, { name: 'Dorm', total_inventory: 0 }, { name: 'Suite' },
      { name: 'Standard', total_inventory: 9 }, { name: '  ' }, null, { name: 'Loft', total_inventory: '2' },
    ])).toEqual([
      { key: 'Standard', tracked: true, total: 3 }, { key: 'Dorm', tracked: false, total: 0 },
      { key: 'Suite', tracked: false, total: 0 }, { key: 'Loft', tracked: true, total: 2 },
    ]);
    expect(roomSummaries(null)).toEqual([]);
  });
});

describe('roomsLeft', () => {
  it('uses the room count when no override is set', () => {
    const r = roomsLeft({ total: 3, overrides: {}, bookings: [stay('2099-10-20', '2099-10-22')], nights: nightsOf('2099-10-20', '2099-10-23'), now: NOW });
    expect(r.byNight).toEqual({ '2099-10-20': 2, '2099-10-21': 2, '2099-10-22': 3 });
    expect(r.left).toBe(2);
  });
  it('an override replaces the count for that night and the stay takes the lowest night', () => {
    const r = roomsLeft({ total: 3, overrides: { '2099-10-21': 0 }, bookings: [], nights: ['2099-10-20', '2099-10-21'], now: NOW });
    expect(r.byNight).toEqual({ '2099-10-20': 3, '2099-10-21': 0 });
    expect(r.left).toBe(0);
  });
  it('a check-out day is free for the next guest', () => {
    const r = roomsLeft({ total: 1, overrides: {}, bookings: [stay('2099-10-18', '2099-10-20')], nights: ['2099-10-20', '2099-10-21'], now: NOW });
    expect(r.left).toBe(1);
  });
  it('ignores bookings that do not hold a room and goes negative when oversold', () => {
    const r = roomsLeft({
      total: 1, overrides: {}, now: NOW, nights: ['2099-10-20'],
      bookings: [
        stay('2099-10-20', '2099-10-21'), stay('2099-10-19', '2099-10-22'),
        stay('2099-10-20', '2099-10-21', { status: 'cancelled' }),
        stay('2099-10-20', '2099-10-21', { payment_method: 'online', created_at: '2099-10-13T10:00:00Z' }),
      ],
    });
    expect(r.left).toBe(-1);
  });
  it('with no nights returns the room count', () => {
    expect(roomsLeft({ total: 2, overrides: {}, bookings: [], nights: [], now: NOW }).left).toBe(2);
  });
});

describe('dayCells', () => {
  it('shows open, booked and left per day and marks overrides', () => {
    expect(dayCells({
      total: 2, overrides: { '2099-10-21': 1 }, bookings: [stay('2099-10-20', '2099-10-22')],
      nights: ['2099-10-20', '2099-10-21', '2099-10-22'], now: NOW,
    })).toEqual([
      { date: '2099-10-20', open: 2, booked: 1, left: 1, override: false },
      { date: '2099-10-21', open: 1, booked: 1, left: 0, override: true },
      { date: '2099-10-22', open: 2, booked: 0, left: 2, override: false },
    ]);
  });
});

describe('month helpers', () => {
  it('monthDates lists every day of the month', () => {
    expect(monthDates('2099-10')).toHaveLength(31);
    expect(monthDates('2028-02')).toHaveLength(29);
    expect(monthDates('2026-02')[27]).toBe('2026-02-28');
    expect(monthDates('2026-02')).toHaveLength(28);
    expect(monthDates('2026-13')).toEqual([]);
  });
  it('shiftMonth crosses years', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-10', 14)).toBe('2027-12');
  });
  it('weekdayOffset is Monday-first', () => {
    expect(weekdayOffset('2026-06')).toBe(0); // 1 June 2026 is a Monday
    expect(weekdayOffset('2026-10')).toBe(3); // Thursday
    expect(weekdayOffset('2026-11')).toBe(6); // Sunday
  });
});

describe('roomBadge', () => {
  it('sold out at 0 or less, "few left" up to 3, nothing otherwise', () => {
    expect(roomBadge(undefined)).toBeNull();
    expect(roomBadge({ tracked: false, left: null })).toBeNull();
    expect(roomBadge({ tracked: true, left: 0 })).toEqual({ kind: 'sold_out' });
    expect(roomBadge({ tracked: true, left: -2 })).toEqual({ kind: 'sold_out' });
    expect(roomBadge({ tracked: true, left: 3 })).toEqual({ kind: 'few', left: 3 });
    expect(roomBadge({ tracked: true, left: 1 })).toEqual({ kind: 'few', left: 1 });
    expect(roomBadge({ tracked: true, left: 4 })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/availability/rooms-left.test.ts`
Expected: FAIL, `roomSummaries` (and the others) are not exported.

- [ ] **Step 3: Implement — append to `lib/availability/calc.ts`**

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/availability`
Expected: PASS (both files).

- [ ] **Step 5: Commit**

```bash
git add lib/availability/calc.ts tests/availability/rooms-left.test.ts
git commit -m "Add rooms-left, month grid and badge helpers"
```

---

### Task 3: Calendar input validation

**Files:**
- Create: `lib/availability/validate.ts`
- Test: `tests/availability/validate.test.ts`

**Interfaces:**
- Consumes: `isDate`, `dayCount`, `MAX_DAYS` (Task 1); `todayIST(now?: Date): string` from `lib/bookings/timing.ts` (exists).
- Produces:
  - `MAX_UNITS = 999`
  - `isMonth(s: unknown): s is string` (`YYYY-MM`, month 01-12)
  - `isUuid(s: unknown): s is string`
  - `parseUnits(s: string): number | null` (text box → whole number 0-999, else null)
  - `type RangeInput = { room_key?: unknown; from?: unknown; to?: unknown; units?: unknown }`
  - `rangeProblem(input: RangeInput, roomKeys: string[], today?: string): string | null`

- [ ] **Step 1: Write the failing test**

```ts
// tests/availability/validate.test.ts
import { describe, expect, it } from 'vitest';
import { isMonth, isUuid, parseUnits, rangeProblem } from '@/lib/availability/validate';

const KEYS = ['Standard', 'Deluxe'];
const T = '2026-10-13';
const ok = { room_key: 'Standard', from: '2026-10-20', to: '2026-10-25', units: 0 };

describe('rangeProblem', () => {
  it('accepts a valid range, including today and a single day', () => {
    expect(rangeProblem(ok, KEYS, T)).toBeNull();
    expect(rangeProblem({ ...ok, from: T, to: T, units: 999 }, KEYS, T)).toBeNull();
  });
  it('requires one of the property\'s room types', () => {
    expect(rangeProblem({ ...ok, room_key: 'Penthouse' }, KEYS, T)).toBe("Choose one of this property's room types");
    expect(rangeProblem({ ...ok, room_key: undefined }, KEYS, T)).toBe("Choose one of this property's room types");
  });
  it('requires real YYYY-MM-DD dates in order, not in the past', () => {
    expect(rangeProblem({ ...ok, from: '2026-10-32' }, KEYS, T)).toBe('Dates must be YYYY-MM-DD');
    expect(rangeProblem({ ...ok, to: '25/10/2026' }, KEYS, T)).toBe('Dates must be YYYY-MM-DD');
    expect(rangeProblem({ ...ok, from: '2026-10-26' }, KEYS, T)).toBe('The start date must be on or before the end date');
    expect(rangeProblem({ ...ok, from: '2026-10-12' }, KEYS, T)).toBe('Dates cannot be in the past');
  });
  it('allows at most 366 days', () => {
    expect(rangeProblem({ ...ok, to: '2027-10-20' }, KEYS, T)).toBeNull();
    expect(rangeProblem({ ...ok, to: '2027-10-21' }, KEYS, T)).toBe('At most 366 days at a time');
  });
  it('requires whole-number units from 0 to 999', () => {
    for (const units of [1000, -1, 1.5, '3', null, undefined]) {
      expect(rangeProblem({ ...ok, units }, KEYS, T)).toBe('Rooms open must be a whole number from 0 to 999');
    }
  });
});

describe('parseUnits', () => {
  it('never turns an empty or bad box into 0', () => {
    expect(parseUnits('')).toBeNull();
    expect(parseUnits('   ')).toBeNull();
    expect(parseUnits('abc')).toBeNull();
    expect(parseUnits('1.5')).toBeNull();
    expect(parseUnits('-1')).toBeNull();
    expect(parseUnits('1000')).toBeNull();
  });
  it('reads whole numbers 0-999', () => {
    expect(parseUnits('0')).toBe(0);
    expect(parseUnits(' 5 ')).toBe(5);
    expect(parseUnits('999')).toBe(999);
  });
});

describe('isMonth / isUuid', () => {
  it('checks formats', () => {
    expect(isMonth('2026-10')).toBe(true);
    expect(isMonth('2026-13')).toBe(false);
    expect(isMonth('2026-1')).toBe(false);
    expect(isMonth(null)).toBe(false);
    expect(isUuid('11111111-1111-4111-8111-111111111111')).toBe(true);
    expect(isUuid('nope')).toBe(false);
    expect(isUuid(null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/availability/validate.test.ts`
Expected: FAIL, cannot resolve `@/lib/availability/validate`.

- [ ] **Step 3: Implement**

```ts
// lib/availability/validate.ts
import { todayIST } from '@/lib/bookings/timing';
import { dayCount, isDate, MAX_DAYS } from './calc';

export const MAX_UNITS = 999;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isMonth = (s: unknown): s is string => typeof s === 'string' && MONTH.test(s);
export const isUuid = (s: unknown): s is string => typeof s === 'string' && UUID.test(s);

/** The calendar's "Rooms open" box. Null for empty or invalid text, so an empty box never saves 0 (sold out). */
export function parseUnits(s: string): number | null {
  const t = s.trim();
  return /^\d{1,3}$/.test(t) ? Number(t) : null;
}

export type RangeInput = { room_key?: unknown; from?: unknown; to?: unknown; units?: unknown };

/** Null when the range can be saved, else a message for the person editing (spec section 5, Validation). */
export function rangeProblem(input: RangeInput, roomKeys: string[], today = todayIST()): string | null {
  const { room_key, from, to, units } = input;
  if (typeof room_key !== 'string' || !roomKeys.includes(room_key)) return "Choose one of this property's room types";
  if (!isDate(from) || !isDate(to)) return 'Dates must be YYYY-MM-DD';
  if (from > to) return 'The start date must be on or before the end date';
  if (from < today) return 'Dates cannot be in the past';
  if (dayCount(from, to) > MAX_DAYS) return `At most ${MAX_DAYS} days at a time`;
  if (typeof units !== 'number' || !Number.isInteger(units) || units < 0 || units > MAX_UNITS) {
    return `Rooms open must be a whole number from 0 to ${MAX_UNITS}`;
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/availability/validate.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/availability/validate.ts tests/availability/validate.test.ts
git commit -m "Add room calendar input validation"
```

---

### Task 4: Database migration

**Files:**
- Create: `supabase/migration-v21-room-availability.sql`

- [ ] **Step 1: Write the migration**

```sql
-- migration-v21: room availability calendar. Run once in the Supabase SQL editor after v20. Safe to re-run.

CREATE TABLE IF NOT EXISTS room_availability (
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  room_key TEXT NOT NULL,
  date DATE NOT NULL,
  units INT NOT NULL CHECK (units >= 0),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (property_id, room_key, date)
);

-- The room type's exact name for new hotel bookings. Old bookings stay null and are matched by room_name.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS room_key TEXT;
CREATE INDEX IF NOT EXISTS idx_bookings_property_stay ON bookings(property_id, check_in, check_out);

-- Reads for the admin and the owning partner; no write policies: only the service role (API routes) writes.
ALTER TABLE room_availability ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin reads room availability" ON room_availability;
CREATE POLICY "Admin reads room availability" ON room_availability FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "Partners read own room availability" ON room_availability;
CREATE POLICY "Partners read own room availability" ON room_availability FOR SELECT USING (
  EXISTS (SELECT 1 FROM properties p WHERE p.id = room_availability.property_id AND p.owner_id = auth.uid())
);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migration-v21-room-availability.sql
git commit -m "Add room availability migration"
```

(The migration is applied to Supabase in Task 14, before the deploy.)

---

### Task 5: Availability store (service role)

**Files:**
- Create: `lib/availability/store.ts`
- Test: `tests/availability/store.test.ts`

**Interfaces:**
- Consumes: `addDays`, `createdAfter`, `dayCells`, `dayCount`, `matchesRoom`, `MAX_DAYS`, `monthDates`, `nightsOf`, `roomSummaries`, `roomsLeft`, types `DayCell`, `RoomSummary`, `StayBooking` (Tasks 1-2); `serviceClient()` from `lib/server-auth.ts`.
- Produces (every function takes an optional Supabase client last, default `serviceClient()`):
  - `type PropertySummary = { id: string; name: string; owner_id: string | null; rooms: RoomSummary[] }`
  - `type RoomAvailability = { tracked: false; left: null } | { tracked: true; left: number }`
  - `type MonthGrid = { room_key: string; tracked: boolean; total: number; days: DayCell[] }`
  - `type StoreOpts = { sb?: SupabaseClient; now?: Date; excludeAfter?: { id: string; created_at: string } }`
  - `loadProperty(id: string, sb?: SupabaseClient): Promise<PropertySummary | null>`
  - `ownedProperties(ownerId: string, sb?: SupabaseClient): Promise<PropertySummary[]>`
  - `availabilityFor(propertyId: string, checkIn: string, checkOut: string, opts?: StoreOpts): Promise<Record<string, RoomAvailability>>` — `left` may be negative; `excludeAfter` ignores bookings created after that booking (race re-check).
  - `monthGrid(propertyId: string, roomKey: string, month: string, opts?: StoreOpts): Promise<MonthGrid | null>` — null for an unknown room; `days: []` for an untracked room.
  - `setUnits(propertyId: string, roomKey: string, from: string, to: string, units: number, userId: string, sb?: SupabaseClient): Promise<number>` — upserts one row per day, returns the day count, throws for ranges outside 1-366 days.

- [ ] **Step 1: Write the failing test**

```ts
// tests/availability/store.test.ts
import { describe, expect, it } from 'vitest';
import { availabilityFor, loadProperty, monthGrid, ownedProperties, setUnits } from '@/lib/availability/store';

const PID = '11111111-1111-4111-8111-111111111111';
const NOW = new Date('2099-10-13T12:00:00Z');
const HOTEL = { id: PID, name: 'Cedar Lodge', owner_id: 'owner-1', rooms: [{ name: 'Standard', total_inventory: 2 }, { name: 'Dorm' }] };
const booking = (over: Record<string, any> = {}) => ({
  id: 'x1', room_key: 'Standard', room_name: 'Standard', check_in: '2099-10-20', check_out: '2099-10-22',
  status: 'confirmed', payment_method: 'pay_at_hotel', payment_status: 'pending', created_at: '2099-10-01T00:00:00.000Z', ...over,
});

type Call = { table: string; op: string; args: any[] };
/** Chainable stand-in for the Supabase client: records every call, returns the table's rows. */
function fakeSb(tables: Record<string, any[]>) {
  const calls: Call[] = [];
  const sb: any = {
    from(table: string) {
      const rows = tables[table] || [];
      const b: any = {
        maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
        upsert: async (...args: any[]) => { calls.push({ table, op: 'upsert', args }); return { error: null }; },
        then: (res: any, rej: any) => Promise.resolve({ data: rows, error: null }).then(res, rej),
      };
      for (const op of ['select', 'eq', 'gte', 'lt', 'gt', 'not', 'order']) {
        b[op] = (...args: any[]) => { calls.push({ table, op, args }); return b; };
      }
      return b;
    },
  };
  return { sb, calls };
}

describe('loadProperty / ownedProperties', () => {
  it('summarises room types', async () => {
    const { sb, calls } = fakeSb({ properties: [HOTEL] });
    expect(await loadProperty(PID, sb)).toEqual({
      id: PID, name: 'Cedar Lodge', owner_id: 'owner-1',
      rooms: [{ key: 'Standard', tracked: true, total: 2 }, { key: 'Dorm', tracked: false, total: 0 }],
    });
    expect(calls).toContainEqual({ table: 'properties', op: 'eq', args: ['id', PID] });
  });
  it('returns null for a missing property', async () => {
    expect(await loadProperty(PID, fakeSb({}).sb)).toBeNull();
  });
  it("lists an owner's properties", async () => {
    const { sb, calls } = fakeSb({ properties: [HOTEL] });
    expect((await ownedProperties('owner-1', sb)).map((p) => p.id)).toEqual([PID]);
    expect(calls).toContainEqual({ table: 'properties', op: 'eq', args: ['owner_id', 'owner-1'] });
  });
});

describe('availabilityFor', () => {
  it('counts overrides and holding bookings for tracked rooms; untracked rooms are open', async () => {
    const { sb, calls } = fakeSb({
      properties: [HOTEL],
      room_availability: [{ room_key: 'Standard', date: '2099-10-21', units: 1 }],
      bookings: [booking()],
    });
    const r = await availabilityFor(PID, '2099-10-20', '2099-10-22', { sb, now: NOW });
    expect(r).toEqual({ Standard: { tracked: true, left: 0 }, Dorm: { tracked: false, left: null } });
    expect(calls).toContainEqual({ table: 'bookings', op: 'eq', args: ['property_id', PID] });
    expect(calls).toContainEqual({ table: 'bookings', op: 'lt', args: ['check_in', '2099-10-22'] });
    expect(calls).toContainEqual({ table: 'bookings', op: 'gt', args: ['check_out', '2099-10-20'] });
    expect(calls).toContainEqual({ table: 'bookings', op: 'not', args: ['status', 'in', '(cancelled,failed,no_show)'] });
    expect(calls).toContainEqual({ table: 'room_availability', op: 'gte', args: ['date', '2099-10-20'] });
    expect(calls).toContainEqual({ table: 'room_availability', op: 'lt', args: ['date', '2099-10-22'] });
  });
  it('matches old bookings by room name and its plan suffix', async () => {
    const { sb } = fakeSb({
      properties: [HOTEL],
      bookings: [booking({ room_key: null, room_name: 'Standard - Breakfast' }), booking({ id: 'x2', room_key: null, room_name: 'Dorm' })],
    });
    expect((await availabilityFor(PID, '2099-10-20', '2099-10-21', { sb, now: NOW })).Standard).toEqual({ tracked: true, left: 1 });
  });
  it('makes no booking query when no room is tracked', async () => {
    const { sb, calls } = fakeSb({ properties: [{ ...HOTEL, rooms: [{ name: 'Dorm' }] }] });
    expect(await availabilityFor(PID, '2099-10-20', '2099-10-21', { sb })).toEqual({ Dorm: { tracked: false, left: null } });
    expect(calls.some((c) => c.table === 'bookings' || c.table === 'room_availability')).toBe(false);
  });
  it('returns {} for an unknown property', async () => {
    expect(await availabilityFor(PID, '2099-10-20', '2099-10-21', { sb: fakeSb({}).sb })).toEqual({});
  });
  it('excludeAfter leaves out later bookings, so only the later of two racing bookings fails', async () => {
    const first = booking({ id: 'b1', created_at: '2099-10-13T11:00:00.000Z' });
    const second = booking({ id: 'b2', created_at: '2099-10-13T11:00:00.500Z' });
    const { sb } = fakeSb({ properties: [{ ...HOTEL, rooms: [{ name: 'Standard', total_inventory: 1 }] }], bookings: [first, second] });
    expect((await availabilityFor(PID, '2099-10-20', '2099-10-22', { sb, now: NOW, excludeAfter: first })).Standard).toEqual({ tracked: true, left: 0 });
    expect((await availabilityFor(PID, '2099-10-20', '2099-10-22', { sb, now: NOW, excludeAfter: second })).Standard).toEqual({ tracked: true, left: -1 });
  });
});

describe('monthGrid', () => {
  it('builds a day grid for a tracked room', async () => {
    const { sb } = fakeSb({ properties: [HOTEL], room_availability: [{ room_key: 'Standard', date: '2099-10-21', units: 0 }], bookings: [booking()] });
    const g = await monthGrid(PID, 'Standard', '2099-10', { sb, now: NOW });
    expect(g?.days).toHaveLength(31);
    expect(g?.days[19]).toEqual({ date: '2099-10-20', open: 2, booked: 1, left: 1, override: false });
    expect(g?.days[20]).toEqual({ date: '2099-10-21', open: 0, booked: 1, left: -1, override: true });
  });
  it('returns no days for an untracked room and null for an unknown one', async () => {
    const { sb } = fakeSb({ properties: [HOTEL] });
    expect(await monthGrid(PID, 'Dorm', '2099-10', { sb })).toEqual({ room_key: 'Dorm', tracked: false, total: 0, days: [] });
    expect(await monthGrid(PID, 'Nope', '2099-10', { sb })).toBeNull();
  });
});

describe('setUnits', () => {
  it('upserts one row per day', async () => {
    const { sb, calls } = fakeSb({});
    expect(await setUnits(PID, 'Standard', '2099-10-30', '2099-11-01', 0, 'user-1', sb)).toBe(3);
    const up = calls.find((c) => c.op === 'upsert')!;
    expect(up.table).toBe('room_availability');
    expect(up.args[0].map((r: any) => r.date)).toEqual(['2099-10-30', '2099-10-31', '2099-11-01']);
    expect(up.args[0][0]).toMatchObject({ property_id: PID, room_key: 'Standard', units: 0, updated_by: 'user-1' });
    expect(up.args[1]).toEqual({ onConflict: 'property_id,room_key,date' });
  });
  it('refuses more than 366 days or reversed dates', async () => {
    const { sb, calls } = fakeSb({});
    await expect(setUnits(PID, 'Standard', '2099-01-01', '2100-01-02', 1, 'u', sb)).rejects.toThrow(/366/);
    await expect(setUnits(PID, 'Standard', '2099-01-02', '2099-01-01', 1, 'u', sb)).rejects.toThrow(/366/);
    expect(calls.some((c) => c.op === 'upsert')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/availability/store.test.ts`
Expected: FAIL, cannot resolve `@/lib/availability/store`.

- [ ] **Step 3: Implement**

```ts
// lib/availability/store.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { serviceClient } from '@/lib/server-auth';
import {
  addDays, createdAfter, dayCells, dayCount, matchesRoom, MAX_DAYS, monthDates, nightsOf, roomSummaries, roomsLeft,
  type DayCell, type RoomSummary, type StayBooking,
} from './calc';

export type PropertySummary = { id: string; name: string; owner_id: string | null; rooms: RoomSummary[] };
export type RoomAvailability = { tracked: false; left: null } | { tracked: true; left: number };
export type MonthGrid = { room_key: string; tracked: boolean; total: number; days: DayCell[] };
export type StoreOpts = { sb?: SupabaseClient; now?: Date; excludeAfter?: { id: string; created_at: string } };

const PROPERTY_COLS = 'id, name, owner_id, rooms';
const BOOKING_COLS = 'id, room_key, room_name, check_in, check_out, status, payment_method, payment_status, created_at';

const toSummary = (row: any): PropertySummary => ({ id: row.id, name: row.name || '', owner_id: row.owner_id ?? null, rooms: roomSummaries(row.rooms) });

export async function loadProperty(id: string, sb: SupabaseClient = serviceClient()): Promise<PropertySummary | null> {
  const { data, error } = await sb.from('properties').select(PROPERTY_COLS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? toSummary(data) : null;
}

export async function ownedProperties(ownerId: string, sb: SupabaseClient = serviceClient()): Promise<PropertySummary[]> {
  const { data, error } = await sb.from('properties').select(PROPERTY_COLS).eq('owner_id', ownerId).order('name');
  if (error) throw error;
  return ((data || []) as any[]).map(toSummary);
}

/** Overrides per room type and the live bookings touching any night in [from, to). */
async function loadStayData(sb: SupabaseClient, propertyId: string, from: string, to: string) {
  const [ov, bk] = await Promise.all([
    sb.from('room_availability').select('room_key, date, units').eq('property_id', propertyId).gte('date', from).lt('date', to),
    sb.from('bookings').select(BOOKING_COLS).eq('property_id', propertyId).lt('check_in', to).gt('check_out', from)
      .not('status', 'in', '(cancelled,failed,no_show)'),
  ]);
  if (ov.error) throw ov.error;
  if (bk.error) throw bk.error;
  const overrides: Record<string, Record<string, number>> = {};
  for (const r of (ov.data || []) as any[]) {
    const room = (overrides[r.room_key] = overrides[r.room_key] || {});
    room[String(r.date).slice(0, 10)] = Number(r.units);
  }
  return { overrides, bookings: (bk.data || []) as StayBooking[] };
}

/** Rooms left for a stay, per room type. Untracked room types: { tracked: false, left: null }. */
export async function availabilityFor(propertyId: string, checkIn: string, checkOut: string, opts: StoreOpts = {}): Promise<Record<string, RoomAvailability>> {
  const sb = opts.sb ?? serviceClient();
  const out: Record<string, RoomAvailability> = {};
  const prop = await loadProperty(propertyId, sb);
  if (!prop) return out;
  const tracked = prop.rooms.filter((r) => r.tracked);
  for (const r of prop.rooms) if (!r.tracked) out[r.key] = { tracked: false, left: null };
  const nights = nightsOf(checkIn, checkOut);
  if (!tracked.length || !nights.length) {
    for (const r of tracked) out[r.key] = { tracked: true, left: r.total };
    return out;
  }
  const { overrides, bookings } = await loadStayData(sb, propertyId, nights[0], addDays(nights[nights.length - 1], 1));
  const ref = opts.excludeAfter;
  const counted = ref ? bookings.filter((b) => !createdAfter(b, ref)) : bookings;
  for (const r of tracked) {
    const { left } = roomsLeft({ total: r.total, overrides: overrides[r.key] || {}, bookings: counted.filter((b) => matchesRoom(b, r.key)), nights, now: opts.now });
    out[r.key] = { tracked: true, left };
  }
  return out;
}

/** Open / booked / left for each day of a month, for the partner and admin calendars. */
export async function monthGrid(propertyId: string, roomKey: string, month: string, opts: StoreOpts = {}): Promise<MonthGrid | null> {
  const sb = opts.sb ?? serviceClient();
  const prop = await loadProperty(propertyId, sb);
  const room = prop?.rooms.find((r) => r.key === roomKey);
  if (!room) return null;
  const dates = monthDates(month);
  if (!room.tracked || !dates.length) return { room_key: roomKey, tracked: room.tracked, total: room.total, days: [] };
  const { overrides, bookings } = await loadStayData(sb, propertyId, dates[0], addDays(dates[dates.length - 1], 1));
  return {
    room_key: roomKey, tracked: true, total: room.total,
    days: dayCells({ total: room.total, overrides: overrides[roomKey] || {}, bookings: bookings.filter((b) => matchesRoom(b, roomKey)), nights: dates, now: opts.now }),
  };
}

/** Set rooms open for every day from..to (inclusive). Callers validate first (rangeProblem); this only guards the size. */
export async function setUnits(propertyId: string, roomKey: string, from: string, to: string, units: number, userId: string, sb: SupabaseClient = serviceClient()): Promise<number> {
  const n = dayCount(from, to);
  if (!(n >= 1 && n <= MAX_DAYS)) throw new Error(`setUnits: range must be 1-${MAX_DAYS} days`);
  const updated_at = new Date().toISOString();
  const rows = Array.from({ length: n }, (_, i) => ({ property_id: propertyId, room_key: roomKey, date: addDays(from, i), units, updated_by: userId, updated_at }));
  const { error } = await sb.from('room_availability').upsert(rows, { onConflict: 'property_id,room_key,date' });
  if (error) throw error;
  return n;
}
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest run tests/availability && npx tsc --noEmit -p .`
Expected: PASS; no type errors.

- [ ] **Step 5: Commit**

```bash
git add lib/availability/store.ts tests/availability/store.test.ts
git commit -m "Add room availability store"
```

---

### Task 6: Sold-out guard and race re-check in `createBooking`

**Files:**
- Modify: `lib/bookings/create.ts` (imports lines 1-4; after `CreateResult` lines 32-34; around `room_label` line 82; insert row line 111; after the insert error block lines 114-117)
- Test: `tests/bookings/create-availability.test.ts` (new). `tests/api/bookings.test.ts` stays unchanged and must pass.

**Interfaces:**
- Consumes: `roomSummaries` (Task 2); `availabilityFor(propertyId, checkIn, checkOut, { sb, excludeAfter })` and `type RoomAvailability` (Task 5), loaded with a dynamic `import('@/lib/availability/store')` only for tracked room types.
- Produces: `createBooking` behaviour — tracked room with `left < 1` → `{ ok: false, error: 'Sold out for these dates', status: 409 }` (no insert); oversold after insert → booking updated to `{ status: 'failed', cancelled_reason: 'Sold out (race)' }` and the same 409; pre-check error → `{ ok: false, error: 'Could not check room availability. Please try again in a minute.', status: 503 }`; inserts `room_key` (exact room type name, or null).

Why `tests/api/bookings.test.ts` keeps passing without edits: its hotel rooms (`Deluxe`, `Standard`) have no `total_inventory`, so `roomInfo.tracked` is false, the store is never imported, and no new Supabase calls are made. The only change it sees is an extra `room_key: 'Deluxe'` field in the inserted row, which it does not assert on.

- [ ] **Step 1: Write the failing test**

```ts
// tests/bookings/create-availability.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const HOTEL_ID = '11111111-1111-4111-8111-111111111111';
const h = vi.hoisted(() => ({
  inserted: [] as any[], updates: [] as any[], emails: [] as string[],
  avail: [] as any[], availCalls: [] as any[], throwOnCall: 0,
  hotel: {
    id: '11111111-1111-4111-8111-111111111111', name: 'Cedar Lodge', price_min: 500, commission_pct: 10,
    rooms: [
      { name: 'Standard', base_price: 1500, total_inventory: 2, rate_plans: [] },
      { name: 'Dorm', base_price: 500, rate_plans: [] },
    ],
  },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: table === 'properties' ? h.hotel : null }) }) }),
      insert: (row: any) => {
        if (table === 'bookings') h.inserted.push(row);
        return {
          select: () => ({ single: async () => ({ data: { id: 'b1', booking_ref: 'BKG-1', created_at: '2099-01-01T00:00:00.000Z', ...row }, error: null }) }),
          then: (r: any) => r({ error: null }),
        };
      },
      update: (patch: any) => ({ eq: async (_c: string, id: string) => { h.updates.push({ table, patch, id }); return { error: null }; } }),
    }),
  }),
}));
vi.mock('@/lib/availability/store', () => ({
  availabilityFor: async (...args: any[]) => {
    h.availCalls.push(args);
    if (h.throwOnCall === h.availCalls.length) throw new Error('db down');
    return h.avail.shift() ?? {};
  },
}));
vi.mock('@/lib/booking-emails', () => ({ sendBookingEmails: async (id: string) => { h.emails.push(id); } }));

import { bookingSchema, createBooking } from '@/lib/bookings/create';

const input = (over: Record<string, any> = {}) => bookingSchema.parse({
  category: 'hotel', property_id: HOTEL_ID, guest_name: 'Asha Rao', guest_phone: '9999999999', num_guests: 2,
  check_in: '2099-10-21', check_out: '2099-10-23', room_name: 'Standard', payment_method: 'pay_at_hotel', ...over,
});
const book = (over: Record<string, any> = {}) => createBooking(input(over), { userId: null });

beforeEach(() => {
  Object.assign(h, { inserted: [], updates: [], emails: [], avail: [], availCalls: [], throwOnCall: 0 });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://supabase.test');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
  vi.stubEnv('STRIPE_SECRET_KEY', '');
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('createBooking room availability', () => {
  it('refuses a sold-out room type with 409 and inserts nothing', async () => {
    h.avail = [{ Standard: { tracked: true, left: 0 } }];
    expect(await book()).toEqual({ ok: false, error: 'Sold out for these dates', status: 409 });
    expect(h.inserted).toEqual([]);
    expect(h.emails).toEqual([]);
    expect(h.availCalls[0].slice(0, 3)).toEqual([HOTEL_ID, '2099-10-21', '2099-10-23']);
  });

  it('books when a room is left, stores room_key and re-checks against the new booking', async () => {
    h.avail = [{ Standard: { tracked: true, left: 1 } }, { Standard: { tracked: true, left: 0 } }];
    const r = await book({ plan_name: 'Room Only' });
    expect(r).toMatchObject({ ok: true, booking: { id: 'b1' }, amount: 3000 });
    expect(h.inserted[0]).toMatchObject({ room_key: 'Standard', room_name: 'Standard - Room Only' });
    expect(h.availCalls).toHaveLength(2);
    expect(h.availCalls[1][3]).toMatchObject({ excludeAfter: { id: 'b1', created_at: '2099-01-01T00:00:00.000Z' } });
    expect(h.emails).toEqual(['b1']);
  });

  it('marks the new booking failed when the re-check finds a night oversold, and sends no emails', async () => {
    h.avail = [{ Standard: { tracked: true, left: 1 } }, { Standard: { tracked: true, left: -1 } }];
    expect(await book()).toEqual({ ok: false, error: 'Sold out for these dates', status: 409 });
    expect(h.updates).toEqual([{ table: 'bookings', patch: { status: 'failed', cancelled_reason: 'Sold out (race)' }, id: 'b1' }]);
    expect(h.emails).toEqual([]);
  });

  it('leaves untracked room types alone', async () => {
    const r = await book({ room_name: 'Dorm' });
    expect(r.ok).toBe(true);
    expect(h.availCalls).toEqual([]);
    expect(h.inserted[0].room_key).toBe('Dorm');
  });

  it('stores room_key null for a room name that is not one of the room types', async () => {
    const r = await book({ room_name: 'Penthouse' });
    expect(r.ok).toBe(true);
    expect(h.availCalls).toEqual([]);
    expect(h.inserted[0].room_key).toBeNull();
  });

  it('pre-check failure: no booking, 503 with a clear message', async () => {
    h.throwOnCall = 1;
    expect(await book()).toEqual({ ok: false, error: 'Could not check room availability. Please try again in a minute.', status: 503 });
    expect(h.inserted).toEqual([]);
  });

  it('re-check failure: the booking that passed the pre-check is kept', async () => {
    h.avail = [{ Standard: { tracked: true, left: 1 } }];
    h.throwOnCall = 2;
    const r = await book();
    expect(r.ok).toBe(true);
    expect(h.updates).toEqual([]);
    expect(h.emails).toEqual(['b1']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/bookings/create-availability.test.ts`
Expected: FAIL — the sold-out test gets `ok: true` and `room_key` is undefined.

- [ ] **Step 3: Implement — edit `lib/bookings/create.ts`**

3a. Imports. Replace

```ts
import { todayIST } from './timing';
```

with

```ts
import { todayIST } from './timing';
import { roomSummaries } from '@/lib/availability/calc';
import type { RoomAvailability } from '@/lib/availability/store';
```

3b. After the `CreateResult` type (ends with `| { ok: false; error: string; status: number };`) add:

```ts

const SOLD_OUT = 'Sold out for these dates';
```

3c. Replace the line

```ts
    const room_label = data.room_name ? (data.plan_name ? `${data.room_name} - ${data.plan_name}` : data.room_name) : null;
```

with

```ts
    const room_label = data.room_name ? (data.plan_name ? `${data.room_name} - ${data.plan_name}` : data.room_name) : null;

    // Room calendar (spec 2026-10-13-room-availability, section 7). Only room types with a room count are checked;
    // the store is loaded only then, so untracked hotels make exactly the same queries as before.
    const roomInfo = data.category === 'hotel' && data.property_id && data.room_name
      ? roomSummaries(entity?.rooms).find((r) => r.key === data.room_name) : undefined;
    const room_key = roomInfo ? roomInfo.key : null;
    const availability = roomInfo?.tracked ? await import('@/lib/availability/store') : null;
    const stay = { propertyId: data.property_id || '', checkIn: data.check_in || '', checkOut: data.check_out || '' };
    if (availability && room_key) {
      let before: RoomAvailability | undefined;
      try {
        before = (await availability.availabilityFor(stay.propertyId, stay.checkIn, stay.checkOut, { sb }))[room_key];
      } catch (e) {
        console.error('Availability check failed:', e);
        return { ok: false, error: 'Could not check room availability. Please try again in a minute.', status: 503 };
      }
      if (before?.tracked && before.left < 1) return { ok: false, error: SOLD_OUT, status: 409 };
    }
```

3d. In the insert row, replace

```ts
      room_name: room_label,
    }).select().single();
```

with

```ts
      room_name: room_label,
      room_key,
    }).select().single();
```

3e. Directly after the insert error block

```ts
    if (error) {
      console.error('Booking insert error:', error);
      return { ok: false, error: 'Failed to create booking', status: 500 };
    }
```

add

```ts

    // Re-check now that this booking exists. Bookings made after it are ignored, so when two people take the
    // last room at once only the later one loses. If only the re-check itself fails, the booking stands.
    if (availability && room_key) {
      try {
        const after = (await availability.availabilityFor(stay.propertyId, stay.checkIn, stay.checkOut, {
          sb, excludeAfter: { id: booking.id, created_at: booking.created_at },
        }))[room_key];
        if (after?.tracked && after.left < 0) {
          const { error: failErr } = await sb.from('bookings').update({ status: 'failed', cancelled_reason: 'Sold out (race)' }).eq('id', booking.id);
          if (failErr) console.error('Sold-out race: could not mark booking failed', booking.id, failErr);
          return { ok: false, error: SOLD_OUT, status: 409 };
        }
      } catch (e) {
        console.error('Availability re-check failed (booking kept):', e);
      }
    }
```

The notification logging and `sendBookingEmails` that follow are unchanged, so they only run after the re-check passes.

- [ ] **Step 4: Run the new and the existing booking tests**

Run: `npx vitest run tests/bookings tests/api/bookings.test.ts tests/wa-chat`
Expected: PASS — the 7 new tests, and every existing test with no edits.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/bookings/create.ts tests/bookings/create-availability.test.ts
git commit -m "Refuse sold-out room types in createBooking and re-check races"
```

---

### Task 7: WhatsApp `quote_booking` checks availability

**Files:**
- Modify: `lib/wa-chat/booking-tools.ts` (imports lines 1-10; `quoteTool` after line 95)
- Modify: `tests/wa-chat/booking-tools.test.ts` (hoisted state, `findHotel` mock, new store mock, `beforeEach` reset, new `describe` at the end — existing tests are not edited)

**Interfaces:**
- Consumes: `roomSummaries` (Task 2), `availabilityFor(propertyId, checkIn, checkOut)` (Task 5).
- Produces: `quote_booking` for a hotel whose chosen room type is tracked and has `left < 1` returns, without saving a quote:
  - `{ error: '<Room> is sold out for <check_in> to <check_out>. Offer one of the rooms that still have space.', rooms_available: string[] }` (active room types that are untracked or have `left >= 1`), or
  - `{ error: '<Hotel> is fully booked for <check_in> to <check_out>. Ask the customer for other dates.', rooms_available: [] }`.

- [ ] **Step 1: Extend the test file**

1a. In the `vi.hoisted` object, replace

```ts
  checkout: { ok: true, url: 'https://pay/x', sessionId: 's' } as any, released: [] as any[],
```

with

```ts
  avail: {} as any, availCalls: [] as any[],
  checkout: { ok: true, url: 'https://pay/x', sessionId: 's' } as any, released: [] as any[],
```

1b. In the `@/lib/wa-chat/find` mock, replace

```ts
    rooms: [{ name: 'Deluxe', base_price: 2500, is_active: true, rate_plans: [{ name: 'Room Only', price: 2500 }, { name: 'Breakfast', price: 3000 }] }],
  } : null,
```

with

```ts
    rooms: [{ name: 'Deluxe', base_price: 2500, is_active: true, rate_plans: [{ name: 'Room Only', price: 2500 }, { name: 'Breakfast', price: 3000 }] }],
  } : n.toLowerCase().includes('cedar') ? {
    id: '77777777-7777-4777-8777-777777777777', name: 'Cedar Lodge', slug: 'cedar-lodge', price_min: 1800,
    rooms: [
      { name: 'Standard', base_price: 1800, total_inventory: 2, is_active: true, rate_plans: [] },
      { name: 'Deluxe', base_price: 2600, total_inventory: 1, is_active: true, rate_plans: [] },
      { name: 'Suite', base_price: 5000, total_inventory: 1, is_active: false, rate_plans: [] },
    ],
  } : null,
```

1c. Directly after the `vi.mock('@/lib/server-auth', ...)` line add

```ts
vi.mock('@/lib/availability/store', () => ({ availabilityFor: async (...a: any[]) => { h.availCalls.push(a); return h.avail; } }));
```

1d. In `beforeEach`, replace

```ts
  Object.assign(h, { quotes: [], quote: goodQuote(),
```

with

```ts
  Object.assign(h, { avail: {}, availCalls: [], quotes: [], quote: goodQuote(),
```

1e. Append at the end of the file:

```ts
describe('quote_booking room availability', () => {
  const CEDAR_ID = '77777777-7777-4777-8777-777777777777';
  const ask = (room: string) => run('quote_booking', { category: 'hotel', name: 'Cedar Lodge', check_in: '2099-10-21', check_out: '2099-10-23', guests: 2, room_name: room });

  it('refuses a sold-out room and lists the active rooms that still have space', async () => {
    h.avail = { Standard: { tracked: true, left: 0 }, Deluxe: { tracked: true, left: 1 }, Suite: { tracked: true, left: 1 } };
    const r = await ask('Standard');
    expect(r.error).toBe('Standard is sold out for 2099-10-21 to 2099-10-23. Offer one of the rooms that still have space.');
    expect(r.rooms_available).toEqual(['Deluxe']);
    expect(h.availCalls).toEqual([[CEDAR_ID, '2099-10-21', '2099-10-23']]);
    expect(h.quotes).toEqual([]);
  });

  it('says the hotel is fully booked when no active room has space', async () => {
    h.avail = { Standard: { tracked: true, left: 0 }, Deluxe: { tracked: true, left: 0 }, Suite: { tracked: true, left: 1 } };
    const r = await ask('Deluxe');
    expect(r.error).toBe('Cedar Lodge is fully booked for 2099-10-21 to 2099-10-23. Ask the customer for other dates.');
    expect(r.rooms_available).toEqual([]);
    expect(h.quotes).toEqual([]);
  });

  it('quotes a tracked room that has space', async () => {
    h.avail = { Standard: { tracked: true, left: 1 }, Deluxe: { tracked: true, left: 0 }, Suite: { tracked: true, left: 0 } };
    const r = await ask('Standard');
    expect(r.amount).toBe(3600);
    expect(h.quotes).toHaveLength(1);
  });

  it('does not look up availability for room types without a room count', async () => {
    await run('quote_booking', { category: 'hotel', name: 'Pine View', check_in: '2099-10-24', check_out: '2099-10-26', guests: 2, room_name: 'deluxe' });
    expect(h.availCalls).toEqual([]);
    expect(h.quotes).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify the new tests fail**

Run: `npx vitest run tests/wa-chat/booking-tools.test.ts`
Expected: FAIL — the two sold-out tests get a saved quote instead of an error; all older tests still PASS.

- [ ] **Step 3: Implement — edit `lib/wa-chat/booking-tools.ts`**

3a. After `import { serviceClient } from '@/lib/server-auth';` add

```ts
import { roomSummaries } from '@/lib/availability/calc';
import { availabilityFor } from '@/lib/availability/store';
```

3b. Above `async function quoteTool(` add

```ts
/** Tracked hotel room with nothing left: an error naming the room types that still have space (null = go ahead). */
async function soldOutCheck(hotel: Record<string, any>, input: Record<string, any>) {
  const room = roomSummaries(hotel.rooms).find((x) => x.key === input.room_name);
  if (!room?.tracked) return null;
  const avail = await availabilityFor(hotel.id, input.check_in, input.check_out);
  const mine = avail[room.key];
  if (!mine?.tracked || mine.left >= 1) return null;
  const active = ((hotel.rooms || []) as any[]).filter((x) => x?.is_active !== false).map((x) => x.name);
  const open = Object.keys(avail).filter((k) => {
    const v = avail[k];
    return k !== room.key && active.includes(k) && (!v.tracked || v.left >= 1);
  });
  const when = `${input.check_in} to ${input.check_out}`;
  return open.length
    ? { error: `${room.key} is sold out for ${when}. Offer one of the rooms that still have space.`, rooms_available: open }
    : { error: `${hotel.name} is fully booked for ${when}. Ask the customer for other dates.`, rooms_available: [] as string[] };
}

```

3c. In `quoteTool`, after

```ts
  if (!UUID.test(String(r.entity.id || ''))) return { error: 'This item cannot be booked in chat. Offer create_enquiry instead.' };
```

add

```ts
  if (category === 'hotel' && r.input.room_name) {
    const sold = await soldOutCheck(r.entity, r.input);
    if (sold) return sold;
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/wa-chat`
Expected: PASS (all, including the 4 new tests).

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

```bash
git add lib/wa-chat/booking-tools.ts tests/wa-chat/booking-tools.test.ts
git commit -m "Refuse sold-out rooms in WhatsApp quotes and suggest open ones"
```

---

### Task 8: Partner availability API

**Files:**
- Create: `lib/availability/handlers.ts`
- Create: `app/api/partner/availability/route.ts`
- Test: `tests/api/partner-availability.test.ts`

**Interfaces:**
- Consumes: `loadProperty`, `ownedProperties`, `monthGrid`, `setUnits`, `PropertySummary` (Task 5); `isMonth`, `isUuid`, `rangeProblem` (Task 3); `requireCaller`, `jsonError` (`lib/server-auth.ts`); `assertActive(status)` (`lib/partners/load.ts`).
- Produces:
  - `lib/availability/handlers.ts`: `publicProperty(p: PropertySummary): { id: string; name: string; rooms: RoomSummary[] }`, `gridResponse(prop: PropertySummary, params: URLSearchParams): Promise<NextResponse>`, `putResponse(prop: PropertySummary, body: any, userId: string): Promise<NextResponse>`, `readJson(req: Request): Promise<any | null>`, `UNTRACKED_ERROR: string`.
  - `GET /api/partner/availability` → `{ properties: { id, name, rooms }[] }` (own properties only, no `owner_id`).
  - `GET /api/partner/availability?property_id&room_key&month=YYYY-MM` → `{ property, grid: MonthGrid }`; without `room_key` → `{ property }`.
  - `PUT /api/partner/availability` body `{ property_id, room_key, from, to, units }` → `{ ok: true, days: number }`.
  - Errors: 400 bad input, 401/403 from `requireCaller`/`assertActive`, 404 `Property not found` (missing or not owned), 409 untracked room type.

- [ ] **Step 1: Write the failing test**

```ts
// tests/api/partner-availability.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const OWN = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const h = vi.hoisted(() => ({
  role: 'partner', status: 'verified' as string | null, setCalls: [] as any[], gridCalls: [] as any[],
  props: {
    '11111111-1111-4111-8111-111111111111': { id: '11111111-1111-4111-8111-111111111111', name: 'Own Hotel', owner_id: 'p1', rooms: [{ key: 'Standard', tracked: true, total: 3 }, { key: 'Dorm', tracked: false, total: 0 }] },
    '22222222-2222-4222-8222-222222222222': { id: '22222222-2222-4222-8222-222222222222', name: 'Other Hotel', owner_id: 'p2', rooms: [{ key: 'Standard', tracked: true, total: 2 }] },
  } as Record<string, any>,
}));

vi.mock('@/lib/server-auth', async (orig) => {
  const actual = await orig<typeof import('@/lib/server-auth')>();
  return {
    ...actual,
    requireCaller: async (_req: Request, roles?: string[]) => {
      if (roles && !roles.includes(h.role)) throw new actual.HttpError(403, 'You do not have access to this');
      return { user: { id: 'user-p1' }, profile: { id: 'p1', role: h.role, partner_status: h.status } };
    },
  };
});
vi.mock('@/lib/availability/store', () => ({
  loadProperty: async (id: string) => h.props[id] ?? null,
  ownedProperties: async (owner: string) => Object.values(h.props).filter((p: any) => p.owner_id === owner),
  monthGrid: async (...a: any[]) => { h.gridCalls.push(a); return { room_key: a[1], tracked: true, total: 3, days: [] }; },
  setUnits: async (...a: any[]) => { h.setCalls.push(a); return 3; },
}));

import { GET, PUT } from '@/app/api/partner/availability/route';

const URL_BASE = 'http://x/api/partner/availability';
const get = (q = '') => GET(new Request(`${URL_BASE}${q}`));
const put = (body: any) => PUT(new Request(URL_BASE, { method: 'PUT', body: typeof body === 'string' ? body : JSON.stringify(body) }));
const range = (over: Record<string, any> = {}) => ({ property_id: OWN, room_key: 'Standard', from: '2099-10-20', to: '2099-10-22', units: 0, ...over });

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  Object.assign(h, { role: 'partner', status: 'verified', setCalls: [], gridCalls: [] });
});

describe('GET /api/partner/availability', () => {
  it('lists only the caller\'s properties, without owner ids', async () => {
    const body = await (await get()).json();
    expect(body.properties).toEqual([{ id: OWN, name: 'Own Hotel', rooms: h.props[OWN].rooms }]);
  });
  it('returns the month grid for an own property', async () => {
    const res = await get(`?property_id=${OWN}&room_key=Standard&month=2099-10`);
    expect(res.status).toBe(200);
    expect((await res.json()).grid.room_key).toBe('Standard');
    expect(h.gridCalls).toEqual([[OWN, 'Standard', '2099-10']]);
  });
  it('returns the property alone when no room is chosen', async () => {
    const body = await (await get(`?property_id=${OWN}`)).json();
    expect(body).toEqual({ property: { id: OWN, name: 'Own Hotel', rooms: h.props[OWN].rooms } });
  });
  it('hides another owner\'s property (404) and never reads its grid', async () => {
    expect((await get(`?property_id=${OTHER}&room_key=Standard&month=2099-10`)).status).toBe(404);
    expect(h.gridCalls).toEqual([]);
  });
  it('rejects a bad month, unknown room or bad id with 400', async () => {
    expect((await get(`?property_id=${OWN}&room_key=Standard&month=2099-13`)).status).toBe(400);
    expect((await get(`?property_id=${OWN}&room_key=Penthouse&month=2099-10`)).status).toBe(400);
    expect((await get('?property_id=nope')).status).toBe(400);
  });
  it('blocks non-partners and suspended or rejected partners', async () => {
    h.role = 'customer';
    expect((await get()).status).toBe(403);
    h.role = 'partner';
    for (const s of ['suspended', 'rejected']) { h.status = s; expect((await get()).status).toBe(403); }
  });
});

describe('PUT /api/partner/availability', () => {
  it('saves a range for an own property', async () => {
    const res = await put(range());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, days: 3 });
    expect(h.setCalls).toEqual([[OWN, 'Standard', '2099-10-20', '2099-10-22', 0, 'user-p1']]);
  });
  it('refuses another owner\'s property with 404', async () => {
    expect((await put(range({ property_id: OTHER }))).status).toBe(404);
    expect(h.setCalls).toEqual([]);
  });
  it('validates the range', async () => {
    for (const over of [{ units: 1000 }, { units: -1 }, { from: '2001-01-01' }, { room_key: 'Penthouse' }, { to: '2099-10-19' }]) {
      expect((await put(range(over))).status).toBe(400);
    }
    expect((await put('not json')).status).toBe(400);
    expect((await put({ room_key: 'Standard' })).status).toBe(400);
    expect(h.setCalls).toEqual([]);
  });
  it('refuses a room type without a room count with 409', async () => {
    const res = await put(range({ room_key: 'Dorm' }));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/no room count/);
    expect(h.setCalls).toEqual([]);
  });
  it('blocks suspended partners before writing', async () => {
    h.status = 'suspended';
    expect((await put(range())).status).toBe(403);
    expect(h.setCalls).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api/partner-availability.test.ts`
Expected: FAIL, cannot resolve `@/app/api/partner/availability/route`.

- [ ] **Step 3: Write the shared handlers**

```ts
// lib/availability/handlers.ts
import { NextResponse } from 'next/server';
import { monthGrid, setUnits, type PropertySummary } from './store';
import { isMonth, rangeProblem } from './validate';

export const UNTRACKED_ERROR = 'This room type has no room count yet, so it is always bookable and the calendar is off. Set its room count (Rooms to sell) first.';

/** What the calendars may see of a property (never owner_id). */
export const publicProperty = (p: PropertySummary) => ({ id: p.id, name: p.name, rooms: p.rooms });

export async function readJson(req: Request): Promise<any | null> {
  try { return await req.json(); } catch { return null; }
}

/** GET for one property the caller may edit: its room types, plus a month grid when room_key and month are given. */
export async function gridResponse(prop: PropertySummary, params: URLSearchParams): Promise<NextResponse> {
  const roomKey = params.get('room_key');
  if (!roomKey) return NextResponse.json({ property: publicProperty(prop) });
  const month = params.get('month');
  if (!isMonth(month)) return NextResponse.json({ error: 'month must be YYYY-MM' }, { status: 400 });
  if (!prop.rooms.some((r) => r.key === roomKey)) return NextResponse.json({ error: 'Unknown room type' }, { status: 400 });
  const grid = await monthGrid(prop.id, roomKey, month);
  return NextResponse.json({ property: publicProperty(prop), grid });
}

/** PUT for one property the caller may edit: validate, then set rooms open for each day of the range. */
export async function putResponse(prop: PropertySummary, body: any, userId: string): Promise<NextResponse> {
  const problem = rangeProblem(body ?? {}, prop.rooms.map((r) => r.key));
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  const room = prop.rooms.find((r) => r.key === body.room_key);
  if (!room?.tracked) return NextResponse.json({ error: UNTRACKED_ERROR }, { status: 409 });
  const days = await setUnits(prop.id, room.key, body.from, body.to, body.units, userId);
  return NextResponse.json({ ok: true, days });
}
```

- [ ] **Step 4: Write the partner route**

```ts
// app/api/partner/availability/route.ts
import { NextResponse } from 'next/server';
import { requireCaller, jsonError, type Caller } from '@/lib/server-auth';
import { assertActive } from '@/lib/partners/load';
import { loadProperty, ownedProperties, type PropertySummary } from '@/lib/availability/store';
import { gridResponse, publicProperty, putResponse, readJson } from '@/lib/availability/handlers';
import { isUuid } from '@/lib/availability/validate';

export const dynamic = 'force-dynamic';

async function activePartner(req: Request): Promise<Caller> {
  const caller = await requireCaller(req, ['partner']);
  assertActive(caller.profile.partner_status);
  return caller;
}

/** The property, only when this partner owns it (own or claimed: owner_id = caller). */
async function ownProperty(id: string, caller: Caller): Promise<PropertySummary | null> {
  const prop = await loadProperty(id);
  return prop && prop.owner_id === caller.profile.id ? prop : null;
}

const notFound = () => NextResponse.json({ error: 'Property not found' }, { status: 404 });
const badId = () => NextResponse.json({ error: 'property_id is required' }, { status: 400 });

export async function GET(req: Request) {
  try {
    const caller = await activePartner(req);
    const params = new URL(req.url).searchParams;
    const id = params.get('property_id');
    if (id === null) return NextResponse.json({ properties: (await ownedProperties(caller.profile.id)).map(publicProperty) });
    if (!isUuid(id)) return badId();
    const prop = await ownProperty(id, caller);
    if (!prop) return notFound();
    return await gridResponse(prop, params);
  } catch (e) { return jsonError(e); }
}

export async function PUT(req: Request) {
  try {
    const caller = await activePartner(req);
    const body = await readJson(req);
    if (!body || !isUuid(body.property_id)) return badId();
    const prop = await ownProperty(body.property_id, caller);
    if (!prop) return notFound();
    return await putResponse(prop, body, caller.user.id);
  } catch (e) { return jsonError(e); }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/api/partner-availability.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 6: Typecheck and commit**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

```bash
git add lib/availability/handlers.ts app/api/partner/availability/route.ts tests/api/partner-availability.test.ts
git commit -m "Add partner room availability API"
```

---

### Task 9: Admin availability API

**Files:**
- Create: `app/api/admin/availability/route.ts`
- Test: `tests/api/admin-availability.test.ts`

**Interfaces:**
- Consumes: `loadProperty` (Task 5); `gridResponse`, `putResponse`, `readJson` (Task 8); `isUuid` (Task 3); `requireCaller`, `jsonError`.
- Produces: `GET /api/admin/availability?property_id[&room_key&month]` → `{ property }` or `{ property, grid }`; `PUT /api/admin/availability` body `{ property_id, room_key, from, to, units }` → `{ ok: true, days }`. Admin only; any property; `property_id` required (400); unknown → 404.

- [ ] **Step 1: Write the failing test**

```ts
// tests/api/admin-availability.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const PID = '22222222-2222-4222-8222-222222222222';
const h = vi.hoisted(() => ({
  role: 'admin', setCalls: [] as any[], gridCalls: [] as any[],
  props: {
    '22222222-2222-4222-8222-222222222222': { id: '22222222-2222-4222-8222-222222222222', name: 'Someone Else Hotel', owner_id: 'p2', rooms: [{ key: 'Standard', tracked: true, total: 2 }] },
  } as Record<string, any>,
}));

vi.mock('@/lib/server-auth', async (orig) => {
  const actual = await orig<typeof import('@/lib/server-auth')>();
  return {
    ...actual,
    requireCaller: async (_req: Request, roles?: string[]) => {
      if (roles && !roles.includes(h.role)) throw new actual.HttpError(403, 'You do not have access to this');
      return { user: { id: 'admin-user' }, profile: { id: 'admin-1', role: h.role } };
    },
  };
});
vi.mock('@/lib/availability/store', () => ({
  loadProperty: async (id: string) => h.props[id] ?? null,
  ownedProperties: async () => [],
  monthGrid: async (...a: any[]) => { h.gridCalls.push(a); return { room_key: a[1], tracked: true, total: 2, days: [] }; },
  setUnits: async (...a: any[]) => { h.setCalls.push(a); return 1; },
}));

import { GET, PUT } from '@/app/api/admin/availability/route';

const URL_BASE = 'http://x/api/admin/availability';
const get = (q = '') => GET(new Request(`${URL_BASE}${q}`));
const put = (body: any) => PUT(new Request(URL_BASE, { method: 'PUT', body: JSON.stringify(body) }));

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  Object.assign(h, { role: 'admin', setCalls: [], gridCalls: [] });
});

describe('admin availability API', () => {
  it('reads any property\'s grid', async () => {
    const res = await get(`?property_id=${PID}&room_key=Standard&month=2099-10`);
    expect(res.status).toBe(200);
    expect(h.gridCalls).toEqual([[PID, 'Standard', '2099-10']]);
  });
  it('writes any property\'s calendar and records the admin as editor', async () => {
    const res = await put({ property_id: PID, room_key: 'Standard', from: '2099-10-20', to: '2099-10-20', units: 1 });
    expect(await res.json()).toEqual({ ok: true, days: 1 });
    expect(h.setCalls).toEqual([[PID, 'Standard', '2099-10-20', '2099-10-20', 1, 'admin-user']]);
  });
  it('requires a property id and a known property', async () => {
    expect((await get()).status).toBe(400);
    expect((await get('?property_id=33333333-3333-4333-8333-333333333333')).status).toBe(404);
  });
  it('is admin only', async () => {
    h.role = 'partner';
    expect((await get(`?property_id=${PID}`)).status).toBe(403);
    expect((await put({ property_id: PID, room_key: 'Standard', from: '2099-10-20', to: '2099-10-20', units: 1 })).status).toBe(403);
    expect(h.setCalls).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api/admin-availability.test.ts`
Expected: FAIL, cannot resolve `@/app/api/admin/availability/route`.

- [ ] **Step 3: Implement**

```ts
// app/api/admin/availability/route.ts
import { NextResponse } from 'next/server';
import { requireCaller, jsonError } from '@/lib/server-auth';
import { loadProperty } from '@/lib/availability/store';
import { gridResponse, putResponse, readJson } from '@/lib/availability/handlers';
import { isUuid } from '@/lib/availability/validate';

export const dynamic = 'force-dynamic';

const notFound = () => NextResponse.json({ error: 'Property not found' }, { status: 404 });
const badId = () => NextResponse.json({ error: 'property_id is required' }, { status: 400 });

export async function GET(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    const params = new URL(req.url).searchParams;
    const id = params.get('property_id');
    if (!isUuid(id)) return badId();
    const prop = await loadProperty(id);
    if (!prop) return notFound();
    return await gridResponse(prop, params);
  } catch (e) { return jsonError(e); }
}

export async function PUT(req: Request) {
  try {
    const caller = await requireCaller(req, ['admin']);
    const body = await readJson(req);
    if (!body || !isUuid(body.property_id)) return badId();
    const prop = await loadProperty(body.property_id);
    if (!prop) return notFound();
    return await putResponse(prop, body, caller.user.id);
  } catch (e) { return jsonError(e); }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/api/admin-availability.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/availability/route.ts tests/api/admin-availability.test.ts
git commit -m "Add admin room availability API"
```

---

### Task 10: Public availability API

**Files:**
- Create: `app/api/availability/route.ts`
- Test: `tests/api/availability-public.test.ts`

**Interfaces:**
- Consumes: `availabilityFor` (Task 5); `isDate`, `dayCount` (Task 1); `isUuid` (Task 3).
- Produces: `GET /api/availability?property_id&check_in&check_out` → `{ rooms: { [roomKey]: { tracked: boolean; left: number | null } } }`, `left` clamped to >= 0, `null` for untracked; `Cache-Control: no-store`; 400 for bad input (max 60 nights); 500 `Could not check availability` on lookup errors.

- [ ] **Step 1: Write the failing test**

```ts
// tests/api/availability-public.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const PID = '11111111-1111-4111-8111-111111111111';
const h = vi.hoisted(() => ({ result: {} as any, calls: [] as any[], fail: false }));
vi.mock('@/lib/availability/store', () => ({
  availabilityFor: async (...a: any[]) => { h.calls.push(a); if (h.fail) throw new Error('db'); return h.result; },
}));

import { GET } from '@/app/api/availability/route';
const get = (q: string) => GET(new Request(`http://x/api/availability?${q}`));

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  Object.assign(h, { calls: [], fail: false, result: { Standard: { tracked: true, left: -1 }, Deluxe: { tracked: true, left: 5 }, Dorm: { tracked: false, left: null } } });
});

describe('GET /api/availability', () => {
  it('returns only counts per room type, never below zero', async () => {
    const res = await get(`property_id=${PID}&check_in=2099-10-21&check_out=2099-10-23`);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.json()).toEqual({ rooms: { Standard: { tracked: true, left: 0 }, Deluxe: { tracked: true, left: 5 }, Dorm: { tracked: false, left: null } } });
    expect(h.calls).toEqual([[PID, '2099-10-21', '2099-10-23']]);
  });
  it('rejects bad input with 400 and does not query', async () => {
    for (const q of [
      'check_in=2099-10-21&check_out=2099-10-23',
      `property_id=nope&check_in=2099-10-21&check_out=2099-10-23`,
      `property_id=${PID}&check_in=2099-10-32&check_out=2099-11-02`,
      `property_id=${PID}&check_in=2099-10-23&check_out=2099-10-23`,
      `property_id=${PID}&check_in=2099-10-01&check_out=2099-12-31`,
    ]) expect((await get(q)).status).toBe(400);
    expect(h.calls).toEqual([]);
  });
  it('returns 500 when the lookup fails', async () => {
    h.fail = true;
    expect((await get(`property_id=${PID}&check_in=2099-10-21&check_out=2099-10-23`)).status).toBe(500);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api/availability-public.test.ts`
Expected: FAIL, cannot resolve `@/app/api/availability/route`.

- [ ] **Step 3: Implement**

```ts
// app/api/availability/route.ts
import { NextResponse } from 'next/server';
import { availabilityFor } from '@/lib/availability/store';
import { dayCount, isDate } from '@/lib/availability/calc';
import { isUuid } from '@/lib/availability/validate';

export const dynamic = 'force-dynamic';

const MAX_PUBLIC_NIGHTS = 60;
const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

/** Rooms left per room type for a stay. Counts only; no booking details. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const id = q.get('property_id');
  const checkIn = q.get('check_in');
  const checkOut = q.get('check_out');
  if (!isUuid(id)) return bad('property_id is required');
  if (!isDate(checkIn) || !isDate(checkOut) || checkOut <= checkIn) return bad('check_in and check_out must be YYYY-MM-DD, check_out after check_in');
  if (dayCount(checkIn, checkOut) - 1 > MAX_PUBLIC_NIGHTS) return bad(`At most ${MAX_PUBLIC_NIGHTS} nights`);
  try {
    const avail = await availabilityFor(id, checkIn, checkOut);
    const rooms: Record<string, { tracked: boolean; left: number | null }> = {};
    for (const key of Object.keys(avail)) {
      const v = avail[key];
      rooms[key] = v.tracked ? { tracked: true, left: Math.max(0, v.left) } : { tracked: false, left: null };
    }
    return NextResponse.json({ rooms }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('Availability lookup failed:', e);
    return NextResponse.json({ error: 'Could not check availability' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/api/availability-public.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/availability/route.ts tests/api/availability-public.test.ts
git commit -m "Add public room availability API"
```

---

### Task 11: Calendar component and partner page

**Files:**
- Create: `components/availability/AvailabilityCalendar.tsx`
- Create: `app/(site)/partner/availability/page.tsx`
- Modify: `app/(site)/partner/dashboard/page.tsx` (lucide import line 5; header links lines 67-69)

**Interfaces:**
- Consumes: `monthDates`, `shiftMonth`, `weekdayOffset`, `DayCell`, `RoomSummary` (Tasks 1-2); `parseUnits`, `MAX_UNITS` (Task 3); `todayIST` (`lib/bookings/timing.ts`); `authFetch`, `supabase` (`lib/supabase.ts`); partner API (Task 8).
- Produces: `<AvailabilityCalendar apiUrl={string} propertyId={string} rooms={RoomSummary[]} untrackedNote={string} />` (default export) — reused by the admin page in Task 12.

No unit tests (vitest runs in node with `tests/**/*.test.ts`; the logic it uses is tested in Tasks 1-3 and 8). Verified by typecheck and the manual check in Task 14.

- [ ] **Step 1: Write the calendar component**

```tsx
// components/availability/AvailabilityCalendar.tsx
'use client';
import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { authFetch } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { todayIST } from '@/lib/bookings/timing';
import { monthDates, shiftMonth, weekdayOffset, type DayCell, type RoomSummary } from '@/lib/availability/calc';
import { MAX_UNITS, parseUnits } from '@/lib/availability/validate';

type Props = { apiUrl: string; propertyId: string; rooms: RoomSummary[]; untrackedNote: string };
type Grid = { room_key: string; tracked: boolean; total: number; days: DayCell[] };

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const monthLabel = (month: string) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** Month grid of rooms open / booked / left for one room type; pick a range, set rooms open, save. */
export default function AvailabilityCalendar({ apiUrl, propertyId, rooms, untrackedNote }: Props) {
  const today = todayIST();
  const [roomKey, setRoomKey] = useState(rooms[0]?.key ?? '');
  const [month, setMonth] = useState(today.slice(0, 7));
  const [grid, setGrid] = useState<Grid | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [units, setUnits] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const room = rooms.find((r) => r.key === roomKey);

  useEffect(() => { setRoomKey(rooms[0]?.key ?? ''); setFrom(''); setTo(''); setMsg(null); }, [propertyId, rooms]);

  const load = useCallback(async () => {
    if (!roomKey || !room?.tracked) { setGrid(null); return; }
    setLoading(true); setError('');
    try {
      const q = new URLSearchParams({ property_id: propertyId, room_key: roomKey, month });
      const res = await authFetch(`${apiUrl}?${q}`);
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || 'Could not load the calendar'); setGrid(null); }
      else setGrid(d.grid);
    } catch { setError('Could not load the calendar'); }
    setLoading(false);
  }, [apiUrl, propertyId, roomKey, month, room?.tracked]);
  useEffect(() => { load(); }, [load]);

  function pick(date: string) {
    if (date < today) return;
    setMsg(null);
    if (!from || to) { setFrom(date); setTo(''); return; }
    if (date < from) { setTo(from); setFrom(date); } else setTo(date);
  }

  async function save() {
    if (!from) return;
    const n = parseUnits(units);
    if (n === null) { setMsg({ ok: false, text: `Enter rooms open as a whole number from 0 to ${MAX_UNITS}.` }); return; }
    setSaving(true); setMsg(null);
    try {
      const res = await authFetch(apiUrl, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_id: propertyId, room_key: roomKey, from, to: to || from, units: n }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setMsg({ ok: false, text: d.error || 'Could not save' });
      else {
        setMsg({ ok: true, text: `Saved: ${n} room${n === 1 ? '' : 's'} open on ${d.days} day${d.days === 1 ? '' : 's'}.` });
        setFrom(''); setTo('');
        await load();
      }
    } catch { setMsg({ ok: false, text: 'Could not save. Please check your connection.' }); }
    setSaving(false);
  }

  if (!rooms.length) return <p className="text-sm text-slate-600">This property has no room types yet.</p>;

  const dates = monthDates(month);
  const byDate: Record<string, DayCell> = {};
  for (const c of grid?.days || []) byDate[c.date] = c;
  const end = to || from;
  const inRange = (d: string) => !!from && d >= from && d <= end;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-slate-700">
          Room type
          <select value={roomKey} onChange={(e) => { setRoomKey(e.target.value); setFrom(''); setTo(''); setMsg(null); }}
            className="ml-2 px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none">
            {rooms.map((r) => <option key={r.key} value={r.key}>{r.key}{r.tracked ? ` (${r.total} rooms)` : ' (no room count)'}</option>)}
          </select>
        </label>
        <div className="flex items-center gap-1 sm:ml-auto">
          <button type="button" aria-label="Previous month" disabled={month <= today.slice(0, 7)} onClick={() => setMonth(shiftMonth(month, -1))}
            className="p-2 rounded-lg border border-slate-200 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
          <span className="w-36 text-center text-sm font-semibold text-slate-900">{monthLabel(month)}</span>
          <button type="button" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}
            className="p-2 rounded-lg border border-slate-200"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      {room && !room.tracked ? (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{untrackedNote}</p>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((w) => <div key={w} className="text-[11px] font-semibold text-slate-500 py-1">{w}</div>)}
            {Array.from({ length: weekdayOffset(month) }, (_, i) => <div key={`blank-${i}`} />)}
            {dates.map((date) => {
              const c = byDate[date];
              const past = date < today;
              return (
                <button key={date} type="button" disabled={past || loading} onClick={() => pick(date)}
                  className={cn('rounded-lg border p-1 sm:p-2 text-left min-h-[64px] transition-colors',
                    past ? 'bg-slate-50 text-slate-300 border-slate-100'
                      : inRange(date) ? 'border-brand-500 ring-1 ring-brand-500 bg-brand-50'
                      : c && c.left <= 0 ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white hover:border-slate-300')}>
                  <span className="block text-xs font-semibold">{Number(date.slice(8))}</span>
                  {c && !past && (
                    <span className="block text-[10px] leading-tight text-slate-600">
                      <span className={c.override ? 'font-semibold text-slate-900' : ''}>{c.open} open</span><br />
                      {c.booked} booked<br />
                      <span className={c.left <= 0 ? 'font-semibold text-red-700' : 'text-green-700'}>{Math.max(0, c.left)} left</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
            <p className="text-sm text-slate-700 w-full">
              {from ? `Selected ${from}${end !== from ? ` to ${end}` : ''}` : 'Tap a day, then another day, to choose dates.'}
            </p>
            <label className="text-sm text-slate-700">
              Rooms open
              <input type="number" inputMode="numeric" min={0} max={MAX_UNITS} value={units} onChange={(e) => setUnits(e.target.value)}
                className="block w-28 mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" />
            </label>
            <button type="button" onClick={save} disabled={!from || saving}
              className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
            {room && (
              <button type="button" onClick={() => setUnits(String(room.total))} className="text-sm text-brand-700 underline py-2">
                Use full count ({room.total})
              </button>
            )}
          </div>
        </>
      )}
      {msg && <p className={cn('text-sm', msg.ok ? 'text-green-700' : 'text-red-600')}>{msg.text}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Write the partner page**

```tsx
// app/(site)/partner/availability/page.tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { supabase, authFetch } from '@/lib/supabase';
import AvailabilityCalendar from '@/components/availability/AvailabilityCalendar';
import type { RoomSummary } from '@/lib/availability/calc';

type Prop = { id: string; name: string; rooms: RoomSummary[] };

const UNTRACKED_NOTE = 'This room type has no room count yet, so it is always bookable and the calendar is off. WhatsApp us and we will set how many rooms of this type you have.';

export default function PartnerAvailabilityPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Prop[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/partner/login'); return; }
      try {
        const res = await authFetch('/api/partner/availability');
        const d = await res.json().catch(() => ({}));
        if (!res.ok) setError(d.error || 'Could not load your properties');
        else { setProperties(d.properties || []); setSelected(d.properties?.[0]?.id || ''); }
      } catch { setError('Could not load your properties'); }
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;

  const prop = properties.find((p) => p.id === selected);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/partner/dashboard" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-brand-600 mb-4"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
      <h1 className="text-2xl font-heading font-bold text-slate-900 flex items-center gap-2"><CalendarDays className="h-6 w-6 text-brand-600" /> Room availability</h1>
      <p className="text-slate-600 text-sm mb-6">Set how many rooms of each type are open on each date. Lower it for walk-ins, phone and other sites; at 0 the room shows Sold out on the website and WhatsApp.</p>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>}

      {!error && properties.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-600">No hotels are linked to your account yet.</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-4">
          {properties.length > 1 && (
            <label className="block text-sm text-slate-700">
              Property
              <select value={selected} onChange={(e) => setSelected(e.target.value)} className="ml-2 px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none">
                {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          )}
          {prop && <AvailabilityCalendar apiUrl="/api/partner/availability" propertyId={prop.id} rooms={prop.rooms} untrackedNote={UNTRACKED_NOTE} />}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Link it from the partner dashboard**

In `app/(site)/partner/dashboard/page.tsx`, replace the lucide import

```tsx
import { Building, Plus, Eye, Clock, CheckCircle, XCircle, AlertCircle, LogOut, ShoppingBag, DollarSign, Bell, BarChart3, Star } from 'lucide-react';
```

with

```tsx
import { Building, Plus, Eye, Clock, CheckCircle, XCircle, AlertCircle, LogOut, ShoppingBag, DollarSign, Bell, BarChart3, Star, CalendarDays } from 'lucide-react';
```

and replace

```tsx
            <ShoppingBag className="h-4 w-4" /> Bookings
          </Link>
```

with

```tsx
            <ShoppingBag className="h-4 w-4" /> Bookings
          </Link>
          {(!partnerType || partnerType === 'hotel') && (
            <Link href="/partner/availability" className="flex items-center gap-2 border border-brand-200 text-brand-700 px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-brand-50">
              <CalendarDays className="h-4 w-4" /> Availability
            </Link>
          )}
```

- [ ] **Step 4: Typecheck and run all tests**

Run: `npx tsc --noEmit -p . && npx vitest run`
Expected: no type errors; all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/availability/AvailabilityCalendar.tsx "app/(site)/partner/availability/page.tsx" "app/(site)/partner/dashboard/page.tsx"
git commit -m "Add partner room availability calendar"
```

---

### Task 12: Admin calendar page, edit-page link and room count field

**Files:**
- Create: `app/(site)/admin/properties/[id]/availability/page.tsx`
- Modify: `app/(site)/admin/properties/[id]/edit/page.tsx` (lucide import line 5; header Save button lines 133-135; room fields line 241)

**Interfaces:**
- Consumes: `AvailabilityCalendar` (Task 11); admin API (Task 9); `RoomSummary` (Task 2).
- Produces: page `/admin/properties/<id>/availability`; a "Room availability" link on the admin edit page; a "Rooms to sell" input that writes `rooms[i].total_inventory` (empty/0 = not tracked). The admin page is wrapped by `AdminShell` through `app/(site)/admin/layout.tsx`; `components/admin/AdminShell.tsx` itself is not changed.

Admins need the "Rooms to sell" field: the admin edit page has no `total_inventory` input today, and without one an admin cannot turn tracking on for imported or claimed hotels (partners can only edit draft/changes-requested listings).

- [ ] **Step 1: Write the admin page**

```tsx
// app/(site)/admin/properties/[id]/availability/page.tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase, authFetch } from '@/lib/supabase';
import AvailabilityCalendar from '@/components/availability/AvailabilityCalendar';
import type { RoomSummary } from '@/lib/availability/calc';

const UNTRACKED_NOTE = 'This room type has no room count yet, so it is always bookable and the calendar is off. Set "Rooms to sell" for it on the edit page first.';

export default function AdminPropertyAvailabilityPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params.id);
  const [property, setProperty] = useState<{ id: string; name: string; rooms: RoomSummary[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/admin/login'); return; }
      try {
        const res = await authFetch(`/api/admin/availability?property_id=${encodeURIComponent(id)}`);
        const d = await res.json().catch(() => ({}));
        if (!res.ok) setError(d.error || 'Could not load this property');
        else setProperty(d.property);
      } catch { setError('Could not load this property'); }
      setLoading(false);
    }
    load();
  }, [id, router]);

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="h-8 w-8 text-brand-600 animate-spin" /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <Link href={`/admin/properties/${id}/edit`} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800 mb-4"><ArrowLeft className="h-4 w-4" /> Back to edit</Link>
      <h1 className="text-2xl font-heading font-bold text-slate-900">Room availability{property ? `: ${property.name}` : ''}</h1>
      <p className="text-sm text-slate-500 mb-6">Rooms open per date for each room type. The default is the room type&apos;s &quot;Rooms to sell&quot;.</p>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}
      {property && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6">
          <AvailabilityCalendar apiUrl="/api/admin/availability" propertyId={property.id} rooms={property.rooms} untrackedNote={UNTRACKED_NOTE} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Edit-page link**

In `app/(site)/admin/properties/[id]/edit/page.tsx`, replace the lucide import

```tsx
import { ArrowLeft, Save, Loader2, Trash2, Plus, X, LinkIcon, Check, Eye, ShieldCheck, ArrowUp, ArrowDown, Star } from 'lucide-react';
```

with

```tsx
import { ArrowLeft, Save, Loader2, Trash2, Plus, X, LinkIcon, Check, Eye, ShieldCheck, ArrowUp, ArrowDown, Star, CalendarDays } from 'lucide-react';
```

and replace

```tsx
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-brand-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-brand-700 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes
        </button>
```

with

```tsx
        <div className="flex items-center gap-3">
          <Link href={`/admin/properties/${params.id}/availability`} className="flex items-center gap-2 border border-brand-200 text-brand-700 px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-brand-50">
            <CalendarDays className="h-4 w-4" /> Room availability
          </Link>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-brand-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-brand-700 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes
          </button>
        </div>
```

- [ ] **Step 3: "Rooms to sell" field**

In the same file replace

```tsx
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
```

with

```tsx
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
```

and directly after the Base Price line

```tsx
                <div><label className="text-xs text-slate-500">Base Price</label><input type="number" value={room.base_price || ''} onChange={e => updateRoom(idx, 'base_price', Number(e.target.value) || 0)} className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded text-sm outline-none" /></div>
```

add

```tsx
                <div><label className="text-xs text-slate-500">Rooms to sell</label><input type="number" min={0} value={room.total_inventory || ''} placeholder="Not tracked" onChange={e => updateRoom(idx, 'total_inventory', Math.max(0, Math.floor(Number(e.target.value) || 0)))} className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded text-sm outline-none" /></div>
```

- [ ] **Step 4: Typecheck and run all tests**

Run: `npx tsc --noEmit -p . && npx vitest run`
Expected: no type errors; all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/(site)/admin/properties/[id]/availability/page.tsx" "app/(site)/admin/properties/[id]/edit/page.tsx"
git commit -m "Add admin room availability page and room count field"
```

---

### Task 13: Sold out / Only N left on the hotel page

**Files:**
- Create: `components/hotels/useRoomAvailability.ts`
- Modify: `components/forms/BookingForm.tsx` (props lines 10-20, signature line 30, `handleSubmit` lines 97-100, error/submit block lines 245-252)
- Modify: `components/hotels/HotelBooking.tsx` (imports lines 1-12, state lines 30-41, room card lines 83-87, plan button lines 140-145, `<BookingForm>` lines 179-187)
- Modify: `lib/i18n/en.ts:181`, `lib/i18n/hi.ts:371` (three new `booking` strings)
- Unchanged: `components/pages/HotelDetailView.tsx` (it already renders `<HotelBooking hotel={hotel} />`, which now does the lookup).

**Interfaces:**
- Consumes: `roomBadge`, `RoomInfo` (Task 2); `GET /api/availability` (Task 10).
- Produces: `useRoomAvailability(propertyId: string | undefined, checkIn: string, checkOut: string): Record<string, RoomInfo> | null`; `BookingForm` optional props `onDatesChange?: (checkIn: string, checkOut: string) => void` and `blockedMessage?: string` (other categories pass neither, so taxi/trek/paragliding forms are unchanged); dictionary keys `booking.soldOut`, `booking.onlyLeft` (`{n}`), `booking.soldOutDates`.

The badge and blocking logic is `roomBadge` (tested in Task 2); the server-side refusal is tested in Task 6. These files are client components (no node test environment), so this task is verified by typecheck and the manual check in Task 14.

- [ ] **Step 1: Dictionary strings**

`lib/i18n/en.ts` — replace

```ts
    pricingOptions: 'Pricing Options', freeCancellation: 'Free Cancellation', perNightTaxes: 'per night + taxes',
```

with

```ts
    pricingOptions: 'Pricing Options', freeCancellation: 'Free Cancellation', perNightTaxes: 'per night + taxes',
    soldOut: 'Sold out', onlyLeft: 'Only {n} left',
    soldOutDates: 'This room is sold out for your dates. Please choose another room or change your dates.',
```

`lib/i18n/hi.ts` — replace

```ts
    pricingOptions: 'कीमत के विकल्प', freeCancellation: 'फ़्री कैंसलेशन', perNightTaxes: 'प्रति रात + टैक्स',
```

with

```ts
    pricingOptions: 'कीमत के विकल्प', freeCancellation: 'फ़्री कैंसलेशन', perNightTaxes: 'प्रति रात + टैक्स',
    soldOut: 'बिक चुका', onlyLeft: 'सिर्फ़ {n} बचे',
    soldOutDates: 'आपकी तारीखों के लिए यह कमरा बिक चुका है। कृपया कोई दूसरा कमरा चुनें या तारीखें बदलें।',
```

- [ ] **Step 2: The lookup hook**

```ts
// components/hotels/useRoomAvailability.ts
'use client';
import { useEffect, useState } from 'react';
import type { RoomInfo } from '@/lib/availability/calc';

/**
 * Rooms left per room type for the chosen stay. Null while dates are incomplete or if the lookup fails:
 * the page then shows no badges and the server still refuses sold-out bookings.
 */
export function useRoomAvailability(propertyId: string | undefined, checkIn: string, checkOut: string): Record<string, RoomInfo> | null {
  const [rooms, setRooms] = useState<Record<string, RoomInfo> | null>(null);
  useEffect(() => {
    setRooms(null);
    if (!propertyId || !checkIn || !checkOut || checkOut <= checkIn) return;
    const ctrl = new AbortController();
    const q = new URLSearchParams({ property_id: propertyId, check_in: checkIn, check_out: checkOut });
    fetch(`/api/availability?${q}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.rooms) setRooms(d.rooms); })
      .catch(() => {});
    return () => ctrl.abort();
  }, [propertyId, checkIn, checkOut]);
  return rooms;
}
```

- [ ] **Step 3: `BookingForm` props**

3a. In `interface BookingFormProps`, replace

```ts
  planIndex?: number;
  className?: string;
}
```

with

```ts
  planIndex?: number;
  className?: string;
  /** Hotel only: told whenever the chosen dates change (the hotel page uses it to look up rooms left). */
  onDatesChange?: (checkIn: string, checkOut: string) => void;
  /** When set, booking is blocked and this message is shown (e.g. the chosen room is sold out). */
  blockedMessage?: string;
}
```

3b. Replace the signature line

```ts
export default function BookingForm({ category, entityId, entityName, pricePerNight, defaultAmount, roomName, planName, planIndex, className = '' }: BookingFormProps) {
```

with

```ts
export default function BookingForm({ category, entityId, entityName, pricePerNight, defaultAmount, roomName, planName, planIndex, className = '', onDatesChange, blockedMessage }: BookingFormProps) {
```

3c. After the `useEffect` that reads `?date=&people=&package=` (ends with `}, [category, t, f.packageNote]);`) add

```ts

  useEffect(() => { onDatesChange?.(checkIn, checkOut); }, [checkIn, checkOut, onDatesChange]);
```

3d. In `handleSubmit`, replace

```ts
    if (!validateDates()) return;
    setStatus('loading'); setErrorMsg('');
```

with

```ts
    if (!validateDates()) return;
    if (blockedMessage) { setErrorMsg(blockedMessage); setStatus('error'); return; }
    setStatus('loading'); setErrorMsg('');
```

3e. Replace

```tsx
        {status === 'error' && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg"><AlertCircle className="h-4 w-4 shrink-0" />{errorMsg}</div>}

        <button type="submit" disabled={status === 'loading'}
```

with

```tsx
        {blockedMessage && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg"><AlertCircle className="h-4 w-4 shrink-0" />{blockedMessage}</div>}
        {status === 'error' && errorMsg !== blockedMessage && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg"><AlertCircle className="h-4 w-4 shrink-0" />{errorMsg}</div>}

        <button type="submit" disabled={status === 'loading' || !!blockedMessage}
```

- [ ] **Step 4: `HotelBooking` — fetch, badges, disabled plans, blocked form**

4a. Replace

```ts
import { useState, useRef } from 'react';
```

with

```ts
import { useCallback, useState, useRef } from 'react';
```

and after `import { fmt } from '@/lib/i18n/dict';` add

```ts
import { roomBadge } from '@/lib/availability/calc';
import { useRoomAvailability } from './useRoomAvailability';
```

4b. Replace

```ts
  const formRef = useRef<HTMLDivElement>(null);
```

with

```ts
  const formRef = useRef<HTMLDivElement>(null);
  const [stay, setStay] = useState({ checkIn: '', checkOut: '' });
  const onDatesChange = useCallback((checkIn: string, checkOut: string) => {
    setStay((s) => (s.checkIn === checkIn && s.checkOut === checkOut ? s : { checkIn, checkOut }));
  }, []);
  const avail = useRoomAvailability(hotel.id, stay.checkIn, stay.checkOut);
  const selectedSoldOut = !!selected.roomName && roomBadge(avail?.[selected.roomName])?.kind === 'sold_out';
```

4c. In the room map, replace

```tsx
                const amenities: string[] = room.amenities || [];
```

with

```tsx
                const amenities: string[] = room.amenities || [];
                const badge = roomBadge(avail?.[room.name]);
                const soldOut = badge?.kind === 'sold_out';
```

and replace

```tsx
                        <h3 className="font-heading font-bold text-lg text-slate-900 mt-4">{roomName}</h3>
```

with

```tsx
                        <h3 className="font-heading font-bold text-lg text-slate-900 mt-4">{roomName}</h3>
                        {badge && (
                          <p className={'mt-1 inline-block text-xs font-semibold px-2 py-0.5 rounded-full ' + (soldOut ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800')}>
                            {badge.kind === 'sold_out' ? b.soldOut : fmt(b.onlyLeft, { n: badge.left })}
                          </p>
                        )}
```

4d. Replace the plan button

```tsx
                                    <button
                                      type="button"
                                      onClick={() => selectRoom(room.name, planName, plan.price, pi)}
                                      className={'text-sm font-bold px-5 py-2.5 rounded-xl transition-colors whitespace-nowrap shrink-0 ' + (isSelected ? 'bg-green-700 text-white' : 'bg-orange-600 hover:bg-orange-700 text-white')}>
                                      {isSelected ? b.selected : b.book}
                                    </button>
```

with

```tsx
                                    <button
                                      type="button"
                                      disabled={soldOut}
                                      onClick={() => selectRoom(room.name, planName, plan.price, pi)}
                                      className={'text-sm font-bold px-5 py-2.5 rounded-xl transition-colors whitespace-nowrap shrink-0 ' + (soldOut ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : isSelected ? 'bg-green-700 text-white' : 'bg-orange-600 hover:bg-orange-700 text-white')}>
                                      {soldOut ? b.soldOut : isSelected ? b.selected : b.book}
                                    </button>
```

4e. In `<BookingForm ... />`, replace

```tsx
            roomName={selected.roomName}
            planName={selected.planName}
          />
```

with

```tsx
            roomName={selected.roomName}
            planName={selected.planName}
            onDatesChange={onDatesChange}
            blockedMessage={selectedSoldOut ? b.soldOutDates : undefined}
          />
```

- [ ] **Step 5: Typecheck and run all tests**

Run: `npx tsc --noEmit -p . && npx vitest run`
Expected: no type errors (the `hi` dictionary must have the same keys as `en`); all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add components/hotels/useRoomAvailability.ts components/hotels/HotelBooking.tsx components/forms/BookingForm.tsx lib/i18n/en.ts lib/i18n/hi.ts
git commit -m "Show sold out and rooms left on the hotel page"
```

---

### Task 14: Ship and verify live

- [ ] **Step 1: Apply the migration** — run `supabase/migration-v21-room-availability.sql` in the Supabase SQL editor (the owner does this) **before** pushing. Verify both objects exist:

```bash
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/room_availability?select=property_id&limit=1" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/bookings?select=room_key&limit=1" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

Expected: `[]` and a JSON array (not "relation does not exist" / "column bookings.room_key does not exist").

- [ ] **Step 2: Full check** — `npx vitest run && npx tsc --noEmit -p .` → all PASS.
- [ ] **Step 3: Push** — `git push origin main`; wait for the deploy (poll the homepage until the new build answers).
- [ ] **Step 4: Manual test** (spec section 8):
  1. As admin, on a test hotel's edit page set "Rooms to sell" = 2 for "Standard", save; open "Room availability".
  2. As the hotel's partner, open `/partner/availability`, pick Standard, select 20-25 of next month, enter 0, Save → those days show 0 open, red.
  3. On the hotel page choose check-in 21, check-out 23 → Standard shows **Sold out**, its plans are disabled; selecting it beforehand and then picking those dates shows the sold-out message and the Book button is disabled.
  4. Choose 26-27 → Standard books normally (pay at hotel). Then set 26 to 1 open and book 26-27 again from another browser → **Sold out** after the first booking holds the only room.
  5. WhatsApp (test number): ask for Standard 21-23 → reply says sold out and offers the other rooms; ask for 28-29 → normal quote.
  6. Partner of another hotel: `/api/partner/availability?property_id=<test hotel id>` → 404.
- [ ] **Step 5: Clean up** — cancel the test bookings in admin, reset the test days to the full count with "Use full count", and report results to the owner.

---

## Self-Review

- **Spec coverage:** §2 model/tracking/hold rule → Tasks 1-2; who edits → Tasks 8-9; race → Tasks 5-6. §3 data → Task 4. §4 `nightsOf`/`holdsRoom`/`roomsLeft` → Tasks 1-2; `availabilityFor`/`monthGrid`/`setUnits` → Task 5. §5 partner page + nav link → Task 11; partner API → Task 8; admin page/API/link → Tasks 9, 12; validation → Task 3 (used in Task 8). §6 public API → Task 10; hotel page → Task 13. §7 `createBooking` → Task 6; WhatsApp quote → Task 7. §8 tests → each task; manual → Task 14. §9 out of scope respected (no pricing, sync, min stay, multi-room).
- **Placeholders:** none; every code step has full code.
- **Type consistency:** `RoomAvailability` (`left: null` when untracked) is used the same way in Tasks 5, 6, 7, 10; `RoomInfo` (Task 2) matches the public API shape; `PropertySummary`/`publicProperty` shared by Tasks 8-9; `StoreOpts.excludeAfter` used by Task 6.
