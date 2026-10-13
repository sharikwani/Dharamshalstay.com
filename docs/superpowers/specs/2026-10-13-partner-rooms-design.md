# Partner Rooms Page (Live Room Categories)

Date: 2026-10-13
Status: approved by owner 2026-10-13, with three additions (sections 6-8)
Related: `2026-10-13-room-availability-design.md` (shipped)

## 1. Goal

Partners manage their hotel's room categories themselves, on live listings, with
changes going live immediately: total rooms for the hotel, and per category the
number of rooms, guests, bed type, price, rate plans, photos and on/off. The sum of
rooms across active categories can never exceed the hotel's total.

## 2. Decisions

| Topic | Decision |
|---|---|
| Approval | None. Saves go live immediately (hotel page, WhatsApp quotes, availability calendar). Owner gets an email summary of every change and can still edit in admin. |
| Hotel total | `properties.total_rooms` (exists), set by the partner, 1-500. |
| Cap | Sum of `total_inventory` over active categories <= `total_rooms`. Enforced server-side (400 with "Rooms assigned (N) exceed the hotel total (M)"); the page shows "Rooms assigned: N of M" live. |
| Category fields | name (2-60, unique per hotel, case-insensitive), rooms count 1-500, max adults 1-20, max children 0-20, bed type, base price per night (₹100-₹10,00,000), rate plans (name, meal plan, price, cancellation text; 0-6), description (<=500), photos (0-8), active flag, extra beds allowed per room (0-3, 0 = none) and extra bed price per night (₹0-₹50,000; default from the hotel's `extra_bed_charge`). |
| Stable id | Every category gets a permanent `id` (uuid) on first save if missing. Renames are detected by id; on rename the server moves `room_availability.room_key` rows and `bookings.room_key` for future, non-cancelled bookings to the new name, and renames the room part of `offers.plan_percents` keys. |
| Removing | A category with upcoming non-cancelled bookings cannot be deleted (409, suggests switching it off). Switching off: hidden from the hotel page and quotes; existing bookings stay valid. |
| Photos | Upload to the existing public property-image storage used by the site (plan picks the existing bucket/pattern); JPEG/PNG/WebP, 5 MB each, shrunk client-side. |
| Who | Partner, own properties only (`owner_id` = caller, `assertActive`); listing must be published or approved (drafts keep using the existing new/edit forms). Admin can use the same page for any property. |
| Late-payment alert | Stripe webhook: when a paid online hotel booking's tracked room is now oversold for any night, still record payment but email the owner "Possible overbooking: <ref>" (folded in from the availability final review). |

## 3. Behaviour

- `lib/rooms/validate.ts` (pure): normalise + validate categories, compute assigned
  total, detect renames by id, detect removals.
- `lib/rooms/store.ts` (service role): load property rooms/total; save rooms + total
  in one update; rename migration of `room_availability` / future bookings'
  `room_key`; upcoming-bookings check for removals.
- API `app/api/partner/rooms/route.ts` GET/PUT and `app/api/admin/rooms/route.ts`
  (same handler, admin scope). PUT body: `{ property_id, total_rooms, rooms: Category[] }`.
- Page `app/(site)/partner/rooms/page.tsx` (+ link in the partner dashboard header next
  to Availability): property picker, total rooms, category cards (add/edit/switch off/
  delete), assigned-of-total counter, photo upload, one Save button; errors shown inline.
- Admin: link "Rooms" on the admin property edit page opening the same component.
- Owner email on every successful save: hotel, who, what changed (added/renamed/
  removed/switched off categories, counts and price changes).

## 4. Testing

Unit: validation (cap, duplicates, ranges), rename/removal detection. API: ownership,
cap 400, removal 409, rename migration calls, admin scope. Webhook: oversold alert email
on paid tracked booking, no alert when room left >= 0. Manual: partner adds 3
categories summing to 21 with total 21, tries 22 (refused), renames one with a calendar
override (override follows), books on the site.

## 5. Out of scope

Per-date prices, approval workflow, bulk import, deleting categories with history.

Also: the hotel page and WhatsApp quotes hide switched-off (`is_active === false`) categories (the hotel page shows all today).

## 6. Addition: extra bed

- Each category has `extra_beds_max` (0-3) and `extra_bed_price` (per bed per night).
- Hotel page: when the chosen room allows it, an "Extra bed" picker (0..max) with the price; the estimate adds
  beds x price x nights. WhatsApp AI: `get_hotel` lists the extra-bed option; `quote_booking` accepts `extra_beds`.
- Server: `bookingSchema.extra_beds` (int 0-3, default 0); `quoteBooking` adds `extra_beds * extra_bed_price * nights`
  and refuses more beds than the room allows (400 "This room allows at most N extra bed(s)"). Stored in
  `bookings.extra_beds` (migration v26) and shown in the room label ("Deluxe - Breakfast + 1 extra bed"), emails,
  WhatsApp alerts and admin/partner booking pages.

## 7. Addition: the customer is always told when a booking is confirmed

Today the admin "Confirm" button writes straight to the database (no customer notice), a hotel's WhatsApp
"Accept" never confirms the booking, and pay-later bookings get a "Booking Confirmed!" email while still pending.

- `lib/bookings/confirm.ts` `confirmBooking(id, by: 'admin' | 'partner' | 'payment')`: moves a `pending` booking to
  `confirmed` (records `confirmed_at`, `confirmed_by`; migration v26), then sends the customer the confirmation
  email (if they gave one) and the `booking_confirmed_customer_v2` WhatsApp template (works outside the 24h window).
  Already confirmed: no-op, no second notice. Cancelled/failed/completed: 409.
- Who confirms: the hotel by tapping Accept on WhatsApp or a new "Confirm" button in the partner bookings page (pay-later
  bookings only; online bookings are confirmed by payment); the admin at any time with "Confirm" (list and detail pages,
  now through `PATCH /api/admin/bookings/[id]` action `confirm`). Whoever is first wins; the other sees "already confirmed".
- Stripe payment: customer also gets the WhatsApp confirmation (email already sent).
- Pay-later booking when made: the customer email becomes "Booking request received - the hotel will confirm shortly"
  (matches what the WhatsApp assistant says); the "Booking Confirmed" email goes out on confirmation.
- Admin list: pending bookings show "Waiting for hotel · 3h" so late ones stand out. The list's "Cancel" goes through
  the cancel API (emails + notices) instead of a silent write.
- Customer cancellation notice on WhatsApp: new template `booking_cancelled_customer` (sent with the existing
  cancellation emails; needs Meta approval via `npm run whatsapp:templates`).

## 8. Addition: professional WhatsApp messages

- The assistant's prompt gets WhatsApp layout rules: a greeting line, then short blocks separated by one blank line,
  one fact per line for details (📅 dates, 🛏️ room, 👥 guests, 💰 price), *single-asterisk bold* for key facts,
  2-4 fitting emojis, a clear closing question or next step. No markdown headings, tables or `**`.
- `lib/whatsapp-format.ts` `tidyWhatsApp(text)` runs on every assistant reply and fixed message: `**x**` -> `*x*`,
  `#` headings -> bold line, `-`/`*` bullets -> `•`, trailing spaces trimmed, 3+ newlines -> one blank line.
- Quote, booking-status and cancellation texts from the tools, and the fixed replies (holding reply, proof received,
  cancelled), are rewritten as tidy multi-line messages with emojis. Manual wa.me share text gets the same layout as
  the templates.
