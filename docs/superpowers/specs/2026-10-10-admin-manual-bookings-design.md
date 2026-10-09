# Admin Manual Bookings

Date: 2026-10-10
Status: draft for review
Related: `2026-10-09-partner-marketplace-design.md` (phases 0–1 shipped; this pulls a slice of phase 2 forward)

## 1. Goal

Let the admin create a booking by hand (phone, WhatsApp or walk-in) for a
**hotel, taxi, trek, paragliding flight or local guide**, choose the exact
room / rate plan / route / package / guide, set or adjust the price, record how
it is paid, and assign it to the right property, partner, driver/pilot/guide
and vehicle. Assigned partners see the booking in their portal.

### Decisions agreed with the owner
| Topic | Decision |
|---|---|
| Price | Prefilled from the room/plan, route, package or guide day rate; admin may edit. An edited price is saved and labelled **"manual price"**, keeping the list price for reference. |
| Payment | Three choices: (1) customer pays the partner/hotel directly; (2) customer paid Dharamshala Stay (amount, method UPI/bank/cash/card, reference); (3) not paid yet (can be marked paid later). Stripe payment links come later. |
| Taxi / paragliding / trek assignment | Pick an **approved** partner of that type, then optionally a driver/pilot/guide and vehicle from **that partner's own** team and fleet. If chosen, the customer email includes them. |
| Local guides | Stay as admin-managed profiles (no login). Priced day rate × days. Notified by email if they have one, plus a "Send on WhatsApp" button. 20% commission, same payment choices. |
| Storage | Manual bookings are ordinary rows in `bookings`, tagged as created by admin, so one list, one partner view, one commission view. |

## 2. Scope

In: admin "New booking" page; server-side create API with validation and
repricing; schema additions; partner-portal "Bookings" tab (read-only list);
admin booking list badges and a detail view to reassign, change payment status
or cancel; emails and WhatsApp share text; tests.

Out (still Phase 2/3): partner accept/reject, live taxi status, driver logins,
dispatch board, ledger/payouts, Stripe payment links, guide logins.

## 3. The New Booking form (`/admin/bookings/new`)

One page; sections appear for the chosen type.

**Type** — Hotel · Taxi · Trek · Paragliding · Local guide.

**What is booked**
| Type | Fields | List price |
|---|---|---|
| Hotel | property (searchable, published + directory), room, rate plan, check-in, check-out, guests | plan price (or room base price, or property `price_min`) × nights |
| Taxi | route (from `taxi_routes`) **or** "custom trip" (pickup, drop); date, pickup time, vehicle type, passengers | route `price` if fixed; custom trip has no list price (admin enters it) |
| Trek | trek, date, people | `price_per_person` × people |
| Paragliding | package, date, people | `price_per_person` × people |
| Local guide | guide, start date, number of days (1–30), people | `price_per_day` × days |

**Customer** — name (required), phone (required, 10+ digits), email (optional), notes.

**Price** — shows the list price; an editable "Final price (₹)" field defaults
to it. If the final price differs, a "manual price" badge appears and a short
"Reason" field (optional) is shown.

**Payment** — radio:
1. *Customer pays the partner/hotel directly* → partner owes commission.
2. *Customer paid Dharamshala Stay* → amount received (defaults to final
   price), method (UPI, bank, cash, card), reference (optional) → we owe the
   partner their share.
3. *Not paid yet*.

**Assign to**
- Hotel: the chosen property (automatic). Shows the property's contact email/phone.
- Taxi / Trek / Paragliding: partner dropdown of **verified** partners of the
  matching `partner_type`; then optional staff dropdown (that partner's active
  `partner_staff` with role driver / guide / pilot respectively) and, for
  taxi, optional vehicle dropdown (that partner's active vehicles). "Unassigned"
  is allowed — the booking is then in the admin's hands.
- Local guide: the chosen guide (automatic).

**Commission preview** — "Booking ₹X · Commission ₹Y (Z%) · Partner gets ₹W",
recomputed live. Rate: partner's `profiles.commission_pct` for activity
partners (default 20); property `commission_pct` for hotels (default 10);
20 for guides; unassigned activity bookings use 20.

**Notify** — checkboxes, on by default: email customer (if email given);
email partner/hotel/guide (if they have an email).

On save: redirect to the booking's detail page, which shows the booking
reference and a **Send on WhatsApp** button (to the partner/guide/hotel phone)
and **Send to customer on WhatsApp** button, both prefilled with the details.

## 4. Data model — `supabase/migration-v16-manual-bookings.sql`

`bookings` changes:
- `category` CHECK extended to include `'guide'`.
- New columns:
  - `guide_id UUID REFERENCES guides(id)`
  - `guide_days INT CHECK (guide_days BETWEEN 1 AND 30)`
  - `partner_id UUID REFERENCES profiles(id)`
  - `staff_id UUID REFERENCES partner_staff(id)`
  - `vehicle_id UUID REFERENCES vehicles(id)`
  - `list_amount INT` — price from the catalogue at creation (NULL for custom taxi trips)
  - `price_overridden BOOLEAN NOT NULL DEFAULT FALSE`
  - `price_override_reason TEXT`
  - `collected_by TEXT CHECK (collected_by IN ('partner','platform'))` — NULL = not paid yet
  - `payment_channel TEXT CHECK (payment_channel IN ('upi','bank','cash','card','stripe'))`
  - `payment_reference TEXT`
  - `partner_share_amount INT` — amount − commission
  - `created_by UUID REFERENCES profiles(id)` (admin who created it; NULL for website bookings)
- `booking_ref` trigger: `GDE-` prefix for guide bookings.
- `auto_commission` trigger (v3) keeps creating a `commission_records` row
  for offline / pay_at_hotel bookings; manual bookings set `payment_method`
  accordingly (below) so cash-to-partner bookings appear in the existing
  commission views.

Field mapping for manual bookings:
| Payment choice | `payment_method` | `payment_status` | `collected_by` | `commission_status` |
|---|---|---|---|---|
| Pays partner/hotel directly | `pay_at_hotel` for hotels, `offline` otherwise | `pending` | `partner` | `pending` |
| Paid Dharamshala Stay | `offline` (or `online` if channel = card/stripe) | `paid` (`paid_amount` = amount received) | `platform` | `not_applicable` |
| Not paid yet | `offline` | `pending` | NULL | `pending` |

`booking_source = 'admin'`, `status = 'confirmed'`.

RLS:
- No new policy: partners read their assigned bookings only through `/api/partner/bookings` (service role), so no partner SELECT policy is added.
- Existing policies unchanged (admins full access; hotel partners read their property's bookings; customers read their own).

## 5. Server

`POST /api/admin/bookings` (admin only, `requireCaller(req, ['admin'])`), zod-validated:
1. Load the item by id from its table (`properties`, `taxi_routes`, `treks`,
   `paragliding_packages`, `guides`); 404 if missing.
2. Compute `list_amount` with `lib/pricing.ts` (`quoteBooking`, extended with
   `guide`: `price_per_day × guide_days`). Custom taxi: `list_amount = null`
   and `final_amount` is required.
3. `final_amount` (integer ₹, 0–10,000,000) defaults to `list_amount`;
   `price_overridden = final_amount !== list_amount`.
4. Assignment checks: partner exists, `role = 'partner'`,
   `partner_status = 'verified'`, `partner_type` matches the category
   (taxi→taxi, trek→trek, paragliding→paragliding); staff belongs to that
   partner, is active and has the matching role; vehicle belongs to that
   partner and is active. Hotel/guide bookings must not carry a partner_id.
   Violations → 400 with a plain-English message.
5. Commission rate per §3; `commission_amount = round(final × pct / 100)`;
   `partner_share_amount = final − commission_amount`.
6. Dates: hotel check-out after check-in; activity/start date not in the
   past (IST) unless "allow past date" is ticked (for recording walk-ins
   after the fact).
7. Insert; then send the chosen emails (never fail the request on email
   errors; log them); return `{ id, booking_ref }`.

`PATCH /api/admin/bookings/[id]` (admin only): `assign` (same checks),
`payment` (move between the three payment choices, recomputing the mapped
fields), `cancel` (with reason). Each change emails the affected parties if
the admin ticks "notify".

`GET /api/admin/booking-options?type=...` (admin only): returns the pickers'
data — properties with rooms/plans, routes, treks, packages, guides, verified
partners of the type with their active staff and vehicles.

`GET /api/partner/bookings` (partner, any status): bookings where
`partner_id = caller` (plus hotel partners' property bookings), newest first,
with customer name/phone shown only for `confirmed`/`completed` bookings.

Emails (`lib/booking-emails.ts`): customer confirmation (now naming the
partner and, if set, driver/pilot/guide name and phone and vehicle number);
partner/hotel/guide "New booking from Dharamshala Stay" with customer name,
phone, dates, people, price and how it is paid (and the commission they owe
if they collect it).

WhatsApp: `lib/whatsapp.ts` builds the prefilled message text and a
`https://wa.me/<number>?text=` link (numbers normalised to 91XXXXXXXXXX).

## 6. Pages

- `/admin/bookings/new` — the form (§3). Linked from a **New booking** button on `/admin/bookings`.
- `/admin/bookings/[id]` — detail: everything stored, badges (Created by admin, manual price), assignment with Change, payment with Change, Cancel, WhatsApp buttons.
- `/admin/bookings` list — adds columns/badges: type "Local guide", "Admin" source badge, "manual price" badge, assigned partner name.
- `/partner/bookings` — new tab in the partner portal: list of assigned bookings (date, type, item, people, price, payment, customer contact when confirmed). Linked from the partner dashboard and onboarding-complete state.
- Layout matches the existing admin pages (`max-w-7xl mx-auto px-4 sm:px-6 py-8`, `AdminPageHeader`, card rows).

## 7. Errors and integrity
- All prices and commission are computed on the server; the client's preview is display-only.
- Server rejects: unverified or wrong-type partner, staff/vehicle from another partner, inactive staff/vehicle, missing custom-trip price, past dates without the override, guide days outside 1–30.
- Email failures are logged, never block saving.
- Every write checks the Supabase `error` and returns 500 on failure.

## 8. Testing
- Unit (Vitest): guide pricing; list vs final price and `price_overridden`; commission and partner share for each source of rate; payment-choice → field mapping; WhatsApp text and number normalisation.
- Route tests with mocked Supabase: non-admin 403; unverified partner 400; driver from another partner 400; custom taxi without price 400; happy path inserts the expected row and calls the email helpers.
- `npm run build` passes; admin form checked in the browser after deploy.

## 9. Rollout
1. Run `migration-v16-manual-bookings.sql` in the Supabase SQL editor (adds columns/policy; safe on live data).
2. Deploy.
3. Create one test booking of each type, assigned to a test partner, then cancel them.
