# Room Availability (Partner Calendar)

Date: 2026-10-13
Status: design approved by owner in chat ("yes go ahead"); spec awaiting owner review
Related: `2026-10-13-whatsapp-booking-control-design.md`

## 1. Goal

Partners (and admins) control how many rooms of each room type can be sold on each
date. The hotel page keeps showing every room, like MakeMyTrip, but a room type with
no rooms left for the chosen dates shows **Sold out** and cannot be booked, on the
website or through the WhatsApp assistant.

Success: a partner sets "Standard: 0 rooms, 20-25 Oct"; a customer choosing 21-23 Oct
sees Standard as Sold out and cannot book it; choosing 26-27 Oct books normally.

## 2. Decisions

| Topic | Decision |
|---|---|
| Model | Calendar per room type. Default rooms open per date = the room type's `total_inventory`. Partner overrides any date or date range. |
| No count set | Room types with no `total_inventory` (null or 0) are **not tracked**: always bookable, as today. |
| What holds a room | Bookings that are not cancelled/failed/no_show and either: pay later (`offline`, `pay_at_hotel`), any status pending/confirmed/completed; or `online` and paid; or `online`, unpaid, created in the last 30 minutes. |
| Outside bookings | Walk-ins, phone, other OTAs: the partner lowers the calendar manually. No channel sync. |
| Who edits | Partner, for properties where `owner_id` = their id (own or claimed). Admin, for any property. |
| Claiming | Unchanged (WhatsApp request, admin links owner). A linked hotel appears in the partner's calendar automatically. |
| Prices | Unchanged. No per-date pricing. |
| Race | Server checks before insert and re-checks right after insert; if the new booking oversold a night, it is marked failed and the customer is told the room just sold out. |

## 3. Data

Migration `supabase/migration-v21-room-availability.sql`:

- `room_availability` – `property_id` UUID FK properties ON DELETE CASCADE,
  `room_key` TEXT (the room type's exact name), `date` DATE, `units` INT NOT NULL
  CHECK (units >= 0), `updated_by` UUID FK profiles, `updated_at` TIMESTAMPTZ.
  PRIMARY KEY (property_id, room_key, date). RLS on; admin read policy; partner
  read policy for own properties; writes only through the service role (API routes).
- `bookings.room_key` TEXT NULL – the room type's exact name, set for new hotel
  bookings. Old bookings: `room_key` null → matched by `room_name` prefix
  (`room_name = key` or starts with `key || ' - '`).
- Index on `bookings(property_id, check_in, check_out)` for the overlap query.

## 4. Counting

`lib/availability/calc.ts` (pure):
- `nightsOf(checkIn, checkOut): string[]` – each night date.
- `holdsRoom(booking, now): boolean` – the rule in section 2.
- `roomsLeft({ total, overrides, bookings, nights, now }): { left: number; byNight: Record<string, number> }`
  – per night `open(date) = override ?? total`, `left(date) = open - holding bookings overlapping that night`; stay `left = min`.

`lib/availability/store.ts` (service role):
- `availabilityFor(propertyId, checkIn, checkOut): Promise<Record<roomKey, { tracked: boolean; left: number }>>`
- `monthGrid(propertyId, roomKey, month)` for the calendars (open/booked/left per date).
- `setUnits(propertyId, roomKey, from, to, units, userId)` – upsert a row per date (max 366 days per call).

## 5. Partner and admin UI

- `app/(site)/partner/availability/page.tsx`: choose property (own) and room type;
  month grid with open/booked/left per day; select a range, enter rooms open, save.
  Link in the partner navigation.
- API `app/api/partner/availability/route.ts`: GET (month grid) and PUT (set range),
  `requireCaller(['partner'])`, `assertActive`, property must have `owner_id` = caller.
- Admin: same calendar component at `app/(site)/admin/properties/[id]/availability/page.tsx`
  with API `app/api/admin/availability/route.ts` (`requireCaller(['admin'])`); link from
  the admin property edit page.
- Validation: units 0-999, room_key must be one of the property's room names, dates
  YYYY-MM-DD, from <= to, range <= 366 days, not before today (IST).

## 6. Hotel page

- Public API `app/api/availability/route.ts` GET `?property_id&check_in&check_out` →
  `{ rooms: { [roomKey]: { tracked, left } } }` (no booking details exposed).
- `HotelBooking.tsx` / `BookingForm.tsx`: when both dates are chosen, fetch it;
  room cards show **Sold out** (plans disabled) or **Only N left** (N <= 3);
  submitting a sold-out room is blocked client-side with a clear message.

## 7. Booking safety

- `createBooking` (hotel with `room_name` and tracked room type): before insert,
  `left < num_rooms(1)` → `{ ok: false, error: 'Sold out for these dates', status: 409 }`.
  Stores `room_key`. After insert, recompute; if any night is now negative, update
  the new booking to `status: 'failed'` with `cancelled_reason: 'Sold out (race)'`
  and return the same 409. Emails are only sent after the re-check passes.
- WhatsApp `quote_booking` (hotel): check availability; sold out → error listing
  the room types that still have space for those dates.

## 8. Testing

- Unit: `holdsRoom` (each payment/status case, 30-minute online window),
  `roomsLeft` (overrides, overlaps, untracked, min across nights), validation.
- API: partner can only read/write own properties; admin any; public endpoint
  returns only counts.
- `createBooking`: sold-out 409, race re-check marks failed, untracked rooms unaffected,
  existing booking tests unchanged.
- WhatsApp quote: sold out → alternatives.
- Manual: set 0 for a range in the partner calendar, check the hotel page and a
  WhatsApp quote for dates inside and outside the range.

## 9. Out of scope

Channel manager / OTA sync, per-date pricing, minimum stay rules, multi-room
bookings in one request (one booking = one room, as today).
