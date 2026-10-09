# Partner Marketplace — Phase 0 (Security) and Phase 1 (Onboarding) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the booking/auth security holes, then let paragliding, taxi and trek partners sign up, upload KYC, add vehicles/drivers/pilots, e-sign the 20% commission agreement, and be verified by admin.

**Architecture:** All partner and money writes go through Next.js API routes that verify the caller's Supabase bearer token and use the service-role client; tables are RLS-protected so the browser can only read its own rows. KYC files live in a private Supabase Storage bucket with no storage policies, reachable only through 5-minute signed URLs issued by the API. Pure logic (pricing, onboarding requirements, validators, agreement PDF) lives in small `lib/` modules covered by Vitest.

**Tech Stack:** Next.js 14 app router, Supabase (Postgres, Auth, Storage), Resend, Stripe, Vitest (new), pdf-lib (new).

**Spec:** `docs/superpowers/specs/2026-10-09-partner-marketplace-design.md`

## Global Constraints

- Commission default for paragliding/taxi/trek partners: **20%** (`profiles.commission_pct`, numeric, default 20).
- Aadhaar: **masked images only**; never store the Aadhaar number.
- KYC files: jpg/png/pdf, **max 8 MB**, private bucket `partner-kyc`, signed URLs expire in **300 seconds**.
- Agreement acceptance records: version, SHA-256 of the exact text, typed name, timestamp, IP, user agent, PDF copy emailed to partner and admin.
- Partner editable states: `onboarding`, `changes_requested`. Only `verified` partners may receive bookings (enforced from Phase 2).
- Existing hotel partners keep their current flow (`partner_type = 'hotel'`, `partner_status` NULL).
- Migrations are plain SQL files in `supabase/`, run by hand in the Supabase SQL editor, numbered from `migration-v14`.
- Money amounts in existing `bookings.amount` stay in rupees (integer); new ledger work (Phase 3) will use paise.
- Copy is plain English for partners who are not technical.

## Spec deltas made while planning (update the spec in Task 1)

1. **Server-rendered page guards (spec §3 item 5) are deferred.** The site stores the Supabase session in browser localStorage, not cookies, so server pages cannot see it without migrating all auth to `@supabase/ssr` cookies. Data stays protected by RLS and by bearer-token checks in every API route; page redirects remain client-side. Revisit in a dedicated auth task.
2. **Drivers and pilots share one table, `partner_staff`** (`role` = `driver` | `pilot` | `guide`), instead of separate `drivers`/pilot tables. Driver logins arrive in Phase 2.
3. **No `agreement_versions` table yet.** The agreement text and version live in code (`lib/partners/agreement.ts`); each signature stores a full snapshot of the text plus its hash. An admin editor for new versions is deferred.
4. **Booking confirmation emails** are sent from server code (`lib/booking-emails.ts`); the public `/api/email/booking-confirmation` route is deleted rather than protected with a secret.

## Review Focus

- **Customer edits the price in the browser** — the booking must be stored at the database price, and Stripe must charge the stored amount (Task 3, Task 4 tests).
- **Partner A opens partner B's document or booking** — API returns 404 and RLS returns zero rows (Task 7 SQL checks, Task 9 ownership test).
- **Re-uploading a rejected document** — the old file and row are replaced; the onboarding checklist counts only the newest non-rejected document (Task 8 test `rejected document counts as missing`).
- **Signing with a name that differs only in case or spaces** — accepted; a different name is rejected with a clear message (Task 8 test for `namesMatch`).
- **Agreement text containing ₹ or Hindi characters in the PDF** — standard PDF fonts cannot encode them; text is transliterated (`₹` → `Rs.`) instead of crashing (Task 10 test).

---

## File Structure

| File | Responsibility |
|---|---|
| `vitest.config.ts` | Test runner config with `@/` alias |
| `lib/pricing.ts` | Server-side price and commission for a booking |
| `lib/server-auth.ts` | Read bearer token, load caller profile, role checks, JSON error helper, service client |
| `lib/booking-emails.ts` | Send guest + admin booking emails for a booking id |
| `lib/supabase.ts` (modify) | Add `authFetch` for browser calls to protected APIs |
| `lib/email.ts` (modify) | Export generic `sendEmail` |
| `lib/partners/types.ts` | Partner type/status/doc-type constants and TS types |
| `lib/partners/requirements.ts` | Onboarding checklist: what is missing for a partner |
| `lib/partners/validate.ts` | PAN, IFSC, UPI, account no., vehicle reg, file, name matching |
| `lib/partners/agreement.ts` | Agreement version + text per partner type |
| `lib/partners/agreement-pdf.ts` | Render signed agreement PDF |
| `lib/partners/emails.ts` | Partner onboarding emails |
| `lib/partners/load.ts` | Server loader: full onboarding state for a partner id |
| `supabase/migration-v14-security.sql` | Booking read/insert policies, customer role repair |
| `supabase/migration-v15-partner-onboarding.sql` | Partner columns, staff, vehicles, documents, agreements, bucket, RLS, triggers |
| `app/api/partner/onboarding/route.ts` | GET onboarding state |
| `app/api/partner/profile/route.ts` | PATCH business and payout details |
| `app/api/partner/documents/route.ts` | POST upload KYC file |
| `app/api/partner/documents/[id]/route.ts` | DELETE own document |
| `app/api/partner/staff/route.ts`, `[id]/route.ts` | Add/remove drivers and pilots |
| `app/api/partner/vehicles/route.ts`, `[id]/route.ts` | Add/remove vehicles |
| `app/api/partner/agreement/route.ts` | POST sign agreement |
| `app/api/admin/partners/route.ts` | GET partner list |
| `app/api/admin/partners/[id]/route.ts` | GET partner detail, POST admin actions |
| `app/(site)/partner/register/page.tsx` (modify) | Choose partner type |
| `app/(site)/partner/onboarding/page.tsx` | Onboarding wizard |
| `app/(site)/partner/dashboard/page.tsx` (modify) | Send unverified activity partners to onboarding |
| `app/(site)/admin/partners/page.tsx`, `[id]/page.tsx` | Admin verification queue and detail |
| `components/admin/AdminShell.tsx` (modify) | "Partners" menu item |
| `tests/**` | Vitest tests |

---

## PHASE 0 — SECURITY

### Task 1: Test harness and spec deltas

**Files:**
- Create: `vitest.config.ts`, `tests/smoke.test.ts`
- Modify: `package.json`, `docs/superpowers/specs/2026-10-09-partner-marketplace-design.md`

**Interfaces:**
- Produces: `npm test` runs Vitest over `tests/**/*.test.ts` with the `@/` alias.

- [ ] **Step 1: Install Vitest**

Run: `npm install -D vitest@2.1.9`
Expected: `package.json` devDependencies contains `"vitest"`.

- [ ] **Step 2: Add config and script**

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
```
In `package.json` `"scripts"` add: `"test": "vitest run"`.

`tests/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('test harness', () => {
  it('resolves the @ alias', () => {
    expect(typeof cn).toBe('function');
  });
});
```

- [ ] **Step 3: Run**

Run: `npm test`
Expected: 1 passed.

- [ ] **Step 4: Record spec deltas**

Append to the spec a section `## 12. Changes made during planning (2026-10-09)` containing the four numbered "Spec deltas" from the top of this plan, verbatim.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts tests/smoke.test.ts package.json package-lock.json docs/superpowers/specs/2026-10-09-partner-marketplace-design.md
git commit -m "Add Vitest and record planning changes to the partner spec"
```

---

### Task 2: Server-side pricing module

**Files:**
- Create: `lib/pricing.ts`, `tests/pricing.test.ts`

**Interfaces:**
- Produces:
  - `nightsBetween(checkIn: string, checkOut: string): number`
  - `hotelNightlyPrice(property: HotelLike, roomName?: string | null, planIndex?: number | null): number`
  - `quoteBooking(category: BookingCategory, entity: Record<string, any> | null, input: QuoteInput): { amount: number; commission_pct: number }`
  - types `BookingCategory = 'hotel' | 'taxi' | 'trek' | 'paragliding'`, `QuoteInput = { num_guests: number; check_in?: string | null; check_out?: string | null; room_name?: string | null; plan_index?: number | null }`, `HotelLike = { price_min?: number | null; rooms?: any[] | null; commission_pct?: number | null }`

- [ ] **Step 1: Write the failing tests**

`tests/pricing.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { nightsBetween, hotelNightlyPrice, quoteBooking } from '@/lib/pricing';

const hotel = {
  price_min: 1800,
  commission_pct: 12,
  rooms: [
    { name: 'Deluxe', base_price: 2500, rate_plans: [{ meal_plan: 'ep', price: 2400 }, { meal_plan: 'cp', price: 2900 }] },
    { name: 'Standard', base_price: 1800, rate_plans: [] },
  ],
};

describe('nightsBetween', () => {
  it('counts nights', () => expect(nightsBetween('2026-11-01', '2026-11-04')).toBe(3));
  it('is 0 for same or reversed dates', () => {
    expect(nightsBetween('2026-11-04', '2026-11-04')).toBe(0);
    expect(nightsBetween('2026-11-05', '2026-11-04')).toBe(0);
  });
});

describe('hotelNightlyPrice', () => {
  it('uses the chosen rate plan', () => expect(hotelNightlyPrice(hotel, 'Deluxe', 1)).toBe(2900));
  it('falls back to base price for a room without plans', () => expect(hotelNightlyPrice(hotel, 'Standard', 0)).toBe(1800));
  it('falls back to price_min when no room is chosen', () => expect(hotelNightlyPrice(hotel, null, null)).toBe(1800));
  it('ignores an out-of-range plan index', () => expect(hotelNightlyPrice(hotel, 'Deluxe', 9)).toBe(2500));
  it('returns 0 when nothing is priced', () => expect(hotelNightlyPrice({ price_min: null, rooms: [] }, null, null)).toBe(0));
});

describe('quoteBooking', () => {
  it('prices a hotel stay from the database, not the client', () => {
    expect(quoteBooking('hotel', hotel, { num_guests: 2, check_in: '2026-11-01', check_out: '2026-11-03', room_name: 'Deluxe', plan_index: 0 }))
      .toEqual({ amount: 4800, commission_pct: 12 });
  });
  it('prices treks per person', () => {
    expect(quoteBooking('trek', { price_per_person: 1500, commission_pct: 10 }, { num_guests: 3 })).toEqual({ amount: 4500, commission_pct: 10 });
  });
  it('prices paragliding per person with default 15%', () => {
    expect(quoteBooking('paragliding', { price_per_person: 3500 }, { num_guests: 2 })).toEqual({ amount: 7000, commission_pct: 15 });
  });
  it('prices a fixed taxi route once, regardless of guests', () => {
    expect(quoteBooking('taxi', { price: 2200, price_type: 'fixed', commission_pct: 10 }, { num_guests: 4 })).toEqual({ amount: 2200, commission_pct: 10 });
  });
  it('returns 0 (quote needed) for a per-km taxi or unknown entity', () => {
    expect(quoteBooking('taxi', { price: 18, price_type: 'per_km' }, { num_guests: 1 }).amount).toBe(0);
    expect(quoteBooking('trek', null, { num_guests: 2 }).amount).toBe(0);
  });
  it('clamps guests to at least 1', () => {
    expect(quoteBooking('trek', { price_per_person: 1000 }, { num_guests: 0 }).amount).toBe(1000);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- tests/pricing.test.ts`
Expected: FAIL, cannot resolve `@/lib/pricing`.

- [ ] **Step 3: Implement**

`lib/pricing.ts`:
```ts
// Booking prices are always computed here, on the server, from database rows.
// The browser only shows an estimate; it never decides what is charged.

export type BookingCategory = 'hotel' | 'taxi' | 'trek' | 'paragliding';
export type QuoteInput = { num_guests: number; check_in?: string | null; check_out?: string | null; room_name?: string | null; plan_index?: number | null };
export type HotelLike = { price_min?: number | null; rooms?: any[] | null; commission_pct?: number | null };

const DEFAULT_COMMISSION: Record<BookingCategory, number> = { hotel: 10, taxi: 10, trek: 10, paragliding: 15 };

export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = Date.parse(checkIn + 'T00:00:00Z');
  const b = Date.parse(checkOut + 'T00:00:00Z');
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
  return Math.round((b - a) / 86_400_000);
}

export function hotelNightlyPrice(property: HotelLike, roomName?: string | null, planIndex?: number | null): number {
  const room = roomName ? (property.rooms || []).find((r: any) => r?.name === roomName) : null;
  if (room) {
    const plans = Array.isArray(room.rate_plans) ? room.rate_plans : [];
    const plan = typeof planIndex === 'number' ? plans[planIndex] : undefined;
    if (plan && Number(plan.price) > 0) return Number(plan.price);
    if (Number(room.base_price) > 0) return Number(room.base_price);
  }
  return Number(property.price_min) > 0 ? Number(property.price_min) : 0;
}

function pct(entity: Record<string, any> | null, category: BookingCategory): number {
  const v = Number(entity?.commission_pct);
  return Number.isFinite(v) && v >= 0 && v <= 100 && entity?.commission_pct != null ? v : DEFAULT_COMMISSION[category];
}

export function quoteBooking(category: BookingCategory, entity: Record<string, any> | null, input: QuoteInput) {
  const guests = Math.max(1, Math.floor(input.num_guests || 1));
  const commission_pct = pct(entity, category);
  if (!entity) return { amount: 0, commission_pct };

  let amount = 0;
  if (category === 'hotel') {
    const nights = input.check_in && input.check_out ? nightsBetween(input.check_in, input.check_out) : 0;
    amount = hotelNightlyPrice(entity, input.room_name, input.plan_index) * nights;
  } else if (category === 'trek' || category === 'paragliding') {
    amount = (Number(entity.price_per_person) || 0) * guests;
  } else if (category === 'taxi') {
    amount = entity.price_type === 'per_km' ? 0 : Number(entity.price) || 0;
  }
  return { amount: Math.round(amount), commission_pct };
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/pricing.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add lib/pricing.ts tests/pricing.test.ts
git commit -m "Add server-side booking price and commission calculation"
```

---

### Task 3: Server auth helper and protected admin import

**Files:**
- Create: `lib/server-auth.ts`, `tests/server-auth.test.ts`
- Modify: `lib/supabase.ts`, `app/api/admin/import-property/route.ts`, `app/(site)/admin/import/page.tsx:37-40`

**Interfaces:**
- Produces:
  - `class HttpError extends Error { status: number }`
  - `serviceClient(): SupabaseClient`
  - `getCaller(req: Request): Promise<Caller | null>` where `Caller = { user: User; profile: Record<string, any> }`
  - `requireCaller(req: Request, roles?: string[]): Promise<Caller>` (throws `HttpError(401|403)`)
  - `jsonError(e: unknown): NextResponse`
  - `bearerFrom(req: Request): string | null`
  - browser: `authFetch(input: string, init?: RequestInit): Promise<Response>` in `lib/supabase.ts`

- [ ] **Step 1: Failing test for the pure parts**

`tests/server-auth.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { bearerFrom, HttpError, jsonError } from '@/lib/server-auth';

describe('bearerFrom', () => {
  it('reads a bearer token', () => {
    expect(bearerFrom(new Request('http://x', { headers: { authorization: 'Bearer abc.def' } }))).toBe('abc.def');
  });
  it('returns null without one', () => {
    expect(bearerFrom(new Request('http://x'))).toBeNull();
    expect(bearerFrom(new Request('http://x', { headers: { authorization: 'Basic zz' } }))).toBeNull();
  });
});

describe('jsonError', () => {
  it('uses HttpError status', async () => {
    const res = jsonError(new HttpError(403, 'Admins only'));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Admins only' });
  });
  it('hides unexpected errors behind 500', async () => {
    const res = jsonError(new Error('db exploded'));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Server error' });
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npm test -- tests/server-auth.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement `lib/server-auth.ts`**

```ts
import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export type Caller = { user: User; profile: Record<string, any> };

export function serviceClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function bearerFrom(req: Request): string | null {
  const h = req.headers.get('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : null;
}

/** The signed-in user behind this request and their profile row, or null. */
export async function getCaller(req: Request): Promise<Caller | null> {
  const token = bearerFrom(req);
  if (!token) return null;
  const sb = serviceClient();
  const { data: { user } } = await sb.auth.getUser(token);
  if (!user) return null;
  const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) return null;
  return { user, profile };
}

export async function requireCaller(req: Request, roles?: string[]): Promise<Caller> {
  const caller = await getCaller(req);
  if (!caller) throw new HttpError(401, 'Please log in again');
  if (roles && !roles.includes(caller.profile.role)) throw new HttpError(403, 'You do not have access to this');
  return caller;
}

export function jsonError(e: unknown): NextResponse {
  if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
  console.error(e);
  return NextResponse.json({ error: 'Server error' }, { status: 500 });
}
```

Append to `lib/supabase.ts`:
```ts
/** fetch() that sends the logged-in user's token, for /api/partner and /api/admin routes. */
export async function authFetch(input: string, init: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  if (session) headers.set('Authorization', 'Bearer ' + session.access_token);
  return fetch(input, { ...init, headers });
}
```

- [ ] **Step 4: Protect the AI import route**

In `app/api/admin/import-property/route.ts`, add the import at the top and make the first lines of `POST` require an admin:
```ts
import { requireCaller, jsonError } from '@/lib/server-auth';
```
```ts
export async function POST(req: NextRequest) {
  try {
    await requireCaller(req, ['admin']);
  } catch (e) {
    return jsonError(e);
  }
  // ...existing body unchanged...
```
In `app/(site)/admin/import/page.tsx`, import `authFetch` from `@/lib/supabase` (add to the existing import) and replace `await fetch('/api/admin/import-property', {` with `await authFetch('/api/admin/import-property', {`.

- [ ] **Step 5: Run tests and typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: tests pass, no type errors.

- [ ] **Step 6: Manual check**

Run `npm run dev`, then: `curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/admin/import-property -H "Content-Type: application/json" -d "{\"rawContent\":\"x\"}"`
Expected: `401`. Then log in as admin at `/admin/import` and confirm extraction still works.

- [ ] **Step 7: Commit**

```bash
git add lib/server-auth.ts lib/supabase.ts tests/server-auth.test.ts app/api/admin/import-property/route.ts "app/(site)/admin/import/page.tsx"
git commit -m "Require admin login for the AI property import API"
```

---

### Task 4: Server-priced bookings, safe checkout, server-sent booking emails

**Files:**
- Create: `lib/booking-emails.ts`
- Modify: `app/api/bookings/route.ts`, `app/api/checkout/route.ts`, `app/api/webhooks/stripe/route.ts`, `components/forms/BookingForm.tsx`, `components/hotels/HotelBooking.tsx`, `components/pages/ParaglidingView.tsx:130`
- Delete: `app/api/email/booking-confirmation/route.ts`
- Test: `tests/pricing.test.ts` (already covers maths); manual API checks below

**Interfaces:**
- Consumes: `quoteBooking`, `BookingCategory` (Task 2); `serviceClient` (Task 3)
- Produces: `sendBookingEmails(bookingId: string): Promise<void>`; `/api/bookings` accepts `plan_index` and ignores `amount`/`commission_pct`; `/api/checkout` body is `{ bookingId: string }`; `BookingForm` prop `planIndex?: number`.

- [ ] **Step 1: Move email sending to a server module**

`lib/booking-emails.ts`:
```ts
import { serviceClient } from '@/lib/server-auth';
import { sendBookingConfirmation, sendAdminNotification } from '@/lib/email';

/** Guest confirmation + admin alert for one booking. Never throws. */
export async function sendBookingEmails(bookingId: string): Promise<void> {
  try {
    const sb = serviceClient();
    const { data: booking } = await sb.from('bookings').select('*').eq('id', bookingId).single();
    if (!booking) return;
    let propertyName = '';
    if (booking.property_id) {
      const { data: prop } = await sb.from('properties').select('name').eq('id', booking.property_id).single();
      propertyName = prop?.name || '';
    }
    if (booking.guest_email) {
      await sendBookingConfirmation({
        guest_name: booking.guest_name, guest_email: booking.guest_email, booking_ref: booking.booking_ref,
        check_in: booking.check_in, check_out: booking.check_out, activity_date: booking.activity_date,
        amount: booking.amount, category: booking.category, room_name: booking.room_name,
        property_name: propertyName, paid_amount: booking.paid_amount,
      });
    }
    await sendAdminNotification({
      guest_name: booking.guest_name, guest_phone: booking.guest_phone, guest_email: booking.guest_email,
      booking_ref: booking.booking_ref, category: booking.category, amount: booking.amount,
      check_in: booking.check_in, check_out: booking.check_out, property_name: propertyName,
    });
  } catch (err) {
    console.error('Booking emails failed (non-fatal):', err);
  }
}
```
Delete `app/api/email/booking-confirmation/route.ts`.

- [ ] **Step 2: Price bookings on the server**

In `app/api/bookings/route.ts`:
1. Add imports: `import { quoteBooking } from '@/lib/pricing';` and `import { sendBookingEmails } from '@/lib/booking-emails';`
2. In `schema`, delete the `amount` and `commission_pct` lines and add `plan_index: z.number().int().min(0).max(50).optional().nullable(),`
3. Replace the block from `// Calculate commission` through the `commission_status` declaration with nothing, and inside `if (url && key) {` right after `const sb = createClient(url, key);` insert:
```ts
      // Price comes from the database row, never from the browser.
      const TABLE = { hotel: 'properties', taxi: 'taxi_routes', trek: 'treks', paragliding: 'paragliding_packages' } as const;
      const entityId = data.property_id || data.taxi_route_id || data.trek_id || data.paragliding_id || null;
      let entity: Record<string, any> | null = null;
      if (entityId) {
        const { data: row } = await sb.from(TABLE[data.category]).select('*').eq('id', entityId).single();
        entity = row || null;
      }
      const { amount, commission_pct } = quoteBooking(data.category, entity, {
        num_guests: data.num_guests, check_in: data.check_in, check_out: data.check_out,
        room_name: data.room_name, plan_index: data.plan_index ?? null,
      });
      const commission_amount = Math.round(amount * commission_pct / 100);
      const commission_status = (data.payment_method === 'offline' || data.payment_method === 'pay_at_hotel') && commission_amount > 0
        ? 'pending' : 'not_applicable';
      // Online payment needs a price; quote-only bookings are taken as pay-later.
      const payment_method = data.payment_method === 'online' && amount < 100 ? 'offline' : data.payment_method;
```
4. In the `.insert({...})` object, change `amount: data.amount,` → `amount,`, `payment_method: data.payment_method,` → `payment_method,`, `commission_pct: data.commission_pct,` → `commission_pct,`.
5. In both `notification_log` bodies replace `amount: data.amount` with `amount`.
6. Replace the success return with:
```ts
      if (payment_method !== 'online') await sendBookingEmails(booking.id);
      return NextResponse.json({ success: true, booking_ref: booking.booking_ref, booking_id: booking.id, amount, payment_method });
```

- [ ] **Step 3: Charge the stored amount only**

Replace the whole of `app/api/checkout/route.ts` with:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { serviceClient } from '@/lib/server-auth';

const RETURN_PATH: Record<string, string> = { hotel: '/hotels', taxi: '/taxi', trek: '/treks', paragliding: '/paragliding' };

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'Online payment is not available yet' }, { status: 503 });
    const { bookingId } = await req.json().catch(() => ({}));
    if (typeof bookingId !== 'string' || !bookingId) return NextResponse.json({ error: 'Missing booking' }, { status: 400 });

    const sb = serviceClient();
    const { data: b } = await sb.from('bookings').select('*').eq('id', bookingId).single();
    if (!b) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    if (b.payment_status === 'paid') return NextResponse.json({ error: 'This booking is already paid' }, { status: 409 });
    if (!b.amount || b.amount < 100) return NextResponse.json({ error: 'This booking has no online price' }, { status: 400 });

    let title = 'Dharamshala Stay booking';
    if (b.property_id) {
      const { data: p } = await sb.from('properties').select('name').eq('id', b.property_id).single();
      if (p?.name) title = p.name;
    }
    const dates = b.check_in ? `${b.check_in} to ${b.check_out || ''}` : b.activity_date || '';
    const description = [b.room_name, dates, b.booking_ref].filter(Boolean).join(' · ');

    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      currency: 'inr',
      line_items: [{ quantity: 1, price_data: { currency: 'inr', unit_amount: Math.round(b.amount * 100), product_data: { name: title, description: description.slice(0, 500) || undefined } } }],
      customer_email: b.guest_email || undefined,
      metadata: { booking_id: b.id, booking_ref: b.booking_ref || '' },
      success_url: process.env.NEXT_PUBLIC_SITE_URL + '/booking/success?session_id={CHECKOUT_SESSION_ID}&ref=' + encodeURIComponent(b.booking_ref || ''),
      cancel_url: process.env.NEXT_PUBLIC_SITE_URL + (RETURN_PATH[b.category] || '/') + '?payment=cancelled',
    });
    await sb.from('bookings').update({ stripe_session_id: session.id, payment_method: 'online' }).eq('id', b.id);
    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json({ error: 'Could not start payment' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Webhook sends emails directly**

In `app/api/webhooks/stripe/route.ts`, add `import { sendBookingEmails } from '@/lib/booking-emails';` and replace the `try { await fetch(process.env.NEXT_PUBLIC_SITE_URL + '/api/email/booking-confirmation', ... ) } catch (emailErr) {...}` block with:
```ts
          await sendBookingEmails(bookingId);
```
(use the booking id variable already in scope in that handler; read the file and match its name.)

- [ ] **Step 5: Booking form sends choices, not prices**

In `components/forms/BookingForm.tsx`:
1. Add `planIndex?: number;` to `BookingFormProps` and to the destructured props: `({ category, entityId, entityName, pricePerNight, defaultAmount, roomName, planIndex, className = '' }`. Remove `commissionPct` from props and the interface.
2. In `payload`, remove `amount: totalAmount,` and `commission_pct: commissionPct,`; add `plan_index: typeof planIndex === 'number' ? planIndex : null,`.
3. Replace the online-payment block with:
```ts
      if (payMethod === 'online' && data.payment_method === 'online' && data.amount >= 100) {
        setStatus('paying');
        const cr = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: data.booking_id }) });
        const cd = await cr.json();
        if (cd.url) { window.location.href = cd.url; return; }
        setErrorMsg(f.paymentFailed); setBookingRef(data.booking_ref || ''); setStatus('success'); return;
      }
```
4. Delete the line that calls `fetch('/api/email/booking-confirmation', ...)`.

In `components/hotels/HotelBooking.tsx`:
1. Add `planIndex: number` to the `SelectedRoom` type and `planIndex: -1` to the initial state.
2. Change `function selectRoom(roomName: string, planName: string, price: number)` to `function selectRoom(roomName: string, planName: string, price: number, planIndex: number)` and set `planIndex` in `setSelected({ roomName, planName, pricePerNight: ourPrice, planIndex })`.
3. Change the call `onClick={() => selectRoom(room.name, planName, plan.price)}` to `onClick={() => selectRoom(room.name, planName, plan.price, pi)}`.
4. Pass `planIndex={selected.planIndex >= 0 ? selected.planIndex : undefined}` to `<BookingForm`.

In `components/pages/ParaglidingView.tsx:130`, replace the BookingForm with:
```tsx
<BookingForm category="paragliding" entityId={packages[0]?.id} entityName="Paragliding Flight" defaultAmount={packages[0]?.price_per_person || 3500} />
```
Remove `commissionPct={...}` from any other `<BookingForm` usage (`grep -rn "commissionPct" components app` must return nothing).

- [ ] **Step 6: Typecheck and test**

Run: `npx tsc --noEmit && npm test`
Expected: clean.

- [ ] **Step 7: Manual price-tamper check**

With `npm run dev` running, pick a published trek id (`/admin/treks`), then:
```bash
curl -s -X POST http://localhost:3000/api/bookings -H "Content-Type: application/json" -d "{\"category\":\"trek\",\"trek_id\":\"<TREK_ID>\",\"guest_name\":\"Test Guest\",\"guest_phone\":\"9999999999\",\"num_guests\":2,\"activity_date\":\"2026-12-01\",\"amount\":1,\"commission_pct\":0}"
```
Expected: response `amount` = 2 × that trek's `price_per_person`. Then in Supabase confirm the row's `amount` and `commission_pct` match the trek, and delete the test row.

- [ ] **Step 8: Commit**

```bash
git add -A lib/booking-emails.ts app/api/bookings/route.ts app/api/checkout/route.ts app/api/webhooks/stripe/route.ts app/api/email components/forms/BookingForm.tsx components/hotels/HotelBooking.tsx components/pages/ParaglidingView.tsx
git commit -m "Price bookings on the server and charge only the stored amount"
```

---

### Task 5: Booking privacy and customer sign-up role (migration v14)

**Files:**
- Create: `supabase/migration-v14-security.sql`
- Modify: `app/(site)/auth/register/page.tsx`

- [ ] **Step 1: Write the migration**

`supabase/migration-v14-security.sql`:
```sql
-- migration-v14: booking privacy + customer sign-up role
-- 1. "Users read own bookings" (v4) let ANY partner read EVERY booking, guest
--    phone numbers included. Customers now read only their own; partners keep
--    "Partner read own property bookings" (v3); admins keep is_admin().
DROP POLICY IF EXISTS "Users read own bookings" ON bookings;
CREATE POLICY "Customers read own bookings" ON bookings
  FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 2. Bookings are created only by /api/bookings (service role), which prices
--    them. Direct inserts from the browser could set any amount.
DROP POLICY IF EXISTS "Anyone can insert bookings" ON bookings;
DROP POLICY IF EXISTS "Public insert bookings" ON bookings;

-- 3. Customer sign-ups were created as 'partner' (the register page did not
--    send a role, and its follow-up role change is blocked by v13). Repair
--    accounts that never acted as partners: no business name, no listings.
UPDATE profiles p SET role = 'user'
WHERE p.role = 'partner'
  AND coalesce(trim(p.business_name), '') = ''
  AND NOT EXISTS (SELECT 1 FROM properties pr WHERE pr.owner_id = p.id);
```

- [ ] **Step 2: Fix the customer register page**

In `app/(site)/auth/register/page.tsx`, change the sign-up options to
`options: { data: { role: 'user', full_name: form.name, phone: form.phone } },`
and delete the whole `// Create profile with role 'user'` block (the `if (data.user) { await supabase.from('profiles').upsert(...) }`). Also remove the now-unused `data` destructure if TypeScript flags it: `const { error: signUpErr } = await supabase.auth.signUp({...})`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit` → clean.

- [ ] **Step 4: Run the migration**

Paste `supabase/migration-v14-security.sql` into the Supabase SQL editor and run. Expected: success; the UPDATE reports N rows.

- [ ] **Step 5: Verify policies**

In the SQL editor:
```sql
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'bookings' ORDER BY policyname;
```
Expected exactly: `Admin full access bookings` (ALL), `Customers read own bookings` (SELECT), `Partner read own property bookings` (SELECT).

- [ ] **Step 6: Manual check**

Register a new customer at `/auth/register`; in Supabase `profiles`, the new row has `role = 'user'`. Make a test hotel booking on the site while logged in as that user; `/account` shows it. Delete test data afterwards.

- [ ] **Step 7: Commit**

```bash
git add supabase/migration-v14-security.sql "app/(site)/auth/register/page.tsx"
git commit -m "Stop partners reading all bookings and register customers as users"
```

---

## PHASE 1 — PARTNER ONBOARDING

### Task 6: Partner constants and validators

**Files:**
- Create: `lib/partners/types.ts`, `lib/partners/validate.ts`, `tests/partners/validate.test.ts`

**Interfaces:**
- Produces (types.ts):
  - `ACTIVITY_PARTNER_TYPES = ['paragliding', 'taxi', 'trek'] as const`, `type ActivityPartnerType`
  - `PARTNER_TYPES = ['hotel', ...ACTIVITY_PARTNER_TYPES] as const`, `type PartnerType`
  - `type PartnerStatus = 'onboarding' | 'pending_verification' | 'verified' | 'changes_requested' | 'suspended' | 'rejected'`
  - `EDITABLE_STATUSES: PartnerStatus[] = ['onboarding', 'changes_requested']`
  - `DOC_TYPES` tuple and `type DocType`; `DOC_LABELS: Record<DocType, string>`; `docTarget(doc: DocType): 'partner' | 'staff' | 'vehicle'`
  - `STAFF_ROLES = ['driver', 'pilot', 'guide'] as const`, `VEHICLE_TYPES = ['sedan', 'suv', 'innova', 'tempo', 'bus'] as const`
- Produces (validate.ts): `isPan(s)`, `isIfsc(s)`, `isUpi(s)`, `isAccountNumber(s)`, `normalizeVehicleReg(s): string | null`, `checkUpload({ type, size }): string | null`, `namesMatch(a, b): boolean`, `ALLOWED_MIME`, `MAX_UPLOAD_BYTES`

- [ ] **Step 1: Failing tests**

`tests/partners/validate.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { isPan, isIfsc, isUpi, isAccountNumber, normalizeVehicleReg, checkUpload, namesMatch, MAX_UPLOAD_BYTES } from '@/lib/partners/validate';
import { docTarget } from '@/lib/partners/types';

describe('identity and bank formats', () => {
  it('PAN', () => { expect(isPan('ABCDE1234F')).toBe(true); expect(isPan('abcde1234f')).toBe(true); expect(isPan('ABCD1234F')).toBe(false); });
  it('IFSC', () => { expect(isIfsc('SBIN0001234')).toBe(true); expect(isIfsc('SBIN1001234')).toBe(false); });
  it('UPI', () => { expect(isUpi('ravi.kumar@okhdfcbank')).toBe(true); expect(isUpi('no-at-sign')).toBe(false); });
  it('account number', () => { expect(isAccountNumber('123456789012')).toBe(true); expect(isAccountNumber('12ab')).toBe(false); });
});

describe('vehicle registration', () => {
  it('normalizes spacing and case', () => expect(normalizeVehicleReg(' hp 39 a 1234 ')).toBe('HP39A1234'));
  it('accepts BH series', () => expect(normalizeVehicleReg('22 BH 1234 AA')).toBe('22BH1234AA'));
  it('rejects junk', () => expect(normalizeVehicleReg('hello')).toBeNull());
});

describe('checkUpload', () => {
  it('accepts a small jpg/png/pdf', () => {
    expect(checkUpload({ type: 'image/jpeg', size: 1000 })).toBeNull();
    expect(checkUpload({ type: 'application/pdf', size: 1000 })).toBeNull();
  });
  it('rejects other types and big files', () => {
    expect(checkUpload({ type: 'image/gif', size: 10 })).toMatch(/JPG, PNG or PDF/);
    expect(checkUpload({ type: 'image/png', size: MAX_UPLOAD_BYTES + 1 })).toMatch(/8 MB/);
  });
});

describe('namesMatch', () => {
  it('ignores case and extra spaces', () => expect(namesMatch('  Ravi  Kumar ', 'ravi kumar')).toBe(true));
  it('rejects a different name', () => expect(namesMatch('Ravi Kumar', 'Ravi Sharma')).toBe(false));
  it('rejects empty', () => expect(namesMatch('', '')).toBe(false));
});

describe('docTarget', () => {
  it('routes documents to their owner', () => {
    expect(docTarget('pan')).toBe('partner');
    expect(docTarget('driving_licence')).toBe('staff');
    expect(docTarget('vehicle_rc')).toBe('vehicle');
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npm test -- tests/partners/validate.test.ts` → FAIL.

- [ ] **Step 3: Implement**

`lib/partners/types.ts`:
```ts
export const ACTIVITY_PARTNER_TYPES = ['paragliding', 'taxi', 'trek'] as const;
export type ActivityPartnerType = (typeof ACTIVITY_PARTNER_TYPES)[number];
export const PARTNER_TYPES = ['hotel', ...ACTIVITY_PARTNER_TYPES] as const;
export type PartnerType = (typeof PARTNER_TYPES)[number];

export type PartnerStatus = 'onboarding' | 'pending_verification' | 'verified' | 'changes_requested' | 'suspended' | 'rejected';
export const EDITABLE_STATUSES: PartnerStatus[] = ['onboarding', 'changes_requested'];

export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  hotel: 'Hotel, homestay or hostel', paragliding: 'Paragliding operator', taxi: 'Taxi driver or taxi operator', trek: 'Trek company or travel agency',
};

export const DOC_TYPES = [
  'aadhaar_front', 'aadhaar_back', 'pan', 'tourism_registration', 'driving_licence',
  'pilot_licence', 'vehicle_rc', 'vehicle_permit', 'vehicle_insurance', 'other',
] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const DOC_LABELS: Record<DocType, string> = {
  aadhaar_front: 'Aadhaar card — front (masked)',
  aadhaar_back: 'Aadhaar card — back',
  pan: 'PAN card',
  tourism_registration: 'Himachal tourism department registration',
  driving_licence: 'Driving licence',
  pilot_licence: 'Paragliding pilot licence / certificate',
  vehicle_rc: 'Vehicle registration certificate (RC)',
  vehicle_permit: 'Commercial (taxi) permit',
  vehicle_insurance: 'Vehicle insurance',
  other: 'Other document',
};

const STAFF_DOCS: DocType[] = ['driving_licence', 'pilot_licence'];
const VEHICLE_DOCS: DocType[] = ['vehicle_rc', 'vehicle_permit', 'vehicle_insurance'];
export function docTarget(doc: DocType): 'partner' | 'staff' | 'vehicle' {
  if (STAFF_DOCS.includes(doc)) return 'staff';
  if (VEHICLE_DOCS.includes(doc)) return 'vehicle';
  return 'partner';
}

export const STAFF_ROLES = ['driver', 'pilot', 'guide'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];
export const VEHICLE_TYPES = ['sedan', 'suv', 'innova', 'tempo', 'bus'] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];
```

`lib/partners/validate.ts`:
```ts
export const ALLOWED_MIME = ['image/jpeg', 'image/png', 'application/pdf'];
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export const isPan = (s: string) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(s.trim().toUpperCase());
export const isIfsc = (s: string) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(s.trim().toUpperCase());
export const isUpi = (s: string) => /^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/.test(s.trim());
export const isAccountNumber = (s: string) => /^\d{9,18}$/.test(s.trim());

/** "hp 39 a 1234" -> "HP39A1234"; Bharat series "22 BH 1234 AA" also accepted. */
export function normalizeVehicleReg(s: string): string | null {
  const v = s.toUpperCase().replace(/[\s-]/g, '');
  if (/^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$/.test(v)) return v;
  if (/^\d{2}BH\d{4}[A-Z]{1,2}$/.test(v)) return v;
  return null;
}

export function checkUpload(f: { type: string; size: number }): string | null {
  if (!ALLOWED_MIME.includes(f.type)) return 'Please upload a JPG, PNG or PDF file.';
  if (f.size > MAX_UPLOAD_BYTES) return 'File is too big. The limit is 8 MB.';
  if (f.size <= 0) return 'The file is empty.';
  return null;
}

const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();
export function namesMatch(a: string, b: string): boolean {
  return norm(a).length > 1 && norm(a) === norm(b);
}
```

- [ ] **Step 4: Run tests** — `npm test -- tests/partners/validate.test.ts` → all pass.

- [ ] **Step 5: Commit**

```bash
git add lib/partners/types.ts lib/partners/validate.ts tests/partners/validate.test.ts
git commit -m "Add partner types, document types and KYC field validators"
```

---

### Task 7: Database schema for partner onboarding (migration v15)

**Files:**
- Create: `supabase/migration-v15-partner-onboarding.sql`
- Modify: `types/index.ts` (add `PartnerProfile` fields to the existing `Profile`/profile type if one exists; otherwise add new interfaces below)

**Interfaces:**
- Produces tables: `partner_staff`, `vehicles`, `partner_documents`, `partner_agreements`; profile columns `partner_type`, `partner_status`, `commission_pct`, `legal_name`, `business_registration_no`, `payout_method`, `payout_details`, `submitted_at`, `verified_at`, `verification_note`; private bucket `partner-kyc`.

- [ ] **Step 1: Write the migration**

`supabase/migration-v15-partner-onboarding.sql`:
```sql
-- migration-v15: paragliding / taxi / trek partner onboarding
-- Partners never write these tables directly: every write goes through
-- /api/partner/* (service role) so files, formats and state changes are
-- checked on the server. The browser may only READ its own rows.

-- 1. Partner columns on profiles ---------------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS partner_type TEXT CHECK (partner_type IN ('hotel','paragliding','taxi','trek')),
  ADD COLUMN IF NOT EXISTS partner_status TEXT CHECK (partner_status IN
    ('onboarding','pending_verification','verified','changes_requested','suspended','rejected')),
  ADD COLUMN IF NOT EXISTS commission_pct NUMERIC(5,2) NOT NULL DEFAULT 20 CHECK (commission_pct BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS legal_name TEXT,
  ADD COLUMN IF NOT EXISTS business_registration_no TEXT,
  ADD COLUMN IF NOT EXISTS payout_method TEXT CHECK (payout_method IN ('bank','upi')),
  ADD COLUMN IF NOT EXISTS payout_details JSONB,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_note TEXT;

-- Existing partners are hotel owners; they keep the listing-review flow.
UPDATE profiles SET partner_type = 'hotel' WHERE role = 'partner' AND partner_type IS NULL;

-- 2. Sign-up: carry the chosen partner type; activity partners start onboarding.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  r TEXT := CASE WHEN NEW.raw_user_meta_data->>'role' IN ('user','partner') THEN NEW.raw_user_meta_data->>'role' ELSE 'partner' END;
  t TEXT := CASE WHEN NEW.raw_user_meta_data->>'partner_type' IN ('hotel','paragliding','taxi','trek') THEN NEW.raw_user_meta_data->>'partner_type' ELSE 'hotel' END;
BEGIN
  INSERT INTO profiles (id, email, role, full_name, phone, business_name, partner_type, partner_status)
  VALUES (
    NEW.id, NEW.email, r,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'business_name', ''),
    CASE WHEN r = 'partner' THEN t END,
    CASE WHEN r = 'partner' AND t <> 'hotel' THEN 'onboarding' END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Only admins / server code may change verification and money fields.
CREATE OR REPLACE FUNCTION protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  IF is_trusted_caller() OR is_admin() THEN RETURN NEW; END IF;
  IF NEW.role IS DISTINCT FROM OLD.role THEN RAISE EXCEPTION 'Only an admin can change account roles'; END IF;
  IF NEW.partner_type IS DISTINCT FROM OLD.partner_type
     OR NEW.partner_status IS DISTINCT FROM OLD.partner_status
     OR NEW.commission_pct IS DISTINCT FROM OLD.commission_pct
     OR NEW.legal_name IS DISTINCT FROM OLD.legal_name
     OR NEW.payout_method IS DISTINCT FROM OLD.payout_method
     OR NEW.payout_details IS DISTINCT FROM OLD.payout_details
     OR NEW.pan_number IS DISTINCT FROM OLD.pan_number
     OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
     OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
     OR NEW.verification_note IS DISTINCT FROM OLD.verification_note THEN
    RAISE EXCEPTION 'These partner details can only be changed through the partner portal';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Staff (drivers, pilots, guides) and vehicles ----------------------------
CREATE TABLE IF NOT EXISTS partner_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('driver','pilot','guide')),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  licence_no TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_partner_staff_partner ON partner_staff(partner_id);

CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('sedan','suv','innova','tempo','bus')),
  make_model TEXT NOT NULL,
  registration_no TEXT NOT NULL UNIQUE,
  seats INT NOT NULL CHECK (seats BETWEEN 1 AND 60),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vehicles_partner ON vehicles(partner_id);

-- 5. KYC documents -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS partner_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('aadhaar_front','aadhaar_back','pan','tourism_registration',
    'driving_licence','pilot_licence','vehicle_rc','vehicle_permit','vehicle_insurance','other')),
  staff_id UUID REFERENCES partner_staff(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT,
  mime_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  rejection_reason TEXT,
  expires_on DATE,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_partner_documents_partner ON partner_documents(partner_id);

-- 6. Signed agreements (append-only) -------------------------------------------
CREATE TABLE IF NOT EXISTS partner_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  body_text TEXT NOT NULL,
  body_sha256 TEXT NOT NULL,
  signed_name TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip TEXT,
  user_agent TEXT,
  pdf_path TEXT,
  UNIQUE (partner_id, version)
);

-- 7. RLS: partners read their own rows; admins everything; no client writes.
ALTER TABLE partner_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Partner reads own staff" ON partner_staff;
CREATE POLICY "Partner reads own staff" ON partner_staff FOR SELECT USING (partner_id = auth.uid());
DROP POLICY IF EXISTS "Admin full access staff" ON partner_staff;
CREATE POLICY "Admin full access staff" ON partner_staff FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Partner reads own vehicles" ON vehicles;
CREATE POLICY "Partner reads own vehicles" ON vehicles FOR SELECT USING (partner_id = auth.uid());
DROP POLICY IF EXISTS "Admin full access vehicles" ON vehicles;
CREATE POLICY "Admin full access vehicles" ON vehicles FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Partner reads own documents" ON partner_documents;
CREATE POLICY "Partner reads own documents" ON partner_documents FOR SELECT USING (partner_id = auth.uid());
DROP POLICY IF EXISTS "Admin full access documents" ON partner_documents;
CREATE POLICY "Admin full access documents" ON partner_documents FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Partner reads own agreements" ON partner_agreements;
CREATE POLICY "Partner reads own agreements" ON partner_agreements FOR SELECT USING (partner_id = auth.uid());
DROP POLICY IF EXISTS "Admin reads agreements" ON partner_agreements;
CREATE POLICY "Admin reads agreements" ON partner_agreements FOR SELECT USING (is_admin());

-- 8. Private KYC bucket. No storage.objects policies on purpose: only the
--    service role (our API) can read or write; people get 5-minute signed URLs.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('partner-kyc', 'partner-kyc', false, 8388608, ARRAY['image/jpeg','image/png','application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 8388608,
  allowed_mime_types = ARRAY['image/jpeg','image/png','application/pdf'];
```

- [ ] **Step 2: Run it** in the Supabase SQL editor. Expected: success.

- [ ] **Step 3: Verify isolation (Review Focus: partner A vs partner B)**

In the SQL editor, with two real test partner ids A and B and one document row inserted for B via SQL:
```sql
INSERT INTO partner_documents (partner_id, doc_type, storage_path) VALUES ('<B>', 'pan', 'test/x.pdf');
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','<A>','role','authenticated')::text, true);
SELECT count(*) FROM partner_documents;   -- expected 0
SELECT set_config('request.jwt.claims', json_build_object('sub','<B>','role','authenticated')::text, true);
SELECT count(*) FROM partner_documents;   -- expected 1
RESET role;
DELETE FROM partner_documents WHERE storage_path = 'test/x.pdf';
```
Run the block inside `BEGIN; ... ROLLBACK;` if the editor requires it for `SET LOCAL`. Also confirm `SELECT public FROM storage.buckets WHERE id = 'partner-kyc'` returns `false`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migration-v15-partner-onboarding.sql
git commit -m "Add partner onboarding schema: staff, vehicles, KYC documents, agreements"
```

---

### Task 8: Onboarding requirements logic

**Files:**
- Create: `lib/partners/requirements.ts`, `tests/partners/requirements.test.ts`

**Interfaces:**
- Consumes: `ActivityPartnerType`, `DocType`, `DOC_LABELS` (Task 6)
- Produces:
  - `type OnboardingInput = { partner_type: ActivityPartnerType; legal_name: string | null; phone: string | null; pan_number: string | null; payout_method: 'bank' | 'upi' | null; payout_details: Record<string, string> | null; documents: { doc_type: DocType; status: string; staff_id: string | null; vehicle_id: string | null; created_at: string }[]; staff: { id: string; role: string; full_name: string; active: boolean }[]; vehicles: { id: string; registration_no: string; active: boolean }[]; agreementSigned: boolean }`
  - `type Missing = { key: string; label: string }`
  - `missingItems(s: OnboardingInput): Missing[]` (includes `{ key: 'agreement' }` last when unsigned)
  - `readyToSign(s: OnboardingInput): boolean` (nothing missing except the agreement)
  - `latestDocs<T extends { doc_type: string; staff_id: string | null; vehicle_id: string | null; created_at: string }>(docs: T[]): T[]`

- [ ] **Step 1: Failing tests**

`tests/partners/requirements.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { missingItems, readyToSign, latestDocs, type OnboardingInput } from '@/lib/partners/requirements';

const doc = (doc_type: any, extra: Partial<{ status: string; staff_id: string; vehicle_id: string; created_at: string }> = {}) =>
  ({ doc_type, status: 'pending', staff_id: null, vehicle_id: null, created_at: '2026-10-09T10:00:00Z', ...extra });

const base = (over: Partial<OnboardingInput> = {}): OnboardingInput => ({
  partner_type: 'trek', legal_name: 'Ravi Kumar', phone: '9816000000', pan_number: 'ABCDE1234F',
  payout_method: 'upi', payout_details: { upi_id: 'ravi@okhdfcbank', account_holder: 'Ravi Kumar' },
  documents: [doc('aadhaar_front'), doc('aadhaar_back'), doc('pan'), doc('tourism_registration')],
  staff: [], vehicles: [], agreementSigned: false, ...over,
});
const keys = (s: OnboardingInput) => missingItems(s).map((m) => m.key);

describe('missingItems', () => {
  it('a complete trek agency only needs to sign', () => {
    expect(keys(base())).toEqual(['agreement']);
    expect(readyToSign(base())).toBe(true);
  });
  it('lists missing business, payout and documents', () => {
    const k = keys(base({ legal_name: '', payout_method: null, pan_number: null, documents: [] }));
    expect(k).toEqual(expect.arrayContaining(['legal_name', 'pan_number', 'payout', 'doc:aadhaar_front', 'doc:aadhaar_back', 'doc:pan', 'doc:tourism_registration']));
    expect(readyToSign(base({ documents: [] }))).toBe(false);
  });
  it('rejected document counts as missing until re-uploaded', () => {
    const rejected = base({ documents: [doc('aadhaar_front', { status: 'rejected' }), doc('aadhaar_back'), doc('pan'), doc('tourism_registration')] });
    expect(keys(rejected)).toContain('doc:aadhaar_front');
    const reuploaded = base({ documents: [...rejected.documents, doc('aadhaar_front', { created_at: '2026-10-10T10:00:00Z' })] });
    expect(keys(reuploaded)).not.toContain('doc:aadhaar_front');
  });
  it('taxi needs a vehicle with RC, permit, insurance and a driver with licence', () => {
    const t = base({ partner_type: 'taxi', documents: [doc('aadhaar_front'), doc('aadhaar_back'), doc('pan')] });
    expect(keys(t)).toEqual(expect.arrayContaining(['vehicle', 'driver']));
    expect(keys(t)).not.toContain('doc:tourism_registration');
    const withFleet = base({
      partner_type: 'taxi',
      vehicles: [{ id: 'v1', registration_no: 'HP39A1234', active: true }],
      staff: [{ id: 's1', role: 'driver', full_name: 'Sonu', active: true }],
      documents: [doc('aadhaar_front'), doc('aadhaar_back'), doc('pan'), doc('vehicle_rc', { vehicle_id: 'v1' }), doc('driving_licence', { staff_id: 's1' })],
    });
    expect(keys(withFleet)).toEqual(['vehicle_doc:v1:vehicle_permit', 'vehicle_doc:v1:vehicle_insurance', 'agreement']);
  });
  it('paragliding needs registration and a pilot with licence', () => {
    const p = base({ partner_type: 'paragliding', staff: [{ id: 'p1', role: 'pilot', full_name: 'Amit', active: true }] });
    expect(keys(p)).toEqual(['staff_doc:p1:pilot_licence', 'agreement']);
  });
  it('signed agreement removes the agreement item', () => {
    expect(keys(base({ agreementSigned: true }))).toEqual([]);
  });
});

describe('latestDocs', () => {
  it('keeps only the newest document per slot', () => {
    const out = latestDocs([doc('pan', { created_at: '2026-01-01T00:00:00Z' }), doc('pan', { created_at: '2026-02-01T00:00:00Z' })]);
    expect(out).toHaveLength(1);
    expect(out[0].created_at).toBe('2026-02-01T00:00:00Z');
  });
});
```

- [ ] **Step 2: Run, expect failure** — `npm test -- tests/partners/requirements.test.ts`.

- [ ] **Step 3: Implement**

`lib/partners/requirements.ts`:
```ts
import { DOC_LABELS, type ActivityPartnerType, type DocType } from './types';

export type OnboardingInput = {
  partner_type: ActivityPartnerType;
  legal_name: string | null;
  phone: string | null;
  pan_number: string | null;
  payout_method: 'bank' | 'upi' | null;
  payout_details: Record<string, string> | null;
  documents: { doc_type: DocType; status: string; staff_id: string | null; vehicle_id: string | null; created_at: string }[];
  staff: { id: string; role: string; full_name: string; active: boolean }[];
  vehicles: { id: string; registration_no: string; active: boolean }[];
  agreementSigned: boolean;
};
export type Missing = { key: string; label: string };

const slot = (d: { doc_type: string; staff_id: string | null; vehicle_id: string | null }) => `${d.doc_type}|${d.staff_id || ''}|${d.vehicle_id || ''}`;

/** Newest document for each (type, staff, vehicle) slot. */
export function latestDocs<T extends { doc_type: string; staff_id: string | null; vehicle_id: string | null; created_at: string }>(docs: T[]): T[] {
  const best = new Map<string, T>();
  for (const d of docs) {
    const cur = best.get(slot(d));
    if (!cur || d.created_at > cur.created_at) best.set(slot(d), d);
  }
  return Array.from(best.values());
}

const PARTNER_DOCS: Record<ActivityPartnerType, DocType[]> = {
  taxi: ['aadhaar_front', 'aadhaar_back', 'pan'],
  paragliding: ['aadhaar_front', 'aadhaar_back', 'pan', 'tourism_registration'],
  trek: ['aadhaar_front', 'aadhaar_back', 'pan', 'tourism_registration'],
};
const VEHICLE_DOCS: DocType[] = ['vehicle_rc', 'vehicle_permit', 'vehicle_insurance'];

function payoutComplete(method: string | null, d: Record<string, string> | null): boolean {
  if (!d || !d.account_holder) return false;
  if (method === 'upi') return !!d.upi_id;
  if (method === 'bank') return !!d.account_number && !!d.ifsc;
  return false;
}

export function missingItems(s: OnboardingInput): Missing[] {
  const out: Missing[] = [];
  const docs = latestDocs(s.documents).filter((d) => d.status !== 'rejected');
  const has = (t: DocType, by: { staff_id?: string; vehicle_id?: string } = {}) =>
    docs.some((d) => d.doc_type === t && (d.staff_id || undefined) === by.staff_id && (d.vehicle_id || undefined) === by.vehicle_id);

  if (!s.legal_name?.trim()) out.push({ key: 'legal_name', label: 'Your full legal name' });
  if (!s.phone?.trim()) out.push({ key: 'phone', label: 'Phone number' });
  if (!s.pan_number?.trim()) out.push({ key: 'pan_number', label: 'PAN number' });
  if (!payoutComplete(s.payout_method, s.payout_details)) out.push({ key: 'payout', label: 'Bank or UPI details for payouts' });

  for (const t of PARTNER_DOCS[s.partner_type]) if (!has(t)) out.push({ key: `doc:${t}`, label: DOC_LABELS[t] });

  if (s.partner_type === 'taxi') {
    const vehicles = s.vehicles.filter((v) => v.active);
    if (!vehicles.length) out.push({ key: 'vehicle', label: 'At least one vehicle' });
    for (const v of vehicles) for (const t of VEHICLE_DOCS) {
      if (!has(t, { vehicle_id: v.id })) out.push({ key: `vehicle_doc:${v.id}:${t}`, label: `${DOC_LABELS[t]} for ${v.registration_no}` });
    }
  }
  const needRole = s.partner_type === 'taxi' ? 'driver' : s.partner_type === 'paragliding' ? 'pilot' : null;
  if (needRole) {
    const licence: DocType = needRole === 'driver' ? 'driving_licence' : 'pilot_licence';
    const people = s.staff.filter((p) => p.active && p.role === needRole);
    if (!people.length) out.push({ key: needRole, label: needRole === 'driver' ? 'At least one driver' : 'At least one pilot' });
    for (const p of people) if (!has(licence, { staff_id: p.id })) out.push({ key: `staff_doc:${p.id}:${licence}`, label: `${DOC_LABELS[licence]} for ${p.full_name}` });
  }
  if (!s.agreementSigned) out.push({ key: 'agreement', label: 'Sign the partner agreement' });
  return out;
}

export function readyToSign(s: OnboardingInput): boolean {
  return missingItems(s).every((m) => m.key === 'agreement');
}
```

- [ ] **Step 4: Run tests** → all pass.

- [ ] **Step 5: Commit**

```bash
git add lib/partners/requirements.ts tests/partners/requirements.test.ts
git commit -m "Add partner onboarding checklist logic"
```

---

### Task 9: Partner onboarding APIs (state, profile, documents, staff, vehicles)

**Files:**
- Create: `lib/partners/load.ts`, `app/api/partner/onboarding/route.ts`, `app/api/partner/profile/route.ts`, `app/api/partner/documents/route.ts`, `app/api/partner/documents/[id]/route.ts`, `app/api/partner/staff/route.ts`, `app/api/partner/staff/[id]/route.ts`, `app/api/partner/vehicles/route.ts`, `app/api/partner/vehicles/[id]/route.ts`, `tests/partners/guards.test.ts`

**Interfaces:**
- Consumes: `requireCaller`, `serviceClient`, `HttpError`, `jsonError` (Task 3); validators and types (Task 6); `missingItems`, `readyToSign`, `latestDocs`, `OnboardingInput` (Task 8)
- Produces:
  - `KYC_BUCKET = 'partner-kyc'`
  - `loadOnboarding(partnerId: string): Promise<OnboardingState>` where `OnboardingState = { profile; documents: (row & { url: string | null })[]; staff; vehicles; agreements; missing: Missing[]; readyToSign: boolean }`
  - `requireActivityPartner(req: Request, opts?: { editable?: boolean }): Promise<Caller>` (403 if not an activity partner; 409 if `editable` and status not in `EDITABLE_STATUSES`)
  - `assertEditable(status: string | null): void` (throws `HttpError(409)`)
  - HTTP: `GET /api/partner/onboarding` → `OnboardingState`; `PATCH /api/partner/profile`; `POST /api/partner/documents` (multipart: `file`, `doc_type`, `staff_id?`, `vehicle_id?`, `expires_on?`); `DELETE /api/partner/documents/:id`; `POST /api/partner/staff` `{ role, full_name, phone, licence_no? }`; `DELETE /api/partner/staff/:id`; `POST /api/partner/vehicles` `{ vehicle_type, make_model, registration_no, seats }`; `DELETE /api/partner/vehicles/:id`

- [ ] **Step 1: Failing test for the guard**

`tests/partners/guards.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { assertEditable } from '@/lib/partners/load';
import { HttpError } from '@/lib/server-auth';

describe('assertEditable', () => {
  it('allows onboarding and changes_requested', () => {
    expect(() => assertEditable('onboarding')).not.toThrow();
    expect(() => assertEditable('changes_requested')).not.toThrow();
  });
  it('blocks edits while under review or after verification', () => {
    for (const s of ['pending_verification', 'verified', 'suspended', 'rejected', null]) {
      try { assertEditable(s); throw new Error('no throw'); }
      catch (e) { expect(e).toBeInstanceOf(HttpError); expect((e as HttpError).status).toBe(409); }
    }
  });
});
```
Run: `npm test -- tests/partners/guards.test.ts` → FAIL.

- [ ] **Step 2: Implement the loader and guards**

`lib/partners/load.ts`:
```ts
import { HttpError, requireCaller, serviceClient, type Caller } from '@/lib/server-auth';
import { ACTIVITY_PARTNER_TYPES, EDITABLE_STATUSES, type ActivityPartnerType, type PartnerStatus } from './types';
import { latestDocs, missingItems, readyToSign, type OnboardingInput } from './requirements';

export const KYC_BUCKET = 'partner-kyc';
const SIGNED_URL_SECONDS = 300;

export function assertEditable(status: string | null): void {
  if (!status || !EDITABLE_STATUSES.includes(status as PartnerStatus)) {
    throw new HttpError(409, 'Your details are being reviewed or are already approved, so they cannot be changed now. Contact us if something is wrong.');
  }
}

export async function requireActivityPartner(req: Request, opts: { editable?: boolean } = {}): Promise<Caller> {
  const caller = await requireCaller(req, ['partner']);
  if (!ACTIVITY_PARTNER_TYPES.includes(caller.profile.partner_type)) throw new HttpError(403, 'This page is for paragliding, taxi and trek partners');
  if (opts.editable) assertEditable(caller.profile.partner_status);
  return caller;
}

export async function signedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await serviceClient().storage.from(KYC_BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
  return data?.signedUrl || null;
}

export async function loadOnboarding(partnerId: string) {
  const sb = serviceClient();
  const [{ data: profile }, { data: documents }, { data: staff }, { data: vehicles }, { data: agreements }] = await Promise.all([
    sb.from('profiles').select('id, email, full_name, phone, business_name, legal_name, pan_number, business_registration_no, partner_type, partner_status, commission_pct, payout_method, payout_details, submitted_at, verified_at, verification_note, created_at').eq('id', partnerId).single(),
    sb.from('partner_documents').select('*').eq('partner_id', partnerId).order('created_at', { ascending: false }),
    sb.from('partner_staff').select('*').eq('partner_id', partnerId).order('created_at'),
    sb.from('vehicles').select('*').eq('partner_id', partnerId).order('created_at'),
    sb.from('partner_agreements').select('id, version, body_sha256, signed_name, signed_at, ip, pdf_path').eq('partner_id', partnerId).order('signed_at', { ascending: false }),
  ]);
  if (!profile) throw new HttpError(404, 'Partner not found');

  const input: OnboardingInput = {
    partner_type: profile.partner_type as ActivityPartnerType,
    legal_name: profile.legal_name, phone: profile.phone, pan_number: profile.pan_number,
    payout_method: profile.payout_method, payout_details: profile.payout_details,
    documents: documents || [], staff: staff || [], vehicles: vehicles || [],
    agreementSigned: (agreements || []).length > 0,
  };
  const current = latestDocs(documents || []);
  const docsWithUrls = await Promise.all(current.map(async (d: any) => ({ ...d, url: await signedUrl(d.storage_path) })));
  const agreementsWithUrls = await Promise.all((agreements || []).map(async (a: any) => ({ ...a, url: await signedUrl(a.pdf_path) })));
  return {
    profile, documents: docsWithUrls, staff: staff || [], vehicles: vehicles || [], agreements: agreementsWithUrls,
    missing: missingItems(input), readyToSign: readyToSign(input),
  };
}
```
Run the guard test → PASS.

- [ ] **Step 3: GET onboarding state**

`app/api/partner/onboarding/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/server-auth';
import { loadOnboarding, requireActivityPartner } from '@/lib/partners/load';
import { agreementFor } from '@/lib/partners/agreement';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { profile } = await requireActivityPartner(req);
    const state = await loadOnboarding(profile.id);
    return NextResponse.json({ ...state, agreement: agreementFor(profile.partner_type) });
  } catch (e) { return jsonError(e); }
}
```
(`agreementFor` is created in Task 10; implement Task 10 Step 3 before running this route, or temporarily omit the `agreement` field.)

- [ ] **Step 4: PATCH profile and payout**

`app/api/partner/profile/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, serviceClient } from '@/lib/server-auth';
import { requireActivityPartner } from '@/lib/partners/load';
import { isAccountNumber, isIfsc, isPan, isUpi } from '@/lib/partners/validate';

const schema = z.object({
  legal_name: z.string().trim().min(2).max(200),
  business_name: z.string().trim().max(300).optional().default(''),
  phone: z.string().trim().min(10).max(20),
  pan_number: z.string().trim().toUpperCase(),
  business_registration_no: z.string().trim().max(100).optional().default(''),
  payout_method: z.enum(['bank', 'upi']),
  account_holder: z.string().trim().min(2).max(200),
  account_number: z.string().trim().optional().default(''),
  ifsc: z.string().trim().toUpperCase().optional().default(''),
  upi_id: z.string().trim().optional().default(''),
});

export async function PATCH(req: Request) {
  try {
    const { profile } = await requireActivityPartner(req, { editable: true });
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new HttpError(400, 'Please fill in every required field.');
    const d = parsed.data;
    if (!isPan(d.pan_number)) throw new HttpError(400, 'PAN should look like ABCDE1234F.');
    if (d.payout_method === 'bank' && (!isAccountNumber(d.account_number) || !isIfsc(d.ifsc))) {
      throw new HttpError(400, 'Check the bank account number (9–18 digits) and IFSC (like SBIN0001234).');
    }
    if (d.payout_method === 'upi' && !isUpi(d.upi_id)) throw new HttpError(400, 'UPI ID should look like name@bank.');

    const payout_details = d.payout_method === 'bank'
      ? { account_holder: d.account_holder, account_number: d.account_number, ifsc: d.ifsc }
      : { account_holder: d.account_holder, upi_id: d.upi_id };
    const { error } = await serviceClient().from('profiles').update({
      legal_name: d.legal_name, business_name: d.business_name, phone: d.phone, pan_number: d.pan_number,
      business_registration_no: d.business_registration_no || null, payout_method: d.payout_method, payout_details,
      updated_at: new Date().toISOString(),
    }).eq('id', profile.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) { return jsonError(e); }
}
```

- [ ] **Step 5: Document upload and delete**

`app/api/partner/documents/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { HttpError, jsonError, serviceClient } from '@/lib/server-auth';
import { KYC_BUCKET, requireActivityPartner } from '@/lib/partners/load';
import { DOC_TYPES, docTarget, type DocType } from '@/lib/partners/types';
import { checkUpload } from '@/lib/partners/validate';

export const runtime = 'nodejs';
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'application/pdf': 'pdf' };

export async function POST(req: Request) {
  try {
    const { profile } = await requireActivityPartner(req, { editable: true });
    const form = await req.formData();
    const file = form.get('file');
    const docType = String(form.get('doc_type') || '') as DocType;
    const staffId = (form.get('staff_id') as string) || null;
    const vehicleId = (form.get('vehicle_id') as string) || null;
    const expiresOn = (form.get('expires_on') as string) || null;

    if (!(file instanceof File)) throw new HttpError(400, 'Choose a file to upload.');
    if (!DOC_TYPES.includes(docType)) throw new HttpError(400, 'Unknown document type.');
    const problem = checkUpload({ type: file.type, size: file.size });
    if (problem) throw new HttpError(400, problem);
    if (expiresOn && !/^\d{4}-\d{2}-\d{2}$/.test(expiresOn)) throw new HttpError(400, 'Expiry date is not valid.');

    const sb = serviceClient();
    const target = docTarget(docType);
    if (target === 'staff') {
      if (!staffId) throw new HttpError(400, 'Choose which person this licence belongs to.');
      const { data: s } = await sb.from('partner_staff').select('id').eq('id', staffId).eq('partner_id', profile.id).single();
      if (!s) throw new HttpError(404, 'Person not found.');
    }
    if (target === 'vehicle') {
      if (!vehicleId) throw new HttpError(400, 'Choose which vehicle this document is for.');
      const { data: v } = await sb.from('vehicles').select('id').eq('id', vehicleId).eq('partner_id', profile.id).single();
      if (!v) throw new HttpError(404, 'Vehicle not found.');
    }
    const sId = target === 'staff' ? staffId : null;
    const vId = target === 'vehicle' ? vehicleId : null;

    // Replace any earlier upload in the same slot that is not yet approved.
    let prevQuery = sb.from('partner_documents').select('id, storage_path, status').eq('partner_id', profile.id).eq('doc_type', docType);
    prevQuery = sId ? prevQuery.eq('staff_id', sId) : prevQuery.is('staff_id', null);
    prevQuery = vId ? prevQuery.eq('vehicle_id', vId) : prevQuery.is('vehicle_id', null);
    const { data: prev } = await prevQuery;
    const replaceable = (prev || []).filter((p: any) => p.status !== 'approved');

    const path = `${profile.id}/${docType}-${crypto.randomUUID()}.${EXT[file.type]}`;
    const { error: upErr } = await sb.storage.from(KYC_BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
    if (upErr) throw upErr;

    const { data: row, error } = await sb.from('partner_documents').insert({
      partner_id: profile.id, doc_type: docType, staff_id: sId, vehicle_id: vId, storage_path: path,
      file_name: file.name.slice(0, 200), mime_type: file.type, expires_on: expiresOn,
    }).select('id').single();
    if (error) { await sb.storage.from(KYC_BUCKET).remove([path]); throw error; }

    if (replaceable.length) {
      await sb.storage.from(KYC_BUCKET).remove(replaceable.map((p: any) => p.storage_path));
      await sb.from('partner_documents').delete().in('id', replaceable.map((p: any) => p.id));
    }
    return NextResponse.json({ ok: true, id: row.id });
  } catch (e) { return jsonError(e); }
}
```

`app/api/partner/documents/[id]/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { HttpError, jsonError, serviceClient } from '@/lib/server-auth';
import { KYC_BUCKET, requireActivityPartner } from '@/lib/partners/load';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { profile } = await requireActivityPartner(req, { editable: true });
    const sb = serviceClient();
    const { data: d } = await sb.from('partner_documents').select('id, storage_path, status').eq('id', params.id).eq('partner_id', profile.id).single();
    if (!d) throw new HttpError(404, 'Document not found.');
    if (d.status === 'approved') throw new HttpError(409, 'Approved documents cannot be removed.');
    await sb.storage.from(KYC_BUCKET).remove([d.storage_path]);
    await sb.from('partner_documents').delete().eq('id', d.id);
    return NextResponse.json({ ok: true });
  } catch (e) { return jsonError(e); }
}
```

- [ ] **Step 6: Staff and vehicles**

`app/api/partner/staff/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, serviceClient } from '@/lib/server-auth';
import { requireActivityPartner } from '@/lib/partners/load';

const schema = z.object({
  role: z.enum(['driver', 'pilot', 'guide']),
  full_name: z.string().trim().min(2).max(200),
  phone: z.string().trim().min(10).max(20),
  licence_no: z.string().trim().max(100).optional().default(''),
});
const ALLOWED: Record<string, string[]> = { taxi: ['driver'], paragliding: ['pilot'], trek: ['guide'] };

export async function POST(req: Request) {
  try {
    const { profile } = await requireActivityPartner(req, { editable: true });
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new HttpError(400, 'Name and a 10-digit phone number are required.');
    if (!ALLOWED[profile.partner_type].includes(parsed.data.role)) throw new HttpError(400, 'This kind of team member does not fit your account type.');
    const { data, error } = await serviceClient().from('partner_staff')
      .insert({ ...parsed.data, licence_no: parsed.data.licence_no || null, partner_id: profile.id }).select('id').single();
    if (error) throw error;
    return NextResponse.json({ ok: true, id: data.id });
  } catch (e) { return jsonError(e); }
}
```

`app/api/partner/staff/[id]/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { HttpError, jsonError, serviceClient } from '@/lib/server-auth';
import { KYC_BUCKET, requireActivityPartner } from '@/lib/partners/load';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { profile } = await requireActivityPartner(req, { editable: true });
    const sb = serviceClient();
    const { data: s } = await sb.from('partner_staff').select('id').eq('id', params.id).eq('partner_id', profile.id).single();
    if (!s) throw new HttpError(404, 'Person not found.');
    const { data: docs } = await sb.from('partner_documents').select('storage_path').eq('staff_id', s.id);
    if (docs?.length) await sb.storage.from(KYC_BUCKET).remove(docs.map((d: any) => d.storage_path));
    await sb.from('partner_staff').delete().eq('id', s.id); // documents cascade
    return NextResponse.json({ ok: true });
  } catch (e) { return jsonError(e); }
}
```

`app/api/partner/vehicles/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, serviceClient } from '@/lib/server-auth';
import { requireActivityPartner } from '@/lib/partners/load';
import { normalizeVehicleReg } from '@/lib/partners/validate';

const schema = z.object({
  vehicle_type: z.enum(['sedan', 'suv', 'innova', 'tempo', 'bus']),
  make_model: z.string().trim().min(2).max(100),
  registration_no: z.string(),
  seats: z.number().int().min(1).max(60),
});

export async function POST(req: Request) {
  try {
    const { profile } = await requireActivityPartner(req, { editable: true });
    if (profile.partner_type !== 'taxi') throw new HttpError(403, 'Only taxi partners add vehicles.');
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new HttpError(400, 'Fill in vehicle type, model, number and seats.');
    const reg = normalizeVehicleReg(parsed.data.registration_no);
    if (!reg) throw new HttpError(400, 'Vehicle number should look like HP39A1234.');
    const { data, error } = await serviceClient().from('vehicles')
      .insert({ ...parsed.data, registration_no: reg, partner_id: profile.id }).select('id').single();
    if (error?.code === '23505') throw new HttpError(409, 'This vehicle number is already registered with us.');
    if (error) throw error;
    return NextResponse.json({ ok: true, id: data.id });
  } catch (e) { return jsonError(e); }
}
```

`app/api/partner/vehicles/[id]/route.ts`: identical to `staff/[id]/route.ts` but with table `vehicles`, column `vehicle_id`, and message `'Vehicle not found.'`:
```ts
import { NextResponse } from 'next/server';
import { HttpError, jsonError, serviceClient } from '@/lib/server-auth';
import { KYC_BUCKET, requireActivityPartner } from '@/lib/partners/load';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { profile } = await requireActivityPartner(req, { editable: true });
    const sb = serviceClient();
    const { data: v } = await sb.from('vehicles').select('id').eq('id', params.id).eq('partner_id', profile.id).single();
    if (!v) throw new HttpError(404, 'Vehicle not found.');
    const { data: docs } = await sb.from('partner_documents').select('storage_path').eq('vehicle_id', v.id);
    if (docs?.length) await sb.storage.from(KYC_BUCKET).remove(docs.map((d: any) => d.storage_path));
    await sb.from('vehicles').delete().eq('id', v.id);
    return NextResponse.json({ ok: true });
  } catch (e) { return jsonError(e); }
}
```

- [ ] **Step 7: Typecheck and tests** — `npx tsc --noEmit && npm test` (if Task 10 is not yet done, `onboarding/route.ts` will fail to compile; do Task 10 Step 3 first or comment the import until then).

- [ ] **Step 8: Manual ownership check (Review Focus)**

With two test taxi partner accounts A and B: as B upload a document, note its id. As A (copy A's access token from the browser devtools `localStorage` Supabase session), run
`curl -s -X DELETE http://localhost:3000/api/partner/documents/<B_DOC_ID> -H "Authorization: Bearer <A_TOKEN>"`
Expected: `{"error":"Document not found."}` with status 404, and B's document still exists.

- [ ] **Step 9: Commit**

```bash
git add lib/partners/load.ts tests/partners/guards.test.ts app/api/partner/onboarding app/api/partner/profile app/api/partner/documents app/api/partner/staff app/api/partner/vehicles
git commit -m "Add partner onboarding APIs for details, KYC uploads, drivers, pilots and vehicles"
```

---

### Task 10: Partner agreement text, PDF and signing

**Files:**
- Create: `lib/partners/agreement.ts`, `lib/partners/agreement-pdf.ts`, `lib/partners/emails.ts`, `app/api/partner/agreement/route.ts`, `tests/partners/agreement.test.ts`
- Modify: `lib/email.ts` (export `sendEmail`)

**Interfaces:**
- Consumes: `loadOnboarding`, `requireActivityPartner`, `KYC_BUCKET` (Task 9); `namesMatch` (Task 6)
- Produces:
  - `AGREEMENT_VERSION = '2026-10-v1'`
  - `agreementFor(type: ActivityPartnerType): { version: string; title: string; body: string }`
  - `sha256Hex(text: string): string`
  - `toPdfSafe(text: string): string`
  - `renderAgreementPdf(a: { title: string; body: string; version: string; signedName: string; signedAt: string; ip: string; email: string; sha256: string }): Promise<Uint8Array>`
  - `sendEmail(msg: { to: string | string[]; subject: string; html: string; attachments?: { filename: string; content: Buffer }[] }): Promise<void>` in `lib/email.ts`
  - `lib/partners/emails.ts`: `emailAgreementCopy(to: string, name: string, pdf: Uint8Array, version: string)`, `emailAdminPartnerSubmitted(p: { id: string; legal_name: string; partner_type: string; email: string; phone: string })`, `emailPartnerDecision(to: string, name: string, decision: 'verified' | 'changes_requested' | 'rejected' | 'suspended', note?: string)`
  - HTTP: `POST /api/partner/agreement` `{ signed_name: string, accepted: true }`

- [ ] **Step 1: Install pdf-lib** — `npm install pdf-lib@1.17.1`

- [ ] **Step 2: Failing tests**

`tests/partners/agreement.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { agreementFor, sha256Hex, AGREEMENT_VERSION } from '@/lib/partners/agreement';
import { renderAgreementPdf, toPdfSafe } from '@/lib/partners/agreement-pdf';

describe('agreement text', () => {
  it('states the 20% commission on online and cash bookings', () => {
    const a = agreementFor('taxi');
    expect(a.version).toBe(AGREEMENT_VERSION);
    expect(a.body).toMatch(/20%/);
    expect(a.body).toMatch(/cash/i);
    expect(a.body).toMatch(/taxi/i);
  });
  it('is stable for hashing', () => {
    expect(sha256Hex(agreementFor('trek').body)).toBe(sha256Hex(agreementFor('trek').body));
    expect(sha256Hex('a')).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('agreement PDF', () => {
  it('transliterates characters standard PDF fonts cannot draw', () => {
    expect(toPdfSafe('Fee ₹500 — “quoted” • ok नमस्ते')).toBe('Fee Rs.500 - "quoted" - ok ?');
  });
  it('renders a PDF', async () => {
    const a = agreementFor('paragliding');
    const bytes = await renderAgreementPdf({ ...a, signedName: 'Ravi Kumar', signedAt: '2026-10-09T10:00:00Z', ip: '1.2.3.4', email: 'r@example.com', sha256: sha256Hex(a.body) });
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(2000);
  });
});
```
Run → FAIL.

- [ ] **Step 3: Agreement text**

`lib/partners/agreement.ts`:
```ts
import { createHash } from 'node:crypto';
import type { ActivityPartnerType } from './types';

// IMPORTANT: draft text. Have a lawyer review before real partners sign.
// Changing the wording requires a new AGREEMENT_VERSION.
export const AGREEMENT_VERSION = '2026-10-v1';

const SERVICE: Record<ActivityPartnerType, string> = {
  paragliding: 'tandem and other paragliding flights, including pilots, equipment and transport to and from the take-off site where included in a package',
  taxi: 'taxi and cab services, including airport and station transfers, local sightseeing and outstation trips, with the vehicles and drivers registered on the Platform',
  trek: 'guided treks, camping and related travel services, including guides, permits, food and equipment where included in a package',
};

const SAFETY: Record<ActivityPartnerType, string> = {
  paragliding: 'Every flight is flown by a pilot holding a valid licence or certificate, using maintained equipment, from a site and under conditions permitted by the authorities. You hold valid registration with the Himachal Pradesh tourism department and third-party/passenger insurance as required by law, and you will cancel flights when weather is unsafe.',
  taxi: 'Every vehicle is commercially registered with a valid taxi permit, fitness certificate and insurance, and every driver holds a valid driving licence and is fit to drive. You follow traffic laws, do not overload vehicles and do not let drivers work under the influence of alcohol or drugs.',
  trek: 'Every trek is led by competent guides, follows forest department and district rules, carries first aid, and is cancelled or turned back when weather or trail conditions are unsafe. You hold the registrations and permits required to operate treks in Himachal Pradesh.',
};

export function agreementFor(type: ActivityPartnerType) {
  const title = 'Dharamshala Stay Partner Agreement';
  const body = `This Partner Agreement ("Agreement") is between Dharamshala Stay ("Dharamshala Stay", "we", "us"), operator of the website dharamshalastay.com (the "Platform"), and the person or business signing below ("Partner", "you").

1. Services
You will provide ${SERVICE[type]} ("Services") to customers who book through the Platform. You are an independent business. Nothing in this Agreement makes you our employee, agent or partner in law.

2. Verification
You confirm that every document and detail you have given us, including your identity documents (Aadhaar, shown masked, and PAN), licences, registrations, vehicle documents and bank or UPI details, is true, current and belongs to you or your business. You will tell us within 7 days if any of them changes, expires or is cancelled. We may suspend your account while documents are missing or expired.

3. Commission
For every booking made through the Platform, Dharamshala Stay earns a commission of 20% of the booking value (the price paid by the customer, before any payment-gateway fee and excluding any taxes we collect separately), unless we agree a different rate with you in writing. Commission is earned on every booking whether the customer pays online or pays you in cash or by UPI directly.

4. Online payments
When a customer pays online, we receive the full amount. After the Service is completed, we credit 80% of the booking value to your Partner balance. We pay positive balances to your registered bank account or UPI ID every week, normally on Monday, after deducting any commission you owe us. Payment-gateway charges are borne by Dharamshala Stay.

5. Cash and direct payments
When a customer pays you directly (cash, UPI to you, or any other method), you collect the full amount and owe us the 20% commission. The commission is recorded in your Partner balance when the Service is completed. It is first deducted from money we owe you. Any amount still owed must be paid through the Platform within 7 days. If commission stays unpaid for more than 21 days, we may stop sending you new bookings until it is paid, and recover the amount by other lawful means.

6. Bookings taken off the Platform
You will not ask customers who found you through the Platform to cancel and re-book with you directly to avoid commission. A booking arranged with a customer introduced by the Platform within 90 days of their enquiry or booking is treated as a Platform booking.

7. Prices and availability
You set your package prices on the Platform and must honour the price shown at the time of booking. You will keep your availability up to date, accept or decline booking requests promptly, and not charge customers extra amounts that were not shown at booking, except for optional extras the customer clearly agrees to.

8. Safety, licences and insurance
${SAFETY[type]} You are solely responsible for the safety of customers during the Services and for any loss or injury caused by you, your staff, your vehicles or your equipment.

9. Cancellations and refunds
Customers may cancel under the policy shown at the time of booking. If you cancel a confirmed booking or fail to provide the Service, the customer is refunded in full and any amount credited to you for that booking is reversed. Repeated cancellations or no-shows may lead to suspension.

10. Customer data
You will use customer names, phone numbers and other details only to provide the booked Service, keep them confidential, and not use them for marketing or share them with anyone else. You will follow the Digital Personal Data Protection Act, 2023 and other applicable law.

11. Reviews and conduct
Customers may review your Services on the Platform. You will not post fake reviews or pressure customers about reviews. You will treat customers respectfully and will not discriminate against them.

12. Taxes
You are responsible for your own income tax, GST and other taxes on the Services. We will provide statements of bookings, commission and payouts to help you.

13. Liability
Dharamshala Stay provides the booking platform only and is not liable for the Services you provide. You will compensate Dharamshala Stay for any claim, penalty or loss arising from your Services, your breach of this Agreement or your breach of law. Our total liability to you under this Agreement is limited to the commission we earned from your bookings in the 3 months before the claim.

14. Suspension and termination
Either party may end this Agreement with 15 days' written notice by email. We may suspend or end it immediately for fraud, safety risk, false documents, unpaid commission or serious customer complaints. Amounts owed by either party up to the end date remain payable.

15. Changes
We may update this Agreement. We will tell you by email and on the Platform at least 15 days before changes take effect; continuing to accept bookings after that date means you accept the updated Agreement.

16. Law and disputes
This Agreement is governed by the laws of India. The courts at Dharamshala, Himachal Pradesh have exclusive jurisdiction.

17. Electronic signature
By ticking the acceptance box and typing your full name, you sign this Agreement electronically under the Information Technology Act, 2000. We record the date, time, IP address and a fingerprint (SHA-256) of this exact text, and email you a PDF copy.

Agreement version: ${AGREEMENT_VERSION}`;
  return { version: AGREEMENT_VERSION, title, body };
}

export function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}
```

- [ ] **Step 4: PDF renderer**

`lib/partners/agreement-pdf.ts`:
```ts
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/** Standard PDF fonts only cover Latin-1; replace what they cannot draw. */
export function toPdfSafe(text: string): string {
  return text
    .replace(/₹/g, 'Rs.')
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/•/g, '-')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]+/g, '?');
}

export async function renderAgreementPdf(a: { title: string; body: string; version: string; signedName: string; signedAt: string; ip: string; email: string; sha256: string }): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const size = 10, lineGap = 14, margin = 50, width = 595 - margin * 2;
  let page = pdf.addPage([595, 842]);
  let y = 842 - margin;

  const newPage = () => { page = pdf.addPage([595, 842]); y = 842 - margin; };
  const write = (text: string, f = font, s = size) => {
    for (const para of toPdfSafe(text).split('\n')) {
      const words = para.split(' ');
      let line = '';
      const flush = () => { if (y < margin) newPage(); page.drawText(line, { x: margin, y, size: s, font: f, color: rgb(0.1, 0.1, 0.1) }); y -= lineGap; line = ''; };
      for (const w of words) {
        const next = line ? line + ' ' + w : w;
        if (f.widthOfTextAtSize(next, s) > width && line) { flush(); line = w; } else line = next;
      }
      flush();
    }
  };

  write(a.title, bold, 16); y -= 6;
  write(a.body);
  y -= 10;
  write('Signed electronically', bold, 12);
  write(`Name: ${a.signedName}\nEmail: ${a.email}\nDate and time (UTC): ${a.signedAt}\nIP address: ${a.ip}\nAgreement version: ${a.version}\nSHA-256 of agreement text: ${a.sha256}`);
  return pdf.save();
}
```

- [ ] **Step 5: Generic email sender and partner emails**

In `lib/email.ts` add (below `FROM`):
```ts
const ADMIN_TO = process.env.ADMIN_EMAIL || 'hello@dharamshalastay.com';
export const adminEmail = () => ADMIN_TO;

export async function sendEmail(msg: { to: string | string[]; subject: string; html: string; attachments?: { filename: string; content: Buffer }[] }): Promise<void> {
  if (!process.env.RESEND_API_KEY) { console.log('[email skipped: no RESEND_API_KEY]', msg.subject); return; }
  const { error } = await getResend().emails.send({ from: FROM, to: msg.to, subject: msg.subject, html: msg.html, attachments: msg.attachments });
  if (error) console.error('Email failed:', msg.subject, error);
}
```
(If `lib/email.ts` already declares an admin address constant, reuse it instead of adding `ADMIN_TO`.)

`lib/partners/emails.ts`:
```ts
import { sendEmail, adminEmail } from '@/lib/email';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.dharamshalastay.com';
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const wrap = (title: string, inner: string) => `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px"><h2 style="color:#1e3a5f">${title}</h2>${inner}<p style="color:#94a3b8;font-size:12px;margin-top:24px">Dharamshala Stay</p></div>`;

export async function emailAgreementCopy(to: string, name: string, pdf: Uint8Array, version: string) {
  await sendEmail({
    to: [to, adminEmail()],
    subject: `Your signed Dharamshala Stay partner agreement (${version})`,
    html: wrap('Agreement signed', `<p>Hi ${esc(name)},</p><p>Thank you for signing the Dharamshala Stay partner agreement. A PDF copy is attached for your records.</p><p>Our team is now checking your documents. We will email you as soon as your account is approved.</p>`),
    attachments: [{ filename: `dharamshala-stay-partner-agreement-${version}.pdf`, content: Buffer.from(pdf) }],
  });
}

export async function emailAdminPartnerSubmitted(p: { id: string; legal_name: string; partner_type: string; email: string; phone: string }) {
  await sendEmail({
    to: adminEmail(),
    subject: `New ${p.partner_type} partner to verify: ${p.legal_name}`,
    html: wrap('Partner waiting for verification', `<p><b>${esc(p.legal_name)}</b> (${esc(p.partner_type)}) has uploaded documents and signed the agreement.</p><p>${esc(p.email)} · ${esc(p.phone || '')}</p><p><a href="${SITE}/admin/partners/${p.id}">Review documents</a></p>`),
  });
}

const DECISION: Record<string, { subject: string; title: string; text: string }> = {
  verified: { subject: 'Your Dharamshala Stay partner account is approved', title: 'You are approved', text: 'Your documents are verified and your partner account is active. You can now add your packages and start receiving bookings.' },
  changes_requested: { subject: 'Action needed on your Dharamshala Stay partner account', title: 'Some details need fixing', text: 'We could not approve your account yet. Please log in, fix the items below and submit again.' },
  rejected: { subject: 'Your Dharamshala Stay partner application', title: 'Application not approved', text: 'We are unable to approve your partner account.' },
  suspended: { subject: 'Your Dharamshala Stay partner account is suspended', title: 'Account suspended', text: 'Your partner account has been suspended and will not receive new bookings.' },
};

export async function emailPartnerDecision(to: string, name: string, decision: 'verified' | 'changes_requested' | 'rejected' | 'suspended', note?: string) {
  const d = DECISION[decision];
  await sendEmail({
    to,
    subject: d.subject,
    html: wrap(d.title, `<p>Hi ${esc(name)},</p><p>${d.text}</p>${note ? `<p style="background:#f8fafc;padding:12px;border-radius:8px">${esc(note)}</p>` : ''}<p><a href="${SITE}/partner/onboarding">Open your partner account</a></p>`),
  });
}
```

- [ ] **Step 6: Run the agreement tests** — `npm test -- tests/partners/agreement.test.ts` → PASS.

- [ ] **Step 7: Signing endpoint**

`app/api/partner/agreement/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, serviceClient } from '@/lib/server-auth';
import { KYC_BUCKET, loadOnboarding, requireActivityPartner } from '@/lib/partners/load';
import { agreementFor, sha256Hex } from '@/lib/partners/agreement';
import { renderAgreementPdf } from '@/lib/partners/agreement-pdf';
import { namesMatch } from '@/lib/partners/validate';
import { emailAdminPartnerSubmitted, emailAgreementCopy } from '@/lib/partners/emails';

export const runtime = 'nodejs';
const schema = z.object({ signed_name: z.string().trim().min(2).max(200), accepted: z.literal(true) });

export async function POST(req: Request) {
  try {
    const { profile, user } = await requireActivityPartner(req, { editable: true });
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new HttpError(400, 'Tick the box and type your full name to sign.');

    const state = await loadOnboarding(profile.id);
    if (!state.readyToSign) throw new HttpError(409, 'Finish the remaining steps before signing: ' + state.missing.filter((m) => m.key !== 'agreement').map((m) => m.label).join(', '));
    if (!namesMatch(parsed.data.signed_name, profile.legal_name || '')) {
      throw new HttpError(400, `Type your name exactly as entered in your details: ${profile.legal_name}`);
    }

    const a = agreementFor(profile.partner_type);
    const sha256 = sha256Hex(a.body);
    const signedAt = new Date().toISOString();
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
    const userAgent = (req.headers.get('user-agent') || '').slice(0, 500);
    const pdf = await renderAgreementPdf({ ...a, signedName: parsed.data.signed_name, signedAt, ip, email: user.email || profile.email, sha256 });

    const sb = serviceClient();
    const pdfPath = `${profile.id}/agreement-${a.version}-${Date.now()}.pdf`;
    const { error: upErr } = await sb.storage.from(KYC_BUCKET).upload(pdfPath, Buffer.from(pdf), { contentType: 'application/pdf' });
    if (upErr) throw upErr;

    const { error: insErr } = await sb.from('partner_agreements').upsert({
      partner_id: profile.id, version: a.version, body_text: a.body, body_sha256: sha256,
      signed_name: parsed.data.signed_name, signed_at: signedAt, ip, user_agent: userAgent, pdf_path: pdfPath,
    }, { onConflict: 'partner_id,version' });
    if (insErr) throw insErr;

    const { error: upd } = await sb.from('profiles').update({ partner_status: 'pending_verification', submitted_at: signedAt, verification_note: null }).eq('id', profile.id);
    if (upd) throw upd;

    await emailAgreementCopy(user.email || profile.email, profile.legal_name, pdf, a.version);
    await emailAdminPartnerSubmitted({ id: profile.id, legal_name: profile.legal_name, partner_type: profile.partner_type, email: profile.email, phone: profile.phone });
    return NextResponse.json({ ok: true });
  } catch (e) { return jsonError(e); }
}
```
Note: a partner in `changes_requested` who already signed re-signs the same version; `upsert` replaces the earlier signature row for that version with the new timestamp and PDF (the old PDF stays in storage as history).

- [ ] **Step 8: Typecheck and tests** — `npx tsc --noEmit && npm test` → clean.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json lib/email.ts lib/partners/agreement.ts lib/partners/agreement-pdf.ts lib/partners/emails.ts app/api/partner/agreement tests/partners/agreement.test.ts app/api/partner/onboarding
git commit -m "Add partner agreement, e-signature with PDF copy, and onboarding emails"
```

---

### Task 11: Partner sign-up type choice and onboarding wizard

**Files:**
- Modify: `app/(site)/partner/register/page.tsx`, `app/(site)/partner/dashboard/page.tsx:17-34`
- Create: `app/(site)/partner/onboarding/page.tsx`

**Interfaces:**
- Consumes: `authFetch` (Task 3); `PARTNER_TYPE_LABELS`, `DOC_LABELS`, `docTarget`, `DocType`, `PartnerType` (Task 6); onboarding HTTP API (Tasks 9–10)

- [ ] **Step 1: Register page asks for the business type**

In `app/(site)/partner/register/page.tsx`:
1. Import `PARTNER_TYPE_LABELS, PARTNER_TYPES, type PartnerType` from `@/lib/partners/types` and add state `const [ptype, setPtype] = useState<PartnerType>('hotel');`. On mount, preselect from `?type=` : 
```ts
useEffect(() => {
  const t = new URLSearchParams(window.location.search).get('type');
  if (t && (PARTNER_TYPES as readonly string[]).includes(t)) setPtype(t as PartnerType);
}, []);
```
(add `useEffect` to the React import.)
2. Change the sign-up metadata to `{ role: 'partner', partner_type: ptype, full_name, phone, business_name }`.
3. Insert as the first field of the form:
```tsx
<fieldset>
  <legend className="block text-sm font-medium text-slate-700 mb-2">What do you offer? *</legend>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
    {PARTNER_TYPES.map((t) => (
      <label key={t} className={'flex items-center gap-2 border rounded-lg px-3 py-2.5 text-sm cursor-pointer ' + (ptype === t ? 'border-brand-600 bg-brand-50' : 'border-slate-300')}>
        <input type="radio" name="partner_type" value={t} checked={ptype === t} onChange={() => setPtype(t)} />
        {PARTNER_TYPE_LABELS[t]}
      </label>
    ))}
  </div>
</fieldset>
```
4. Change the heading to `Become a Partner` and the intro to `Create a partner account for your hotel, paragliding, taxi or trek business on Dharamshala Stay.`; change the business-name placeholder to `e.g. Mountain View Homestay or Bir Sky Paragliding`.
5. Success text: replace `start adding your property.` with `finish setting up your account.`

- [ ] **Step 2: Dashboard sends activity partners to onboarding until verified**

In `app/(site)/partner/dashboard/page.tsx`, inside `load()` right after `setUser(user);` insert:
```ts
      const { data: me } = await supabase.from('profiles').select('partner_type, partner_status').eq('id', user.id).single();
      if (me && me.partner_type && me.partner_type !== 'hotel' && me.partner_status !== 'verified') {
        router.push('/partner/onboarding'); return;
      }
```

- [ ] **Step 3: Onboarding wizard page**

`app/(site)/partner/onboarding/page.tsx`:
```tsx
'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Circle, Upload, Trash2, Loader2, FileText, AlertCircle } from 'lucide-react';
import { supabase, authFetch } from '@/lib/supabase';
import { DOC_LABELS, docTarget, type DocType } from '@/lib/partners/types';

type State = any;
const STATUS_TEXT: Record<string, string> = {
  onboarding: 'Finish the steps below. When everything is ticked, sign the agreement to send your account for approval.',
  changes_requested: 'We need a few fixes before we can approve you. See the note below, fix the items and sign again.',
  pending_verification: 'Thank you. Our team is checking your documents. We will email you when your account is approved, usually within 2 working days.',
  verified: 'Your account is approved.',
  suspended: 'Your account is suspended. Contact us to resolve this.',
  rejected: 'Your application was not approved.',
};
const PARTNER_DOCS: Record<string, DocType[]> = {
  taxi: ['aadhaar_front', 'aadhaar_back', 'pan'],
  paragliding: ['aadhaar_front', 'aadhaar_back', 'pan', 'tourism_registration'],
  trek: ['aadhaar_front', 'aadhaar_back', 'pan', 'tourism_registration'],
};
const VEHICLE_DOCS: DocType[] = ['vehicle_rc', 'vehicle_permit', 'vehicle_insurance'];
const field = 'w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500';

export default function PartnerOnboarding() {
  const router = useRouter();
  const [s, setS] = useState<State | null>(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/partner/login'); return; }
    const res = await authFetch('/api/partner/onboarding');
    if (res.status === 403) { router.push('/partner/dashboard'); return; }
    const data = await res.json();
    if (!res.ok) { setMsg({ ok: false, text: data.error }); return; }
    if (data.profile.partner_status === 'verified') { router.push('/partner/dashboard'); return; }
    setS(data);
  }, [router]);
  useEffect(() => { load(); }, [load]);

  async function call(label: string, url: string, init: RequestInit) {
    setBusy(label); setMsg(null);
    try {
      const res = await authFetch(url, init);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ ok: false, text: data.error || 'Something went wrong' }); return false; }
      await load(); return true;
    } finally { setBusy(''); }
  }
  const json = (method: string, body: unknown): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  if (!s) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-600" />{msg && <p className="ml-3 text-red-600 text-sm">{msg.text}</p>}</div>;

  const p = s.profile;
  const editable = ['onboarding', 'changes_requested'].includes(p.partner_status);
  const missingKeys = new Set<string>(s.missing.map((m: any) => m.key));
  const docFor = (t: DocType, staffId?: string, vehicleId?: string) =>
    s.documents.find((d: any) => d.doc_type === t && (d.staff_id || undefined) === staffId && (d.vehicle_id || undefined) === vehicleId);

  function DocRow({ t, staffId, vehicleId, label }: { t: DocType; staffId?: string; vehicleId?: string; label?: string }) {
    const d = docFor(t, staffId, vehicleId);
    const needsExpiry = ['driving_licence', 'pilot_licence', 'vehicle_permit', 'vehicle_insurance'].includes(t);
    async function upload(e: FormEvent<HTMLFormElement>) {
      e.preventDefault();
      const form = e.currentTarget; // React clears currentTarget after an await
      const fd = new FormData(form);
      fd.set('doc_type', t);
      if (staffId) fd.set('staff_id', staffId);
      if (vehicleId) fd.set('vehicle_id', vehicleId);
      if (await call('doc:' + t + staffId + vehicleId, '/api/partner/documents', { method: 'POST', body: fd })) form.reset();
    }
    const done = d && d.status !== 'rejected';
    return (
      <div className="border border-slate-200 rounded-lg p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            {done ? <CheckCircle className="h-5 w-5 text-green-600 shrink-0" /> : <Circle className="h-5 w-5 text-slate-300 shrink-0" />}
            <div>
              <p className="text-sm font-medium text-slate-800">{label || DOC_LABELS[t]}</p>
              {d && <p className="text-xs text-slate-500">{d.status === 'approved' ? 'Approved' : d.status === 'rejected' ? 'Rejected: ' + (d.rejection_reason || 'please upload again') : 'Uploaded, waiting for review'}{d.url && <> · <a href={d.url} target="_blank" rel="noreferrer" className="text-brand-600 underline">view</a></>}</p>}
              {t === 'aadhaar_front' && <p className="text-xs text-amber-700 mt-1">Upload a <b>masked Aadhaar</b> (first 8 digits hidden). You can download it from the UIDAI website.</p>}
            </div>
          </div>
          {d && editable && d.status !== 'approved' && (
            <button type="button" onClick={() => call('del' + d.id, '/api/partner/documents/' + d.id, { method: 'DELETE' })} className="text-slate-400 hover:text-red-600" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
          )}
        </div>
        {editable && (!d || d.status !== 'approved') && (
          <form onSubmit={upload} className="mt-2 flex flex-col sm:flex-row gap-2 sm:items-center">
            <input type="file" name="file" required accept="image/jpeg,image/png,application/pdf" className="text-sm" />
            {needsExpiry && <label className="text-xs text-slate-600 flex items-center gap-1">Valid until <input type="date" name="expires_on" className="border border-slate-300 rounded px-2 py-1 text-sm" /></label>}
            <button disabled={!!busy} className="inline-flex items-center gap-1.5 bg-brand-600 text-white text-sm px-3 py-1.5 rounded-lg disabled:opacity-50"><Upload className="h-4 w-4" />{d ? 'Replace' : 'Upload'}</button>
          </form>
        )}
      </div>
    );
  }

  async function saveDetails(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget).entries());
    await call('details', '/api/partner/profile', json('PATCH', fd));
  }
  async function addStaff(e: FormEvent<HTMLFormElement>, role: string) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = Object.fromEntries(new FormData(form).entries());
    if (await call('staff', '/api/partner/staff', json('POST', { ...fd, role }))) form.reset();
  }
  async function addVehicle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = Object.fromEntries(new FormData(form).entries());
    if (await call('vehicle', '/api/partner/vehicles', json('POST', { ...fd, seats: Number(fd.seats) }))) form.reset();
  }
  async function sign(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await call('sign', '/api/partner/agreement', json('POST', { signed_name: fd.get('signed_name'), accepted: fd.get('accepted') === 'on' }));
  }

  const staffRole = p.partner_type === 'taxi' ? 'driver' : p.partner_type === 'paragliding' ? 'pilot' : null;
  const licence: DocType | null = staffRole === 'driver' ? 'driving_licence' : staffRole === 'pilot' ? 'pilot_licence' : null;
  const pd = p.payout_details || {};

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-heading font-bold text-slate-900">Set up your partner account</h1>
        <p className="text-slate-600 mt-1">{STATUS_TEXT[p.partner_status]}</p>
        {p.verification_note && <p className="mt-3 bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-lg p-3">Note from our team: {p.verification_note}</p>}
        {msg && <p className={'mt-3 text-sm rounded-lg p-3 flex gap-2 ' + (msg.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700')}><AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />{msg.text}</p>}
        {editable && s.missing.length > 0 && (
          <div className="mt-4 bg-slate-50 rounded-lg p-4">
            <p className="text-sm font-semibold text-slate-800 mb-1">Still to do</p>
            <ul className="text-sm text-slate-600 list-disc pl-5">{s.missing.map((m: any) => <li key={m.key}>{m.label}</li>)}</ul>
          </div>
        )}
      </div>

      <section>
        <h2 className="text-lg font-heading font-semibold mb-3">1. Your details and payout account</h2>
        <form onSubmit={saveDetails} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-sm">Full legal name (as on PAN) *<input name="legal_name" defaultValue={p.legal_name || ''} required disabled={!editable} className={field} /></label>
          <label className="text-sm">Business name<input name="business_name" defaultValue={p.business_name || ''} disabled={!editable} className={field} /></label>
          <label className="text-sm">Phone *<input name="phone" defaultValue={p.phone || ''} required disabled={!editable} className={field} /></label>
          <label className="text-sm">PAN number *<input name="pan_number" defaultValue={p.pan_number || ''} required disabled={!editable} className={field} placeholder="ABCDE1234F" /></label>
          <label className="text-sm sm:col-span-2">Tourism / business registration number<input name="business_registration_no" defaultValue={p.business_registration_no || ''} disabled={!editable} className={field} /></label>
          <label className="text-sm">Get paid by *
            <select name="payout_method" defaultValue={p.payout_method || 'upi'} disabled={!editable} className={field}><option value="upi">UPI</option><option value="bank">Bank transfer</option></select>
          </label>
          <label className="text-sm">Account holder name *<input name="account_holder" defaultValue={pd.account_holder || ''} required disabled={!editable} className={field} /></label>
          <label className="text-sm">UPI ID (if UPI)<input name="upi_id" defaultValue={pd.upi_id || ''} disabled={!editable} className={field} placeholder="name@bank" /></label>
          <label className="text-sm">Bank account number (if bank)<input name="account_number" defaultValue={pd.account_number || ''} disabled={!editable} className={field} /></label>
          <label className="text-sm">IFSC (if bank)<input name="ifsc" defaultValue={pd.ifsc || ''} disabled={!editable} className={field} placeholder="SBIN0001234" /></label>
          {editable && <div className="sm:col-span-2"><button disabled={!!busy} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">{busy === 'details' ? 'Saving…' : 'Save details'}</button></div>}
        </form>
      </section>

      <section>
        <h2 className="text-lg font-heading font-semibold mb-1">2. Identity and business documents</h2>
        <p className="text-sm text-slate-500 mb-3">JPG, PNG or PDF, up to 8 MB each. Only our verification team can see these files.</p>
        <div className="space-y-2">{PARTNER_DOCS[p.partner_type].map((t) => <DocRow key={t} t={t} />)}</div>
      </section>

      {p.partner_type === 'taxi' && (
        <section>
          <h2 className="text-lg font-heading font-semibold mb-3">3. Vehicles</h2>
          {s.vehicles.map((v: any) => (
            <div key={v.id} className="border border-slate-200 rounded-xl p-4 mb-3 space-y-2">
              <div className="flex justify-between"><p className="font-semibold">{v.registration_no} · {v.make_model} · {v.seats} seats</p>
                {editable && <button onClick={() => call('dv' + v.id, '/api/partner/vehicles/' + v.id, { method: 'DELETE' })} className="text-slate-400 hover:text-red-600" aria-label="Remove vehicle"><Trash2 className="h-4 w-4" /></button>}</div>
              {VEHICLE_DOCS.map((t) => <DocRow key={t} t={t} vehicleId={v.id} />)}
            </div>
          ))}
          {editable && (
            <form onSubmit={addVehicle} className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
              <label className="text-sm">Type<select name="vehicle_type" className={field}><option value="sedan">Sedan</option><option value="suv">SUV</option><option value="innova">Innova</option><option value="tempo">Tempo Traveller</option><option value="bus">Bus</option></select></label>
              <label className="text-sm">Model<input name="make_model" required className={field} placeholder="Toyota Innova Crysta" /></label>
              <label className="text-sm">Number<input name="registration_no" required className={field} placeholder="HP39A1234" /></label>
              <label className="text-sm">Seats<input name="seats" type="number" min={1} max={60} required className={field} /></label>
              <button disabled={!!busy} className="col-span-2 sm:col-span-4 bg-slate-900 text-white rounded-lg py-2 text-sm font-semibold">Add vehicle</button>
            </form>
          )}
        </section>
      )}

      {staffRole && licence && (
        <section>
          <h2 className="text-lg font-heading font-semibold mb-3">{p.partner_type === 'taxi' ? '4. Drivers' : '3. Pilots'}</h2>
          {s.staff.filter((m: any) => m.role === staffRole).map((m: any) => (
            <div key={m.id} className="border border-slate-200 rounded-xl p-4 mb-3 space-y-2">
              <div className="flex justify-between"><p className="font-semibold">{m.full_name} · {m.phone}</p>
                {editable && <button onClick={() => call('ds' + m.id, '/api/partner/staff/' + m.id, { method: 'DELETE' })} className="text-slate-400 hover:text-red-600" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>}</div>
              <DocRow t={licence} staffId={m.id} label={`${DOC_LABELS[licence]} for ${m.full_name}`} />
            </div>
          ))}
          {editable && (
            <form onSubmit={(e) => addStaff(e, staffRole)} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
              <label className="text-sm">Full name<input name="full_name" required className={field} /></label>
              <label className="text-sm">Phone<input name="phone" required className={field} /></label>
              <label className="text-sm">Licence number<input name="licence_no" className={field} /></label>
              <button disabled={!!busy} className="sm:col-span-3 bg-slate-900 text-white rounded-lg py-2 text-sm font-semibold">Add {staffRole}</button>
            </form>
          )}
        </section>
      )}

      <section>
        <h2 className="text-lg font-heading font-semibold mb-3">Partner agreement</h2>
        <div className="border border-slate-200 rounded-xl p-4 max-h-80 overflow-y-auto whitespace-pre-line text-sm text-slate-700 bg-white">{s.agreement.body}</div>
        {s.agreements[0] && <p className="text-sm text-slate-600 mt-2 flex items-center gap-1.5"><FileText className="h-4 w-4" />Signed by {s.agreements[0].signed_name} on {new Date(s.agreements[0].signed_at).toLocaleString('en-IN')}{s.agreements[0].url && <> · <a href={s.agreements[0].url} className="text-brand-600 underline" target="_blank" rel="noreferrer">download PDF</a></>}</p>}
        {editable && (
          <form onSubmit={sign} className="mt-3 space-y-3">
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="accepted" required className="mt-1" />I have read and agree to the Dharamshala Stay Partner Agreement, including the 20% commission on every booking, online or cash.</label>
            <label className="text-sm block">Type your full legal name to sign<input name="signed_name" required className={field} placeholder={p.legal_name || ''} /></label>
            <button disabled={!!busy || !s.readyToSign} className="bg-green-700 text-white px-5 py-2.5 rounded-lg font-semibold disabled:opacity-50">{busy === 'sign' ? 'Signing…' : 'Sign and submit for approval'}</button>
            {!s.readyToSign && <p className="text-xs text-slate-500">Complete everything in "Still to do" first.</p>}
          </form>
        )}
      </section>
    </div>
  );
}
```
Note: `docTarget` import is unused in the page if not referenced; remove it from the import if TypeScript/ESLint flags it.

- [ ] **Step 4: Typecheck** — `npx tsc --noEmit` → clean.

- [ ] **Step 5: Manual end-to-end (dev server, with migration v15 applied and RESEND unset so emails log only)**

1. Register at `/partner/register?type=taxi`, verify the email, log in → lands on `/partner/onboarding`.
2. Save details with PAN `ABCDE1234F`, UPI `test@okaxis`.
3. Upload Aadhaar front/back and PAN (any small JPG/PDF). Try a 9 MB file → error "File is too big".
4. Add vehicle `hp 39 a 1234` → stored as `HP39A1234`; upload RC, permit, insurance.
5. Add a driver; upload licence.
6. "Still to do" shows only "Sign the partner agreement". Sign with your legal name in different case → success; status text changes to "being reviewed"; the PDF link opens a signed agreement.
7. Try uploading again → 409 message "being reviewed".

- [ ] **Step 6: Commit**

```bash
git add "app/(site)/partner/register/page.tsx" "app/(site)/partner/dashboard/page.tsx" "app/(site)/partner/onboarding/page.tsx"
git commit -m "Add partner type choice at sign-up and the onboarding wizard"
```

---

### Task 12: Admin partner verification

**Files:**
- Create: `app/api/admin/partners/route.ts`, `app/api/admin/partners/[id]/route.ts`, `app/(site)/admin/partners/page.tsx`, `app/(site)/admin/partners/[id]/page.tsx`, `lib/partners/admin-actions.ts`, `tests/partners/admin-actions.test.ts`
- Modify: `components/admin/AdminShell.tsx`

**Interfaces:**
- Consumes: `requireCaller`, `serviceClient`, `HttpError`, `jsonError`; `loadOnboarding`; `emailPartnerDecision`; `latestDocs`
- Produces:
  - `canVerify(state: { documents: { status: string }[]; agreements: unknown[]; missing: { key: string }[] }): string | null` (null = OK, else reason)
  - `type AdminAction = { action: 'approve_doc' | 'reject_doc'; document_id: string; reason?: string } | { action: 'verify' } | { action: 'request_changes' | 'reject' | 'suspend'; note: string } | { action: 'reinstate' } | { action: 'set_commission'; commission_pct: number }`
  - HTTP: `GET /api/admin/partners?status=` → `{ partners: [...] }`; `GET /api/admin/partners/:id` → onboarding state; `POST /api/admin/partners/:id` with `AdminAction`

- [ ] **Step 1: Failing test**

`tests/partners/admin-actions.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { canVerify } from '@/lib/partners/admin-actions';

const ok = { documents: [{ status: 'approved' }, { status: 'approved' }], agreements: [{}], missing: [] };
describe('canVerify', () => {
  it('passes when every document is approved and the agreement is signed', () => expect(canVerify(ok)).toBeNull());
  it('blocks pending or rejected documents', () => {
    expect(canVerify({ ...ok, documents: [{ status: 'approved' }, { status: 'pending' }] })).toMatch(/approve every document/i);
  });
  it('blocks a missing agreement or checklist items', () => {
    expect(canVerify({ ...ok, agreements: [] })).toMatch(/agreement/i);
    expect(canVerify({ ...ok, missing: [{ key: 'vehicle' }] })).toMatch(/incomplete/i);
  });
});
```
Run → FAIL.

- [ ] **Step 2: Implement `lib/partners/admin-actions.ts`**

```ts
export type AdminAction =
  | { action: 'approve_doc' | 'reject_doc'; document_id: string; reason?: string }
  | { action: 'verify' }
  | { action: 'request_changes' | 'reject' | 'suspend'; note: string }
  | { action: 'reinstate' }
  | { action: 'set_commission'; commission_pct: number };

export function canVerify(state: { documents: { status: string }[]; agreements: unknown[]; missing: { key: string }[] }): string | null {
  if (state.missing.some((m) => m.key !== 'agreement')) return 'The partner\'s checklist is incomplete.';
  if (!state.agreements.length) return 'The partner has not signed the agreement.';
  if (!state.documents.length || state.documents.some((d) => d.status !== 'approved')) return 'Approve every document before verifying.';
  return null;
}
```
Run test → PASS.

- [ ] **Step 3: Admin APIs**

`app/api/admin/partners/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { jsonError, requireCaller, serviceClient } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    const status = new URL(req.url).searchParams.get('status');
    let q = serviceClient().from('profiles')
      .select('id, email, full_name, legal_name, business_name, phone, partner_type, partner_status, commission_pct, submitted_at, verified_at, created_at')
      .in('partner_type', ['paragliding', 'taxi', 'trek'])
      .order('submitted_at', { ascending: false, nullsFirst: false });
    if (status && status !== 'all') q = q.eq('partner_status', status);
    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json({ partners: data || [] });
  } catch (e) { return jsonError(e); }
}
```

`app/api/admin/partners/[id]/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, requireCaller, serviceClient } from '@/lib/server-auth';
import { loadOnboarding } from '@/lib/partners/load';
import { canVerify } from '@/lib/partners/admin-actions';
import { emailPartnerDecision } from '@/lib/partners/emails';

export const dynamic = 'force-dynamic';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve_doc'), document_id: z.string().uuid() }),
  z.object({ action: z.literal('reject_doc'), document_id: z.string().uuid(), reason: z.string().trim().min(3).max(500) }),
  z.object({ action: z.literal('verify') }),
  z.object({ action: z.literal('request_changes'), note: z.string().trim().min(3).max(2000) }),
  z.object({ action: z.literal('reject'), note: z.string().trim().min(3).max(2000) }),
  z.object({ action: z.literal('suspend'), note: z.string().trim().min(3).max(2000) }),
  z.object({ action: z.literal('reinstate') }),
  z.object({ action: z.literal('set_commission'), commission_pct: z.number().min(0).max(100) }),
]);

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireCaller(req, ['admin']);
    return NextResponse.json(await loadOnboarding(params.id));
  } catch (e) { return jsonError(e); }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { profile: admin } = await requireCaller(req, ['admin']);
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new HttpError(400, 'Invalid action. A reason or note is required for rejections.');
    const a = parsed.data;
    const sb = serviceClient();
    const state = await loadOnboarding(params.id);
    const p = state.profile;
    const now = new Date().toISOString();
    const name = p.legal_name || p.full_name || 'Partner';

    if (a.action === 'approve_doc' || a.action === 'reject_doc') {
      const { data: d } = await sb.from('partner_documents').select('id').eq('id', a.document_id).eq('partner_id', p.id).single();
      if (!d) throw new HttpError(404, 'Document not found.');
      await sb.from('partner_documents').update({
        status: a.action === 'approve_doc' ? 'approved' : 'rejected',
        rejection_reason: a.action === 'reject_doc' ? a.reason : null,
        reviewed_by: admin.id, reviewed_at: now,
      }).eq('id', d.id);
    } else if (a.action === 'verify') {
      const reason = canVerify(state);
      if (reason) throw new HttpError(409, reason);
      await sb.from('profiles').update({ partner_status: 'verified', verified_at: now, verification_note: null }).eq('id', p.id);
      await emailPartnerDecision(p.email, name, 'verified');
    } else if (a.action === 'request_changes' || a.action === 'reject' || a.action === 'suspend') {
      const status = a.action === 'request_changes' ? 'changes_requested' : a.action === 'reject' ? 'rejected' : 'suspended';
      await sb.from('profiles').update({ partner_status: status, verification_note: a.note }).eq('id', p.id);
      await emailPartnerDecision(p.email, name, status, a.note);
    } else if (a.action === 'reinstate') {
      if (p.partner_status !== 'suspended') throw new HttpError(409, 'Only suspended partners can be reinstated.');
      await sb.from('profiles').update({ partner_status: 'verified', verification_note: null }).eq('id', p.id);
      await emailPartnerDecision(p.email, name, 'verified');
    } else if (a.action === 'set_commission') {
      await sb.from('profiles').update({ commission_pct: a.commission_pct }).eq('id', p.id);
    }
    return NextResponse.json(await loadOnboarding(params.id));
  } catch (e) { return jsonError(e); }
}
```

- [ ] **Step 4: Admin pages**

`app/(site)/admin/partners/page.tsx`:
```tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase, authFetch } from '@/lib/supabase';
import { AdminPageHeader } from '@/components/admin/AdminShell';

const FILTERS: Record<string, string> = {
  pending_verification: 'Waiting for you', changes_requested: 'Sent back', onboarding: 'Still filling in', verified: 'Approved', suspended: 'Suspended', rejected: 'Rejected', all: 'Everyone',
};
const TYPE: Record<string, string> = { paragliding: 'Paragliding', taxi: 'Taxi', trek: 'Trek' };

export default function AdminPartners() {
  const router = useRouter();
  const [filter, setFilter] = useState('pending_verification');
  const [rows, setRows] = useState<any[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/admin/login'); return; }
      setRows(null);
      const res = await authFetch('/api/admin/partners?status=' + filter);
      const data = await res.json();
      if (!res.ok) { setError(data.error); setRows([]); return; }
      setRows(data.partners);
    })();
  }, [filter, router]);

  return (
    <div>
      <AdminPageHeader title="Partners" description="Paragliding, taxi and trek partners. Check their documents and agreement, then approve them so they can take bookings." />
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(FILTERS).map(([k, v]) => (
          <button key={k} onClick={() => setFilter(k)} className={'px-3 py-1.5 rounded-full text-sm ' + (filter === k ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700')}>{v}</button>
        ))}
      </div>
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      {!rows ? <p className="text-slate-500 text-sm">Loading…</p> : rows.length === 0 ? <p className="text-slate-500 text-sm">Nobody here.</p> : (
        <div className="bg-white border border-slate-200 rounded-xl divide-y">
          {rows.map((p) => (
            <Link key={p.id} href={'/admin/partners/' + p.id} className="flex items-center justify-between p-4 hover:bg-slate-50">
              <div>
                <p className="font-semibold text-slate-900">{p.legal_name || p.full_name || p.email}</p>
                <p className="text-xs text-slate-500">{TYPE[p.partner_type]} · {p.business_name || '—'} · {p.email} · {p.phone || ''}</p>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p className="font-medium text-slate-700">{FILTERS[p.partner_status] || p.partner_status}</p>
                {p.submitted_at && <p>Submitted {new Date(p.submitted_at).toLocaleDateString('en-IN')}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

`app/(site)/admin/partners/[id]/page.tsx`:
```tsx
'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { supabase, authFetch } from '@/lib/supabase';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { DOC_LABELS } from '@/lib/partners/types';

export default function AdminPartnerDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [s, setS] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/admin/login'); return; }
    const res = await authFetch('/api/admin/partners/' + id);
    const data = await res.json();
    if (!res.ok) { setMsg(data.error); return; }
    setS(data);
  }, [id, router]);
  useEffect(() => { load(); }, [load]);

  async function act(body: Record<string, unknown>) {
    setMsg('');
    const res = await authFetch('/api/admin/partners/' + id, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { setMsg(data.error); return; }
    setS(data);
  }

  if (!s) return <p className="text-sm text-slate-500">{msg || 'Loading…'}</p>;
  const p = s.profile;
  const owner = (d: any) => d.vehicle_id ? s.vehicles.find((v: any) => v.id === d.vehicle_id)?.registration_no : d.staff_id ? s.staff.find((m: any) => m.id === d.staff_id)?.full_name : '';

  return (
    <div className="max-w-4xl">
      <AdminPageHeader title={p.legal_name || p.full_name || p.email} description={`${p.partner_type} partner · status: ${p.partner_status} · commission ${p.commission_pct}%`} />
      {msg && <p className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mb-4">{msg}</p>}

      <section className="bg-white border border-slate-200 rounded-xl p-5 mb-5 grid sm:grid-cols-2 gap-2 text-sm">
        <p><b>Email:</b> {p.email}</p><p><b>Phone:</b> {p.phone}</p>
        <p><b>Business:</b> {p.business_name || '—'}</p><p><b>PAN:</b> {p.pan_number || '—'}</p>
        <p><b>Registration no.:</b> {p.business_registration_no || '—'}</p>
        <p><b>Payout:</b> {p.payout_method === 'upi' ? `UPI ${p.payout_details?.upi_id}` : p.payout_method === 'bank' ? `A/c ${p.payout_details?.account_number} · ${p.payout_details?.ifsc}` : '—'} ({p.payout_details?.account_holder || '—'})</p>
        {s.missing.length > 0 && <p className="sm:col-span-2 text-amber-700"><b>Missing:</b> {s.missing.map((m: any) => m.label).join(', ')}</p>}
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
        <h2 className="font-semibold mb-3">Documents</h2>
        {s.documents.length === 0 && <p className="text-sm text-slate-500">None uploaded.</p>}
        <div className="space-y-2">
          {s.documents.map((d: any) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 border border-slate-100 rounded-lg p-3">
              <div className="text-sm">
                <p className="font-medium">{DOC_LABELS[d.doc_type as keyof typeof DOC_LABELS]}{owner(d) ? ` — ${owner(d)}` : ''}</p>
                <p className="text-xs text-slate-500">{d.status}{d.expires_on ? ` · valid until ${d.expires_on}` : ''}{d.rejection_reason ? ` · ${d.rejection_reason}` : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                {d.url && <a href={d.url} target="_blank" rel="noreferrer" className="text-brand-600 text-sm inline-flex items-center gap-1">Open <ExternalLink className="h-3.5 w-3.5" /></a>}
                <button onClick={() => act({ action: 'approve_doc', document_id: d.id })} className="text-green-700 text-sm inline-flex items-center gap-1"><CheckCircle className="h-4 w-4" />Approve</button>
                <button onClick={() => { const reason = window.prompt('Why is this document rejected? The partner will see this.'); if (reason) act({ action: 'reject_doc', document_id: d.id, reason }); }} className="text-red-600 text-sm inline-flex items-center gap-1"><XCircle className="h-4 w-4" />Reject</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {(s.vehicles.length > 0 || s.staff.length > 0) && (
        <section className="bg-white border border-slate-200 rounded-xl p-5 mb-5 text-sm">
          <h2 className="font-semibold mb-2">Fleet and team</h2>
          {s.vehicles.map((v: any) => <p key={v.id}>{v.registration_no} · {v.make_model} · {v.vehicle_type} · {v.seats} seats</p>)}
          {s.staff.map((m: any) => <p key={m.id}>{m.role}: {m.full_name} · {m.phone}{m.licence_no ? ` · licence ${m.licence_no}` : ''}</p>)}
        </section>
      )}

      <section className="bg-white border border-slate-200 rounded-xl p-5 mb-5 text-sm">
        <h2 className="font-semibold mb-2">Agreement</h2>
        {s.agreements.length === 0 ? <p className="text-slate-500">Not signed yet.</p> : s.agreements.map((a: any) => (
          <p key={a.id}>Version {a.version}, signed by <b>{a.signed_name}</b> on {new Date(a.signed_at).toLocaleString('en-IN')} from IP {a.ip}{a.url && <> · <a href={a.url} target="_blank" rel="noreferrer" className="text-brand-600 underline">PDF</a></>}<br /><span className="text-xs text-slate-400 break-all">SHA-256 {a.body_sha256}</span></p>
        ))}
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <h2 className="font-semibold">Decision</h2>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note to the partner (required to send back, reject or suspend)" className="w-full border border-slate-300 rounded-lg p-2 text-sm" rows={3} />
        <div className="flex flex-wrap gap-2">
          <button onClick={() => act({ action: 'verify' })} className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">Approve partner</button>
          <button onClick={() => act({ action: 'request_changes', note })} className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-semibold">Send back for changes</button>
          <button onClick={() => act({ action: 'reject', note })} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">Reject</button>
          {p.partner_status === 'verified' && <button onClick={() => act({ action: 'suspend', note })} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-semibold">Suspend</button>}
          {p.partner_status === 'suspended' && <button onClick={() => act({ action: 'reinstate' })} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-semibold">Reinstate</button>}
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <label className="text-sm">Commission %</label>
          <input type="number" min={0} max={100} step={0.5} defaultValue={p.commission_pct} id="commission" className="w-24 border border-slate-300 rounded px-2 py-1 text-sm" />
          <button onClick={() => act({ action: 'set_commission', commission_pct: Number((document.getElementById('commission') as HTMLInputElement).value) })} className="text-sm text-brand-600 font-semibold">Save</button>
        </div>
      </section>
    </div>
  );
}
```

In `components/admin/AdminShell.tsx`: add `BadgeCheck` to the lucide import and add a new group after "Customers":
```ts
  {
    title: 'Partners',
    items: [
      { href: '/admin/partners', label: 'Partners', hint: 'Verify paragliding, taxi and trek partners', icon: BadgeCheck, tone: 'bg-teal-500' },
    ],
  },
```

- [ ] **Step 5: Typecheck and tests** — `npx tsc --noEmit && npm test` → clean.

- [ ] **Step 6: Manual check**

As admin: `/admin/partners` shows the test taxi partner under "Waiting for you". Open it; documents open via signed URLs (the URL stops working after 5 minutes). Click "Approve partner" before approving documents → error "Approve every document before verifying." Reject one document with a reason → log in as the partner, the page shows the rejection — but the partner is still `pending_verification` and cannot edit; so as admin click "Send back for changes" with a note → partner can now replace the document and sign again. As admin approve all documents → "Approve partner" succeeds; partner's `/partner/dashboard` no longer redirects.
Also confirm a non-admin token gets 403: `curl -s http://localhost:3000/api/admin/partners -H "Authorization: Bearer <PARTNER_TOKEN>"` → `{"error":"You do not have access to this"}`.

- [ ] **Step 7: Commit**

```bash
git add lib/partners/admin-actions.ts tests/partners/admin-actions.test.ts app/api/admin/partners "app/(site)/admin/partners" components/admin/AdminShell.tsx
git commit -m "Add admin partner verification: documents, agreement, approve or send back"
```

---

### Task 13: Release

**Files:** none new.

- [ ] **Step 1: Full verification**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: all tests pass, no type errors, build succeeds.

- [ ] **Step 2: Production configuration** (owner, in Vercel → Settings → Environment Variables)

Confirm present: `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_EMAIL`, `NEXT_PUBLIC_SITE_URL`. Stripe keys are not needed until Phase 3 (checkout returns "Online payment is not available yet" without them).

- [ ] **Step 3: Migrations on production**

Confirm `migration-v14-security.sql` and `migration-v15-partner-onboarding.sql` have been run on the production Supabase project (same project as `.env.local` for this site).

- [ ] **Step 4: Push and smoke test live**

```bash
git push origin main
```
After Vercel deploys: `/partner/register?type=paragliding` shows the type choice; `/admin/partners` loads for the admin; a hotel booking on a live property still completes and the admin email arrives.

- [ ] **Step 5: Legal reminder**

Tell the owner: the agreement in `lib/partners/agreement.ts` is a draft; a lawyer must review it before inviting real partners. Any wording change must bump `AGREEMENT_VERSION`.

---

## Self-Review Notes

- **Spec coverage (Phase 0):** booking privacy ✔ T5; server pricing ✔ T2/T4; customer role ✔ T5; admin import auth ✔ T3; email route abuse ✔ T4 (route removed); server page guards → deferred (delta 1).
- **Spec coverage (Phase 1):** partner types ✔ T6/T7/T11; KYC types incl. masked Aadhaar, PAN, licences, RC, permit, insurance, pilot licence, tourism registration ✔ T6–T9; private storage with signed URLs ✔ T7/T9; payout details ✔ T9; vehicles/drivers/pilots ✔ T7/T9/T11; clickwrap agreement with hash/IP/UA/PDF/email ✔ T10; admin verification queue, per-document approve/reject, verify/request changes/reject/suspend/reinstate, commission override ✔ T12; partner and admin emails ✔ T10/T12; expiry dates captured ✔ T9/T11 (reminder emails belong to Phase 2's cron).
- **Out of this plan (next plans):** Phase 2 bookings/dispatch/notifications/cron, Phase 3 money, Phase 4 messages/reviews; DPDP consent notice text on the KYC step is added in Task 11 copy? — **added below**.

### Addendum to Task 11 Step 3 (DPDP notice)
In the onboarding page, under the "2. Identity and business documents" heading paragraph, add:
```tsx
<p className="text-xs text-slate-500 mb-3">We use these documents only to verify you as a partner and meet legal requirements. They are kept while you are a partner and for 3 years after, then deleted. To correct or delete your data, email hello@dharamshalastay.com.</p>
```
