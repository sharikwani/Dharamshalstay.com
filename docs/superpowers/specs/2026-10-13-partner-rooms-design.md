# Partner Rooms Page (Live Room Categories)

Date: 2026-10-13
Status: design approved by owner in chat ("yes"); spec awaiting owner review
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
| Category fields | name (2-60, unique per hotel, case-insensitive), rooms count 1-500, max adults 1-20, max children 0-20, bed type, base price per night (₹100-₹10,00,000), rate plans (name, meal plan, price, cancellation text; 0-6), description (<=500), photos (0-8), active flag. |
| Stable id | Every category gets a permanent `id` (uuid) on first save if missing. Renames are detected by id; on rename the server moves `room_availability.room_key` rows and `bookings.room_key` for future, non-cancelled bookings to the new name. |
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
