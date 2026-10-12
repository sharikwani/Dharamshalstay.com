# WhatsApp Booking Control

Date: 2026-10-13
Status: design approved by owner in chat (sections 1 and 2: "yes"); spec awaiting owner review
Related: `2026-10-12-whatsapp-ai-assistant-design.md`, `2026-10-10-whatsapp-booking-alerts-design.md`

## 1. Goal

A customer can book a hotel, taxi, trek or paragliding flight end to end in the
WhatsApp chat, choose to pay online or later exactly as on the website, check
their own bookings, and cancel an unpaid booking when they have a valid reason
with proof. The AI never handles money decisions: paid bookings, refunds and
anything unclear go to the owner.

Success: a customer who never opens the website ends the chat with a real
booking (a `bookings` row with `booking_source = 'whatsapp'`) that the partner
and admin see and handle exactly like a website booking.

## 2. Decisions

| Topic | Decision |
|---|---|
| How bookings are created | Shared code with the website (approach A). Booking, Stripe link and cancel logic move out of their routes into `lib/bookings/*`; website, admin and AI all call the same functions. |
| Prices | Always from the database via `quoteBooking`. The AI passes names and details, never ids or amounts. |
| Confirmation | Code-enforced: a booking needs a saved quote shown to the customer and a customer message after it. |
| Payment | Same two choices as the website: **Pay online** (Stripe Checkout link sent in chat) or **Pay later** (`pay_at_hotel` for hotels, `offline` for others). `partial_online` is not offered (nothing charges a deposit today). |
| Booking status wording | AI says "requested, waiting for confirmation" until the partner accepts; never "confirmed". |
| Own bookings only | Lookup and cancellation match bookings whose `guest_phone` equals the chat's WhatsApp number (last 10 digits). |
| Cancel – paid | Never by AI. Handover to owner, who applies the published refund table. |
| Cancel – unpaid, < 24 h before start | Not allowed. AI replies with the policy. Hands over only if the customer reports an emergency or is upset. |
| Cancel – unpaid, ≥ 24 h before start | AI may cancel with a reason from the valid list and matching proof (section 5). Otherwise handover. |
| Proof check | AI reads the proof image (`gpt-4.1` vision). Only a `matches` verdict cancels; `mismatch` or `unclear` goes to the owner. |
| Published policy | Add a rule for every category: no cancellation and no refund within 24 hours of start. Taxi "6–24 h: 50%" row becomes "under 24 h: no cancellation, no refund". Other tables unchanged. |
| Limits | Max 3 WhatsApp bookings per number per rolling 24 h; beyond that, handover. Existing reply limits stay. |

"Start" means `check_in` for hotels and `activity_date` (plus `pickup_time` when
set, else 00:00) for taxi, trek and paragliding, in India time (IST).

## 3. Shared booking code

Extracted with behaviour unchanged; existing route tests must keep passing.

- `lib/bookings/create.ts` – `createBooking(input, { source, userId, callerRole })`
  returns `{ ok: true, booking } | { ok: false, error, status }`. Holds today's
  `/api/bookings` logic: date rules (IST, past dates, check-out after check-in,
  hotel dates required), partner-email guard, entity lookup, `quoteBooking`,
  commission, online→offline fallback when the amount is under ₹100 or Stripe is
  off, insert, notification log rows, booking emails. `/api/bookings` validates
  with zod and calls it.
- `lib/bookings/checkout.ts` – `createCheckoutLink(bookingId, { returnPath })`
  returns `{ ok: true, url } | { ok: false, error }`. Holds today's
  `/api/checkout` logic. The route calls it.
- `lib/bookings/cancel.ts` – `cancelBooking(id, reason, { notify })` sets
  `status = 'cancelled'`, `cancelled_reason`, waives unpaid commission, syncs
  commission records, and when `notify` sends the cancellation emails and the
  partner WhatsApp alert. The admin route's cancel branch calls it.
- `lib/bookings/timing.ts` – `startsAt(booking)` and
  `hoursUntilStart(booking, now)` using the IST rule above.

## 4. AI booking tools

New file `lib/wa-chat/booking-tools.ts`, registered in `TOOL_DEFS` and
`runTool`. Every tool takes the chat context (`conversationId`, `phone`); the
phone is never an argument the AI can set.

| Tool | Arguments | Behaviour |
|---|---|---|
| `quote_booking` | `category`, item `name` (hotel / trek / package / route as "from–to"), dates, `num_guests`, hotel `room_name` + `plan_name`, taxi `vehicle_type` + `pickup_time` + pickup/drop | Resolves the item by name (same matching as existing lookup tools), runs the same date checks and `quoteBooking`. Saves a row in `whatsapp_quotes` (30 min expiry) and returns `{ quote_id, summary, amount, online_payment_available }`. Errors come back as `{ error }` in plain words for the AI to relay. |
| `create_booking` | `quote_id`, `payment` (`online` \| `later`), `guest_name`, `guest_email?` | Checks: quote exists, belongs to this conversation, not expired, not used; a customer message exists after `quote.created_at`; fewer than 3 WhatsApp bookings for this phone in 24 h. Calls `createBooking` with `source = 'whatsapp'`, `guest_phone` = chat phone. Marks the quote used. For `online`, also calls `createCheckoutLink` and returns the URL. Returns `{ booking_ref, status: 'requested', payment_url? }`. |
| `payment_link` | `booking_ref` | Own, unpaid, not cancelled booking only. Returns a fresh Stripe link. |
| `my_bookings` | – | Up to 5 most recent own bookings: ref, item, dates, guests, amount, payment status, status. |
| `request_cancellation` | `booking_ref`, `reason_code`, `reason_text` | Runs the rules in section 5 and returns one of: `cancelled`, `need_proof`, `not_allowed_within_24h`, `handed_over`, `not_found`, `already_cancelled`. |

Return path for Stripe links from WhatsApp: the booking success page as today;
the cancel URL goes to the category page.

## 5. Cancellation rules

Valid `reason_code` values:

| Code | Reason | Proof needed |
|---|---|---|
| `medical` | Illness or medical emergency | Doctor's note or hospital paper |
| `travel_disruption` | Flight / train / bus cancelled or delayed | Cancellation or delay notice |
| `family_emergency` | Death or emergency in the family | Any supporting document |
| `weather_road` | Landslide, snow, road closure, official advisory | News screenshot or official notice |
| `duplicate_or_mistake` | Booked twice or by mistake | None if the code finds another own, non-cancelled booking for the same item and overlapping dates created within 48 h; otherwise handover |
| `other` | Anything else | – (always handover) |

`request_cancellation` order of checks, all in code:

1. Find the booking by ref among the caller's own bookings → else `not_found`.
2. Already cancelled → `already_cancelled`.
3. Paid (`payment_status = 'paid'`) → handover ("paid booking cancellation").
4. `hoursUntilStart < 24` → `not_allowed_within_24h`.
5. `other` → handover. `duplicate_or_mistake` → duplicate check → `cancelled` or handover.
6. Otherwise save a `whatsapp_cancellations` row (`status = 'awaiting_proof'`)
   and return `need_proof`. The AI asks for a photo or PDF of the proof.

**Proof handling.** In `handleInbound`, an image or PDF from a conversation with
an `awaiting_proof` row (created in the last 24 h) is no longer handed straight
to the owner. Instead:

1. Download the media (existing `downloadMedia`), store it in the private
   Supabase bucket `whatsapp-proofs` at `<conversation>/<cancellation>.<ext>`.
2. `lib/wa-chat/proof.ts` – `checkProof({ image, mimeType, guestName, startDate, reasonCode, reasonText })`
   sends the image to `gpt-4.1` with a strict JSON schema answer:
   `{ verdict: 'matches' | 'mismatch' | 'unclear', notes }`. The prompt asks
   whether the document plausibly supports the stated reason, names the guest
   (or a family member for `family_emergency`) and falls on or before the start
   date. PDFs are sent as file input; on any error the verdict is `unclear`.
3. Re-check steps 2–4 above (state may have changed), then
   - `matches` → `cancelBooking(id, "WhatsApp: <reason> (proof checked)", { notify: true })`,
     row `status = 'cancelled'`, AI tells the customer it is cancelled.
   - `mismatch` / `unclear` → row `status = 'needs_review'`, handover with the
     reason, notes and a link to the proof; AI tells the customer the team will
     review it.
4. Other media with no open request keeps today's behaviour (handover).

Owner review: the handover email and the `/admin/whatsapp` conversation show
the cancellation row (reason, verdict, notes, signed link to the proof). The
owner cancels from the existing admin booking page if they agree.

## 6. Data

Migration `supabase/migration-v20-whatsapp-booking.sql`:

- `whatsapp_quotes` – `id`, `conversation_id` (FK), `category`, `input` JSONB
  (the resolved booking input incl. entity id), `amount`, `summary`,
  `expires_at`, `used_booking_id` (FK bookings, nullable), `created_at`.
- `whatsapp_cancellations` – `id`, `conversation_id` (FK), `booking_id` (FK),
  `reason_code`, `reason_text`, `status` (`awaiting_proof`, `cancelled`,
  `needs_review`, `handed_over`), `proof_path`, `verdict`, `verdict_notes`,
  `created_at`, `updated_at`.
- Private storage bucket `whatsapp-proofs` (service role only).
- RLS enabled on both tables with no public policies (service role only), as
  for the existing chat tables.

## 7. AI instructions

`SYSTEM_PROMPT` booking section is rewritten:

- Collect details, call `quote_booking`, send the summary with the price and
  both payment choices, and ask the customer to reply YES. Only call
  `create_booking` after a clear yes to that summary.
- Say "booking requested, the property/operator will confirm shortly"; never
  "confirmed" or "reserved".
- Online payment: send the link from the tool, never a made-up URL.
- Cancellation: follow the tool result. Within 24 h, explain politely that
  bookings cannot be cancelled or refunded within 24 hours of the start time;
  hand over only for an emergency or an upset customer. Never promise a refund.
- The discount note and other existing rules stay. The handover list keeps
  "cancelling or changing a paid booking" and "refunds".

## 8. Error handling

- Tool failures return `{ error }`; the AI tells the customer plainly and offers
  handover. It never claims success without a `booking_ref` from the tool.
- `createBooking` failure after a yes → holding reply path plus owner email
  (existing processor behaviour on thrown errors is unchanged).
- Stripe link failure → booking stays as pay later; AI says payment can be done
  later or at the property and offers a new link with `payment_link`.
- Proof download/storage/vision failure → `unclear` → owner review.

## 9. Testing

- Existing tests for `/api/bookings`, `/api/checkout`, admin booking cancel and
  WhatsApp stay green after the extraction.
- Unit tests: `hoursUntilStart` (IST, hotel vs activity, pickup time);
  `request_cancellation` for each branch; `create_booking` guards (no quote,
  expired, other conversation, no message after quote, used quote, daily
  limit); `quote_booking` name resolution and date errors; `checkProof` parsing
  and failure → `unclear`; inbound media routing with and without an open
  cancellation.
- Manual: one pay-later and one online test booking from a phone, one
  cancellation with a matching proof and one with an unrelated photo.

## 10. Out of scope

- Changing dates or guests on an existing booking (handover).
- Refunds of any kind, and cancelling paid bookings.
- Deposits / `partial_online`.
- Guide bookings (not bookable on the website either).
- Live room availability (the website does not check it either; the partner
  accepts or declines as today).
