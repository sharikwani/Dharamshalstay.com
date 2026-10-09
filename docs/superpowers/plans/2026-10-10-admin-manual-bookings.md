# Admin Manual Bookings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin can create a booking by hand for a hotel, taxi, trek, paragliding flight or local guide, set/adjust the price, record payment, assign it to a property/partner/driver/vehicle/guide, and assigned partners see it in their portal.

**Architecture:** Manual bookings are ordinary `bookings` rows (`booking_source = 'admin'`) with new assignment/payment columns (migration v16). An admin-only API validates and reprices on the server using pure helpers in `lib/manual-booking.ts` and `lib/pricing.ts`; pages are client components calling the API with `authFetch`. Emails go through `sendEmail`; WhatsApp is a prefilled `wa.me` link.

**Tech Stack:** Next.js 14 app router, Supabase, Resend, Vitest, Tailwind, lucide-react, zod.

**Spec:** `docs/superpowers/specs/2026-10-10-admin-manual-bookings-design.md`

## Global Constraints

- Prices and commission are integers in rupees, computed on the server; the browser preview is display only.
- Commission rate: activity partner `profiles.commission_pct` (default 20); hotel `properties.commission_pct` (default 10); guide 20; unassigned activity booking 20.
- Assignable partners: `role = 'partner'`, `partner_status = 'verified'`, `partner_type` equal to the category (taxi/trek/paragliding). Staff/vehicles must belong to that partner and be active; staff role: taxi→driver, trek→guide, paragliding→pilot.
- Guide days 1–30. Final price 0–10,000,000.
- Every Supabase write checks `{ error }`; email failures are logged, never block the save.
- Admin pages use `max-w-7xl mx-auto px-4 sm:px-6 py-8` + `AdminPageHeader` and the existing card/button styles.
- Do not run SQL against Supabase from tasks; migration v16 is run by the owner at release.
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never commit `.superpowers/`.

## Review Focus

- **Admin edits the price** — stored `amount` = final price, `list_amount` = catalogue price, `price_overridden` true (Task 2 tests).
- **Assigning a driver from a different partner, or an unverified partner** — 400 with a clear message (Task 2 + Task 3 tests).
- **Custom taxi trip with no price** — 400 "Enter the price for a custom trip" (Task 3 test).
- **"Customer paid Dharamshala Stay"** — `payment_status 'paid'`, `collected_by 'platform'`, `commission_status 'not_applicable'`, partner share recorded (Task 2 test).
- **Partner sees only their own assigned bookings** — API filters on caller id; RLS policy added (Task 6 test + v16).

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migration-v16-manual-bookings.sql` | Columns, category 'guide', booking ref prefix, partner read policy |
| `lib/pricing.ts` (modify) | Add guide pricing |
| `lib/manual-booking.ts` | Pure rules: commission rate, split, payment mapping, assignment checks, date check |
| `lib/whatsapp.ts` | Phone normalisation, wa.me links, message text |
| `lib/manual-booking-emails.ts` | Customer + partner/hotel/guide emails for a booking id |
| `app/api/admin/booking-options/route.ts` | Picker data for the form |
| `app/api/admin/bookings/route.ts` | POST create manual booking |
| `app/api/admin/bookings/[id]/route.ts` | GET detail, PATCH assign/payment/cancel |
| `app/api/partner/bookings/route.ts` | GET partner's assigned bookings |
| `app/(site)/admin/bookings/new/page.tsx` | New booking form |
| `app/(site)/admin/bookings/[id]/page.tsx` | Booking detail |
| `app/(site)/admin/bookings/page.tsx` (modify) | New booking button, badges, link to detail |
| `app/(site)/partner/bookings/page.tsx` | Partner bookings list |
| `app/(site)/partner/dashboard/page.tsx` (modify) | Link to partner bookings |
| `tests/manual-booking.test.ts`, `tests/whatsapp.test.ts`, `tests/api/admin-bookings.test.ts`, `tests/api/partner-bookings.test.ts` | Tests |

---

### Task 1: Migration v16

**Files:** Create `supabase/migration-v16-manual-bookings.sql`

- [ ] **Step 1: Write the migration**

```sql
-- migration-v16: admin manual bookings (local guide bookings, assignment, payment details)
-- Additive; safe to run on live data and safe to re-run.

-- 1. Local guide bookings
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_category_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_category_check
  CHECK (category IN ('hotel','taxi','trek','paragliding','guide'));

-- 2. Assignment, pricing and payment details
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS guide_id UUID REFERENCES guides(id),
  ADD COLUMN IF NOT EXISTS guide_days INT CHECK (guide_days BETWEEN 1 AND 30),
  ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES partner_staff(id),
  ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES vehicles(id),
  ADD COLUMN IF NOT EXISTS list_amount INT,
  ADD COLUMN IF NOT EXISTS price_overridden BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS price_override_reason TEXT,
  ADD COLUMN IF NOT EXISTS collected_by TEXT CHECK (collected_by IN ('partner','platform')),
  ADD COLUMN IF NOT EXISTS payment_channel TEXT CHECK (payment_channel IN ('upi','bank','cash','card','stripe')),
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS partner_share_amount INT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
CREATE INDEX IF NOT EXISTS idx_bookings_partner ON bookings(partner_id);

-- 3. Booking reference prefix for guide bookings
CREATE OR REPLACE FUNCTION generate_booking_ref()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.category
    WHEN 'hotel' THEN NEW.booking_ref := 'HTL';
    WHEN 'taxi' THEN NEW.booking_ref := 'TXI';
    WHEN 'trek' THEN NEW.booking_ref := 'TRK';
    WHEN 'paragliding' THEN NEW.booking_ref := 'PLG';
    WHEN 'guide' THEN NEW.booking_ref := 'GDE';
    ELSE NEW.booking_ref := 'BKG';
  END CASE;
  NEW.booking_ref := NEW.booking_ref || '-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 5));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Partners read bookings assigned to them
DROP POLICY IF EXISTS "Partner reads assigned bookings" ON bookings;
CREATE POLICY "Partner reads assigned bookings" ON bookings
  FOR SELECT USING (partner_id IS NOT NULL AND partner_id = auth.uid());
```

- [ ] **Step 2: Commit** — `git add supabase/migration-v16-manual-bookings.sql && git commit -m "Add migration v16 for admin manual bookings"` (+ trailer).

---

### Task 2: Pure booking rules, guide pricing and WhatsApp helpers

**Files:** Modify `lib/pricing.ts`; create `lib/manual-booking.ts`, `lib/whatsapp.ts`, `tests/manual-booking.test.ts`, `tests/whatsapp.test.ts`

**Interfaces — Produces:**
- `lib/pricing.ts`: `BookingCategory` becomes `'hotel' | 'taxi' | 'trek' | 'paragliding' | 'guide'`; `QuoteInput` gains `guide_days?: number | null`; `quoteBooking('guide', guide, { num_guests, guide_days })` → `{ amount: price_per_day × clamp(days,1,30), commission_pct: 20 }`.
- `lib/manual-booking.ts`:
  - `type ManualCategory = BookingCategory`
  - `type PaymentChoice = 'partner_collects' | 'platform_paid' | 'unpaid'`
  - `type PaymentChannel = 'upi' | 'bank' | 'cash' | 'card' | 'stripe'`
  - `ACTIVITY_CATEGORIES = ['taxi','trek','paragliding'] as const`
  - `STAFF_ROLE_FOR: Record<'taxi'|'trek'|'paragliding', 'driver'|'guide'|'pilot'>`
  - `commissionRateFor(category, opts: { partnerPct?: number | null; propertyPct?: number | null }): number`
  - `splitAmount(finalAmount: number, pct: number): { commission_amount: number; partner_share_amount: number }`
  - `paymentFields(choice: PaymentChoice, category: ManualCategory, finalAmount: number, opts?: { amountReceived?: number | null; channel?: PaymentChannel | null; reference?: string | null }): { payment_method: string; payment_status: string; collected_by: 'partner' | 'platform' | null; commission_status: string; paid_amount: number | null; payment_channel: PaymentChannel | null; payment_reference: string | null }`
  - `checkAssignment(category, partner: AssignPartner | null, staff: AssignStaff | null, vehicle: AssignVehicle | null): string | null` (null = OK, else message)
  - `isBeforeToday(dateStr: string, todayIst: string): boolean`
  - `todayIst(now?: Date): string`
- `lib/whatsapp.ts`: `normalizeIndianPhone(raw: string | null | undefined): string | null`, `waLink(phone: string | null | undefined, text: string): string | null`, `bookingShareText(b: ShareBooking, audience: 'partner' | 'customer'): string`

- [ ] **Step 1: Failing tests** — `tests/manual-booking.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { quoteBooking } from '@/lib/pricing';
import { commissionRateFor, splitAmount, paymentFields, checkAssignment, isBeforeToday, todayIst } from '@/lib/manual-booking';

describe('guide pricing', () => {
  it('day rate × days', () => expect(quoteBooking('guide', { price_per_day: 2500 }, { num_guests: 3, guide_days: 2 })).toEqual({ amount: 5000, commission_pct: 20 }));
  it('clamps days to 1..30', () => {
    expect(quoteBooking('guide', { price_per_day: 1000 }, { num_guests: 1, guide_days: 0 }).amount).toBe(1000);
    expect(quoteBooking('guide', { price_per_day: 1000 }, { num_guests: 1, guide_days: 99 }).amount).toBe(30000);
  });
});

describe('commissionRateFor', () => {
  it('uses partner rate for activities, default 20', () => {
    expect(commissionRateFor('taxi', { partnerPct: 15 })).toBe(15);
    expect(commissionRateFor('trek', {})).toBe(20);
  });
  it('uses property rate for hotels, default 10', () => {
    expect(commissionRateFor('hotel', { propertyPct: 12 })).toBe(12);
    expect(commissionRateFor('hotel', {})).toBe(10);
  });
  it('guides are 20', () => expect(commissionRateFor('guide', { partnerPct: 5 })).toBe(20));
});

describe('splitAmount', () => {
  it('rounds commission and gives the rest to the partner', () => expect(splitAmount(3333, 20)).toEqual({ commission_amount: 667, partner_share_amount: 2666 }));
});

describe('paymentFields', () => {
  it('partner collects (hotel uses pay_at_hotel)', () => {
    const f = paymentFields('partner_collects', 'hotel', 5000);
    expect(f).toMatchObject({ payment_method: 'pay_at_hotel', payment_status: 'pending', collected_by: 'partner', commission_status: 'pending', paid_amount: null });
    expect(paymentFields('partner_collects', 'taxi', 5000).payment_method).toBe('offline');
  });
  it('platform paid records amount, channel, reference', () => {
    expect(paymentFields('platform_paid', 'trek', 4000, { channel: 'upi', reference: 'UTR1' })).toMatchObject({
      payment_method: 'offline', payment_status: 'paid', collected_by: 'platform', commission_status: 'not_applicable',
      paid_amount: 4000, payment_channel: 'upi', payment_reference: 'UTR1',
    });
    expect(paymentFields('platform_paid', 'trek', 4000, { channel: 'card', amountReceived: 3500 })).toMatchObject({ payment_method: 'online', paid_amount: 3500 });
  });
  it('unpaid', () => {
    expect(paymentFields('unpaid', 'guide', 2000)).toMatchObject({ payment_method: 'offline', payment_status: 'pending', collected_by: null, commission_status: 'pending', paid_amount: null });
  });
});

describe('checkAssignment', () => {
  const partner = { id: 'p1', role: 'partner', partner_type: 'taxi', partner_status: 'verified' };
  const driver = { id: 's1', partner_id: 'p1', role: 'driver', active: true };
  const car = { id: 'v1', partner_id: 'p1', active: true };
  it('accepts a verified partner with own driver and car', () => expect(checkAssignment('taxi', partner, driver, car)).toBeNull());
  it('accepts an unassigned activity booking', () => expect(checkAssignment('taxi', null, null, null)).toBeNull());
  it('rejects unverified, wrong type, other partner staff/vehicle, wrong role, inactive', () => {
    expect(checkAssignment('taxi', { ...partner, partner_status: 'onboarding' }, null, null)).toMatch(/approved/i);
    expect(checkAssignment('trek', partner, null, null)).toMatch(/trek/i);
    expect(checkAssignment('taxi', partner, { ...driver, partner_id: 'p2' }, null)).toMatch(/does not belong/i);
    expect(checkAssignment('taxi', partner, null, { ...car, partner_id: 'p2' })).toMatch(/does not belong/i);
    expect(checkAssignment('taxi', partner, { ...driver, role: 'pilot' }, null)).toMatch(/driver/i);
    expect(checkAssignment('taxi', partner, { ...driver, active: false }, null)).toMatch(/not active/i);
  });
  it('staff or vehicle without a partner is rejected', () => expect(checkAssignment('taxi', null, driver, null)).toMatch(/choose the partner/i));
  it('hotel and guide bookings cannot take a partner', () => expect(checkAssignment('hotel', partner, null, null)).toMatch(/cannot be assigned/i));
  it('vehicles only for taxi', () => expect(checkAssignment('trek', { ...partner, partner_type: 'trek' }, null, car)).toMatch(/only taxi/i));
});

describe('dates', () => {
  it('todayIst formats in IST', () => expect(todayIst(new Date('2026-10-09T20:00:00Z'))).toBe('2026-10-10'));
  it('isBeforeToday', () => {
    expect(isBeforeToday('2026-10-09', '2026-10-10')).toBe(true);
    expect(isBeforeToday('2026-10-10', '2026-10-10')).toBe(false);
  });
});
```
`tests/whatsapp.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { normalizeIndianPhone, waLink, bookingShareText } from '@/lib/whatsapp';

describe('normalizeIndianPhone', () => {
  it('handles common formats', () => {
    expect(normalizeIndianPhone('98160 00005')).toBe('919816000005');
    expect(normalizeIndianPhone('+91-98160-00005')).toBe('919816000005');
    expect(normalizeIndianPhone('09816000005')).toBe('919816000005');
    expect(normalizeIndianPhone('12345')).toBeNull();
    expect(normalizeIndianPhone(null)).toBeNull();
  });
});
describe('waLink', () => {
  it('encodes text', () => expect(waLink('9816000005', 'Hi & bye')).toBe('https://wa.me/919816000005?text=Hi%20%26%20bye'));
  it('null for bad phone', () => expect(waLink('x', 'Hi')).toBeNull());
});
describe('bookingShareText', () => {
  const b = { booking_ref: 'TXI-261010-ABCDE', category: 'taxi', item_name: 'Gaggal Airport to McLeod Ganj', date_text: '12 Oct 2026, 10:00', num_guests: 3, guest_name: 'Asha', guest_phone: '9816000005', amount: 2200, payment_text: 'Customer pays you directly', commission_amount: 440, assignee_text: 'Driver Sonu · HP39A1234' };
  it('partner message includes customer contact and commission', () => {
    const t = bookingShareText(b, 'partner');
    expect(t).toContain('TXI-261010-ABCDE');
    expect(t).toContain('Asha');
    expect(t).toContain('9816000005');
    expect(t).toContain('Rs.2,200');
    expect(t).toContain('Rs.440');
  });
  it('customer message omits commission and includes assignee', () => {
    const t = bookingShareText(b, 'customer');
    expect(t).not.toContain('440');
    expect(t).toContain('Driver Sonu');
  });
});
```
Run `npm test -- tests/manual-booking.test.ts tests/whatsapp.test.ts` → FAIL.

- [ ] **Step 2: Implement**

In `lib/pricing.ts`:
- `export type BookingCategory = 'hotel' | 'taxi' | 'trek' | 'paragliding' | 'guide';`
- `QuoteInput` add `guide_days?: number | null;`
- `DEFAULT_COMMISSION` add `guide: 20`.
- In `quoteBooking`, add before the return:
```ts
  } else if (category === 'guide') {
    const days = Math.min(30, Math.max(1, Math.floor(input.guide_days || 1)));
    amount = (Number(entity.price_per_day) || 0) * days;
```
(as an additional `else if` branch in the existing chain), and make the guide commission always 20: `const commission_pct = category === 'guide' ? 20 : pct(entity, category);`.

Note: `app/api/bookings/route.ts`'s zod enum stays the four public categories, so the public site still cannot create guide bookings.

`lib/manual-booking.ts`:
```ts
import type { BookingCategory } from './pricing';

export type ManualCategory = BookingCategory;
export type PaymentChoice = 'partner_collects' | 'platform_paid' | 'unpaid';
export type PaymentChannel = 'upi' | 'bank' | 'cash' | 'card' | 'stripe';
export const ACTIVITY_CATEGORIES = ['taxi', 'trek', 'paragliding'] as const;
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];
export const STAFF_ROLE_FOR: Record<ActivityCategory, 'driver' | 'guide' | 'pilot'> = { taxi: 'driver', trek: 'guide', paragliding: 'pilot' };
const isActivity = (c: string): c is ActivityCategory => (ACTIVITY_CATEGORIES as readonly string[]).includes(c);

const validPct = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100;

export function commissionRateFor(category: ManualCategory, opts: { partnerPct?: number | null; propertyPct?: number | null }): number {
  if (category === 'guide') return 20;
  if (category === 'hotel') return validPct(opts.propertyPct) ? (opts.propertyPct as number) : 10;
  return validPct(opts.partnerPct) ? (opts.partnerPct as number) : 20;
}

export function splitAmount(finalAmount: number, pct: number) {
  const commission_amount = Math.round((finalAmount * pct) / 100);
  return { commission_amount, partner_share_amount: finalAmount - commission_amount };
}

export function paymentFields(
  choice: PaymentChoice, category: ManualCategory, finalAmount: number,
  opts: { amountReceived?: number | null; channel?: PaymentChannel | null; reference?: string | null } = {},
) {
  if (choice === 'platform_paid') {
    const channel = opts.channel || 'cash';
    return {
      payment_method: channel === 'card' || channel === 'stripe' ? 'online' : 'offline',
      payment_status: 'paid', collected_by: 'platform' as const, commission_status: 'not_applicable',
      paid_amount: opts.amountReceived ?? finalAmount, payment_channel: channel, payment_reference: opts.reference?.trim() || null,
    };
  }
  if (choice === 'partner_collects') {
    return {
      payment_method: category === 'hotel' ? 'pay_at_hotel' : 'offline', payment_status: 'pending',
      collected_by: 'partner' as const, commission_status: 'pending', paid_amount: null, payment_channel: null, payment_reference: null,
    };
  }
  return {
    payment_method: 'offline', payment_status: 'pending', collected_by: null, commission_status: 'pending',
    paid_amount: null, payment_channel: null, payment_reference: null,
  };
}

export type AssignPartner = { id: string; role: string; partner_type: string | null; partner_status: string | null };
export type AssignStaff = { id: string; partner_id: string; role: string; active: boolean };
export type AssignVehicle = { id: string; partner_id: string; active: boolean };

export function checkAssignment(category: ManualCategory, partner: AssignPartner | null, staff: AssignStaff | null, vehicle: AssignVehicle | null): string | null {
  if (!isActivity(category)) {
    return partner || staff || vehicle ? 'Hotel and local guide bookings cannot be assigned to a partner.' : null;
  }
  if (!partner) return staff || vehicle ? 'Choose the partner before choosing a driver, pilot, guide or vehicle.' : null;
  if (partner.role !== 'partner' || partner.partner_status !== 'verified') return 'This partner is not approved yet, so they cannot take bookings.';
  if (partner.partner_type !== category) return `This partner is not a ${category} partner.`;
  if (staff) {
    if (staff.partner_id !== partner.id) return 'That person does not belong to the chosen partner.';
    if (!staff.active) return 'That person is not active.';
    if (staff.role !== STAFF_ROLE_FOR[category]) return `Choose a ${STAFF_ROLE_FOR[category]} for a ${category} booking.`;
  }
  if (vehicle) {
    if (category !== 'taxi') return 'Vehicles can only be added to taxi bookings.';
    if (vehicle.partner_id !== partner.id) return 'That vehicle does not belong to the chosen partner.';
    if (!vehicle.active) return 'That vehicle is not active.';
  }
  return null;
}

export function todayIst(now: Date = new Date()): string {
  return new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
export function isBeforeToday(dateStr: string, today: string): boolean {
  return dateStr < today;
}
```
Note the vehicle-only-for-taxi test calls `checkAssignment('trek', {partner_type:'trek'...}, null, car)`; the vehicle branch must run regardless of the staff branch (as written).

`lib/whatsapp.ts`:
```ts
export function normalizeIndianPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  return /^[6-9]\d{9}$/.test(d) ? '91' + d : null;
}

export function waLink(phone: string | null | undefined, text: string): string | null {
  const p = normalizeIndianPhone(phone);
  return p ? `https://wa.me/${p}?text=${encodeURIComponent(text)}` : null;
}

export type ShareBooking = {
  booking_ref: string; category: string; item_name: string; date_text: string; num_guests: number;
  guest_name: string; guest_phone: string; amount: number; payment_text: string;
  commission_amount?: number | null; assignee_text?: string | null;
};
const rs = (n: number) => 'Rs.' + Math.round(n).toLocaleString('en-IN');
const TYPE: Record<string, string> = { hotel: 'Hotel stay', taxi: 'Taxi', trek: 'Trek', paragliding: 'Paragliding', guide: 'Local guide' };

export function bookingShareText(b: ShareBooking, audience: 'partner' | 'customer'): string {
  const lines = [
    audience === 'partner' ? `New booking from Dharamshala Stay (${b.booking_ref})` : `Your Dharamshala Stay booking is confirmed (${b.booking_ref})`,
    `${TYPE[b.category] || b.category}: ${b.item_name}`,
    `When: ${b.date_text}`,
    `People: ${b.num_guests}`,
  ];
  if (audience === 'partner') lines.push(`Customer: ${b.guest_name}, ${b.guest_phone}`);
  if (b.assignee_text) lines.push(audience === 'partner' ? `Assigned: ${b.assignee_text}` : `Your ${b.category === 'taxi' ? 'driver' : 'host'}: ${b.assignee_text}`);
  lines.push(`Price: ${rs(b.amount)}`, `Payment: ${b.payment_text}`);
  if (audience === 'partner' && b.commission_amount) lines.push(`Dharamshala Stay commission: ${rs(b.commission_amount)}`);
  return lines.join('\n');
}
```

- [ ] **Step 3: Run tests** — `npm test` (all) and `npx tsc --noEmit` → pass.
- [ ] **Step 4: Commit** — "Add manual booking rules, guide pricing and WhatsApp helpers".

---

### Task 3: Admin booking options + create API

**Files:** Create `app/api/admin/booking-options/route.ts`, `app/api/admin/bookings/route.ts`, `lib/manual-booking-emails.ts`, `tests/api/admin-bookings.test.ts`

**Interfaces:**
- Consumes: `requireCaller`, `serviceClient`, `HttpError`, `jsonError` (lib/server-auth); `quoteBooking` (pricing); everything from `lib/manual-booking.ts`; `sendEmail` (lib/email).
- Produces:
  - `GET /api/admin/booking-options?type=hotel|taxi|trek|paragliding|guide` → `{ items: [...], partners: [{ id, legal_name, business_name, phone, email, commission_pct, staff: [{id, full_name, phone, role}], vehicles: [{id, registration_no, make_model, vehicle_type, seats}] }] }`. Items per type: hotel `properties` (status published, fields `id, name, destination_slug, price_min, rooms, commission_pct, contact_email, contact_phone, listing_type`); taxi `taxi_routes` (status active: `id, from_location, to_location, vehicle_category, vehicle_name, price, price_type, commission_pct`); trek `treks` (status published: `id, name, price_per_person, commission_pct`); paragliding `paragliding_packages` (status published: `id, name, destination, price_per_person, commission_pct`); guide `guides` (status active: `id, name, phone, email, price_per_day`). `partners` only for taxi/trek/paragliding: verified partners of that type with their active staff (matching role) and, for taxi, active vehicles. Use the real column names: read `supabase/schema.sql` / `migration-v3.sql` to confirm each table's columns and status values before writing selects.
  - `POST /api/admin/bookings` body (zod):
    ```ts
    {
      category: 'hotel'|'taxi'|'trek'|'paragliding'|'guide',
      item_id: string uuid | null,            // null only for a custom taxi trip
      room_name?: string, plan_index?: number, plan_name?: string,
      check_in?: 'YYYY-MM-DD', check_out?: 'YYYY-MM-DD',
      activity_date?: 'YYYY-MM-DD', pickup_time?: string,
      pickup_location?: string, drop_location?: string, vehicle_type?: string,
      num_guests: number (1–100), guide_days?: number (1–30),
      guest_name: string (2–200), guest_phone: string (10–20), guest_email?: email | '',
      special_requests?: string (≤2000),
      final_amount?: number int 0–10_000_000, price_override_reason?: string (≤500),
      payment: { choice: 'partner_collects'|'platform_paid'|'unpaid', amount_received?: int, channel?: 'upi'|'bank'|'cash'|'card'|'stripe', reference?: string (≤200) },
      partner_id?: uuid | null, staff_id?: uuid | null, vehicle_id?: uuid | null,
      allow_past_date?: boolean, notify_customer?: boolean (default true), notify_partner?: boolean (default true),
    }
    ```
    → `{ id, booking_ref }`.
  - `lib/manual-booking-emails.ts`: `loadBookingView(bookingId: string): Promise<BookingView | null>` and `sendManualBookingEmails(bookingId: string, opts: { customer: boolean; partner: boolean; subjectPrefix?: string }): Promise<void>` where `BookingView` = the booking row plus `item_name`, `date_text`, `assignee_text`, `payment_text`, `partner_contact: { name, email, phone } | null` (partner profile, hotel property contact, or guide).

- [ ] **Step 1: Failing route tests** — `tests/api/admin-bookings.test.ts`: mock `@/lib/server-auth` (`requireCaller` returns admin or throws `new HttpError(403, ...)`; `serviceClient` returns a fake whose `from(table)` returns per-table fixtures and records inserts), and mock `@/lib/manual-booking-emails`. Tests:
  1. non-admin → 403.
  2. trek happy path: trek `{id:'t1', price_per_person:1500, commission_pct:null}`, verified trek partner `{commission_pct: 20}`, 3 people, `payment: {choice:'partner_collects'}` → 200; inserted row has `amount 4500, list_amount 4500, price_overridden false, commission_pct 20, commission_amount 900, partner_share_amount 3600, booking_source 'admin', status 'confirmed', partner_id 'p1', created_by 'admin1', collected_by 'partner'`; emails helper called with `{customer: true, partner: true}`.
  3. override: same with `final_amount: 4000, price_override_reason: 'group'` → `amount 4000, list_amount 4500, price_overridden true, commission_amount 800`.
  4. unverified partner → 400 message matches /approved/.
  5. driver of another partner → 400 /does not belong/.
  6. custom taxi (`item_id: null`) without `final_amount` → 400 "Enter the price for a custom trip."
  7. past `activity_date` without `allow_past_date` → 400 /past/; with it → 200.
  8. Supabase insert `{ error }` → 500 and emails NOT called.
  Run → FAIL.

- [ ] **Step 2: Implement `POST /api/admin/bookings`** in `app/api/admin/bookings/route.ts`:
  1. `const { profile: admin } = await requireCaller(req, ['admin']);` parse with zod; 400 "Please check the booking details." on failure (include the first issue's path in the message).
  2. Load the item: table by category (`properties`, `taxi_routes`, `treks`, `paragliding_packages`, `guides`) by `item_id`; 404 "The chosen item was not found." If category is taxi and `item_id` is null → custom trip: require `pickup_location` and `drop_location` (400) and `final_amount` (400 "Enter the price for a custom trip.").
  3. `list_amount = item ? quoteBooking(category, item, {...}).amount : null`. Hotel requires `check_in`/`check_out` with check-out after check-in (400). Activity/guide requires `activity_date` (400). Unless `allow_past_date`, reject dates before `todayIst()` (400 "That date is in the past. Tick 'allow past date' to record an earlier booking.").
  4. `final = body.final_amount ?? list_amount`; if `final == null` → 400. `price_overridden = list_amount == null ? true : final !== list_amount`.
  5. Load partner (`profiles` id, role, partner_type, partner_status, commission_pct), staff (`partner_staff`), vehicle (`vehicles`) when ids are given; `const problem = checkAssignment(...)`; 400 with `problem`.
  6. `pct = commissionRateFor(category, { partnerPct: partner?.commission_pct, propertyPct: category === 'hotel' ? item.commission_pct : null })`; `split = splitAmount(final, pct)`; `pay = paymentFields(body.payment.choice, category, final, {...})`.
  7. Insert into `bookings`: category, guest fields, `num_guests`, dates (`check_in/check_out` for hotel; `activity_date`, `pickup_time` otherwise), `property_id/taxi_route_id/trek_id/paragliding_id/guide_id` by category, `guide_days`, `pickup_location`, `drop_location`, `vehicle_type`, `room_name` (`plan_name ? `${room} - ${plan}` : room`), `amount: final`, `list_amount`, `price_overridden`, `price_override_reason`, `commission_pct: pct`, `commission_amount`, `partner_share_amount`, all `pay` fields, `partner_id`, `staff_id`, `vehicle_id`, `booking_source: 'admin'`, `status: 'confirmed'`, `created_by: admin.id`. `.select('id, booking_ref').single()`; on `error` → `throw new HttpError(500, 'Could not save the booking. Please try again.')`.
  8. `await sendManualBookingEmails(row.id, { customer: notify_customer && !!guest_email, partner: notify_partner })` inside try/catch that only logs.
  9. Return `{ id, booking_ref }`.

- [ ] **Step 3: Implement `lib/manual-booking-emails.ts`** — `loadBookingView` selects the booking and the related item/partner/staff/vehicle/guide/property rows with `serviceClient()`, builds:
  - `item_name`: property name (+ ` · ${room_name}`), `${from} → ${to}` for routes or `${pickup} → ${drop}` for custom trips, trek/package name, guide name.
  - `date_text`: hotel `check_in – check_out`; others `activity_date` (+ `, ${pickup_time}`) (+ ` · ${guide_days} day(s)` for guides). Format dates as `12 Oct 2026` via `toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })`.
  - `assignee_text`: staff `full_name` + `, ${phone}` and ` · ${registration_no}` for vehicles; null if none.
  - `payment_text`: partner_collects → "Customer pays you directly" (partner audience) / "Pay at the time of service" (customer); platform → "Paid to Dharamshala Stay"; unpaid → "Payment pending".
  - `partner_contact`: activity → partner profile (`legal_name || business_name || full_name`, `email`, `phone`); hotel → property `name`, `contact_email`, `contact_phone`; guide → guide `name`, `email`, `phone`.
  `sendManualBookingEmails` uses `sendEmail` with simple HTML matching `lib/partners/emails.ts`'s `wrap` style (copy a local `wrap`/`esc`): customer gets "Your booking is confirmed – {ref}" with item, dates, people, assignee, price, payment text; partner gets "New booking from Dharamshala Stay – {ref}" with customer name/phone/email, item, dates, people, assignee, price, payment text, and "Commission due to Dharamshala Stay: Rs.X" when `collected_by !== 'platform'`, or "Your share: Rs.Y (we will pay you)" when `collected_by === 'platform'`. Prefix subjects with `opts.subjectPrefix` (e.g. "Updated: ") when given. Skip a recipient with no email. Escape all user text.

- [ ] **Step 4: Implement `GET /api/admin/booking-options`** as specified in Interfaces (admin only; `force-dynamic`; check every query's `error`).

- [ ] **Step 5: Tests, tsc, commit** — `npm test`, `npx tsc --noEmit`; commit "Add admin API to create manual bookings with server-side pricing and assignment checks".

---

### Task 4: Booking detail API (view, reassign, payment, cancel)

**Files:** Create `app/api/admin/bookings/[id]/route.ts`; extend `tests/api/admin-bookings.test.ts`

**Interfaces:**
- `GET /api/admin/bookings/:id` → `{ booking: BookingView }` (from `loadBookingView`; 404 if missing).
- `PATCH /api/admin/bookings/:id` body (zod discriminated union on `action`):
  - `{ action: 'assign', partner_id: uuid|null, staff_id?: uuid|null, vehicle_id?: uuid|null, notify?: boolean }` — runs `checkAssignment` with the booking's category; recomputes `commission_pct`/`commission_amount`/`partner_share_amount` from the new partner (keeps `amount`); email partner with `subjectPrefix: 'Updated: '` if notify.
  - `{ action: 'payment', choice, amount_received?, channel?, reference?, notify?: boolean }` — applies `paymentFields` with the booking's category and `amount`.
  - `{ action: 'cancel', reason: string (3–500), notify?: boolean }` — `status 'cancelled'`, `cancel_reason`, `commission_status 'waived'` unless already `'paid'`; email customer and partner "Booking cancelled – {ref}" with the reason if notify.
  - Every update checks `{ error }` → 500; cancelled bookings cannot be reassigned or re-paid (409 "This booking is cancelled.").
  - Returns `{ booking: BookingView }` after the change.
- Add to `lib/manual-booking-emails.ts`: `sendCancellationEmails(bookingId: string, reason: string): Promise<void>`.

- [ ] **Step 1: Failing tests** (append to `tests/api/admin-bookings.test.ts`): non-admin PATCH 403; assign to a driver of another partner 400; payment `platform_paid` with channel upi sets `payment_status 'paid'`, `collected_by 'platform'`; cancel sets `status 'cancelled'` and `cancel_reason`; PATCH on a cancelled booking 409; update error → 500 with no email.
- [ ] **Step 2: Implement**, run `npm test` + `npx tsc --noEmit`.
- [ ] **Step 3: Commit** — "Add admin API to view, reassign, update payment and cancel bookings".

---

### Task 5: Admin pages — New booking form, detail page, list updates

**Files:** Create `app/(site)/admin/bookings/new/page.tsx`, `app/(site)/admin/bookings/[id]/page.tsx`; modify `app/(site)/admin/bookings/page.tsx`

**Interfaces — Consumes:** `authFetch` (lib/supabase); the three admin APIs above; `pricing.quoteBooking`, `nightsBetween`, `hotelNightlyPrice` and `lib/manual-booking.ts` `commissionRateFor`, `splitAmount` for the live preview; `lib/whatsapp.ts` `waLink`, `bookingShareText`; `AdminPageHeader`; `formatPrice` from `lib/utils`.

- [ ] **Step 1: New booking page** (`'use client'`), layout `max-w-4xl mx-auto px-4 sm:px-6 py-8` inside the admin shell with `AdminPageHeader title="New booking" description="Create a booking taken by phone, WhatsApp or in person, and assign it to a hotel, partner or guide."`. Sections as white cards (`bg-white border border-slate-200 rounded-xl p-5 mb-5`), each with an `h2` (`font-semibold text-slate-900 mb-3`):
  1. **Type** — five large toggle buttons with lucide icons (Building/Car/Mountain/Wind/User) styled like the admin filter buttons; changing type resets item/assignment fields and fetches `/api/admin/booking-options?type=…`.
  2. **What is booked** — per spec §3: hotel (searchable `<select>` of properties; room select from the chosen property's `rooms`; rate plan select from that room's `rate_plans` showing `name || meal_plan` and price; check-in/out dates; guests), taxi (route select showing `from → to · vehicle · ₹price` plus a "Custom trip" option revealing pickup/drop inputs; date; pickup time; vehicle type select; passengers), trek/paragliding (item select showing price per person; date; people), guide (guide select showing day rate; start date; days 1–30; people). Inputs use the existing admin input class `w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500`.
  3. **Customer** — name, phone, email (optional), notes.
  4. **Price** — "List price" computed client-side with `quoteBooking` (display only; "No list price for a custom trip"); "Final price (₹)" number input prefilled with the list price whenever the list price changes and the admin hasn't edited it; if different, an amber "manual price" pill and a "Reason (optional)" input.
  5. **Payment** — three radio cards (Customer pays the partner/hotel directly · Customer paid Dharamshala Stay · Not paid yet); the second reveals amount received (default final price), method select (UPI, Bank transfer, Cash, Card), reference input.
  6. **Assign to** — hotel/guide: read-only line naming the property/guide and its contact; taxi/trek/paragliding: partner select ("Unassigned" + verified partners `legal_name || business_name`), then staff select (that partner's staff, label "Driver"/"Guide"/"Pilot") and for taxi a vehicle select (`registration_no · make_model · seats seats`). Show an empty-state hint if no verified partners of that type exist ("No approved {type} partners yet — leave unassigned or approve one in Partners").
  7. **Summary bar** (sticky bottom on mobile, card on desktop): "Booking ₹X · Commission ₹Y (Z%) · Partner gets ₹W" using `commissionRateFor` + `splitAmount`; checkboxes "Email the customer" (disabled without email) and "Email the partner/hotel/guide"; "Allow a past date" checkbox; **Create booking** button (disabled while saving). On error show the API's message in a red box above the button. On success `router.push('/admin/bookings/' + id)`.
- [ ] **Step 2: Detail page** — loads `GET /api/admin/bookings/:id`; header `Booking {ref}` with status pill and badges ("Created by admin" if `booking_source === 'admin'`, amber "manual price" if `price_overridden`, showing list price struck through). Cards: What (item_name, date_text, people, notes) · Customer (name, phone `tel:` link, email) · Price & payment (amount, commission, partner share, payment text, channel/reference) with **Change payment** inline form (same three choices) · Assigned to (partner/hotel/guide + assignee_text) with **Change** inline form (same pickers as the new page, loaded from booking-options) · Actions: **Send on WhatsApp to partner** (`waLink(partner_contact.phone, bookingShareText(view,'partner'))`), **Send on WhatsApp to customer** (`waLink(guest_phone, bookingShareText(view,'customer'))`) as `<a target="_blank">` buttons (hidden when the link is null), **Cancel booking** (opens an inline reason box, calls PATCH cancel). Each change form has a "notify by email" checkbox (default on). Show API errors inline.
- [ ] **Step 3: List page updates** (`app/(site)/admin/bookings/page.tsx`):
  - Header `action` gets a **New booking** button (`Link href="/admin/bookings/new"`, brand button with Plus icon) next to Refresh.
  - Category filter includes `guide` ("Local guide"); the category pill shows "Local guide" for `guide`.
  - Each row: badges "Admin" when `booking_source === 'admin'`, amber "manual price" when `price_overridden`; the booking ref links to `/admin/bookings/{id}`.
  - Update the header description to "Every booking — from the website or created here. Open one to assign it, change payment or cancel it."
- [ ] **Step 4:** `npx tsc --noEmit`, `npm test`, `npm run build` all pass.
- [ ] **Step 5: Commit** — "Add admin New booking form and booking detail page".

---

### Task 6: Partner bookings list

**Files:** Create `app/api/partner/bookings/route.ts`, `app/(site)/partner/bookings/page.tsx`, `tests/api/partner-bookings.test.ts`; modify `app/(site)/partner/dashboard/page.tsx`

**Interfaces:**
- `GET /api/partner/bookings` — `requireCaller(req, ['partner'])`; activity partners: bookings `where partner_id = caller.id`; hotel partners: bookings whose `property_id` is one of `properties.owner_id = caller.id`; newest first, limit 200; each mapped through the same view-building as `loadBookingView` (export a `toBookingViews(rows)` helper from `lib/manual-booking-emails.ts` that batches the related lookups) but **omitting** `commission_pct` details other than `commission_amount`/`partner_share_amount`, and with `guest_phone`/`guest_email` set to null unless `status` is `confirmed` or `completed`. Check every query's `error` → 500.

- [ ] **Step 1: Failing test** `tests/api/partner-bookings.test.ts` (mock server-auth + serviceClient): non-partner 403; activity partner only receives rows queried with `partner_id = caller` (assert the `.eq('partner_id', 'p1')` call); pending booking's phone is null, confirmed booking's phone is present.
- [ ] **Step 2: Implement the route.**
- [ ] **Step 3: Page** `app/(site)/partner/bookings/page.tsx` (`'use client'`, `max-w-5xl mx-auto px-4 sm:px-6 py-8`): title "Your bookings", subtitle "Bookings Dharamshala Stay has assigned to you."; redirect to `/partner/login` if not logged in; card per booking: ref, type pill, item_name, date_text, people, assignee_text, price, "You collect from customer — commission due Rs.X" or "Paid to Dharamshala Stay — your share Rs.Y" or "Payment pending", customer name + tap-to-call phone when shown, status pill; empty state "No bookings yet."
- [ ] **Step 4: Dashboard link** — in `app/(site)/partner/dashboard/page.tsx` header actions, add `<Link href="/partner/bookings">` "Bookings" button (ShoppingBag icon) before "Add Property"; for `partner_type` other than hotel, hide "Add Property".  The dashboard already loads the profile in `load()`; store `partner_type` in state to decide.
- [ ] **Step 5:** tests, tsc, build; commit "Add partner bookings list".

---

### Task 7: Release

- [ ] Owner runs `supabase/migration-v16-manual-bookings.sql` in the Supabase SQL editor, then verifies: `select conname, pg_get_constraintdef(oid) from pg_constraint where conname='bookings_category_check';` includes 'guide'; `select policyname from pg_policies where tablename='bookings';` includes "Partner reads assigned bookings".
- [ ] Push to main (deploys). Then in the admin panel create one booking of each type (assign the activity ones to a test partner if one exists, otherwise leave unassigned), open each detail page, try Change payment and WhatsApp links, then cancel them with reason "test".
