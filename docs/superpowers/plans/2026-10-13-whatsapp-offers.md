# WhatsApp Offers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the owner run "up to X% off" hotel offers that only the WhatsApp assistant hands out, as unique short-lived codes that customers either book with (paid online in full) or show at reception, all controlled and checked from the admin and partner portals.

**Architecture:** Pure offer rules (code format, percents, expiry, validity verdicts) live in `lib/offers/rules.ts`; database access (offers, codes, claim/release) in `lib/offers/store.ts`; checking, marking codes used and cancelling them, with partner scope and an audit log, in `lib/offers/verify.ts`. The WhatsApp assistant gets a `get_offer_code` tool (`lib/wa-chat/offer-tools.ts`) and an `offer_code` argument on `quote_booking`; `createBooking` takes the offer as a server-side option (never from the website form), applies the percent to the database price and refuses anything but online payment. Codes are claimed atomically like quotes, released when a booking fails, is cancelled or stays unpaid, and re-attached when a late payment arrives.

**Tech Stack:** Next.js 14 route handlers and client pages, TypeScript, Supabase (Postgres, RLS), Stripe Checkout, OpenAI Chat Completions tools, zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-13-whatsapp-offers-design.md`

> **Runs after the room-availability plan** (spec `docs/superpowers/specs/2026-10-13-room-availability-design.md`, migration v21). Shared touch points; every edit below is anchored on surrounding code, not line numbers, so keep whatever that plan added:
> - `lib/bookings/create.ts` `createBooking`: availability adds a pre-insert sold-out check, `room_key` in the insert, and a post-insert re-check that marks the booking `failed` and returns 409. This plan (Task 5) renames the destructured `amount` at the `quoteBooking(...)` call to `listAmount`, adds the offer guard directly after that call, and spreads `offer_code`/`offer_percent` into the insert right after `room_name: room_label,` (next to `room_key`). The availability check does not read `amount`, so its position does not matter. A sold-out 409 reaches the WhatsApp tool as `!r.ok`, which releases the code (Task 8).
> - `lib/wa-chat/booking-tools.ts` `quoteTool`: availability adds a sold-out check after `resolve(...)`. Task 8 replaces only the pricing tail, from `const { amount } = quoteBooking(category, r.entity, {` to the end of the function; the availability check above it stays.
> - `createTool`: if the availability plan changed the `if (!r.ok) { await releaseQuote(q.id); return { error: r.error }; }` line (for example a sold-out message), keep its message and add the `releaseCode` line from Task 8 inside the same block.
> - `lib/wa-chat/tools.ts` `getHotel` / `searchHotels`: Task 7 only adds an `offer` field; any availability wording in `prices_note` stays.
> - Tests: if `tests/wa-chat/booking-tools.test.ts` gained a `vi.mock(...)` for the availability module, copy that exact mock into the new `tests/wa-chat/booking-tools-offers.test.ts` (Task 8) so hotel quotes see the room as available.
> - `supabase/migration-v22-whatsapp-offers.sql` is applied after v21.

## Global Constraints

- Customers are told "up to X% off" where X = the highest % configured for the offer (`maxPercent`). Never an exact % in marketing text; an exact % appears only in a quote's price line.
- Code = `<PREFIX>-` + 5 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no 0/O/1/I), e.g. `PNV-7K3Q9`, generated with `crypto.randomInt`. Prefix matches `^[A-Z]{2,5}$`.
- One active code per phone per offer; asking again returns the same code until it expires.
- Code validity = `valid_hours` (1-168, default 3) from issue. Once a booking with the code is paid, the code stays valid for that booking with no time limit.
- Percents are integers 1-90 (`default_percent` and every `plan_percents` value; key `"<room name>|<plan name>"`).
- Online path: offer bookings are paid online in full. Pay later is never discounted; without online payment the code is only a walk-in coupon.
- Without `STRIPE_SECRET_KEY` only walk-in works, and the AI says: "This offer needs online payment, which isn't available right now; show the code at reception within N hours instead".
- The offer replaces the site-wide "up to ₹500" discount. Bookings carry `offer_code` / `offer_percent`; admin and partner views show "Offer applied – no further discount".
- Off = no new codes. Issued codes stay valid until expiry; admin can cancel any code.
- One active offer per property (enforced in the API and by a partial unique index).
- Partners check and mark codes only for properties whose `owner_id` is their profile id; anything else answers "Code not found".
- The chat phone is never a tool argument; it always comes from `ToolCtx.phone`.
- Offer codes are WhatsApp-only: `/api/bookings` (website form) behaviour does not change and `tests/api/bookings.test.ts` passes unmodified.
- Migration file `supabase/migration-v22-whatsapp-offers.sql`; seed one inactive offer for Panchvati Cottages (`da442d47-cd48-41d5-a301-a1513999d9a8`, slug `panchvati-cottages`): 25%, 3 hours, prefix `PNV`.
- Run tests with `npx vitest run`; typecheck with `npx tsc --noEmit -p .` (test files are typechecked too). Shell is Windows Git Bash.

## Review Focus

- Code typed loosely at reception or in chat (`pnv 7k3q9`, `pnv-7k3q9`, `PNV7K3Q9`) → treated as `PNV-7K3Q9` and found (Tasks 2, 4, 7).
- Customer picks "Pay later" on a quote that carries a code → refused with a clear message; no booking, code untouched (Task 8).
- Online payment abandoned (booking unpaid 30+ minutes) or booking cancelled straight from the admin bookings list (not through `cancelBooking`) → the code goes back to issued on its next check or use; if that old Stripe link is paid later, the code is re-attached or the owner is emailed about the conflict (Tasks 2, 3, 6).
- Partner of another hotel enters a valid code, or someone guesses codes → "Code not found" with nothing leaked, and a partner is blocked after 30 not-found checks in an hour (Task 4).
- Two staff press "Mark as used" at the same moment, or a used code is shown again → only one succeeds, the other is told it was already used (Task 4).

Each line above has a test in the task that owns it.

---

### Task 1: Database migration

**Files:**
- Create: `supabase/migration-v22-whatsapp-offers.sql`

**Interfaces:**
- Produces: tables `offers`, `offer_codes`, `offer_code_checks`; columns `bookings.offer_code TEXT`, `bookings.offer_percent INT`; partial unique index `uq_offers_one_active_per_property`; SQL function `offer_percents_ok(JSONB)`.

- [ ] **Step 1: Write the migration**

```sql
-- migration-v22: WhatsApp-only hotel offers. Run once in the Supabase SQL editor after v21. Safe to re-run.

-- plan_percents: {"<room name>|<plan name>": 1-90, ...}
CREATE OR REPLACE FUNCTION offer_percents_ok(j JSONB) RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
  SELECT jsonb_typeof(j) = 'object' AND COALESCE(bool_and(
    jsonb_typeof(value) = 'number'
    AND (value::text)::numeric = floor((value::text)::numeric)
    AND (value::text)::numeric BETWEEN 1 AND 90), true)
  FROM jsonb_each(CASE WHEN jsonb_typeof(j) = 'object' THEN j ELSE '{}'::jsonb END)
$$;

CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT false,
  default_percent INT NOT NULL CHECK (default_percent BETWEEN 1 AND 90),
  plan_percents JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (offer_percents_ok(plan_percents)),
  valid_hours INT NOT NULL DEFAULT 3 CHECK (valid_hours BETWEEN 1 AND 168),
  code_prefix TEXT NOT NULL CHECK (code_prefix ~ '^[A-Z]{2,5}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- One active offer per property at a time.
CREATE UNIQUE INDEX IF NOT EXISTS uq_offers_one_active_per_property ON offers(property_id) WHERE active;

CREATE TABLE IF NOT EXISTS offer_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE SET NULL,
  percent INT NOT NULL CHECK (percent BETWEEN 1 AND 90),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  booked_percent INT CHECK (booked_percent BETWEEN 1 AND 90),
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','booked','redeemed','cancelled')),
  redeemed_at TIMESTAMPTZ,
  redeemed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT
);
-- Expired = status 'issued' AND expires_at < now() (computed, not stored).
CREATE INDEX IF NOT EXISTS idx_offer_codes_phone ON offer_codes(offer_id, phone, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_offer_codes_booking ON offer_codes(booking_id);
CREATE INDEX IF NOT EXISTS idx_offer_codes_issued ON offer_codes(issued_at DESC);

CREATE TABLE IF NOT EXISTS offer_code_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID REFERENCES offer_codes(id) ON DELETE SET NULL,
  code_entered TEXT NOT NULL,
  checked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  result TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_offer_code_checks_by ON offer_code_checks(checked_by, created_at DESC);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS offer_code TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS offer_percent INT CHECK (offer_percent BETWEEN 1 AND 90);

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_code_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin reads offers" ON offers;
CREATE POLICY "Admin reads offers" ON offers FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "Admin reads offer codes" ON offer_codes;
CREATE POLICY "Admin reads offer codes" ON offer_codes FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "Admin reads offer code checks" ON offer_code_checks;
CREATE POLICY "Admin reads offer code checks" ON offer_code_checks FOR SELECT USING (is_admin());
-- No write policies: all writes go through API routes with the service role.

-- Seed: Panchvati Cottages offer, switched off until the owner turns it on in Admin -> WhatsApp offers.
INSERT INTO offers (property_id, name, active, default_percent, valid_hours, code_prefix)
SELECT p.id, 'WhatsApp offer – Panchvati Cottages', false, 25, 3, 'PNV'
FROM properties p
WHERE p.id = 'da442d47-cd48-41d5-a301-a1513999d9a8'
  AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.property_id = p.id);

SELECT o.name, o.active, o.default_percent, o.valid_hours, o.code_prefix, p.slug
FROM offers o JOIN properties p ON p.id = o.property_id;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migration-v22-whatsapp-offers.sql
git commit -m "Add WhatsApp offers migration"
```

(The migration is applied to Supabase in Task 13.)

---

### Task 2: Offer rules (pure)

**Files:**
- Create: `lib/offers/rules.ts`
- Test: `tests/offers/rules.test.ts`

**Interfaces:**
- Produces (all exported from `@/lib/offers/rules`):
  - Types: `Offer = { id: string; property_id: string; name: string; active: boolean; default_percent: number; plan_percents: Record<string, number>; valid_hours: number; code_prefix: string; created_at?: string; updated_at?: string }`, `CodeStatus = 'issued' | 'booked' | 'redeemed' | 'cancelled'`, `CodeState = CodeStatus | 'expired'`, `OfferCode = { id; offer_id; code; phone; conversation_id: string | null; percent: number; issued_at; expires_at; booking_id: string | null; booked_percent: number | null; status: CodeStatus; redeemed_at: string | null; redeemed_by: string | null; notes: string | null }`, `CodeBooking = { id; booking_ref; status; payment_status: string | null; created_at; guest_name: string | null; guest_phone: string | null }`, `CheckReason = 'not_found' | 'expired' | 'cancelled' | 'already_used' | 'awaiting_payment'`, `CodePath = 'paid_booking' | 'walk_in'`, `Verdict = { valid: boolean; reason: CheckReason | null; path: CodePath | null; percent: number | null }`, `CheckResult = Verdict & { code: string; status: CodeStatus | null; default_percent: number | null; plan_percents: Record<string, number> | null; guest: { name: string | null; phone: string } | null; expires_at: string | null; booking_ref: string | null; property_name: string | null; redeemed_at: string | null }`.
  - Constants: `CODE_ALPHABET`, `CODE_LENGTH = 5`, `PAY_WINDOW_MINUTES = 30`, `OFFER_NEEDS_ONLINE = 'This offer needs online payment in full'`, `REASON_TEXT: Record<CheckReason, string>`.
  - Functions: `makeCode(prefix: string, randomIndex: (n: number) => number): string`, `normalizeCode(input: unknown): string`, `planKey(room: string, plan: string): string`, `maxPercent(o): number`, `planPercent(o, room?, plan?): number`, `cappedPlanPercents(o: { plan_percents }, cap: number): Record<string, number>`, `discounted(amount: number, percent: number): number`, `isExpired(c: { expires_at }, now?: number): boolean`, `hoursLeft(expiresAt: string, now?: number): number`, `shouldRelease(c, b: CodeBooking | null, now?: number): boolean`, `judgeCode(c, b: CodeBooking | null, now?: number): Verdict`, `codeState(c, now?: number): CodeState`, `formatIST(iso: string): string`, `upToText(o): string`, `offerNeedsOnline(expiresAt: string, now?: number): string`, `rulesLine(c: { expires_at; percent }, online: boolean): string`, `roomPlans(rooms: unknown): { room: string; plans: string[] }[]`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/offers/rules.test.ts
import { describe, expect, it } from 'vitest';
import {
  CODE_ALPHABET, cappedPlanPercents, codeState, discounted, formatIST, hoursLeft, isExpired, judgeCode, makeCode,
  maxPercent, normalizeCode, offerNeedsOnline, planPercent, roomPlans, rulesLine, shouldRelease, upToText,
} from '@/lib/offers/rules';

const OFFER = { default_percent: 20, plan_percents: { 'Deluxe|Breakfast': 25, 'Deluxe|Room Only': 15 } };
const NOW = Date.parse('2026-10-13T10:00:00Z');
const iso = (mins: number) => new Date(NOW + mins * 60e3).toISOString();
const code = (over: any = {}): any => ({ status: 'issued', expires_at: iso(60), percent: 25, booked_percent: null, booking_id: null, ...over });
const booking = (over: any = {}): any => ({ id: 'b1', booking_ref: 'HTL-1', status: 'pending', payment_status: 'pending', created_at: iso(-10), guest_name: 'Asha', guest_phone: '9800000001', ...over });

describe('codes', () => {
  it('makes PREFIX- plus 5 unambiguous characters', () => {
    expect(CODE_ALPHABET).not.toMatch(/[0O1I]/);
    expect(CODE_ALPHABET).toHaveLength(32);
    const seq = [0, 31, 7, 22, 30];
    let i = 0;
    expect(makeCode('PNV', () => seq[i++])).toBe('PNV-A9HY8');
    for (let n = 0; n < 50; n++) {
      expect(makeCode('PNV', (m) => Math.floor(Math.random() * m))).toMatch(/^PNV-[ABCDEFGHJKLMNPQRSTUVWXYZ2-9]{5}$/);
    }
  });
  it('normalizes codes typed with spaces, lower case or no dash', () => {
    expect(normalizeCode(' pnv 7k3q9 ')).toBe('PNV-7K3Q9');
    expect(normalizeCode('PNV7K3Q9')).toBe('PNV-7K3Q9');
    expect(normalizeCode('pnv-7k3q9')).toBe('PNV-7K3Q9');
    expect(normalizeCode('hello')).toBe('HELLO');
    expect(normalizeCode(null)).toBe('');
  });
});

describe('percents', () => {
  it('max is the highest of the default and the plan percents', () => {
    expect(maxPercent(OFFER)).toBe(25);
    expect(maxPercent({ default_percent: 30, plan_percents: { 'Deluxe|Breakfast': 25 } })).toBe(30);
    expect(maxPercent({ default_percent: 20, plan_percents: {} })).toBe(20);
    expect(maxPercent({ default_percent: 20, plan_percents: { 'Deluxe|Breakfast': 95 } })).toBe(20);
  });
  it('plan percent falls back to the default', () => {
    expect(planPercent(OFFER, 'Deluxe', 'Breakfast')).toBe(25);
    expect(planPercent(OFFER, 'Deluxe', 'Half Board')).toBe(20);
    expect(planPercent(OFFER, 'Deluxe', null)).toBe(20);
    expect(planPercent({ default_percent: 20, plan_percents: { 'Deluxe|Breakfast': 95 } }, 'Deluxe', 'Breakfast')).toBe(20);
  });
  it('caps plan percents at the code snapshot and rounds discounts', () => {
    expect(cappedPlanPercents({ plan_percents: { 'Deluxe|Breakfast': 30, 'Deluxe|Room Only': 15 } }, 25)).toEqual({ 'Deluxe|Breakfast': 25, 'Deluxe|Room Only': 15 });
    expect(discounted(8000, 25)).toBe(6000);
    expect(discounted(4999, 15)).toBe(4249);
  });
  it('lists active rooms with their plan names', () => {
    expect(roomPlans([{ name: 'Deluxe', rate_plans: [{ name: 'Room Only' }, { name: '' }] }, { name: 'Old', is_active: false }, { name: 'Cottage' }, null]))
      .toEqual([{ room: 'Deluxe', plans: ['Room Only'] }, { room: 'Cottage', plans: [] }]);
    expect(roomPlans(null)).toEqual([]);
  });
  it('up-to wording uses the highest percent', () => {
    expect(upToText(OFFER)).toBe('Up to 25% off, only through this WhatsApp chat');
  });
});

describe('expiry and release', () => {
  it('a code is expired at or after expires_at', () => {
    expect(isExpired({ expires_at: iso(1) }, NOW)).toBe(false);
    expect(isExpired({ expires_at: iso(0) }, NOW)).toBe(true);
    expect(codeState({ status: 'issued', expires_at: iso(-1) }, NOW)).toBe('expired');
    expect(codeState({ status: 'booked', expires_at: iso(-1) }, NOW)).toBe('booked');
  });
  it('hours left rounds up and is at least 1', () => {
    expect(hoursLeft(iso(179), NOW)).toBe(3);
    expect(hoursLeft(iso(-5), NOW)).toBe(1);
    expect(offerNeedsOnline(iso(179), NOW)).toBe("This offer needs online payment, which isn't available right now; show the code at reception within 3 hours instead");
    expect(offerNeedsOnline(iso(30), NOW)).toMatch(/within 1 hour instead$/);
  });
  it('releases a booked code when its booking is dead or unpaid after 30 minutes', () => {
    const b = code({ status: 'booked', booking_id: 'b1' });
    expect(shouldRelease(b, booking({ status: 'cancelled' }), NOW)).toBe(true);
    expect(shouldRelease(b, booking({ status: 'failed' }), NOW)).toBe(true);
    expect(shouldRelease(b, null, NOW)).toBe(true);
    expect(shouldRelease(b, booking({ created_at: iso(-31) }), NOW)).toBe(true);
    expect(shouldRelease(b, booking({ created_at: iso(-29) }), NOW)).toBe(false);
    expect(shouldRelease(b, booking({ created_at: iso(-600), payment_status: 'paid', status: 'confirmed' }), NOW)).toBe(false);
    expect(shouldRelease(code(), null, NOW)).toBe(false);
  });
  it('a claimed code with no booking yet is released only after it expires', () => {
    expect(shouldRelease(code({ status: 'booked' }), null, NOW)).toBe(false);
    expect(shouldRelease(code({ status: 'booked', expires_at: iso(-1) }), null, NOW)).toBe(true);
  });
});

describe('judgeCode', () => {
  it('walk-in codes are valid until they expire', () => {
    expect(judgeCode(code(), null, NOW)).toEqual({ valid: true, reason: null, path: 'walk_in', percent: 25 });
    expect(judgeCode(code({ expires_at: iso(-1) }), null, NOW)).toEqual({ valid: false, reason: 'expired', path: 'walk_in', percent: 25 });
  });
  it('paid bookings stay valid with no time limit', () => {
    const c = code({ status: 'booked', booking_id: 'b1', booked_percent: 20, expires_at: iso(-6000) });
    expect(judgeCode(c, booking({ payment_status: 'paid' }), NOW)).toEqual({ valid: true, reason: null, path: 'paid_booking', percent: 20 });
    expect(judgeCode(c, booking(), NOW)).toEqual({ valid: false, reason: 'awaiting_payment', path: 'paid_booking', percent: 20 });
  });
  it('used and cancelled codes are not valid', () => {
    expect(judgeCode(code({ status: 'redeemed' }), null, NOW)).toMatchObject({ valid: false, reason: 'already_used', path: 'walk_in' });
    expect(judgeCode(code({ status: 'cancelled' }), null, NOW)).toMatchObject({ valid: false, reason: 'cancelled' });
  });
});

describe('wording', () => {
  it('formats times in India time', () => {
    expect(formatIST('2026-10-13T13:00:00Z')).toMatch(/13 Oct.*6:30\s*pm/i);
  });
  it('rules line covers both paths, or reception only without online payment', () => {
    const c = { expires_at: '2026-10-13T13:00:00Z', percent: 25 };
    expect(rulesLine(c, true)).toMatch(/^Up to 25% off\. Book in this chat .* pay online in full .* reception .* Not valid with pay later\.$/);
    expect(rulesLine(c, false)).toMatch(/reception/);
    expect(rulesLine(c, false)).not.toMatch(/pay online/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/offers/rules.test.ts`
Expected: FAIL, cannot resolve `@/lib/offers/rules`.

- [ ] **Step 3: Implement**

```ts
// lib/offers/rules.ts
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
/** An online offer booking that is still unpaid this long after it was made gives its code back. */
export const PAY_WINDOW_MINUTES = 30;
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

/** A booked code goes back to 'issued' when its booking is dead, or online and still unpaid after PAY_WINDOW_MINUTES. */
export function shouldRelease(c: Pick<OfferCode, 'status' | 'booking_id' | 'expires_at'>, b: CodeBooking | null, now = Date.now()): boolean {
  if (c.status !== 'booked') return false;
  if (!c.booking_id) return isExpired(c, now); // claimed but never linked (crashed mid-booking)
  if (!b || DEAD_BOOKING.includes(b.status)) return true;
  return b.payment_status !== 'paid' && now - Date.parse(b.created_at) > PAY_WINDOW_MINUTES * 60e3;
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/offers/rules.test.ts`
Expected: PASS (16 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/offers/rules.ts tests/offers/rules.test.ts
git commit -m "Add WhatsApp offer rules"
```

---

### Task 3: Offer store (offers, codes, claim and release)

**Files:**
- Create: `lib/offers/store.ts`
- Create: `tests/offers/fake-sb.ts` (shared chainable Supabase fake, reused by Tasks 4 and 10)
- Test: `tests/offers/store.test.ts`

**Interfaces:**
- Consumes: `makeCode`, `maxPercent`, `shouldRelease`, `Offer`, `OfferCode`, `CodeBooking` (Task 2).
- Produces (from `@/lib/offers/store`):
  - `offerFor(propertyId: string): Promise<Offer | null>` (active offer only)
  - `activeOffers(): Promise<Offer[]>`
  - `getOffer(id: string): Promise<Offer | null>` (active or not)
  - `findCode(code: string): Promise<OfferCode | null>` (expects a normalized code)
  - `type IssueResult = { ok: true; code: OfferCode; reused: boolean } | { ok: false; error: string }`
  - `issueCode(offerId: string, phone: string, conversationId: string | null): Promise<IssueResult>`
  - `claimCode(id: string, percent: number): Promise<boolean>` (issued and unexpired → booked)
  - `linkCodeBooking(id: string, bookingId: string): Promise<void>`
  - `releaseCode(id: string): Promise<void>` (booked → issued)
  - `releaseForBooking(bookingId: string): Promise<void>`
  - `settle(c: OfferCode): Promise<{ code: OfferCode; booking: CodeBooking | null }>` (loads the booking and releases a stale claim)
  - `attachPaidOffer(bookingId: string): Promise<'none' | 'attached' | 'conflict'>`
- Produces (test helper `tests/offers/fake-sb.ts`): `makeFake()`, `fake` with `client`, `calls`, `queue(table, ...responses)`, `ops(table, op)`, `reset()`.

- [ ] **Step 1: Write the test helper**

```ts
// tests/offers/fake-sb.ts
/** A tiny chainable Supabase stand-in. Each awaited query on a table takes the next queued response for that table. */
export type Res = { data?: any; error?: any; count?: number | null };
export type Call = { table: string; op: string; args: unknown[] };

const OPS = ['select', 'insert', 'update', 'upsert', 'delete', 'eq', 'neq', 'in', 'is', 'gt', 'gte', 'lt', 'lte', 'or', 'order', 'limit', 'ilike'];

export function makeFake() {
  const calls: Call[] = [];
  const queues: Record<string, Res[]> = {};
  const next = (t: string) => {
    const r: Res = queues[t] && queues[t].length ? queues[t].shift()! : {};
    return { data: r.data ?? null, error: r.error ?? null, count: r.count ?? null };
  };
  const client = {
    from(table: string) {
      const b: any = {};
      for (const op of OPS) b[op] = (...args: unknown[]) => { calls.push({ table, op, args }); return b; };
      b.single = async () => next(table);
      b.maybeSingle = async () => next(table);
      b.then = (ok: any, fail: any) => Promise.resolve(next(table)).then(ok, fail);
      return b;
    },
  };
  return {
    client,
    calls,
    queue(table: string, ...rs: Res[]) { (queues[table] = queues[table] || []).push(...rs); },
    ops(table: string, op: string): unknown[][] { return calls.filter((c) => c.table === table && c.op === op).map((c) => c.args); },
    reset() { calls.length = 0; for (const k of Object.keys(queues)) delete queues[k]; },
  };
}

export const fake = makeFake();
```

- [ ] **Step 2: Write the failing test**

```ts
// tests/offers/store.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fake } from './fake-sb';

vi.mock('@/lib/server-auth', async () => {
  const m = await import('./fake-sb');
  return { serviceClient: () => m.fake.client };
});

import { attachPaidOffer, claimCode, issueCode, offerFor, releaseCode, releaseForBooking, settle } from '@/lib/offers/store';

const OFFER = { id: 'o1', property_id: 'p1', name: 'Panchvati', active: true, default_percent: 20, plan_percents: { 'Deluxe|Breakfast': 25 }, valid_hours: 3, code_prefix: 'PNV' };
const code = (over: any = {}): any => ({
  id: 'c1', offer_id: 'o1', code: 'PNV-7K3Q9', phone: '919800000001', conversation_id: 'conv1', percent: 25, issued_at: '2026-10-13T10:00:00Z',
  expires_at: new Date(Date.now() + 3600e3).toISOString(), booking_id: null, booked_percent: null, status: 'issued', redeemed_at: null, redeemed_by: null, notes: null, ...over,
});
const bookingRow = (over: any = {}) => ({ id: 'b1', booking_ref: 'HTL-1', status: 'pending', payment_status: 'pending', created_at: new Date().toISOString(), guest_name: 'Asha', guest_phone: '9800000001', ...over });

beforeEach(() => fake.reset());
afterEach(() => vi.useRealTimers());

describe('offerFor', () => {
  it('asks for the active offer of the property', async () => {
    fake.queue('offers', { data: OFFER });
    expect(await offerFor('p1')).toEqual(OFFER);
    expect(fake.ops('offers', 'eq')).toEqual([['property_id', 'p1'], ['active', true]]);
  });
  it('is null when there is none', async () => {
    expect(await offerFor('p1')).toBeNull();
  });
});

describe('issueCode', () => {
  it('returns the unexpired code this phone already has', async () => {
    const existing = code();
    fake.queue('offers', { data: OFFER });
    fake.queue('offer_codes', { data: existing });
    expect(await issueCode('o1', '919800000001', 'conv1')).toEqual({ ok: true, code: existing, reused: true });
    expect(fake.ops('offer_codes', 'eq')).toEqual([['offer_id', 'o1'], ['phone', '919800000001']]);
    expect(fake.ops('offer_codes', 'in')).toEqual([['status', ['issued', 'booked']]]);
    expect(fake.ops('offer_codes', 'gt')[0][0]).toBe('expires_at');
    expect(fake.ops('offer_codes', 'insert')).toEqual([]);
  });
  it('creates a new code with the prefix, the max percent and the validity window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-13T10:00:00Z'));
    fake.queue('offers', { data: OFFER });
    fake.queue('offer_codes', { data: null }, { data: code() });
    expect(await issueCode('o1', '919800000001', 'conv1')).toMatchObject({ ok: true, reused: false });
    const row = fake.ops('offer_codes', 'insert')[0][0] as any;
    expect(row.code).toMatch(/^PNV-[ABCDEFGHJKLMNPQRSTUVWXYZ2-9]{5}$/);
    expect(row).toMatchObject({
      offer_id: 'o1', phone: '919800000001', conversation_id: 'conv1', percent: 25, status: 'issued',
      issued_at: '2026-10-13T10:00:00.000Z', expires_at: '2026-10-13T13:00:00.000Z',
    });
  });
  it('tries a new code when the random one is taken', async () => {
    fake.queue('offers', { data: OFFER });
    fake.queue('offer_codes', { data: null }, { error: { code: '23505', message: 'duplicate key' } }, { data: code() });
    expect((await issueCode('o1', '919800000001', 'conv1')).ok).toBe(true);
    expect(fake.ops('offer_codes', 'insert')).toHaveLength(2);
  });
  it('gives up after 5 taken codes and passes other errors on', async () => {
    fake.queue('offers', { data: OFFER });
    fake.queue('offer_codes', { data: null }, ...Array(5).fill({ error: { code: '23505' } }));
    await expect(issueCode('o1', '919800000001', 'conv1')).rejects.toThrow(/unique/);
    fake.reset();
    fake.queue('offers', { data: OFFER });
    fake.queue('offer_codes', { data: null }, { error: { code: '42P01', message: 'missing table' } });
    await expect(issueCode('o1', '919800000001', 'conv1')).rejects.toMatchObject({ code: '42P01' });
  });
  it('refuses when the offer is off', async () => {
    fake.queue('offers', { data: { ...OFFER, active: false } });
    expect(await issueCode('o1', '919800000001', 'conv1')).toEqual({ ok: false, error: 'This hotel has no WhatsApp offer right now.' });
    expect(fake.ops('offer_codes', 'insert')).toEqual([]);
  });
});

describe('claim and release', () => {
  it('claims only an issued, unexpired code', async () => {
    fake.queue('offer_codes', { data: [{ id: 'c1' }] }, { data: [] });
    expect(await claimCode('c1', 20)).toBe(true);
    expect(await claimCode('c1', 20)).toBe(false);
    expect(fake.ops('offer_codes', 'update')[0]).toEqual([{ status: 'booked', booked_percent: 20 }]);
    expect(fake.ops('offer_codes', 'eq')).toContainEqual(['status', 'issued']);
    expect(fake.ops('offer_codes', 'gt')[0][0]).toBe('expires_at');
  });
  it('releases only a booked code', async () => {
    await releaseCode('c1');
    expect(fake.ops('offer_codes', 'update')[0]).toEqual([{ status: 'issued', booking_id: null, booked_percent: null }]);
    expect(fake.ops('offer_codes', 'eq')).toEqual([['id', 'c1'], ['status', 'booked']]);
  });
  it('releases the code of a cancelled booking', async () => {
    await releaseForBooking('b1');
    expect(fake.ops('offer_codes', 'update')[0]).toEqual([{ status: 'issued', booking_id: null, booked_percent: null }]);
    expect(fake.ops('offer_codes', 'eq')).toEqual([['booking_id', 'b1'], ['status', 'booked']]);
  });
});

describe('settle', () => {
  it('releases a code whose booking was cancelled', async () => {
    fake.queue('bookings', { data: bookingRow({ status: 'cancelled' }) });
    const r = await settle(code({ status: 'booked', booking_id: 'b1', booked_percent: 20 }));
    expect(r.code).toMatchObject({ status: 'issued', booking_id: null, booked_percent: null });
    expect(r.booking).toBeNull();
    expect(fake.ops('offer_codes', 'update')).toHaveLength(1);
  });
  it('keeps a code whose booking is paid', async () => {
    const paid = bookingRow({ status: 'confirmed', payment_status: 'paid', created_at: '2026-01-01T00:00:00Z' });
    fake.queue('bookings', { data: paid });
    const r = await settle(code({ status: 'booked', booking_id: 'b1', booked_percent: 20 }));
    expect(r).toMatchObject({ code: { status: 'booked' }, booking: paid });
    expect(fake.ops('offer_codes', 'update')).toEqual([]);
  });
  it('does not look up a booking for a walk-in code', async () => {
    const r = await settle(code());
    expect(r).toMatchObject({ code: { status: 'issued' }, booking: null });
    expect(fake.calls.filter((c) => c.table === 'bookings')).toEqual([]);
  });
});

describe('attachPaidOffer', () => {
  it('does nothing for bookings without an offer', async () => {
    fake.queue('bookings', { data: { id: 'b1', offer_code: null, offer_percent: null } });
    expect(await attachPaidOffer('b1')).toBe('none');
  });
  it('re-attaches a released code to the paid booking', async () => {
    fake.queue('bookings', { data: { id: 'b1', offer_code: 'PNV-7K3Q9', offer_percent: 20 } });
    fake.queue('offer_codes', { data: { id: 'c1', status: 'issued', booking_id: null } }, { data: [{ id: 'c1' }] });
    expect(await attachPaidOffer('b1')).toBe('attached');
    expect(fake.ops('offer_codes', 'update')[0]).toEqual([{ status: 'booked', booking_id: 'b1', booked_percent: 20 }]);
  });
  it('leaves a code already on this booking alone', async () => {
    fake.queue('bookings', { data: { id: 'b1', offer_code: 'PNV-7K3Q9', offer_percent: 20 } });
    fake.queue('offer_codes', { data: { id: 'c1', status: 'booked', booking_id: 'b1' } });
    expect(await attachPaidOffer('b1')).toBe('attached');
    expect(fake.ops('offer_codes', 'update')).toEqual([]);
  });
  it('reports a conflict when the code was used or cancelled meanwhile', async () => {
    fake.queue('bookings', { data: { id: 'b1', offer_code: 'PNV-7K3Q9', offer_percent: 20 } });
    fake.queue('offer_codes', { data: { id: 'c1', status: 'redeemed', booking_id: null } });
    expect(await attachPaidOffer('b1')).toBe('conflict');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/offers/store.test.ts`
Expected: FAIL, cannot resolve `@/lib/offers/store`.

- [ ] **Step 4: Implement**

```ts
// lib/offers/store.ts
import { randomInt } from 'node:crypto';
import { serviceClient } from '@/lib/server-auth';
import { makeCode, maxPercent, shouldRelease, type CodeBooking, type Offer, type OfferCode } from './rules';

const OFFER_COLS = 'id, property_id, name, active, default_percent, plan_percents, valid_hours, code_prefix, created_at, updated_at';
const BOOKING_COLS = 'id, booking_ref, status, payment_status, created_at, guest_name, guest_phone';
const INSERT_TRIES = 5;
const RELEASED = { status: 'issued', booking_id: null, booked_percent: null };
const nowIso = () => new Date().toISOString();

/** The property's offer that is switched on, or null. */
export async function offerFor(propertyId: string): Promise<Offer | null> {
  const { data, error } = await serviceClient().from('offers').select(OFFER_COLS).eq('property_id', propertyId).eq('active', true).maybeSingle();
  if (error) throw error;
  return (data as Offer) ?? null;
}

export async function activeOffers(): Promise<Offer[]> {
  const { data, error } = await serviceClient().from('offers').select(OFFER_COLS).eq('active', true);
  if (error) throw error;
  return (data as Offer[]) || [];
}

/** An offer by id, on or off (issued codes keep working after the offer is switched off). */
export async function getOffer(id: string): Promise<Offer | null> {
  const { data, error } = await serviceClient().from('offers').select(OFFER_COLS).eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as Offer) ?? null;
}

export async function findCode(code: string): Promise<OfferCode | null> {
  const { data, error } = await serviceClient().from('offer_codes').select('*').eq('code', code).maybeSingle();
  if (error) throw error;
  return (data as OfferCode) ?? null;
}

export type IssueResult = { ok: true; code: OfferCode; reused: boolean } | { ok: false; error: string };

/** The phone's unexpired code for this offer, or a new random one. Only while the offer is on. */
export async function issueCode(offerId: string, phone: string, conversationId: string | null): Promise<IssueResult> {
  const offer = await getOffer(offerId);
  if (!offer || !offer.active) return { ok: false, error: 'This hotel has no WhatsApp offer right now.' };
  const sb = serviceClient();
  const { data: existing, error: findErr } = await sb.from('offer_codes').select('*')
    .eq('offer_id', offerId).eq('phone', phone).in('status', ['issued', 'booked']).gt('expires_at', nowIso())
    .order('issued_at', { ascending: false }).limit(1).maybeSingle();
  if (findErr) throw findErr;
  if (existing) return { ok: true, code: existing as OfferCode, reused: true };

  const issued = new Date();
  const row = {
    offer_id: offerId, phone, conversation_id: conversationId, percent: maxPercent(offer), status: 'issued',
    issued_at: issued.toISOString(), expires_at: new Date(issued.getTime() + offer.valid_hours * 3600e3).toISOString(),
  };
  for (let i = 0; i < INSERT_TRIES; i++) {
    const { data, error } = await sb.from('offer_codes').insert({ ...row, code: makeCode(offer.code_prefix, (n) => randomInt(n)) }).select('*').single();
    if (!error) return { ok: true, code: data as OfferCode, reused: false };
    if (error.code !== '23505') throw error; // 23505 = the random code already exists; try another
  }
  throw new Error('Could not create a unique offer code');
}

/** Reserve a code for a booking being made. Only the first caller gets true. */
export async function claimCode(id: string, percent: number): Promise<boolean> {
  const { data, error } = await serviceClient().from('offer_codes').update({ status: 'booked', booked_percent: percent })
    .eq('id', id).eq('status', 'issued').gt('expires_at', nowIso()).select('id');
  if (error) throw error;
  return (data || []).length > 0;
}

export async function linkCodeBooking(id: string, bookingId: string): Promise<void> {
  const { error } = await serviceClient().from('offer_codes').update({ booking_id: bookingId }).eq('id', id);
  if (error) console.error('Offer code link failed:', error);
}

export async function releaseCode(id: string): Promise<void> {
  const { error } = await serviceClient().from('offer_codes').update(RELEASED).eq('id', id).eq('status', 'booked');
  if (error) console.error('Offer code release failed:', error);
}

export async function releaseForBooking(bookingId: string): Promise<void> {
  const { error } = await serviceClient().from('offer_codes').update(RELEASED).eq('booking_id', bookingId).eq('status', 'booked');
  if (error) console.error('Offer code release failed:', error);
}

/** The code with its booking; a booked code whose booking died or stayed unpaid is released first. */
export async function settle(c: OfferCode): Promise<{ code: OfferCode; booking: CodeBooking | null }> {
  let booking: CodeBooking | null = null;
  if (c.booking_id) {
    const { data, error } = await serviceClient().from('bookings').select(BOOKING_COLS).eq('id', c.booking_id).maybeSingle();
    if (error) throw error;
    booking = (data as CodeBooking) ?? null;
  }
  if (!shouldRelease(c, booking)) return { code: c, booking };
  await releaseCode(c.id);
  return { code: { ...c, status: 'issued', booking_id: null, booked_percent: null }, booking: null };
}

/**
 * A paid booking keeps its offer code. If the code was released while the booking was unpaid, take it back;
 * if it was used, cancelled or booked elsewhere meanwhile, report a conflict for the owner.
 */
export async function attachPaidOffer(bookingId: string): Promise<'none' | 'attached' | 'conflict'> {
  const sb = serviceClient();
  const { data: b, error: bErr } = await sb.from('bookings').select('id, offer_code, offer_percent').eq('id', bookingId).maybeSingle();
  if (bErr) throw bErr;
  if (!b?.offer_code) return 'none';
  const { data: c, error: cErr } = await sb.from('offer_codes').select('id, status, booking_id').eq('code', b.offer_code).maybeSingle();
  if (cErr) throw cErr;
  if (!c) return 'conflict';
  if (c.status === 'booked' && c.booking_id === bookingId) return 'attached';
  if (c.status !== 'issued') return 'conflict';
  const { data: rows, error } = await sb.from('offer_codes').update({ status: 'booked', booking_id: bookingId, booked_percent: b.offer_percent })
    .eq('id', c.id).eq('status', 'issued').select('id');
  if (error) throw error;
  return (rows || []).length ? 'attached' : 'conflict';
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/offers/store.test.ts`
Expected: PASS (17 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/offers/store.ts tests/offers/fake-sb.ts tests/offers/store.test.ts
git commit -m "Add offer code store with claim and release"
```

---

### Task 4: Check, mark used and cancel codes

**Files:**
- Create: `lib/offers/verify.ts`
- Test: `tests/offers/verify.test.ts`

**Interfaces:**
- Consumes: `findCode`, `settle` (Task 3); `judgeCode`, `normalizeCode`, `cappedPlanPercents`, `REASON_TEXT`, `CheckResult` (Task 2); `HttpError`, `serviceClient` (`@/lib/server-auth`); `fake` (Task 3 helper).
- Produces (from `@/lib/offers/verify`):
  - `type Viewer = { id: string; role: 'admin' | 'partner' }`
  - `checkCode(input: string, opts: { viewer: Viewer }): Promise<CheckResult>` (logs to `offer_code_checks`; partners see only their own properties; throws `HttpError(429)` after 30 not-found checks per partner per hour)
  - `type RedeemResult = { ok: true; result: CheckResult } | { ok: false; error: string; status: number; result?: CheckResult }`
  - `redeemCode(input: string, by: Viewer): Promise<RedeemResult>`
  - `cancelCode(input: string, by: Viewer, notes?: string): Promise<{ ok: true } | { ok: false; error: string; status: number }>` (throws `HttpError(403)` for non-admins)

- [ ] **Step 1: Write the failing test**

```ts
// tests/offers/verify.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fake } from './fake-sb';

const h = vi.hoisted(() => ({ code: null as any, booking: null as any }));
vi.mock('@/lib/server-auth', async (orig) => {
  const real = await orig<any>();
  const m = await import('./fake-sb');
  return { ...real, serviceClient: () => m.fake.client };
});
vi.mock('@/lib/offers/store', () => ({
  findCode: async (c: string) => (h.code && h.code.code === c ? h.code : null),
  settle: async (c: any) => ({ code: c, booking: h.booking }),
}));

import { cancelCode, checkCode, redeemCode } from '@/lib/offers/verify';

const ADMIN = { id: 'a1', role: 'admin' as const };
const OWNER = { id: 'p1', role: 'partner' as const };
const OTHER = { id: 'p2', role: 'partner' as const };
const issued = (over: any = {}) => ({
  id: 'c1', offer_id: 'o1', code: 'PNV-7K3Q9', phone: '919800000001', conversation_id: 'conv1', percent: 25, issued_at: '2026-10-13T10:00:00Z',
  expires_at: new Date(Date.now() + 3600e3).toISOString(), booking_id: null, booked_percent: null, status: 'issued', redeemed_at: null, redeemed_by: null, notes: null, ...over,
});
const PAID = { id: 'b1', booking_ref: 'HTL-7', status: 'confirmed', payment_status: 'paid', created_at: '2026-10-13T10:00:00Z', guest_name: 'Asha Rao', guest_phone: '9800000001' };
function world() {
  fake.queue('offers', { data: { id: 'o1', property_id: 'h1', default_percent: 20, plan_percents: { 'Deluxe|Breakfast': 30, 'Deluxe|Room Only': 15 } } });
  fake.queue('properties', { data: { id: 'h1', name: 'Panchvati Cottages', owner_id: 'p1' } });
  fake.queue('whatsapp_conversations', { data: { profile_name: 'Asha' } });
}

beforeEach(() => { fake.reset(); h.code = issued(); h.booking = null; });

describe('checkCode', () => {
  it('shows a walk-in coupon to the hotel owner and logs the check', async () => {
    world();
    const r = await checkCode(' pnv 7k3q9 ', { viewer: OWNER });
    expect(r).toMatchObject({
      valid: true, reason: null, path: 'walk_in', percent: 25, default_percent: 20, code: 'PNV-7K3Q9',
      property_name: 'Panchvati Cottages', guest: { name: 'Asha', phone: '919800000001' }, booking_ref: null,
    });
    expect(r.plan_percents).toEqual({ 'Deluxe|Breakfast': 25, 'Deluxe|Room Only': 15 });
    expect(fake.ops('offer_code_checks', 'insert')).toEqual([[{ code_id: 'c1', code_entered: 'PNV-7K3Q9', checked_by: 'p1', result: 'valid' }]]);
  });
  it('says not found to a partner of another hotel and logs it', async () => {
    world();
    const r = await checkCode('PNV-7K3Q9', { viewer: OTHER });
    expect(r).toMatchObject({ valid: false, reason: 'not_found', guest: null, property_name: null, percent: null });
    expect(fake.ops('offer_code_checks', 'insert')[0][0]).toMatchObject({ code_id: null, checked_by: 'p2', result: 'not_found' });
  });
  it('lets the admin check any hotel', async () => {
    world();
    expect((await checkCode('PNV-7K3Q9', { viewer: ADMIN })).valid).toBe(true);
  });
  it('reports expired walk-in codes', async () => {
    h.code = issued({ expires_at: '2020-01-01T00:00:00Z' });
    world();
    expect(await checkCode('PNV-7K3Q9', { viewer: OWNER })).toMatchObject({ valid: false, reason: 'expired' });
  });
  it('shows a paid booking with its booked percent and no time limit', async () => {
    h.code = issued({ status: 'booked', booking_id: 'b1', booked_percent: 20, expires_at: '2020-01-01T00:00:00Z' });
    h.booking = PAID;
    world();
    expect(await checkCode('PNV-7K3Q9', { viewer: OWNER })).toMatchObject({
      valid: true, path: 'paid_booking', percent: 20, booking_ref: 'HTL-7', plan_percents: null, default_percent: null,
      guest: { name: 'Asha Rao', phone: '9800000001' },
    });
  });
  it('blocks a partner after 30 wrong codes in an hour, but never the admin', async () => {
    fake.queue('offer_code_checks', { count: 30 });
    await expect(checkCode('PNV-AAAAA', { viewer: OWNER })).rejects.toMatchObject({ status: 429 });
    expect(fake.ops('offer_code_checks', 'eq')).toEqual([['checked_by', 'p1'], ['result', 'not_found']]);
    fake.reset();
    fake.queue('offer_code_checks', { count: 99 });
    expect((await checkCode('PNV-AAAAA', { viewer: ADMIN })).reason).toBe('not_found');
  });
});

describe('redeemCode', () => {
  it('marks a valid walk-in code used, only while it is still issued and unexpired', async () => {
    world();
    fake.queue('offer_codes', { data: [{ id: 'c1' }] });
    const r = await redeemCode('pnv-7k3q9', OWNER);
    expect(r).toMatchObject({ ok: true, result: { status: 'redeemed', reason: 'already_used', valid: false } });
    expect(fake.ops('offer_codes', 'update')[0][0]).toMatchObject({ status: 'redeemed', redeemed_by: 'p1' });
    expect(fake.ops('offer_codes', 'eq')).toEqual([['id', 'c1'], ['status', 'issued']]);
    expect(fake.ops('offer_codes', 'gt')[0][0]).toBe('expires_at');
    expect(fake.ops('offer_code_checks', 'insert')[0][0]).toMatchObject({ result: 'redeemed' });
  });
  it('loses the race cleanly when someone else used it first', async () => {
    world();
    fake.queue('offer_codes', { data: [] });
    expect(await redeemCode('PNV-7K3Q9', OWNER)).toEqual({ ok: false, error: 'This code was just used or changed. Check it again.', status: 409 });
  });
  it('refuses a code that was already used', async () => {
    h.code = issued({ status: 'redeemed', redeemed_at: '2026-10-13T11:00:00Z' });
    world();
    expect(await redeemCode('PNV-7K3Q9', OWNER)).toMatchObject({ ok: false, status: 409, error: 'This code was already used' });
    expect(fake.ops('offer_codes', 'update')).toEqual([]);
  });
  it('refuses a booked code whose booking is not paid', async () => {
    h.code = issued({ status: 'booked', booking_id: 'b1', booked_percent: 20 });
    h.booking = { ...PAID, payment_status: 'pending', status: 'pending' };
    world();
    expect(await redeemCode('PNV-7K3Q9', OWNER)).toMatchObject({ ok: false, status: 409, error: 'This code is linked to a booking that is not paid yet' });
  });
  it('marks a paid booking code used while it is still booked', async () => {
    h.code = issued({ status: 'booked', booking_id: 'b1', booked_percent: 20 });
    h.booking = PAID;
    world();
    fake.queue('offer_codes', { data: [{ id: 'c1' }] });
    expect((await redeemCode('PNV-7K3Q9', OWNER)).ok).toBe(true);
    expect(fake.ops('offer_codes', 'eq')).toEqual([['id', 'c1'], ['status', 'booked']]);
  });
  it('is not found for a partner of another hotel', async () => {
    world();
    expect(await redeemCode('PNV-7K3Q9', OTHER)).toEqual({ ok: false, error: 'Code not found', status: 404 });
    expect(fake.ops('offer_codes', 'update')).toEqual([]);
  });
});

describe('cancelCode', () => {
  it('is admin only', async () => {
    await expect(cancelCode('PNV-7K3Q9', OWNER)).rejects.toMatchObject({ status: 403 });
  });
  it('cancels an issued or booked code with a note', async () => {
    fake.queue('offer_codes', { data: [{ id: 'c1' }] });
    expect(await cancelCode('pnv-7k3q9', ADMIN, ' Asked twice ')).toEqual({ ok: true });
    expect(fake.ops('offer_codes', 'update')[0]).toEqual([{ status: 'cancelled', notes: 'Asked twice' }]);
    expect(fake.ops('offer_codes', 'in')).toEqual([['status', ['issued', 'booked']]]);
  });
  it('refuses unknown and finished codes', async () => {
    expect(await cancelCode('PNV-ZZZZZ', ADMIN)).toEqual({ ok: false, error: 'Code not found', status: 404 });
    fake.queue('offer_codes', { data: [] });
    expect(await cancelCode('PNV-7K3Q9', ADMIN)).toEqual({ ok: false, error: 'Only issued or booked codes can be cancelled', status: 409 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/offers/verify.test.ts`
Expected: FAIL, cannot resolve `@/lib/offers/verify`.

- [ ] **Step 3: Implement**

```ts
// lib/offers/verify.ts
import { HttpError, serviceClient } from '@/lib/server-auth';
import { cappedPlanPercents, judgeCode, normalizeCode, REASON_TEXT, type CheckResult, type CodeBooking, type OfferCode } from './rules';
import { findCode, settle } from './store';

export type Viewer = { id: string; role: 'admin' | 'partner' };
export type RedeemResult = { ok: true; result: CheckResult } | { ok: false; error: string; status: number; result?: CheckResult };

const NOT_FOUND_PER_HOUR = 30;

type Loaded = {
  c: OfferCode; booking: CodeBooking | null; defaultPercent: number; planPercents: Record<string, number>;
  propertyName: string; guestName: string | null;
};

/** The code with its offer, property and guest; null when it does not exist or belongs to another partner's property. */
async function load(code: string, viewer: Viewer): Promise<Loaded | null> {
  const found = await findCode(code);
  if (!found) return null;
  const sb = serviceClient();
  const { data: offer, error: oErr } = await sb.from('offers').select('id, property_id, default_percent, plan_percents').eq('id', found.offer_id).maybeSingle();
  if (oErr) throw oErr;
  if (!offer) return null;
  const { data: prop, error: pErr } = await sb.from('properties').select('id, name, owner_id').eq('id', offer.property_id).maybeSingle();
  if (pErr) throw pErr;
  if (!prop || (viewer.role !== 'admin' && prop.owner_id !== viewer.id)) return null;
  const { code: c, booking } = await settle(found);
  let guestName = booking?.guest_name ?? null;
  if (!guestName && c.conversation_id) {
    const { data: conv } = await sb.from('whatsapp_conversations').select('profile_name').eq('id', c.conversation_id).maybeSingle();
    guestName = conv?.profile_name ?? null;
  }
  return { c, booking, defaultPercent: offer.default_percent, planPercents: offer.plan_percents || {}, propertyName: prop.name, guestName };
}

function toResult(f: Loaded): CheckResult {
  const v = judgeCode(f.c, f.booking);
  const walkIn = v.path === 'walk_in';
  return {
    ...v,
    code: f.c.code,
    status: f.c.status,
    default_percent: walkIn ? Math.min(f.defaultPercent, f.c.percent) : null,
    plan_percents: walkIn ? cappedPlanPercents({ plan_percents: f.planPercents }, f.c.percent) : null,
    guest: { name: f.guestName, phone: f.booking?.guest_phone || f.c.phone },
    expires_at: f.c.expires_at,
    booking_ref: f.booking?.booking_ref ?? null,
    property_name: f.propertyName,
    redeemed_at: f.c.redeemed_at,
  };
}

const notFound = (code: string): CheckResult => ({
  valid: false, reason: 'not_found', path: null, percent: null, code, status: null, default_percent: null, plan_percents: null,
  guest: null, expires_at: null, booking_ref: null, property_name: null, redeemed_at: null,
});

async function logCheck(codeId: string | null, entered: string, by: string, result: string): Promise<void> {
  const { error } = await serviceClient().from('offer_code_checks').insert({ code_id: codeId, code_entered: entered.slice(0, 40), checked_by: by, result });
  if (error) console.error('Offer code check log failed:', error);
}

/** Codes are short; stop a partner account from guessing them. */
async function assertNotThrottled(viewer: Viewer): Promise<void> {
  if (viewer.role === 'admin') return;
  const since = new Date(Date.now() - 3600e3).toISOString();
  const { count, error } = await serviceClient().from('offer_code_checks').select('id', { count: 'exact', head: true })
    .eq('checked_by', viewer.id).eq('result', 'not_found').gte('created_at', since);
  if (error) throw error;
  if ((count || 0) >= NOT_FOUND_PER_HOUR) throw new HttpError(429, 'Too many wrong codes. Please wait an hour and try again.');
}

export async function checkCode(input: string, opts: { viewer: Viewer }): Promise<CheckResult> {
  const code = normalizeCode(input);
  await assertNotThrottled(opts.viewer);
  const f = await load(code, opts.viewer);
  const result = f ? toResult(f) : notFound(code);
  await logCheck(f?.c.id ?? null, code, opts.viewer.id, result.valid ? 'valid' : result.reason!);
  return result;
}

/** Make a code single-use. Walk-in: issued and not expired. Paid booking: booked and the booking is paid. */
export async function redeemCode(input: string, by: Viewer): Promise<RedeemResult> {
  const code = normalizeCode(input);
  await assertNotThrottled(by);
  const f = await load(code, by);
  if (!f) {
    await logCheck(null, code, by.id, 'not_found');
    return { ok: false, error: REASON_TEXT.not_found, status: 404 };
  }
  const before = toResult(f);
  if (!before.valid) return { ok: false, error: REASON_TEXT[before.reason!], status: 409, result: before };
  const at = new Date().toISOString();
  let q = serviceClient().from('offer_codes').update({ status: 'redeemed', redeemed_at: at, redeemed_by: by.id }).eq('id', f.c.id);
  q = before.path === 'walk_in' ? q.eq('status', 'issued').gt('expires_at', at) : q.eq('status', 'booked');
  const { data, error } = await q.select('id');
  if (error) throw error;
  if (!data?.length) return { ok: false, error: 'This code was just used or changed. Check it again.', status: 409 };
  await logCheck(f.c.id, code, by.id, 'redeemed');
  return { ok: true, result: { ...before, valid: false, reason: 'already_used', status: 'redeemed', redeemed_at: at } };
}

export async function cancelCode(input: string, by: Viewer, notes?: string): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (by.role !== 'admin') throw new HttpError(403, 'Only the admin can cancel offer codes');
  const code = normalizeCode(input);
  const c = await findCode(code);
  if (!c) return { ok: false, error: REASON_TEXT.not_found, status: 404 };
  const patch: Record<string, unknown> = { status: 'cancelled' };
  if (notes?.trim()) patch.notes = notes.trim().slice(0, 500);
  const { data, error } = await serviceClient().from('offer_codes').update(patch).eq('id', c.id).in('status', ['issued', 'booked']).select('id');
  if (error) throw error;
  if (!data?.length) return { ok: false, error: 'Only issued or booked codes can be cancelled', status: 409 };
  await logCheck(c.id, code, by.id, 'cancelled');
  return { ok: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/offers/verify.test.ts`
Expected: PASS (15 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/offers/verify.ts tests/offers/verify.test.ts
git commit -m "Add offer code check, mark-used and cancel"
```

---

### Task 5: `createBooking` takes an offer

**Files:**
- Modify: `lib/bookings/create.ts` (imports, `createBooking` options, pricing right after `quoteBooking(...)`, bookings insert)
- Test: `tests/bookings/create-offer.test.ts` (new); `tests/api/bookings.test.ts` and `tests/bookings/create.test.ts` unchanged and must pass

**Interfaces:**
- Consumes: `discounted`, `OFFER_NEEDS_ONLINE` (Task 2).
- Produces: `export type BookingOffer = { code: string; percent: number }`; `createBooking(data: BookingInput, opts: { userId: string | null; callerRole?: string | null; offer?: BookingOffer }): Promise<CreateResult>`. With `offer`: amount = `discounted(listAmount, offer.percent)`; only `payment_method: 'online'` with Stripe configured and amount >= 100 is accepted, else `{ ok: false, error: OFFER_NEEDS_ONLINE, status: 400 }`; the insert adds `offer_code`, `offer_percent`. Without `offer` the insert has neither key.

- [ ] **Step 1: Write the failing test**

```ts
// tests/bookings/create-offer.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const h = vi.hoisted(() => ({
  inserted: [] as any[], emails: [] as string[],
  hotel: { id: '11111111-1111-4111-8111-111111111111', name: 'Panchvati Cottages', price_min: 4000, commission_pct: 12, rooms: [] as any[] },
}));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: table === 'properties' ? h.hotel : null }) }) }),
      insert: (row: any) => {
        if (table === 'bookings') h.inserted.push(row);
        return {
          select: () => ({ single: async () => ({ data: { id: 'b1', booking_ref: 'HTL-1', ...row }, error: null }) }),
          then: (r: any) => r({ error: null }),
        };
      },
    }),
  }),
}));
vi.mock('@/lib/booking-emails', () => ({ sendBookingEmails: async (id: string) => { h.emails.push(id); } }));

import { bookingSchema, createBooking } from '@/lib/bookings/create';
import { OFFER_NEEDS_ONLINE } from '@/lib/offers/rules';

// No room_name: hotel priced from price_min (4000/night), so no room-availability lookup is involved.
const input = (over: Record<string, unknown> = {}) => bookingSchema.parse({
  category: 'hotel', property_id: h.hotel.id, guest_name: 'Asha Rao', guest_phone: '919800000001', num_guests: 2,
  check_in: '2099-01-10', check_out: '2099-01-12', payment_method: 'online', booking_source: 'whatsapp', ...over,
});
const OFFER = { code: 'PNV-7K3Q9', percent: 25 };

beforeEach(() => {
  h.inserted.length = 0; h.emails.length = 0;
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://sb');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'key');
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test');
});
afterEach(() => vi.unstubAllEnvs());

describe('createBooking with an offer', () => {
  it('takes the offer percent off the server price and records the code', async () => {
    const r = await createBooking(input(), { userId: null, callerRole: null, offer: OFFER });
    expect(r).toMatchObject({ ok: true, amount: 6000, payment_method: 'online' });
    expect(h.inserted[0]).toMatchObject({
      amount: 6000, payment_method: 'online', offer_code: 'PNV-7K3Q9', offer_percent: 25,
      commission_amount: 720, commission_status: 'not_applicable',
    });
    expect(h.emails).toEqual([]);
  });
  it('refuses an offer booking that is not paid online', async () => {
    expect(await createBooking(input({ payment_method: 'pay_at_hotel' }), { userId: null, callerRole: null, offer: OFFER }))
      .toEqual({ ok: false, error: OFFER_NEEDS_ONLINE, status: 400 });
    expect(h.inserted).toEqual([]);
  });
  it('refuses an offer booking when online payment is not set up', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    expect(await createBooking(input(), { userId: null, callerRole: null, offer: OFFER }))
      .toEqual({ ok: false, error: OFFER_NEEDS_ONLINE, status: 400 });
    expect(h.inserted).toEqual([]);
  });
  it('leaves bookings without an offer as they were', async () => {
    const r = await createBooking(input({ payment_method: 'pay_at_hotel' }), { userId: null, callerRole: null });
    expect(r).toMatchObject({ ok: true, amount: 8000 });
    expect(h.inserted[0]).not.toHaveProperty('offer_code');
    expect(h.inserted[0]).not.toHaveProperty('offer_percent');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/bookings/create-offer.test.ts`
Expected: FAIL (amount 8000 instead of 6000, no `offer_code`, and the guard tests insert a row).

- [ ] **Step 3: Implement**

In `lib/bookings/create.ts`:

Add to the imports at the top:

```ts
import { discounted, OFFER_NEEDS_ONLINE } from '@/lib/offers/rules';
```

Add next to `export type BookingInput = z.infer<typeof bookingSchema>;`:

```ts
/** A WhatsApp offer code already validated and claimed by the caller (never taken from the website form). */
export type BookingOffer = { code: string; percent: number };
```

Change the signature line

```ts
export async function createBooking(data: BookingInput, opts: { userId: string | null; callerRole?: string | null }): Promise<CreateResult> {
```

to

```ts
export async function createBooking(data: BookingInput, opts: { userId: string | null; callerRole?: string | null; offer?: BookingOffer }): Promise<CreateResult> {
```

Replace the pricing call

```ts
    const { amount, commission_pct } = quoteBooking(data.category, entity, {
      num_guests: data.num_guests, check_in: data.check_in, check_out: data.check_out,
      room_name: data.room_name, plan_index: data.plan_index ?? null,
    });
```

with

```ts
    const { amount: listAmount, commission_pct } = quoteBooking(data.category, entity, {
      num_guests: data.num_guests, check_in: data.check_in, check_out: data.check_out,
      room_name: data.room_name, plan_index: data.plan_index ?? null,
    });
    // A WhatsApp offer lowers the database price by its percent and must be paid online in full (pay later is never discounted).
    const amount = opts.offer ? discounted(listAmount, opts.offer.percent) : listAmount;
    if (opts.offer && (data.payment_method !== 'online' || amount < 100 || !process.env.STRIPE_SECRET_KEY)) {
      return { ok: false, error: OFFER_NEEDS_ONLINE, status: 400 };
    }
```

In the `sb.from('bookings').insert({ ... })` object, directly after the line `room_name: room_label,` (keep any `room_key` line the availability plan added there), add:

```ts
      ...(opts.offer ? { offer_code: opts.offer.code, offer_percent: opts.offer.percent } : {}),
```

Nothing else in `createBooking` changes: `commission_amount` is computed from the discounted `amount`, and an online booking keeps `commission_status: 'not_applicable'`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/bookings tests/api/bookings.test.ts`
Expected: PASS, including the 4 new tests; existing booking tests unchanged.

- [ ] **Step 5: Commit**

```bash
git add lib/bookings/create.ts tests/bookings/create-offer.test.ts
git commit -m "Apply WhatsApp offer percent in createBooking, online only"
```

---

### Task 6: Release codes on cancel, re-attach on late payment

**Files:**
- Modify: `lib/bookings/cancel.ts` (after the commission waive block)
- Modify: `app/api/webhooks/stripe/route.ts` (after `await sendBookingEmails(booking.id);` in the paid branch)
- Test: `tests/bookings/cancel.test.ts`, `tests/api/stripe-webhook.test.ts` (add mocks and tests; existing tests unchanged)

**Interfaces:**
- Consumes: `releaseForBooking(bookingId)`, `attachPaidOffer(bookingId): Promise<'none' | 'attached' | 'conflict'>` (Task 3).
- Produces: `cancelBooking` releases the booking's offer code after a successful save; the Stripe webhook re-attaches the offer code of a newly paid (not cancelled) booking and emails the owner "Offer code conflict on paid booking <ref>" on conflict.

- [ ] **Step 1: Write the failing tests**

In `tests/bookings/cancel.test.ts`, add below the existing `vi.mock('@/lib/booking-whatsapp', ...)` line:

```ts
const off = vi.hoisted(() => ({ released: [] as string[] }));
vi.mock('@/lib/offers/store', () => ({ releaseForBooking: async (id: string) => { off.released.push(id); } }));
```

Change the existing `beforeEach` to also reset it:

```ts
beforeEach(() => { Object.assign(h, { updates: [], recordUpdates: [], updateError: null, emails: [], wa: [] }); off.released = []; });
```

Add inside `describe('cancelBooking', ...)`:

```ts
  it('gives the booking\'s offer code back after cancelling', async () => {
    await cancelBooking({ id: 'b1', commission_status: 'pending' }, 'Sick', { notify: false });
    expect(off.released).toEqual(['b1']);
  });
  it('keeps the offer code when the cancel could not be saved', async () => {
    h.updateError = { message: 'boom' };
    await cancelBooking({ id: 'b1' }, 'Sick', { notify: false });
    expect(off.released).toEqual([]);
  });
```

In `tests/api/stripe-webhook.test.ts`, add below the existing `vi.mock('@/lib/email', ...)` line:

```ts
const o = vi.hoisted(() => ({ result: 'none' as 'none' | 'attached' | 'conflict', calls: [] as string[] }));
vi.mock('@/lib/offers/store', () => ({ attachPaidOffer: async (id: string) => { o.calls.push(id); return o.result; } }));
```

At the end of the existing `beforeEach`, add:

```ts
  o.result = 'none';
  o.calls.length = 0;
```

Add inside `describe('POST /api/webhooks/stripe', ...)`:

```ts
  it('ties the offer code to the paid booking', async () => {
    h.result = { data: { id: 'b1', booking_ref: 'DS-1' }, error: null };
    o.result = 'attached';
    await send();
    expect(o.calls).toEqual(['b1']);
    expect(h.sendEmail).not.toHaveBeenCalled();
  });

  it('emails the owner when a paid booking\'s offer code was used elsewhere', async () => {
    h.result = { data: { id: 'b1', booking_ref: 'DS-1' }, error: null };
    o.result = 'conflict';
    const res = await send();
    expect(res.status).toBe(200);
    expect(h.sendEmail).toHaveBeenCalledTimes(1);
    expect(h.sendEmail.mock.calls[0][0]).toMatchObject({ to: 'owner@x', subject: 'Offer code conflict on paid booking DS-1' });
  });

  it('does not touch offer codes for a cancelled booking', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.bySession = { data: open({ status: 'cancelled', commission_status: 'waived' }), error: null };
    h.result = { data: { id: 'b1', booking_ref: 'DS-1', status: 'cancelled' }, error: null };
    await send();
    expect(o.calls).toEqual([]);
    spy.mockRestore();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/bookings/cancel.test.ts tests/api/stripe-webhook.test.ts`
Expected: FAIL on the new tests (`off.released` / `o.calls` stay empty, no conflict email).

- [ ] **Step 3: Implement**

In `lib/bookings/cancel.ts`, add to the imports:

```ts
import { releaseForBooking } from '@/lib/offers/store';
```

Directly before `  if (opts.notify) {`, add:

```ts
  // A cancelled booking gives its WhatsApp offer code back (it works again while still inside its window).
  try { await releaseForBooking(booking.id); } catch (e) { console.error('Offer code release failed:', e); }
```

In `app/api/webhooks/stripe/route.ts`, add to the imports:

```ts
import { attachPaidOffer } from '@/lib/offers/store';
```

In the `} else if (booking) {` branch, directly after `await sendBookingEmails(booking.id);`, add:

```ts
          try {
            if ((await attachPaidOffer(booking.id)) === 'conflict') {
              await sendEmail({
                to: adminEmail(), subject: `Offer code conflict on paid booking ${booking.booking_ref}`,
                html: `<p>Booking <b>${esc(booking.booking_ref)}</b> was paid at the WhatsApp offer price, but its offer code was already used, cancelled or linked to another booking. Check it in Admin → WhatsApp offers.</p>`,
              });
            }
          } catch (e) { console.error('Stripe webhook: offer code attach failed:', e); }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/bookings/cancel.test.ts tests/api/stripe-webhook.test.ts`
Expected: PASS (all old tests plus 5 new).

- [ ] **Step 5: Commit**

```bash
git add lib/bookings/cancel.ts app/api/webhooks/stripe/route.ts tests/bookings/cancel.test.ts tests/api/stripe-webhook.test.ts
git commit -m "Release offer codes on cancel and re-attach on late payment"
```

---

### Task 7: `get_offer_code` tool and offer notes on hotels

**Files:**
- Create: `lib/wa-chat/offer-tools.ts`
- Modify: `lib/wa-chat/tools.ts` (imports, `TOOL_DEFS`, `searchHotels`, `getHotel`, `runTool`)
- Test: `tests/wa-chat/offer-tools.test.ts` (new), `tests/wa-chat/tools.test.ts` (tool list, ids on mock rows, new mock and tests)

**Interfaces:**
- Consumes: `offerFor`, `activeOffers`, `getOffer`, `issueCode`, `findCode`, `settle` (Task 3); `formatIST`, `isExpired`, `normalizeCode`, `planPercent`, `rulesLine`, `upToText` (Task 2); `samePhone` (`./booking-store`); `findHotel` (`./find`); `ToolCtx` (`./tools`).
- Produces (from `@/lib/wa-chat/offer-tools`):
  - `OFFER_TOOL_DEF` (OpenAI function `get_offer_code`, required `['hotel_name']`)
  - `getOfferCode(a: any, ctx: ToolCtx): Promise<{ hotel: string; code: string; expires_at_india_time: string; up_to_percent: number; rules: string } | { error: string }>`
  - `offerNotes(propertyIds: string[]): Promise<Record<string, string>>` (property id → "Up to X% off, only through this WhatsApp chat"; `{}` on any error)
  - `type OfferOk = { ok: true; codeId: string; code: string; percent: number; expiresAt: string }`, `type OfferCheck = OfferOk | { error: string }`
  - `offerForBooking(i: { code: unknown; phone: string; propertyId: string | null | undefined; room?: string | null; plan?: string | null }): Promise<OfferCheck>` (percent = `min(planPercent(offer, room, plan), code.percent)`; works after the offer is switched off)
  - `search_hotels` / `get_hotel` results carry `offer` (string) for hotels with an active offer.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/wa-chat/offer-tools.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const h = vi.hoisted(() => ({ offer: null as any, issued: null as any, issueCalls: [] as any[], code: null as any, offerById: null as any, active: [] as any }));
vi.mock('@/lib/wa-chat/find', () => ({
  findHotel: async (n: string) => (n.toLowerCase().includes('panch') ? { id: 'h1', name: 'Panchvati Cottages', slug: 'panchvati-cottages' } : null),
}));
vi.mock('@/lib/offers/store', () => ({
  offerFor: async () => h.offer,
  issueCode: async (...a: any[]) => { h.issueCalls.push(a); return h.issued; },
  findCode: async (c: string) => (h.code && h.code.code === c ? h.code : null),
  settle: async (c: any) => ({ code: c, booking: null }),
  getOffer: async () => h.offerById,
  activeOffers: async () => { if (h.active === 'throw') throw new Error('db down'); return h.active; },
}));

import { getOfferCode, offerForBooking, offerNotes, OFFER_TOOL_DEF } from '@/lib/wa-chat/offer-tools';

const OFFER = { id: 'o1', property_id: 'h1', name: 'Panchvati', active: true, default_percent: 20, plan_percents: { 'Deluxe|Breakfast': 25 }, valid_hours: 3, code_prefix: 'PNV' };
const ctx = () => ({ conversationId: 'c1', phone: '919800000001', profileName: 'Asha', handedOver: false });
const code = (over: any = {}) => ({
  id: 'k1', offer_id: 'o1', code: 'PNV-7K3Q9', phone: '919800000001', conversation_id: 'c1', percent: 25, issued_at: '2026-10-13T10:00:00Z',
  expires_at: new Date(Date.now() + 3 * 3600e3 - 60e3).toISOString(), booking_id: null, booked_percent: null, status: 'issued',
  redeemed_at: null, redeemed_by: null, notes: null, ...over,
});

beforeEach(() => {
  Object.assign(h, { offer: OFFER, issued: { ok: true, code: code(), reused: false }, issueCalls: [], code: code(), offerById: OFFER, active: [OFFER] });
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test');
});
afterEach(() => vi.unstubAllEnvs());

describe('get_offer_code', () => {
  it('takes only a hotel name', () => {
    expect(OFFER_TOOL_DEF.function.name).toBe('get_offer_code');
    expect(OFFER_TOOL_DEF.function.parameters.required).toEqual(['hotel_name']);
    expect(Object.keys(OFFER_TOOL_DEF.function.parameters.properties)).toEqual(['hotel_name']);
  });
  it('issues the code to the chat phone and explains the rules', async () => {
    const r: any = await getOfferCode({ hotel_name: 'Panchvati' }, ctx());
    expect(h.issueCalls[0]).toEqual(['o1', '919800000001', 'c1']);
    expect(r).toMatchObject({ hotel: 'Panchvati Cottages', code: 'PNV-7K3Q9', up_to_percent: 25 });
    expect(r.expires_at_india_time).toMatch(/\d{1,2}:\d{2}/);
    expect(r.rules).toMatch(/pay online in full/);
    expect(r.rules).toMatch(/Not valid with pay later/);
  });
  it('sends the customer to reception when online payment is off', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    const r: any = await getOfferCode({ hotel_name: 'Panchvati' }, ctx());
    expect(r.rules).toMatch(/reception/);
    expect(r.rules).not.toMatch(/pay online in full/);
  });
  it('errors when the hotel has no offer or is unknown', async () => {
    h.offer = null;
    expect(await getOfferCode({ hotel_name: 'Panchvati' }, ctx())).toEqual({ error: 'This hotel has no WhatsApp offer right now.' });
    expect(((await getOfferCode({ hotel_name: 'Nowhere' }, ctx())) as any).error).toMatch(/not found/i);
    expect(h.issueCalls).toEqual([]);
  });
});

describe('offerForBooking', () => {
  const base = { code: 'pnv 7k3q9', phone: '+91 98000 00001', propertyId: 'h1', room: 'Deluxe', plan: 'Breakfast' };
  it('accepts the code typed loosely by its own customer and uses the plan percent', async () => {
    expect(await offerForBooking(base)).toMatchObject({ ok: true, codeId: 'k1', code: 'PNV-7K3Q9', percent: 25 });
    expect(await offerForBooking({ ...base, plan: 'Room Only' })).toMatchObject({ ok: true, percent: 20 });
  });
  it('never gives more than the code promised', async () => {
    h.offerById = { ...OFFER, plan_percents: { 'Deluxe|Breakfast': 40 } };
    expect(await offerForBooking(base)).toMatchObject({ percent: 25 });
  });
  it('still honours a code after the offer was switched off', async () => {
    h.offerById = { ...OFFER, active: false };
    expect(await offerForBooking(base)).toMatchObject({ ok: true });
  });
  it('rejects another phone, another hotel, expired, booked and used codes', async () => {
    expect(((await offerForBooking({ ...base, phone: '919811111111' })) as any).error).toMatch(/not found for this WhatsApp number/);
    expect(((await offerForBooking({ ...base, propertyId: 'h2' })) as any).error).toMatch(/different hotel/);
    h.code = code({ expires_at: '2020-01-01T00:00:00Z' });
    expect(((await offerForBooking(base)) as any).error).toMatch(/expired/);
    h.code = code({ status: 'booked', booking_id: 'b9' });
    expect(((await offerForBooking(base)) as any).error).toMatch(/already used/);
    h.code = code({ status: 'redeemed' });
    expect(((await offerForBooking(base)) as any).error).toMatch(/can no longer be used/);
  });
});

describe('offerNotes', () => {
  it('maps hotels with an active offer to the up-to wording', async () => {
    expect(await offerNotes(['h1', 'h2'])).toEqual({ h1: 'Up to 25% off, only through this WhatsApp chat' });
    expect(await offerNotes([])).toEqual({});
  });
  it('never breaks hotel answers when the lookup fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.active = 'throw';
    expect(await offerNotes(['h1'])).toEqual({});
    spy.mockRestore();
  });
});
```

In `tests/wa-chat/tools.test.ts`:

Add `id` fields to the `@/lib/db` mock rows: `id: 'p-panch'` on the Panchvati row in `getPublishedProperties`, `id: 'p-pine'` on the Pine View row, and `id: 'p-panch'` on the object returned by `getPropertyBySlug`.

Add below the existing `vi.mock('@/lib/wa-chat/cancellations', ...)` line:

```ts
vi.mock('@/lib/wa-chat/offer-tools', () => ({
  OFFER_TOOL_DEF: { type: 'function', function: { name: 'get_offer_code' } },
  getOfferCode: async () => ({ code: 'PNV-7K3Q9' }),
  offerNotes: async (ids: string[]) => Object.fromEntries(ids.filter((id) => id === 'p-panch').map((id) => [id, 'Up to 25% off, only through this WhatsApp chat'])),
}));
```

Change the expected tool names in `it('defines every tool', ...)` to:

```ts
      ['create_booking', 'create_enquiry', 'get_hotel', 'get_offer_code', 'get_trek', 'handover', 'list_paragliding', 'list_taxi_routes', 'list_treks', 'my_bookings', 'payment_link', 'quote_booking', 'request_cancellation', 'search_hotels']);
```

Add inside `describe('tools', ...)`:

```ts
  it('get_hotel and search_hotels show an active offer', async () => {
    const one = JSON.parse(await runTool('get_hotel', { name: 'panchvati' }, ctx()));
    expect(one.offer).toBe('Up to 25% off, only through this WhatsApp chat');
    const list = JSON.parse(await runTool('search_hotels', {}, ctx()));
    expect(list.hotels.find((x: any) => x.name === 'Panchvati Cottages').offer).toBe('Up to 25% off, only through this WhatsApp chat');
    expect(list.hotels.find((x: any) => x.name === 'Pine View')).not.toHaveProperty('offer');
  });
  it('routes get_offer_code', async () => {
    expect(JSON.parse(await runTool('get_offer_code', { hotel_name: 'panchvati' }, ctx()))).toEqual({ code: 'PNV-7K3Q9' });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/wa-chat/offer-tools.test.ts tests/wa-chat/tools.test.ts`
Expected: FAIL, cannot resolve `@/lib/wa-chat/offer-tools`; tool list missing `get_offer_code`.

- [ ] **Step 3: Implement `offer-tools.ts`**

```ts
// lib/wa-chat/offer-tools.ts
import { activeOffers, findCode, getOffer, issueCode, offerFor, settle } from '@/lib/offers/store';
import { formatIST, isExpired, normalizeCode, planPercent, rulesLine, upToText } from '@/lib/offers/rules';
import { samePhone } from './booking-store';
import { findHotel } from './find';
import type { ToolCtx } from './tools';

export type OfferOk = { ok: true; codeId: string; code: string; percent: number; expiresAt: string };
export type OfferCheck = OfferOk | { error: string };

export const OFFER_TOOL_DEF = {
  type: 'function',
  function: {
    name: 'get_offer_code',
    description: 'Give this customer their WhatsApp-only offer code for a hotel whose search_hotels or get_hotel result shows an offer. Returns the code, when it expires (India time), the maximum percent and the rules in one line. Asking again returns the same code until it expires.',
    parameters: {
      type: 'object',
      properties: { hotel_name: { type: 'string', description: 'Hotel name or page slug' } },
      required: ['hotel_name'],
      additionalProperties: false,
    },
  },
};

export async function getOfferCode(a: any, ctx: ToolCtx) {
  const p: any = await findHotel(String(a.hotel_name || ''));
  if (!p) return { error: 'Hotel not found. Use search_hotels first.' };
  const offer = await offerFor(p.id);
  if (!offer) return { error: 'This hotel has no WhatsApp offer right now.' };
  const r = await issueCode(offer.id, ctx.phone, ctx.conversationId);
  if (!r.ok) return { error: r.error };
  return {
    hotel: p.name, code: r.code.code, expires_at_india_time: formatIST(r.code.expires_at), up_to_percent: r.code.percent,
    rules: rulesLine(r.code, !!process.env.STRIPE_SECRET_KEY),
  };
}

/** "Up to X% off, only through this WhatsApp chat" per property with an active offer. Never throws. */
export async function offerNotes(propertyIds: string[]): Promise<Record<string, string>> {
  if (!propertyIds.length) return {};
  try {
    const want = new Set(propertyIds);
    return Object.fromEntries((await activeOffers()).filter((o) => want.has(o.property_id)).map((o) => [o.property_id, upToText(o)]));
  } catch (e) {
    console.error('Offer lookup failed:', e);
    return {};
  }
}

/** Can this chat's customer book this hotel room/plan with this code right now, and at what percent? */
export async function offerForBooking(i: { code: unknown; phone: string; propertyId: string | null | undefined; room?: string | null; plan?: string | null }): Promise<OfferCheck> {
  const found = await findCode(normalizeCode(i.code));
  if (!found || !samePhone(found.phone, i.phone)) return { error: 'That offer code was not found for this WhatsApp number. Use get_offer_code to get one.' };
  const { code: c } = await settle(found);
  if (c.status === 'booked') return { error: 'This offer code is already used for another booking.' };
  if (c.status !== 'issued') return { error: 'This offer code can no longer be used.' };
  if (isExpired(c)) return { error: 'This offer code has expired. Use get_offer_code to get a new one if the offer is still on.' };
  const offer = await getOffer(c.offer_id);
  if (!offer || !i.propertyId || offer.property_id !== i.propertyId) return { error: 'This offer code is for a different hotel.' };
  return { ok: true, codeId: c.id, code: c.code, percent: Math.min(planPercent(offer, i.room, i.plan), c.percent), expiresAt: c.expires_at };
}
```

- [ ] **Step 4: Wire into `tools.ts`**

In `lib/wa-chat/tools.ts`, add to the imports:

```ts
import { getOfferCode, OFFER_TOOL_DEF, offerNotes } from './offer-tools';
```

In `TOOL_DEFS`, change the last entry line `  ...BOOKING_TOOL_DEFS, CANCEL_TOOL_DEF,` to:

```ts
  ...BOOKING_TOOL_DEFS, CANCEL_TOOL_DEF, OFFER_TOOL_DEF,
```

In `searchHotels`, replace

```ts
  return {
    hotels: rows.slice(0, 6).map((p) => ({
```

with

```ts
  const top = rows.slice(0, 6);
  const offers = await offerNotes(top.map((p) => p.id));
  return {
    hotels: top.map((p) => ({
```

and in the same object add after `link: \`${SITE}/hotels/${p.slug}\`,`:

```ts
      offer: offers[p.id],
```

In `getHotel`, directly after `if (!p) return { error: 'Hotel not found. Try search_hotels.' };` add:

```ts
  const offers = await offerNotes([p.id]);
```

and in its returned object, after `cancellation_policy: p.cancellation_policy || null,` add:

```ts
    offer: offers[p.id],
```

In `runTool`, directly after `if (name === 'request_cancellation') return JSON.stringify(await requestCancellation(a, ctx, handover));` add:

```ts
    if (name === 'get_offer_code') return JSON.stringify(await getOfferCode(a, ctx));
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/wa-chat`
Expected: PASS (new offer-tools tests, tools tests, and all other wa-chat tests).

- [ ] **Step 6: Commit**

```bash
git add lib/wa-chat/offer-tools.ts lib/wa-chat/tools.ts tests/wa-chat/offer-tools.test.ts tests/wa-chat/tools.test.ts
git commit -m "Add get_offer_code tool and offer notes on hotels"
```

---

### Task 8: `quote_booking` and `create_booking` with an offer code

**Files:**
- Modify: `lib/wa-chat/booking-tools.ts` (imports, `quote_booking` definition, tail of `quoteTool`, three spots in `createTool`)
- Test: `tests/wa-chat/booking-tools-offers.test.ts` (new); `tests/wa-chat/booking-tools.test.ts` unchanged and must pass

**Interfaces:**
- Consumes: `offerForBooking`, `OfferOk` (Task 7); `claimCode`, `releaseCode`, `linkCodeBooking` (Task 3); `discounted`, `formatIST`, `OFFER_NEEDS_ONLINE`, `offerNeedsOnline` (Task 2); `createBooking(..., { offer })` (Task 5).
- Produces:
  - `quote_booking` accepts `offer_code` (hotels only). With a valid code: `amount` = discounted price, summary `... · Total ₹X (P% WhatsApp offer off ₹Y, code CODE) · Pay online only · Cannot be cancelled within 24 hours of the start`, quote `input` gets `offer_code` and `offer_percent`, result adds `offer: { code, percent, full_price }` and `payment: 'online only'`. Without Stripe: `{ error: offerNeedsOnline(expiresAt) }`.
  - `create_booking` for an offer quote: pay later refused; the code is re-checked, claimed (`claimCode(codeId, quotedPercent)`), passed to `createBooking` as `offer`, linked to the booking, released on any failure; a failed payment link marks the booking `failed` instead of falling back to pay later. Result adds `offer_code`, `offer_percent`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/wa-chat/booking-tools-offers.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const HOTEL_ID = '11111111-1111-4111-8111-111111111111';
const h = vi.hoisted(() => ({
  quotes: [] as any[], quote: null as any, created: [] as any[], createResult: null as any, checkout: null as any,
  released: [] as any[], linked: [] as any[], updates: [] as any[], emails: [] as any[],
  offer: null as any, offerCalls: [] as any[], claims: [] as any[], codeClaimed: true, codeReleased: [] as any[], codeLinked: [] as any[],
}));
vi.mock('@/lib/wa-chat/find', () => ({
  findHotel: async (n: string) => n.toLowerCase().includes('pine') ? {
    id: '11111111-1111-4111-8111-111111111111', name: 'Pine View', slug: 'pine-view', price_min: 2000,
    rooms: [{ name: 'Deluxe', base_price: 2500, is_active: true, rate_plans: [{ name: 'Room Only', price: 2500 }, { name: 'Breakfast', price: 3000 }] }],
  } : null,
}));
vi.mock('@/lib/db', () => ({
  getPublishedTreks: async () => [{ id: '22222222-2222-4222-8222-222222222222', slug: 'triund-trek', name: 'Triund Trek', price_per_person: 1500 }],
  getParaglidingPackages: async () => [],
  getActiveTaxiRoutes: async () => [],
}));
vi.mock('@/lib/wa-chat/booking-store', () => ({
  saveQuote: async (q: any) => { const row = { id: 'q1', created_at: '2026-10-13T10:00:00Z', expires_at: new Date(Date.now() + 60e3).toISOString(), used_at: null, used_booking_id: null, ...q }; h.quotes.push(row); return row; },
  latestOpenQuote: async () => h.quote,
  claimQuote: async () => true,
  releaseQuote: async (id: string) => { h.released.push(id); },
  linkQuoteBooking: async (...a: any[]) => { h.linked.push(a); },
  confirmedAfter: async () => true,
  ownBookings: async () => [],
  findOwnBooking: async () => null,
}));
vi.mock('@/lib/bookings/create', async (orig) => {
  const actual = await orig<typeof import('@/lib/bookings/create')>();
  return { ...actual, createBooking: async (d: any, o: any) => { h.created.push([d, o]); return h.createResult; } };
});
vi.mock('@/lib/bookings/checkout', () => ({ createCheckoutLink: async () => h.checkout }));
vi.mock('@/lib/booking-emails', () => ({ sendBookingEmails: async (id: string) => { h.emails.push(id); } }));
vi.mock('@/lib/server-auth', () => ({ serviceClient: () => ({ from: () => ({ update: (row: any) => ({ eq: async () => { h.updates.push(row); return { error: null }; } }) }) }) }));
vi.mock('@/lib/wa-chat/offer-tools', () => ({ offerForBooking: async (i: any) => { h.offerCalls.push(i); return h.offer; } }));
vi.mock('@/lib/offers/store', () => ({
  claimCode: async (...a: any[]) => { h.claims.push(a); return h.codeClaimed; },
  releaseCode: async (id: string) => { h.codeReleased.push(id); },
  linkCodeBooking: async (...a: any[]) => { h.codeLinked.push(a); },
}));
// If tests/wa-chat/booking-tools.test.ts mocks the room-availability module (added by the availability plan),
// copy that exact vi.mock line here so hotel quotes see the room as available.

import { runBookingTool } from '@/lib/wa-chat/booking-tools';
import { OFFER_NEEDS_ONLINE } from '@/lib/offers/rules';

const ctx = () => ({ conversationId: 'c1', phone: '919800000001', profileName: 'Asha', handedOver: false });
const run = (name: string, a: any) => runBookingTool(name, a, ctx(), async () => ({ ok: true })) as Promise<any>;
const expiresIn3h = () => new Date(Date.now() + 3 * 3600e3 - 60e3).toISOString();
const hotelQuote = (input: any = {}) => ({
  id: 'q1', conversation_id: 'c1', category: 'hotel', amount: 4800, summary: 'Pine View', created_at: '2026-10-13T10:00:00Z',
  expires_at: new Date(Date.now() + 60e3).toISOString(), used_at: null, used_booking_id: null,
  input: { category: 'hotel', property_id: HOTEL_ID, check_in: '2099-10-24', check_out: '2099-10-26', num_guests: 2, room_name: 'Deluxe', plan_name: 'Breakfast', plan_index: 1, offer_code: 'PNV-7K3Q9', offer_percent: 20, ...input },
});
const hotelArgs = { category: 'hotel', name: 'Pine View', check_in: '2099-10-24', check_out: '2099-10-26', guests: 2, room_name: 'deluxe', plan_name: 'breakfast' };

beforeEach(() => {
  Object.assign(h, {
    quotes: [], quote: hotelQuote(), created: [], released: [], linked: [], updates: [], emails: [],
    offerCalls: [], claims: [], codeClaimed: true, codeReleased: [], codeLinked: [],
    offer: { ok: true, codeId: 'k1', code: 'PNV-7K3Q9', percent: 20, expiresAt: expiresIn3h() },
    createResult: { ok: true, booking: { id: 'b1', booking_ref: 'HTL-9' }, amount: 4800, payment_method: 'online' },
    checkout: { ok: true, url: 'https://pay/x', sessionId: 's' },
  });
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test');
});
afterEach(() => vi.unstubAllEnvs());

describe('quote_booking with an offer code', () => {
  it('takes the plan percent off and asks for online payment only', async () => {
    const r = await run('quote_booking', { ...hotelArgs, offer_code: 'pnv-7k3q9' });
    expect(h.offerCalls[0]).toEqual({ code: 'pnv-7k3q9', phone: '919800000001', propertyId: HOTEL_ID, room: 'Deluxe', plan: 'Breakfast' });
    expect(r).toMatchObject({ amount: 4800, online_payment_available: true, payment: 'online only', offer: { code: 'PNV-7K3Q9', percent: 20, full_price: 6000 } });
    expect(r.summary).toBe('Pine View – Deluxe (Breakfast) · 2099-10-24 to 2099-10-26 · 2 people · Total ₹4,800 (20% WhatsApp offer off ₹6,000, code PNV-7K3Q9) · Pay online only · Cannot be cancelled within 24 hours of the start');
    expect(h.quotes[0]).toMatchObject({ amount: 4800, input: { offer_code: 'PNV-7K3Q9', offer_percent: 20, room_name: 'Deluxe' } });
  });
  it('sends the customer to reception when online payment is off', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    const r = await run('quote_booking', { ...hotelArgs, offer_code: 'PNV-7K3Q9' });
    expect(r.error).toBe("This offer needs online payment, which isn't available right now; show the code at reception within 3 hours instead");
    expect(h.quotes).toEqual([]);
  });
  it('passes on a rejected code and saves no quote', async () => {
    h.offer = { error: 'That offer code was not found for this WhatsApp number. Use get_offer_code to get one.' };
    const r = await run('quote_booking', { ...hotelArgs, offer_code: 'PNV-ZZZZZ' });
    expect(r.error).toMatch(/not found for this WhatsApp number/);
    expect(h.quotes).toEqual([]);
  });
  it('only takes codes for hotels', async () => {
    const r = await run('quote_booking', { category: 'trek', name: 'triund', date: '2099-10-24', guests: 2, offer_code: 'PNV-7K3Q9' });
    expect(r.error).toBe('Offer codes are only for hotels.');
    expect(h.offerCalls).toEqual([]);
  });
  it('quotes normally without a code', async () => {
    const r = await run('quote_booking', hotelArgs);
    expect(r).toMatchObject({ amount: 6000 });
    expect(r).not.toHaveProperty('offer');
    expect(h.quotes[0].input).not.toHaveProperty('offer_code');
  });
});

describe('create_booking with an offer code', () => {
  it('refuses pay later for an offer quote', async () => {
    const r = await run('create_booking', { payment: 'later', guest_name: 'Asha Rao' });
    expect(r.error).toMatch(/needs online payment in full/);
    expect(h.claims).toEqual([]);
    expect(h.created).toEqual([]);
  });
  it('claims the code, books online at the quoted percent and links the code', async () => {
    const r = await run('create_booking', { payment: 'online', guest_name: 'Asha Rao' });
    expect(h.offerCalls[0]).toMatchObject({ code: 'PNV-7K3Q9', phone: '919800000001', propertyId: HOTEL_ID, room: 'Deluxe', plan: 'Breakfast' });
    expect(h.claims).toEqual([['k1', 20]]);
    const [data, opts] = h.created[0];
    expect(data).toMatchObject({ payment_method: 'online', property_id: HOTEL_ID, booking_source: 'whatsapp', guest_phone: '919800000001' });
    expect(data).not.toHaveProperty('offer_code');
    expect(opts).toEqual({ userId: null, callerRole: null, offer: { code: 'PNV-7K3Q9', percent: 20 } });
    expect(h.codeLinked).toEqual([['k1', 'b1']]);
    expect(r).toMatchObject({ booking_ref: 'HTL-9', payment: 'online', payment_url: 'https://pay/x', offer_code: 'PNV-7K3Q9', offer_percent: 20 });
  });
  it('keeps the percent the customer said yes to', async () => {
    h.offer = { ...h.offer, percent: 15 };
    await run('create_booking', { payment: 'online', guest_name: 'Asha Rao' });
    expect(h.claims[0]).toEqual(['k1', 20]);
  });
  it('stops when the code is no longer valid', async () => {
    h.offer = { error: 'This offer code has expired. Use get_offer_code to get a new one if the offer is still on.' };
    const r = await run('create_booking', { payment: 'online', guest_name: 'Asha Rao' });
    expect(r.error).toMatch(/expired.*Make a new quote/);
    expect(h.claims).toEqual([]);
    expect(h.created).toEqual([]);
  });
  it('releases the quote when someone used the code first', async () => {
    h.codeClaimed = false;
    const r = await run('create_booking', { payment: 'online', guest_name: 'Asha Rao' });
    expect(r.error).toMatch(/just used/);
    expect(h.released).toEqual(['q1']);
    expect(h.created).toEqual([]);
  });
  it('releases the code and points to reception when online payment is not available', async () => {
    h.createResult = { ok: false, error: OFFER_NEEDS_ONLINE, status: 400 };
    const r = await run('create_booking', { payment: 'online', guest_name: 'Asha Rao' });
    expect(r.error).toMatch(/show the code at reception within 3 hours/);
    expect(h.codeReleased).toEqual(['k1']);
    expect(h.released).toEqual(['q1']);
  });
  it('releases the code when the booking fails for another reason', async () => {
    h.createResult = { ok: false, error: 'Sold out for these dates', status: 409 };
    expect((await run('create_booking', { payment: 'online', guest_name: 'Asha Rao' })).error).toBe('Sold out for these dates');
    expect(h.codeReleased).toEqual(['k1']);
  });
  it('does not fall back to pay later when the payment link fails', async () => {
    h.checkout = { ok: false, error: 'Stripe down', status: 500 };
    const r = await run('create_booking', { payment: 'online', guest_name: 'Asha Rao' });
    expect(r.error).toMatch(/Could not create the payment link/);
    expect(h.updates).toEqual([{ status: 'failed', cancelled_reason: 'Offer booking: payment link failed' }]);
    expect(h.codeReleased).toEqual(['k1']);
    expect(h.emails).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/wa-chat/booking-tools-offers.test.ts`
Expected: FAIL (offer codes ignored: full price quoted, pay later accepted, no claim).

- [ ] **Step 3: Implement**

In `lib/wa-chat/booking-tools.ts`, add to the imports:

```ts
import { claimCode, linkCodeBooking, releaseCode } from '@/lib/offers/store';
import { discounted, formatIST, OFFER_NEEDS_ONLINE, offerNeedsOnline } from '@/lib/offers/rules';
import { offerForBooking, type OfferOk } from './offer-tools';
```

In `BOOKING_TOOL_DEFS`, in the `quote_booking` properties, after `drop_location: str('Exact drop address (taxi)'),` add:

```ts
    offer_code: str('WhatsApp offer code from get_offer_code, only if the customer wants to use it (hotels only)'),
```

In `quoteTool`, replace the pricing tail, from

```ts
  const { amount } = quoteBooking(category, r.entity, {
```

through the function's final line

```ts
  return { quote_id: q.id, summary, amount, online_payment_available: online, expires_in_minutes: 30 };
```

with:

```ts
  const { amount: listAmount } = quoteBooking(category, r.entity, {
    num_guests: r.input.num_guests, check_in: r.input.check_in, check_out: r.input.check_out, room_name: r.input.room_name, plan_index: r.input.plan_index,
  });
  let amount = listAmount;
  let offer: { code: string; percent: number; full_price: number } | null = null;
  if (a.offer_code) {
    if (category !== 'hotel') return { error: 'Offer codes are only for hotels.' };
    const o = await offerForBooking({ code: a.offer_code, phone: ctx.phone, propertyId: r.input.property_id, room: r.input.room_name, plan: r.input.plan_name });
    if ('error' in o) return o;
    amount = discounted(listAmount, o.percent);
    if (amount < 100 || !process.env.STRIPE_SECRET_KEY) return { error: offerNeedsOnline(o.expiresAt) };
    offer = { code: o.code, percent: o.percent, full_price: listAmount };
  }
  const online = amount >= 100 && !!process.env.STRIPE_SECRET_KEY;
  const total = amount <= 0 ? 'Price confirmed by our team'
    : offer ? `Total ${rupees(amount)} (${offer.percent}% WhatsApp offer off ${rupees(offer.full_price)}, code ${offer.code}) · Pay online only`
    : `Total ${rupees(amount)}`;
  const summary = [r.label, r.when, `${r.input.num_guests} ${r.input.num_guests === 1 ? 'person' : 'people'}`, total]
    .filter(Boolean).join(' · ') + ' · Cannot be cancelled within 24 hours of the start';
  const input = offer ? { ...r.input, offer_code: offer.code, offer_percent: offer.percent } : r.input;
  const q = await saveQuote({ conversation_id: ctx.conversationId, category, input, amount, summary });
  return { quote_id: q.id, summary, amount, online_payment_available: online, expires_in_minutes: 30, ...(offer ? { offer, payment: 'online only' } : {}) };
```

In `createTool`, directly before `const payment_method = a.payment === 'online' ? 'online' : laterMethod(q.category);` add:

```ts
  const offerCode = typeof q.input.offer_code === 'string' ? q.input.offer_code : null;
  if (offerCode && a.payment !== 'online') {
    return { error: 'This quote uses an offer code, which needs online payment in full. Ask the customer to pay online, or make a new quote without the code (pay later, no offer).' };
  }
```

In `createTool`, replace

```ts
  if (!(await claimQuote(q.id))) return { error: 'This quote was already booked.' };

  const r = await createBooking(parsed.data, { userId: null, callerRole: null });
  if (!r.ok) { await releaseQuote(q.id); return { error: r.error }; }
  await linkQuoteBooking(q.id, r.booking.id);
  const base = { booking_ref: r.booking.booking_ref, status: 'requested', amount: r.amount };
```

with

```ts
  let offer: OfferOk | null = null;
  if (offerCode) {
    const o = await offerForBooking({ code: offerCode, phone: ctx.phone, propertyId: q.input.property_id, room: q.input.room_name, plan: q.input.plan_name });
    if ('error' in o) return { error: `${o.error} Make a new quote.` };
    // Keep the percent the customer said YES to in the quote.
    offer = { ...o, percent: Number(q.input.offer_percent) || o.percent };
  }
  if (!(await claimQuote(q.id))) return { error: 'This quote was already booked.' };
  if (offer && !(await claimCode(offer.codeId, offer.percent))) {
    await releaseQuote(q.id);
    return { error: 'This offer code was just used or has expired. Make a new quote.' };
  }

  const r = await createBooking(parsed.data, { userId: null, callerRole: null, ...(offer ? { offer: { code: offer.code, percent: offer.percent } } : {}) });
  if (!r.ok) {
    await releaseQuote(q.id);
    if (offer) await releaseCode(offer.codeId);
    return { error: offer && r.error === OFFER_NEEDS_ONLINE ? offerNeedsOnline(offer.expiresAt) : r.error };
  }
  await linkQuoteBooking(q.id, r.booking.id);
  if (offer) await linkCodeBooking(offer.codeId, r.booking.id);
  const base = { booking_ref: r.booking.booking_ref, status: 'requested', amount: r.amount, ...(offer ? { offer_code: offer.code, offer_percent: offer.percent } : {}) };
```

(If the availability plan changed the `if (!r.ok) {...}` line, keep its error message and add `if (offer) await releaseCode(offer.codeId);` inside that block.)

In `createTool`, directly after `if (link?.ok) return { ...base, payment: 'online', payment_url: link.url };` add:

```ts
  if (offer) {
    // Offer bookings cannot become pay later (pay later is never discounted): drop this booking and free the code.
    const { error } = await serviceClient().from('bookings').update({ status: 'failed', cancelled_reason: 'Offer booking: payment link failed' }).eq('id', r.booking.id);
    if (error) console.error('WhatsApp offer booking: could not mark failed', error);
    await releaseCode(offer.codeId);
    return { error: `Could not create the payment link, so the booking was not made. Try again in a minute, or show code ${offer.code} at the hotel reception before ${formatIST(offer.expiresAt)}.` };
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/wa-chat`
Expected: PASS (13 new tests; existing `booking-tools.test.ts` unchanged and passing).

- [ ] **Step 5: Commit**

```bash
git add lib/wa-chat/booking-tools.ts tests/wa-chat/booking-tools-offers.test.ts
git commit -m "Book WhatsApp offer codes online only, with atomic code claims"
```

---

### Task 9: Teach the assistant about offers

**Files:**
- Modify: `lib/wa-chat/assistant.ts` (`SYSTEM_PROMPT` Booking section and a new Offers section)
- Test: `tests/wa-chat/assistant.test.ts`

**Interfaces:**
- Consumes: tool names `get_offer_code` (Task 7), `quote_booking` `offer_code` argument (Task 8), the `offer` field on `search_hotels` / `get_hotel` (Task 7).
- Produces: prompt rules; the existing assertions (`Discount of up to ₹500 on every booking`, `applied by our team when the booking is confirmed`) still hold.

- [ ] **Step 1: Write the failing test**

Add inside `describe('assistant', ...)` in `tests/wa-chat/assistant.test.ts`:

```ts
  it('explains WhatsApp offers without exact percents or pay-later discounts', () => {
    expect(SYSTEM_PROMPT).toMatch(/get_offer_code/);
    expect(SYSTEM_PROMPT).toMatch(/only through this chat/);
    expect(SYSTEM_PROMPT).toMatch(/paid online in full/);
    expect(SYSTEM_PROMPT).toMatch(/pay later gets no offer/i);
    expect(SYSTEM_PROMPT).toMatch(/Never say an exact percent before quote_booking/);
    expect(SYSTEM_PROMPT).toMatch(/never offer both/);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/wa-chat/assistant.test.ts`
Expected: FAIL on the new test.

- [ ] **Step 3: Edit the prompt**

In `SYSTEM_PROMPT` (`lib/wa-chat/assistant.ts`), in the Booking bullet that starts `- Call quote_booking. Send its summary and total,` replace

```text
mention the "${BOOKING_DISCOUNT_NOTE}" note, and ask:
```

with

```text
mention the "${BOOKING_DISCOUNT_NOTE}" note (not when the quote has an offer), and ask:
```

Replace the bullet

```text
- Discounts: the only one is the site-wide "${BOOKING_DISCOUNT_NOTE}" - applied by our team when the booking is confirmed. Never promise an exact amount, any other discount, refunds or compensation.
```

with

```text
- Discounts: the site-wide "${BOOKING_DISCOUNT_NOTE}" - applied by our team when the booking is confirmed - and the WhatsApp offers that tools show (see Offers). Never promise an exact amount, any other discount, refunds or compensation.
```

Directly before the line `Cancelling:` insert this section (with one blank line after it):

```text
Offers:
- If search_hotels or get_hotel shows an offer for a hotel, tell the customer in those words (up to X% off, only through this chat) and offer them a code. Never say an exact percent before quote_booking prices it.
- get_offer_code gives the customer's code, its expiry (India time) and the rules; send the code and the rules as given.
- To book with the code, pass offer_code to quote_booking. Offer bookings must be paid online in full (create_booking with payment online); pay later gets no offer. If a tool says online payment isn't available, tell them to show the code at the hotel reception before it expires.
- An offer replaces the "${BOOKING_DISCOUNT_NOTE}" note; never offer both.
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest run tests/wa-chat && npx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/wa-chat/assistant.ts tests/wa-chat/assistant.test.ts
git commit -m "Tell the WhatsApp assistant how offers work"
```

---

### Task 10: Admin offers API

**Files:**
- Create: `app/api/admin/offers/route.ts` (GET list, POST create)
- Create: `app/api/admin/offers/[id]/route.ts` (PATCH edit / on-off)
- Create: `app/api/admin/offers/codes/route.ts` (POST check / redeem / cancel)
- Test: `tests/api/admin-offers.test.ts`

**Interfaces:**
- Consumes: `requireCaller`, `serviceClient`, `jsonError`, `HttpError` (`@/lib/server-auth`); `codeState`, `maxPercent`, `planKey`, `roomPlans` (Task 2); `checkCode`, `redeemCode`, `cancelCode` (Task 4); `fake` (Task 3 helper).
- Produces:
  - `GET /api/admin/offers?status=<all|issued|expired|booked|redeemed|cancelled>&offer_id=<uuid>` → `{ offers: (Offer & { property_name: string; rooms: { room: string; plans: string[] }[]; up_to: number })[]; codes: (OfferCode & { state: CodeState; offer_name: string; booking_ref: string | null })[]; properties: { id: string; name: string }[] }` (codes newest first, max 200).
  - `POST /api/admin/offers` body `{ property_id, default_percent, code_prefix, valid_hours?, name? }` → `{ offer }`, always created inactive.
  - `PATCH /api/admin/offers/[id]` body partial `{ name, active, default_percent, plan_percents, valid_hours, code_prefix }` → `{ offer }`; 400 for unknown room/plan keys, 409 when another offer of the property is on.
  - `POST /api/admin/offers/codes` body `{ action: 'check' | 'redeem' | 'cancel', code, notes? }` → `{ result: CheckResult }` (check/redeem) or `{ ok: true }` (cancel); refusals `{ error, result? }` with their status.

- [ ] **Step 1: Write the failing test**

```ts
// tests/api/admin-offers.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fake } from '../offers/fake-sb';

const h = vi.hoisted(() => ({
  role: 'admin', verify: [] as any[],
  checkResult: { valid: true, code: 'PNV-7K3Q9' } as any, redeemResult: { ok: true, result: { status: 'redeemed' } } as any, cancelResult: { ok: true } as any,
}));
vi.mock('@/lib/server-auth', async (orig) => {
  const real = await orig<any>();
  const m = await import('../offers/fake-sb');
  return {
    ...real,
    requireCaller: async (_req: Request, roles: string[]) => {
      if (!roles.includes(h.role)) throw new real.HttpError(403, 'You do not have access to this');
      return { user: { id: 'a1' }, profile: { id: 'a1', role: h.role } };
    },
    serviceClient: () => m.fake.client,
  };
});
vi.mock('@/lib/offers/verify', () => ({
  checkCode: async (...a: any[]) => { h.verify.push(['check', ...a]); return h.checkResult; },
  redeemCode: async (...a: any[]) => { h.verify.push(['redeem', ...a]); return h.redeemResult; },
  cancelCode: async (...a: any[]) => { h.verify.push(['cancel', ...a]); return h.cancelResult; },
}));

import { GET, POST } from '@/app/api/admin/offers/route';
import { PATCH } from '@/app/api/admin/offers/[id]/route';
import { POST as codesPost } from '@/app/api/admin/offers/codes/route';

const OFFER_ID = '22222222-2222-4222-8222-222222222222';
const PROP_ID = 'da442d47-cd48-41d5-a301-a1513999d9a8';
const ROOMS = [{ name: 'Super Deluxe', is_active: true, rate_plans: [{ name: 'Room Only', price: 4000 }, { name: 'Breakfast', price: 4500 }] }];
const json = (method: string, body?: unknown, url = 'http://x/api/admin/offers') =>
  new Request(url, { method, body: body === undefined ? undefined : JSON.stringify(body), headers: { Authorization: 'Bearer t' } });
const patch = (body: unknown) => PATCH(json('PATCH', body), { params: { id: OFFER_ID } });
const codes = (body: unknown) => codesPost(json('POST', body));

beforeEach(() => {
  fake.reset();
  h.role = 'admin'; h.verify = [];
  h.redeemResult = { ok: true, result: { status: 'redeemed' } };
  h.cancelResult = { ok: true };
});

describe('GET /api/admin/offers', () => {
  it('is admin only', async () => {
    h.role = 'partner';
    expect((await GET(json('GET'))).status).toBe(403);
  });
  it('lists offers with rooms and up-to percent, and codes with their state', async () => {
    fake.queue('offers', { data: [{ id: OFFER_ID, property_id: PROP_ID, name: 'Panchvati', active: true, default_percent: 20, plan_percents: { 'Super Deluxe|Breakfast': 25 }, valid_hours: 3, code_prefix: 'PNV', properties: { name: 'Panchvati Cottages', rooms: ROOMS } }] });
    fake.queue('properties', { data: [{ id: PROP_ID, name: 'Panchvati Cottages' }] });
    fake.queue('offer_codes', { data: [{ id: 'k1', code: 'PNV-7K3Q9', status: 'issued', expires_at: '2020-01-01T00:00:00Z', offers: { name: 'Panchvati' }, bookings: null }] });
    const res = await GET(json('GET', undefined, `http://x/api/admin/offers?status=expired&offer_id=${OFFER_ID}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.offers[0]).toMatchObject({ property_name: 'Panchvati Cottages', up_to: 25, rooms: [{ room: 'Super Deluxe', plans: ['Room Only', 'Breakfast'] }] });
    expect(body.offers[0]).not.toHaveProperty('properties');
    expect(body.codes[0]).toMatchObject({ code: 'PNV-7K3Q9', state: 'expired', offer_name: 'Panchvati', booking_ref: null });
    expect(body.properties).toEqual([{ id: PROP_ID, name: 'Panchvati Cottages' }]);
    expect(fake.ops('offer_codes', 'eq')).toEqual([['offer_id', OFFER_ID], ['status', 'issued']]);
    expect(fake.ops('offer_codes', 'lte')[0][0]).toBe('expires_at');
  });
});

describe('POST /api/admin/offers', () => {
  it('creates an inactive offer for an existing property', async () => {
    fake.queue('properties', { data: { id: PROP_ID, name: 'Panchvati Cottages' } });
    fake.queue('offers', { data: { id: OFFER_ID } });
    const res = await POST(json('POST', { property_id: PROP_ID, default_percent: 25, valid_hours: 3, code_prefix: 'PNV' }));
    expect(res.status).toBe(200);
    expect(fake.ops('offers', 'insert')[0][0]).toEqual({
      property_id: PROP_ID, default_percent: 25, valid_hours: 3, code_prefix: 'PNV', name: 'WhatsApp offer – Panchvati Cottages', active: false, plan_percents: {},
    });
  });
  it('rejects a bad percent or prefix', async () => {
    expect((await POST(json('POST', { property_id: PROP_ID, default_percent: 95, code_prefix: 'PNV' }))).status).toBe(400);
    expect((await POST(json('POST', { property_id: PROP_ID, default_percent: 25, code_prefix: 'pn1' }))).status).toBe(400);
    expect(fake.ops('offers', 'insert')).toEqual([]);
  });
  it('404s an unknown property', async () => {
    expect((await POST(json('POST', { property_id: PROP_ID, default_percent: 25, code_prefix: 'PNV' }))).status).toBe(404);
  });
});

describe('PATCH /api/admin/offers/[id]', () => {
  const existing = { id: OFFER_ID, property_id: PROP_ID, properties: { rooms: ROOMS } };
  it('is admin only', async () => {
    h.role = 'partner';
    expect((await patch({ active: false })).status).toBe(403);
  });
  it('saves percents per rate plan and the validity', async () => {
    fake.queue('offers', { data: existing }, { data: { id: OFFER_ID } });
    const res = await patch({ default_percent: 20, plan_percents: { 'Super Deluxe|Breakfast': 25 }, valid_hours: 3 });
    expect(res.status).toBe(200);
    const row = fake.ops('offers', 'update')[0][0] as any;
    expect(row).toMatchObject({ default_percent: 20, plan_percents: { 'Super Deluxe|Breakfast': 25 }, valid_hours: 3 });
    expect(typeof row.updated_at).toBe('string');
  });
  it('rejects a rate plan the hotel does not have', async () => {
    fake.queue('offers', { data: existing });
    const res = await patch({ plan_percents: { 'Suite|Breakfast': 25 } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Unknown room or rate plan: Suite|Breakfast');
    expect(fake.ops('offers', 'update')).toEqual([]);
  });
  it('rejects percents outside 1-90 and validity outside 1-168 hours', async () => {
    expect((await patch({ default_percent: 0 })).status).toBe(400);
    expect((await patch({ plan_percents: { 'Super Deluxe|Breakfast': 91 } })).status).toBe(400);
    expect((await patch({ valid_hours: 200 })).status).toBe(400);
    expect((await patch({ code_prefix: 'TOOLONG' })).status).toBe(400);
  });
  it('allows only one active offer per hotel', async () => {
    fake.queue('offers', { data: existing }, { data: [{ id: 'other' }] });
    const res = await patch({ active: true });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/Another offer is already on/);
    expect(fake.ops('offers', 'update')).toEqual([]);
  });
  it('turns an offer on when it is the only one', async () => {
    fake.queue('offers', { data: existing }, { data: [] }, { data: { id: OFFER_ID, active: true } });
    expect((await patch({ active: true })).status).toBe(200);
    expect(fake.ops('offers', 'neq')).toEqual([['id', OFFER_ID]]);
  });
  it('maps the database one-active guard to 409', async () => {
    fake.queue('offers', { data: existing }, { data: [] }, { error: { code: '23505', message: 'duplicate' } });
    expect((await patch({ active: true })).status).toBe(409);
  });
  it('404s an unknown offer', async () => {
    expect((await patch({ active: false })).status).toBe(404);
  });
});

describe('POST /api/admin/offers/codes', () => {
  it('is admin only', async () => {
    h.role = 'partner';
    expect((await codes({ action: 'check', code: 'PNV-7K3Q9' })).status).toBe(403);
    expect(h.verify).toEqual([]);
  });
  it('checks, marks used and cancels as the admin', async () => {
    const res = await codes({ action: 'check', code: 'pnv-7k3q9' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ result: h.checkResult });
    expect(h.verify[0]).toEqual(['check', 'pnv-7k3q9', { viewer: { id: 'a1', role: 'admin' } }]);
    await codes({ action: 'redeem', code: 'PNV-7K3Q9' });
    expect(h.verify[1]).toEqual(['redeem', 'PNV-7K3Q9', { id: 'a1', role: 'admin' }]);
    expect((await codes({ action: 'cancel', code: 'PNV-7K3Q9', notes: 'Duplicate' })).status).toBe(200);
    expect(h.verify[2]).toEqual(['cancel', 'PNV-7K3Q9', { id: 'a1', role: 'admin' }, 'Duplicate']);
  });
  it('passes a refusal on with its status', async () => {
    h.redeemResult = { ok: false, error: 'This code was already used', status: 409, result: { reason: 'already_used' } };
    const res = await codes({ action: 'redeem', code: 'PNV-7K3Q9' });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'This code was already used', result: { reason: 'already_used' } });
    h.cancelResult = { ok: false, error: 'Code not found', status: 404 };
    expect((await codes({ action: 'cancel', code: 'PNV-ZZZZZ' })).status).toBe(404);
  });
  it('rejects a bad request', async () => {
    expect((await codes({ action: 'delete', code: 'PNV-7K3Q9' })).status).toBe(400);
    expect((await codes({ action: 'check', code: 'X' })).status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api/admin-offers.test.ts`
Expected: FAIL, cannot resolve `@/app/api/admin/offers/route`.

- [ ] **Step 3: Implement the list/create route**

```ts
// app/api/admin/offers/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, requireCaller, serviceClient } from '@/lib/server-auth';
import { codeState, maxPercent, roomPlans } from '@/lib/offers/rules';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STORED = ['booked', 'redeemed', 'cancelled'];

export async function GET(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    const url = new URL(req.url);
    const status = url.searchParams.get('status') || '';
    const offerId = url.searchParams.get('offer_id') || '';
    const sb = serviceClient();
    const now = new Date().toISOString();

    let codes = sb.from('offer_codes').select('*, offers(name), bookings(booking_ref)');
    if (UUID.test(offerId)) codes = codes.eq('offer_id', offerId);
    if (status === 'issued') codes = codes.eq('status', 'issued').gt('expires_at', now);
    else if (status === 'expired') codes = codes.eq('status', 'issued').lte('expires_at', now);
    else if (STORED.includes(status)) codes = codes.eq('status', status);

    const [o, p, c] = await Promise.all([
      sb.from('offers').select('*, properties(name, rooms)').order('created_at', { ascending: false }),
      sb.from('properties').select('id, name').order('name').limit(1000),
      codes.order('issued_at', { ascending: false }).limit(200),
    ]);
    if (o.error) throw o.error;
    if (p.error) throw p.error;
    if (c.error) throw c.error;

    return NextResponse.json({
      offers: (o.data || []).map(({ properties, ...offer }: any) => ({
        ...offer, property_name: properties?.name ?? '', rooms: roomPlans(properties?.rooms), up_to: maxPercent(offer),
      })),
      codes: (c.data || []).map(({ offers, bookings, ...code }: any) => ({
        ...code, state: codeState(code), offer_name: offers?.name ?? '', booking_ref: bookings?.booking_ref ?? null,
      })),
      properties: p.data || [],
    });
  } catch (e) { return jsonError(e); }
}

const createSchema = z.object({
  property_id: z.string().uuid(),
  name: z.string().trim().min(2).max(100).optional(),
  default_percent: z.number().int().min(1, 'Percent must be 1-90').max(90, 'Percent must be 1-90'),
  valid_hours: z.number().int().min(1).max(168).default(3),
  code_prefix: z.string().regex(/^[A-Z]{2,5}$/, 'Code prefix must be 2-5 capital letters'),
});

export async function POST(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    const body = createSchema.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new HttpError(400, body.error.issues[0]?.message || 'Invalid offer');
    const sb = serviceClient();
    const { data: prop, error: pErr } = await sb.from('properties').select('id, name').eq('id', body.data.property_id).maybeSingle();
    if (pErr) throw pErr;
    if (!prop) throw new HttpError(404, 'Property not found');
    const { data, error } = await sb.from('offers')
      .insert({ ...body.data, name: body.data.name || `WhatsApp offer – ${prop.name}`, active: false, plan_percents: {} })
      .select('*').single();
    if (error) throw error;
    return NextResponse.json({ offer: data });
  } catch (e) { return jsonError(e); }
}
```

- [ ] **Step 4: Implement the edit route**

```ts
// app/api/admin/offers/[id]/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, requireCaller, serviceClient } from '@/lib/server-auth';
import { planKey, roomPlans } from '@/lib/offers/rules';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ONE_ACTIVE = 'Another offer is already on for this hotel. Turn it off first.';
const percent = z.number().int().min(1, 'Percent must be 1-90').max(90, 'Percent must be 1-90');

const patchSchema = z.object({
  name: z.string().trim().min(2).max(100),
  active: z.boolean(),
  default_percent: percent,
  plan_percents: z.record(percent),
  valid_hours: z.number().int().min(1, 'Validity must be 1-168 hours').max(168, 'Validity must be 1-168 hours'),
  code_prefix: z.string().regex(/^[A-Z]{2,5}$/, 'Code prefix must be 2-5 capital letters'),
}).partial();

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireCaller(req, ['admin']);
    if (!UUID.test(params.id)) throw new HttpError(404, 'Offer not found');
    const body = patchSchema.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new HttpError(400, body.error.issues[0]?.message || 'Invalid offer');
    const sb = serviceClient();
    const { data: offer, error: oErr } = await sb.from('offers').select('id, property_id, properties(rooms)').eq('id', params.id).maybeSingle();
    if (oErr) throw oErr;
    if (!offer) throw new HttpError(404, 'Offer not found');

    if (body.data.plan_percents) {
      const known = new Set(roomPlans((offer as any).properties?.rooms).flatMap((r) => r.plans.map((p) => planKey(r.room, p))));
      const bad = Object.keys(body.data.plan_percents).find((k) => !known.has(k));
      if (bad) throw new HttpError(400, `Unknown room or rate plan: ${bad}`);
    }
    if (body.data.active) {
      const { data: others, error: aErr } = await sb.from('offers').select('id')
        .eq('property_id', (offer as any).property_id).eq('active', true).neq('id', params.id);
      if (aErr) throw aErr;
      if ((others || []).length) throw new HttpError(409, ONE_ACTIVE);
    }

    const { data, error } = await sb.from('offers').update({ ...body.data, updated_at: new Date().toISOString() }).eq('id', params.id).select('*').single();
    if (error?.code === '23505') throw new HttpError(409, ONE_ACTIVE);
    if (error) throw error;
    return NextResponse.json({ offer: data });
  } catch (e) { return jsonError(e); }
}
```

- [ ] **Step 5: Implement the codes route**

```ts
// app/api/admin/offers/codes/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, requireCaller } from '@/lib/server-auth';
import { cancelCode, checkCode, redeemCode, type Viewer } from '@/lib/offers/verify';

export const dynamic = 'force-dynamic';

const schema = z.object({
  action: z.enum(['check', 'redeem', 'cancel']),
  code: z.string().trim().min(4).max(20),
  notes: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  try {
    const caller = await requireCaller(req, ['admin']);
    const body = schema.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new HttpError(400, 'Enter an offer code');
    const viewer: Viewer = { id: caller.profile.id, role: 'admin' };
    const { action, code, notes } = body.data;
    if (action === 'check') return NextResponse.json({ result: await checkCode(code, { viewer }) });
    if (action === 'redeem') {
      const r = await redeemCode(code, viewer);
      return r.ok ? NextResponse.json({ result: r.result }) : NextResponse.json({ error: r.error, result: r.result ?? null }, { status: r.status });
    }
    const r = await cancelCode(code, viewer, notes);
    return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: r.status });
  } catch (e) { return jsonError(e); }
}
```

Note: a refused redeem without a `result` returns `result: null`; the test above only refuses with a `result`, so `toEqual` holds.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run tests/api/admin-offers.test.ts && npx tsc --noEmit -p .`
Expected: PASS (17 tests), no type errors.

- [ ] **Step 7: Commit**

```bash
git add app/api/admin/offers tests/api/admin-offers.test.ts
git commit -m "Add admin API for WhatsApp offers and codes"
```

---

### Task 11: Admin offers page, nav item and "Offer applied" badge

**Files:**
- Create: `components/offers/CodeResult.tsx` (shared by admin and partner pages)
- Create: `app/(site)/admin/offers/page.tsx`
- Modify: `components/admin/AdminShell.tsx` (`ADMIN_NAV` Customers group, lucide import)
- Modify: `app/(site)/admin/bookings/page.tsx` (badge row)

**Interfaces:**
- Consumes: admin API from Task 10; `CheckResult` shape (Task 2) as the `CodeCheck` client type.
- Produces: `components/offers/CodeResult.tsx` default export `CodeResult({ r }: { r: CodeCheck })` and `export type CodeCheck`; page at `/admin/offers`; nav item "WhatsApp offers".

- [ ] **Step 1: Shared result card**

```tsx
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
```

- [ ] **Step 2: Admin page**

```tsx
// app/(site)/admin/offers/page.tsx
'use client';
import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import CodeResult, { type CodeCheck } from '@/components/offers/CodeResult';
import { cn } from '@/lib/utils';

type RoomPlans = { room: string; plans: string[] };
type OfferView = {
  id: string; property_id: string; property_name: string; name: string; active: boolean; default_percent: number;
  plan_percents: Record<string, number>; valid_hours: number; code_prefix: string; up_to: number; rooms: RoomPlans[]; updated_at: string;
};
type CodeView = {
  id: string; code: string; phone: string; percent: number; booked_percent: number | null; state: string;
  issued_at: string; expires_at: string; offer_name: string; booking_ref: string | null; notes: string | null;
};

const STATES = ['all', 'issued', 'expired', 'booked', 'redeemed', 'cancelled'];
const STATE_STYLE: Record<string, string> = {
  issued: 'bg-sky-100 text-sky-800', expired: 'bg-slate-100 text-slate-600', booked: 'bg-violet-100 text-violet-800',
  redeemed: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-700',
};
const when = (s: string) => new Date(s).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

async function api(path: string, init?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.error || 'Something went wrong'), { body: json });
  return json;
}

function OfferCard({ offer, onChanged, onError }: { offer: OfferView; onChanged: () => void; onError: (m: string) => void }) {
  const [name, setName] = useState(offer.name);
  const [percent, setPercent] = useState(String(offer.default_percent));
  const [hours, setHours] = useState(String(offer.valid_hours));
  const [prefix, setPrefix] = useState(offer.code_prefix);
  const [plans, setPlans] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(offer.plan_percents).map(([k, v]) => [k, String(v)])));
  const [busy, setBusy] = useState(false);

  async function save(body: Record<string, unknown>) {
    setBusy(true); onError('');
    try { await api(`/api/admin/offers/${offer.id}`, { method: 'PATCH', body: JSON.stringify(body) }); onChanged(); }
    catch (e: any) { onError(e.message); } finally { setBusy(false); }
  }
  const saveAll = () => save({
    name: name.trim(), default_percent: Number(percent), valid_hours: Number(hours), code_prefix: prefix.trim().toUpperCase(),
    plan_percents: Object.fromEntries(Object.entries(plans).filter(([, v]) => v.trim() !== '').map(([k, v]) => [k, Number(v)])),
  });
  const input = 'mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <p className="font-semibold text-slate-900">{offer.property_name}</p>
          <p className="text-sm text-slate-500">Customers see: “Up to {offer.up_to}% off, only through this WhatsApp chat”</p>
        </div>
        <button onClick={() => save({ active: !offer.active })} disabled={busy}
          className={cn('px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50', offer.active ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-700')}>
          {offer.active ? 'On – tap to turn off' : 'Off – tap to turn on'}
        </button>
      </div>
      <div className="grid sm:grid-cols-5 gap-3 text-sm">
        <label className="sm:col-span-2">Name<input value={name} onChange={(e) => setName(e.target.value)} className={input} /></label>
        <label>Default %<input type="number" min={1} max={90} value={percent} onChange={(e) => setPercent(e.target.value)} className={input} /></label>
        <label>Code valid (hours)<input type="number" min={1} max={168} value={hours} onChange={(e) => setHours(e.target.value)} className={input} /></label>
        <label>Code prefix<input value={prefix} maxLength={5} onChange={(e) => setPrefix(e.target.value.toUpperCase())} className={cn(input, 'uppercase')} /></label>
      </div>
      {offer.rooms.some((r) => r.plans.length > 0) && (
        <div className="mt-4">
          <p className="text-sm font-medium text-slate-700 mb-1">% per rate plan (leave empty to use the default)</p>
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            {offer.rooms.flatMap((r) => r.plans.map((p) => {
              const key = `${r.room}|${p}`;
              return (
                <label key={key} className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg px-3 py-1.5">
                  <span>{r.room} – {p}</span>
                  <input type="number" min={1} max={90} value={plans[key] ?? ''} placeholder={percent}
                    onChange={(e) => setPlans({ ...plans, [key]: e.target.value })} className="w-20 px-2 py-1 border border-slate-300 rounded" />
                </label>
              );
            }))}
          </div>
        </div>
      )}
      <button onClick={saveAll} disabled={busy} className="mt-4 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold disabled:opacity-50">
        {busy ? 'Saving…' : 'Save changes'}
      </button>
      <p className="text-xs text-slate-500 mt-2">Changes apply to new codes straight away. Codes already sent keep working until they expire.</p>
    </div>
  );
}

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<OfferView[]>([]);
  const [codes, setCodes] = useState<CodeView[]>([]);
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([]);
  const [state, setState] = useState('all');
  const [offerFilter, setOfferFilter] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [entered, setEntered] = useState('');
  const [result, setResult] = useState<CodeCheck | null>(null);
  const [busy, setBusy] = useState(false);
  const [newProp, setNewProp] = useState('');
  const [newPrefix, setNewPrefix] = useState('');
  const [newPercent, setNewPercent] = useState('20');

  const load = useCallback(async () => {
    try {
      const qs = new URLSearchParams();
      if (state !== 'all') qs.set('status', state);
      if (offerFilter) qs.set('offer_id', offerFilter);
      const d = await api(`/api/admin/offers?${qs.toString()}`);
      setOffers(d.offers); setCodes(d.codes); setProperties(d.properties);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, [state, offerFilter]);
  useEffect(() => { load(); }, [load]);

  async function codeAction(action: 'check' | 'redeem' | 'cancel') {
    const code = entered.trim();
    if (!code) return;
    if (action === 'cancel' && !confirm(`Cancel code ${code.toUpperCase()}? The customer can no longer use it.`)) return;
    setBusy(true); setError('');
    try {
      const d = await api('/api/admin/offers/codes', { method: 'POST', body: JSON.stringify({ action, code }) });
      setResult(action === 'cancel'
        ? (await api('/api/admin/offers/codes', { method: 'POST', body: JSON.stringify({ action: 'check', code }) })).result
        : d.result);
      if (action !== 'check') await load();
    } catch (e: any) {
      setError(e.message);
      if (e.body?.result) setResult(e.body.result);
    } finally { setBusy(false); }
  }

  async function createOffer() {
    setError('');
    try {
      await api('/api/admin/offers', { method: 'POST', body: JSON.stringify({ property_id: newProp, default_percent: Number(newPercent), valid_hours: 3, code_prefix: newPrefix.trim().toUpperCase() }) });
      setNewProp(''); setNewPrefix('');
      await load();
    } catch (e: any) { setError(e.message); }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <AdminPageHeader title="WhatsApp offers" description="Discount codes the WhatsApp assistant gives out for a hotel. Customers only ever see “up to X% off”." />
      {error && <p className="mb-4 text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <section className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
        <h2 className="font-semibold text-slate-900 mb-2">Check a code</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input value={entered} onChange={(e) => { setEntered(e.target.value); setResult(null); }} placeholder="e.g. PNV-7K3Q9" aria-label="Offer code"
            className="px-3 py-2 border border-slate-300 rounded-lg uppercase w-48" />
          <button onClick={() => codeAction('check')} disabled={busy} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold disabled:opacity-50">Check</button>
          <button onClick={() => codeAction('redeem')} disabled={busy || !result?.valid} className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold disabled:opacity-50">Mark as used</button>
          <button onClick={() => codeAction('cancel')} disabled={busy} className="px-4 py-2 rounded-lg border border-red-300 text-red-700 text-sm font-semibold disabled:opacity-50">Cancel code</button>
          {busy && <Loader2 className="h-5 w-5 animate-spin text-slate-400" />}
        </div>
        {result && <div className="mt-3"><CodeResult r={result} /></div>}
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-slate-900 mb-2">Offers</h2>
        {loading ? <p className="text-slate-500 text-sm">Loading…</p> : (
          <div className="space-y-3">
            {offers.map((o) => <OfferCard key={`${o.id}-${o.updated_at}`} offer={o} onChanged={load} onError={setError} />)}
            {offers.length === 0 && <p className="text-sm text-slate-500">No offers yet.</p>}
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-end gap-2 text-sm bg-white border border-dashed border-slate-300 rounded-xl p-3">
          <label>Hotel
            <select value={newProp} onChange={(e) => setNewProp(e.target.value)} className="mt-1 block px-3 py-2 border border-slate-300 rounded-lg max-w-xs">
              <option value="">Choose…</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label>Default %<input type="number" min={1} max={90} value={newPercent} onChange={(e) => setNewPercent(e.target.value)} className="mt-1 block w-20 px-3 py-2 border border-slate-300 rounded-lg" /></label>
          <label>Code prefix<input value={newPrefix} maxLength={5} onChange={(e) => setNewPrefix(e.target.value.toUpperCase())} placeholder="PNV" className="mt-1 block w-24 px-3 py-2 border border-slate-300 rounded-lg uppercase" /></label>
          <button onClick={createOffer} disabled={!newProp || !newPrefix} className="px-4 py-2 rounded-lg bg-brand-600 text-white font-semibold disabled:opacity-50">Add offer (starts off)</button>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <h2 className="font-semibold text-slate-900 mr-2">Codes</h2>
          {STATES.map((s) => (
            <button key={s} onClick={() => setState(s)} className={cn('px-3 py-1 rounded-full text-sm capitalize', state === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700')}>{s}</button>
          ))}
          <select value={offerFilter} onChange={(e) => setOfferFilter(e.target.value)} className="ml-auto px-3 py-1.5 border border-slate-300 rounded-lg text-sm" aria-label="Filter by offer">
            <option value="">All offers</option>
            {offers.map((o) => <option key={o.id} value={o.id}>{o.property_name}</option>)}
          </select>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr><th className="p-2">Code</th><th className="p-2">State</th><th className="p-2">Offer</th><th className="p-2">Phone</th><th className="p-2">%</th><th className="p-2">Issued</th><th className="p-2">Expires</th><th className="p-2">Booking</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {codes.length === 0 && <tr><td colSpan={8} className="p-4 text-slate-500">No codes.</td></tr>}
              {codes.map((c) => (
                <tr key={c.id}>
                  <td className="p-2 font-mono"><button onClick={() => { setEntered(c.code); setResult(null); }} className="hover:underline">{c.code}</button></td>
                  <td className="p-2"><span className={cn('text-xs px-2 py-0.5 rounded-full capitalize', STATE_STYLE[c.state])}>{c.state}</span></td>
                  <td className="p-2">{c.offer_name}</td>
                  <td className="p-2">{c.phone}</td>
                  <td className="p-2">{c.booked_percent ?? c.percent}%</td>
                  <td className="p-2">{when(c.issued_at)}</td>
                  <td className="p-2">{c.state === 'booked' || c.state === 'redeemed' ? '—' : when(c.expires_at)}</td>
                  <td className="p-2 font-mono">{c.booking_ref || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Nav item**

In `components/admin/AdminShell.tsx`, add `BadgePercent` to the `lucide-react` import list, and in `ADMIN_NAV`, group `'Customers'`, directly after the `/admin/whatsapp` item add:

```tsx
      { href: '/admin/offers', label: 'WhatsApp offers', hint: 'Chat-only discount codes for hotels', icon: BadgePercent, tone: 'bg-rose-500' },
```

- [ ] **Step 4: "Offer applied" badge on admin bookings**

In `app/(site)/admin/bookings/page.tsx`, directly after the line rendering the `manual price` badge (`{b.price_overridden && ...}`), add:

```tsx
                    {b.offer_code && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">Offer {b.offer_code} ({b.offer_percent}%) applied – no further discount</span>}
```

(The page already loads `bookings` with `select('*')`, so `offer_code` / `offer_percent` arrive once migration v22 is applied.)

- [ ] **Step 5: Typecheck and run all tests**

Run: `npx tsc --noEmit -p . && npx vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/offers/CodeResult.tsx "app/(site)/admin/offers/page.tsx" components/admin/AdminShell.tsx "app/(site)/admin/bookings/page.tsx"
git commit -m "Add admin WhatsApp offers page"
```

---

### Task 12: Partner "Check offer code" page and API

**Files:**
- Create: `app/api/partner/offer-codes/route.ts`
- Create: `app/(site)/partner/offer-codes/page.tsx`
- Modify: `app/(site)/partner/dashboard/page.tsx` (header link, lucide import)
- Modify: `app/api/partner/bookings/route.ts` (pass `offer_code`, `offer_percent`)
- Modify: `app/(site)/partner/bookings/page.tsx` (badge row)
- Test: `tests/api/partner-offer-codes.test.ts` (new), `tests/api/partner-bookings.test.ts` (one new test)

**Interfaces:**
- Consumes: `checkCode`, `redeemCode`, `Viewer` (Task 4); `assertActive` (`@/lib/partners/load`); `CodeResult`, `CodeCheck` (Task 11).
- Produces: `POST /api/partner/offer-codes` body `{ action: 'check' | 'redeem', code }` → `{ result }`, or `{ error, result }` with the refusal status; partner bookings API rows gain `offer_code`, `offer_percent`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/api/partner-offer-codes.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  role: 'partner', status: 'verified' as string | null, calls: [] as any[],
  check: { valid: true, code: 'PNV-7K3Q9' } as any, redeem: { ok: true, result: { status: 'redeemed' } } as any,
}));
vi.mock('@/lib/server-auth', async (orig) => {
  const real = await orig<any>();
  return {
    ...real,
    requireCaller: async (_req: Request, roles: string[]) => {
      if (!roles.includes(h.role)) throw new real.HttpError(403, 'You do not have access to this');
      return { user: { id: 'p1' }, profile: { id: 'p1', role: h.role, partner_status: h.status } };
    },
  };
});
vi.mock('@/lib/offers/verify', () => ({
  checkCode: async (...a: any[]) => { h.calls.push(['check', ...a]); return h.check; },
  redeemCode: async (...a: any[]) => { h.calls.push(['redeem', ...a]); return h.redeem; },
}));

import { POST } from '@/app/api/partner/offer-codes/route';

const post = (body: unknown) => POST(new Request('http://x', { method: 'POST', body: JSON.stringify(body), headers: { Authorization: 'Bearer t' } }));

beforeEach(() => { h.role = 'partner'; h.status = 'verified'; h.calls = []; h.redeem = { ok: true, result: { status: 'redeemed' } }; });

describe('POST /api/partner/offer-codes', () => {
  it('rejects non-partners and suspended partners', async () => {
    h.role = 'customer';
    expect((await post({ action: 'check', code: 'PNV-7K3Q9' })).status).toBe(403);
    h.role = 'partner'; h.status = 'suspended';
    expect((await post({ action: 'check', code: 'PNV-7K3Q9' })).status).toBe(403);
    expect(h.calls).toEqual([]);
  });
  it('checks as this partner, so only their own hotels match', async () => {
    const res = await post({ action: 'check', code: 'pnv-7k3q9' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ result: h.check });
    expect(h.calls[0]).toEqual(['check', 'pnv-7k3q9', { viewer: { id: 'p1', role: 'partner' } }]);
  });
  it('marks a code used and passes refusals on', async () => {
    expect((await post({ action: 'redeem', code: 'PNV-7K3Q9' })).status).toBe(200);
    expect(h.calls[0]).toEqual(['redeem', 'PNV-7K3Q9', { id: 'p1', role: 'partner' }]);
    h.redeem = { ok: false, error: 'This code has expired', status: 409, result: { reason: 'expired' } };
    const res = await post({ action: 'redeem', code: 'PNV-7K3Q9' });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'This code has expired', result: { reason: 'expired' } });
  });
  it('does not let partners cancel codes', async () => {
    expect((await post({ action: 'cancel', code: 'PNV-7K3Q9' })).status).toBe(400);
    expect(h.calls).toEqual([]);
  });
});
```

In `tests/api/partner-bookings.test.ts`, add inside `describe('GET /api/partner/bookings', ...)`:

```ts
  it('passes the offer code through so the partner sees no further discount applies', async () => {
    bookingRows = [{ id: 'b4', status: 'pending', amount: 6000, offer_code: 'PNV-7K3Q9', offer_percent: 25 }];
    const { bookings } = await (await get()).json();
    expect(bookings[0]).toMatchObject({ offer_code: 'PNV-7K3Q9', offer_percent: 25 });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/api/partner-offer-codes.test.ts tests/api/partner-bookings.test.ts`
Expected: FAIL (route missing; `offer_code` not returned).

- [ ] **Step 3: Implement the API route**

```ts
// app/api/partner/offer-codes/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, requireCaller } from '@/lib/server-auth';
import { assertActive } from '@/lib/partners/load';
import { checkCode, redeemCode, type Viewer } from '@/lib/offers/verify';

export const dynamic = 'force-dynamic';

const schema = z.object({ action: z.enum(['check', 'redeem']), code: z.string().trim().min(4).max(20) });

/** Check a WhatsApp offer code for one of the caller's own properties, or mark it used. */
export async function POST(req: Request) {
  try {
    const caller = await requireCaller(req, ['partner']);
    assertActive(caller.profile.partner_status);
    const body = schema.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new HttpError(400, 'Enter the offer code');
    const viewer: Viewer = { id: caller.profile.id, role: 'partner' };
    if (body.data.action === 'check') return NextResponse.json({ result: await checkCode(body.data.code, { viewer }) });
    const r = await redeemCode(body.data.code, viewer);
    return r.ok ? NextResponse.json({ result: r.result }) : NextResponse.json({ error: r.error, result: r.result ?? null }, { status: r.status });
  } catch (e) { return jsonError(e); }
}
```

- [ ] **Step 4: Partner bookings API field**

In `app/api/partner/bookings/route.ts`, in the object returned per booking, after `partner_response: row?.partner_response ?? null, partner_responded_at: row?.partner_responded_at ?? null,` add:

```ts
        offer_code: row?.offer_code ?? null, offer_percent: row?.offer_percent ?? null,
```

- [ ] **Step 5: Partner page**

```tsx
// app/(site)/partner/offer-codes/page.tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import CodeResult, { type CodeCheck } from '@/components/offers/CodeResult';
import { cn } from '@/lib/utils';

export default function PartnerOfferCodesPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [code, setCode] = useState('');
  const [result, setResult] = useState<CodeCheck | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/partner/login');
      else setToken(session.access_token);
    });
  }, [router]);

  async function send(action: 'check' | 'redeem') {
    if (!code.trim() || !token) return;
    setBusy(true); setMsg(null);
    try {
      const res = await fetch('/api/partner/offer-codes', {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action, code }),
      });
      const d = await res.json().catch(() => ({}));
      if (d.result) setResult(d.result);
      if (!res.ok) setMsg({ ok: false, text: d.error || 'Something went wrong' });
      else if (action === 'redeem') setMsg({ ok: true, text: 'Marked as used. This code cannot be used again.' });
    } catch { setMsg({ ok: false, text: 'Could not reach the server. Please check your connection.' }); }
    setBusy(false);
  }

  if (!token) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/partner/dashboard" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-brand-600 mb-4"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
      <h1 className="text-2xl font-heading font-bold text-slate-900">Check an offer code</h1>
      <p className="text-slate-600 text-sm mb-6">Guests who chat with Dharamshala Stay on WhatsApp can get a discount code for your hotel. Check it here before you give the discount, then mark it as used.</p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input value={code} onChange={(e) => { setCode(e.target.value); setResult(null); setMsg(null); }} placeholder="e.g. PNV-7K3Q9" aria-label="Offer code"
          className="px-3 py-2 border border-slate-300 rounded-lg uppercase w-48" />
        <button onClick={() => send('check')} disabled={busy || !code.trim()} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold disabled:opacity-50">Check</button>
        <button onClick={() => send('redeem')} disabled={busy || !result?.valid} className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold disabled:opacity-50">Mark as used</button>
        {busy && <Loader2 className="h-5 w-5 animate-spin text-slate-400" />}
      </div>
      {msg && <p className={cn('text-sm mb-3', msg.ok ? 'text-green-700' : 'text-red-600')}>{msg.text}</p>}
      {result && <CodeResult r={result} />}

      <ul className="mt-6 text-sm text-slate-600 list-disc pl-5 space-y-1">
        <li><b>Walk-in coupon:</b> valid only until the time shown. Give the discount at the desk, then mark it as used.</li>
        <li><b>Paid online booking:</b> the guest already paid the discounted price. Give no further discount; mark it as used at check-in.</li>
      </ul>
    </div>
  );
}
```

- [ ] **Step 6: Dashboard link and bookings badge**

In `app/(site)/partner/dashboard/page.tsx`, add `BadgePercent` to the `lucide-react` import list, and directly after the `<Link href="/partner/bookings" ...>...</Link>` element in the header add:

```tsx
          {(!partnerType || partnerType === 'hotel') && (
            <Link href="/partner/offer-codes" className="flex items-center gap-2 border border-brand-200 text-brand-700 px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-brand-50">
              <BadgePercent className="h-4 w-4" /> Offer codes
            </Link>
          )}
```

In `app/(site)/partner/bookings/page.tsx`, in the badge row, directly after the `{b.partner_response === 'declined' && ...}` line add:

```tsx
                {b.offer_code && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">Offer {b.offer_code} ({b.offer_percent}%) applied – no further discount</span>}
```

- [ ] **Step 7: Run tests and typecheck**

Run: `npx vitest run && npx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add app/api/partner/offer-codes/route.ts "app/(site)/partner/offer-codes/page.tsx" "app/(site)/partner/dashboard/page.tsx" app/api/partner/bookings/route.ts "app/(site)/partner/bookings/page.tsx" tests/api/partner-offer-codes.test.ts tests/api/partner-bookings.test.ts
git commit -m "Let partners check and mark WhatsApp offer codes"
```

---

### Task 13: Ship and verify live

- [ ] **Step 1: Apply the migration** — after v21 is applied, run `supabase/migration-v22-whatsapp-offers.sql` in the Supabase SQL editor (the owner does this). Its last `SELECT` should list `WhatsApp offer – Panchvati Cottages | false | 25 | 3 | PNV | panchvati-cottages`. Verify the API can see the table:

```bash
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/offer_codes?select=id&limit=1" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

Expected: `[]` (not a 404 / "relation does not exist").

- [ ] **Step 2: Full check** — `npx vitest run && npx tsc --noEmit -p .` → all PASS.
- [ ] **Step 3: Push** — `git push origin main`; wait for the deploy (poll the homepage until the new build answers).
- [ ] **Step 4: Switch the offer on** — Admin → WhatsApp offers → Panchvati Cottages → set per-plan % if wanted → "Off – tap to turn on". Confirm `STRIPE_SECRET_KEY` is set on production (without it only the walk-in path works).
- [ ] **Step 5: Manual test from a phone** (spec section 5):
  1. Ask the assistant about Panchvati Cottages → it says "up to 25% off, only through this chat" and offers a code; ask for it → `PNV-xxxxx` with an expiry about 3 hours ahead (India time). Ask again → the same code.
  2. Check the code in the partner portal (`/partner/offer-codes`, logged in as Panchvati's owner; if Panchvati has no `owner_id` yet, use Admin → WhatsApp offers → Check) → Valid, walk-in, up to 25%, guest name and phone, valid-until time.
  3. Mark it as used → "Marked as used". Check or mark it again → "Already used".
  4. Get a code from another test number, quote a Panchvati room with it → discounted total, "Pay online only"; choose pay later → refused; choose pay online → Stripe link. Do not pay; after 30 minutes check the code in admin → it is issued again (or expired if past its window).
  5. As a partner of another hotel, check a Panchvati code → "Code not found".
- [ ] **Step 6: Clean up** — cancel the test bookings and test codes in admin, set the offer back to the owner's chosen state, and report the results to the owner.

---

## Self-Review

- **Spec coverage:** admin control per offer (property, on/off, default %, per-plan %, validity hours, prefix) → Tasks 1, 10, 11; "up to X%" wording → Tasks 2, 7, 9; code format, unguessable, reuse per phone → Tasks 2, 3; validity → Tasks 2, 3; online path with snapshot percent and no time limit once paid → Tasks 5, 8, 2 (`judgeCode`); walk-in path → Tasks 4, 12; pay later not discounted → Tasks 5, 8; stacking (`offer_code`, badges, prompt) → Tasks 5, 9, 11, 12; verification in partner portal and admin with mark-as-used → Tasks 4, 10, 11, 12; turning off and admin cancel → Tasks 3, 4, 7, 10; Stripe-off message → Tasks 2, 7, 8; data model and seed → Task 1; release on cancel or never paid → Tasks 2, 3, 6; `lib/offers/*` functions `offerFor`, `maxPercent`, `planPercent`, `issueCode`, `checkCode`, `redeemCode`, `cancelCode` → Tasks 2-4; testing list (format, retry, reuse, plan %, max %, expiry, redeem atomicity, partner scope, stacking flag, WhatsApp tools, API auth) → Tasks 2-8, 10, 12; manual test → Task 13.
- **Placeholder scan:** none; every code step has complete code, and the availability-plan cross-references give exact anchors.
- **Type consistency:** `OfferOk`/`OfferCheck` (Task 7) used in Task 8; `BookingOffer` (Task 5) matches the `{ code, percent }` passed in Task 8; `CheckResult` (Task 2) matches `CodeCheck` (Task 11); `Viewer` (Task 4) used by Tasks 10 and 12; `attachPaidOffer` return values match the webhook branch (Task 6).
- **Review Focus:** each of the five lines has a test in its owning task (normalization: Tasks 2, 4, 7; pay later refused: Task 8; release and re-attach: Tasks 2, 3, 6; partner scope and throttle: Task 4; redeem race and repeat: Task 4).
