# WhatsApp-Only Hotel Offers (Panchvati Cottages first)

Date: 2026-10-13
Status: design approved by owner in chat ("yes"); spec awaiting owner review
Related: `2026-10-13-whatsapp-booking-control-design.md`, `2026-10-13-room-availability-design.md`

## 1. Goal

The owner runs discount offers for a hotel that are only available through the
WhatsApp chat, fully controlled from the admin portal. The first offer is
Panchvati Cottages: "up to 25% off", with a unique code from the AI that is valid
for 3 hours, or for the whole stay when the booking is paid online in full.

## 2. Decisions

| Topic | Decision |
|---|---|
| Control | Admin page: per offer – property, on/off, default %, optional % per rate plan, code validity hours, code prefix. Changes apply to new codes immediately. |
| Wording | Customers are told "up to X% off" where X = highest % configured for the offer. Never an exact % in marketing text. |
| Code | Random, unguessable: `<PREFIX>-` + 5 chars from an unambiguous alphabet (no 0/O/1/I), e.g. `PNV-7K3Q9`. One active code per phone per offer; asking again returns the same code until it expires. |
| Validity | `valid_hours` (3 for Panchvati) from issue. |
| Online path | Within the validity window, the customer books the offer's property through the WhatsApp chat with the code; price is reduced by the plan's % (snapshot on the code); payment must be online in full. Once paid, the code stays valid for that booking with no time limit. |
| Walk-in path | No online payment: the code is a walk-in coupon, shown at the property's reception within the validity window; staff apply the % at the desk. |
| Pay later | Not discounted. A booking with a code must be paid online; otherwise the code is only a walk-in coupon. |
| Stacking | Offer replaces the site-wide "up to ₹500" discount. Bookings carry `offer_code`; admin/partner views show "Offer applied – no further discount". |
| Verification | Partner portal "Check offer code" (own properties only) and admin. Shows validity, %, path (paid booking / walk-in), guest name/phone, expiry. "Mark as used" makes it single-use. |
| Turning off | Off = no new codes. Issued codes stay valid until expiry; admin can cancel any code. |
| Stripe | Online path needs `STRIPE_SECRET_KEY` on production; without it only walk-in works and the AI says so. |

## 3. Data

Migration `supabase/migration-v22-whatsapp-offers.sql`:

- `offers` – `id`, `property_id` FK properties, `name`, `active` BOOL default false,
  `default_percent` INT CHECK 1-90, `plan_percents` JSONB default '{}' (key
  `"<room name>|<plan name>"` → INT 1-90), `valid_hours` INT CHECK 1-168 default 3,
  `code_prefix` TEXT CHECK `^[A-Z]{2,5}$`, `created_at`, `updated_at`.
- `offer_codes` – `id`, `offer_id` FK, `code` TEXT UNIQUE, `phone`, `conversation_id`
  FK whatsapp_conversations NULL, `percent` INT (snapshot of the max at issue),
  `issued_at`, `expires_at`, `booking_id` FK bookings NULL, `booked_percent` INT NULL
  (the plan's % applied to the booking), `status` CHECK in
  ('issued','booked','redeemed','cancelled'), `redeemed_at`, `redeemed_by` FK profiles,
  `notes`. Expired = status 'issued' and `expires_at < now()` (computed, not stored).
- `offer_code_checks` – audit log: `code_id` NULL, `code_entered`, `checked_by`,
  `result`, `created_at`.
- `bookings.offer_code` TEXT NULL, `bookings.offer_percent` INT NULL.
- RLS on all; admin read; writes via service role. Seed: one inactive Panchvati offer
  (25%, 3 h, prefix PNV) for the owner to switch on.

## 4. Behaviour

`lib/offers/*`:
- `offerFor(propertyId)` active offer or null; `maxPercent(offer)`; `planPercent(offer, room, plan)`.
- `issueCode(offerId, phone, conversationId)` – reuse unexpired code for the phone or create one.
- `checkCode(code, { viewer })` → `{ valid, reason, path: 'paid_booking'|'walk_in', percent, guest, expires_at, booking_ref }`
  (`viewer` partner → only own properties; logs to `offer_code_checks`).
- `redeemCode(code, by)` – atomic `issued|booked → redeemed`; walk-in requires not expired;
  paid booking requires `payment_status = paid`.
- `cancelCode(code, by)` admin only.

WhatsApp:
- Prompt: when the customer asks about a property with an active offer, mention
  "up to X% off, only through this chat" (X from `offerFor`) and offer a code.
- Tool `get_offer_code({ hotel_name })` → issues/returns the code, expiry time (IST),
  max %, and the rules in one short line.
- `quote_booking` / `create_booking` accept `offer_code`: valid, unexpired, same phone,
  same property → amount reduced by the plan %; payment forced to online (error if
  Stripe off: "This offer needs online payment, which isn't available right now; show
  the code at reception within N hours instead"); code → status 'booked' with
  `booking_id`, `booked_percent`; booking gets `offer_code`/`offer_percent`.
  A booking that is cancelled or never paid releases the code back to 'issued'
  (if still within its window).

Admin: `app/(site)/admin/offers/page.tsx` (+ nav item): offers list and editor,
codes table with filters (status, offer), check/redeem/cancel box. API
`app/api/admin/offers/*` with `requireCaller(['admin'])` and zod validation.

Partner: `app/(site)/partner/offer-codes/page.tsx` (+ nav item): check + mark used.
API `app/api/partner/offer-codes/route.ts` with `requireCaller(['partner'])`,
`assertActive`, own-property scope.

## 5. Testing

Unit: code format/uniqueness retry, reuse per phone, plan % lookup, max %, expiry,
redeem atomicity, partner scope, stacking flag. WhatsApp tools: issue, quote/book
with code (online forced, Stripe-off message), wrong phone/property/expired code
rejected. API auth tests for admin and partner routes. Manual: issue a code by
chat, check it in partner portal, mark used, try again (rejected).

## 6. Out of scope

Website booking-form code entry (offer is WhatsApp-only), automatic discount at
pay-later checkout, multiple offers per property at once (one active offer per
property).
