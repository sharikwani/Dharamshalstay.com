# WhatsApp Booking Alerts

Date: 2026-10-10
Status: approved by owner ("go ahead and do everything")
Related: `2026-10-10-admin-manual-bookings-design.md`

## 1. Goal

Partners (and their assigned driver/pilot/guide), hotels and local guides get
new, changed and cancelled bookings **automatically on WhatsApp** from the
Dharamshala Stay business number, with **Accept / Can't do it** buttons.
Customers can also get their confirmation on WhatsApp. Email stays as the
backup. Nothing changes until WhatsApp credentials are configured.

## 2. Meta setup (done / owner)
- Business portfolio "Dharamshala Stay" (id 1911150040047815), app "Dharamshala Stay Bookings" (id 1623197262587099), WhatsApp enabled.
- Test number +1 555 631 8363 — phone number id `1357037027493117`, WABA id `1408639064178047`. Test number can message up to 5 verified recipients.
- Owner still to do: add the real business number (OTP), payment method, business verification, a permanent System User token, and paste secrets into Vercel.

## 3. Decisions
| Topic | Decision |
|---|---|
| Provider | Meta WhatsApp Cloud API directly (Graph API `v21.0`), no BSP. |
| Message type | Pre-approved **utility** templates (English), ~₹0.115 + GST each. |
| Who gets alerts | Activity partners and their assigned staff, hotels, guides — only if a WhatsApp number is set **and** WhatsApp alerts are switched on for them. Customers on manual bookings when admin ticks "WhatsApp the customer". |
| Consent | Partners tick "Send me booking alerts on WhatsApp" in onboarding (stored with timestamp). Admin can switch alerts on/off for partners, hotels and guides. |
| Replies | Quick-reply buttons "Accept" / "Can't do it" update the booking's partner response and alert the admin by email when declined. |
| Delivery tracking | Every send is logged; Meta's status webhooks update it (sent → delivered → read / failed). Shown on the admin booking page. |
| Fallback | Emails are always sent as today. WhatsApp failures are logged, never block a save. |
| Secrets | `WHATSAPP_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN` only in Vercel env. Non-secret: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WABA_ID`. |

## 4. Templates (category UTILITY, language `en`)
1. `booking_new_partner` — body: "New booking {{1}} from Dharamshala Stay. Service: {{2}}. Date: {{3}}. Guests: {{4}}. Customer name: {{5}}. Customer phone: {{6}}. Price: {{7}}. Payment: {{8}}. Please tap a button below to confirm." (8 params: ref, service, date, guests, customer name, customer phone, price, payment) Buttons: quick reply "Accept", quick reply "Can't do it".
2. `booking_cancelled_partner` — body: "Booking {{1}} ({{2}} on {{3}}) has been cancelled. Reason: {{4}}." (4 params)
3. `booking_confirmed_customer` — body: "Your Dharamshala Stay booking {{1}} is confirmed. Service: {{2}}. Date: {{3}}. Guests: {{4}}. {{5}}. Price: {{6}}. Payment: {{7}}. Questions? Reply here." (7 params; {{5}} is always a full phrase: "Your driver: …" / "Your pilot: …" / "Your guide: …", "Assigned: …" for other categories, or "Assigned: Not yet assigned")
Template parameters never contain newlines or more than 4 consecutive spaces (Meta rule); text is trimmed to 300 chars per parameter.

## 5. Data — `supabase/migration-v17-whatsapp.sql`
- `profiles`: `whatsapp_number TEXT`, `whatsapp_alerts BOOLEAN NOT NULL DEFAULT FALSE`, `whatsapp_opt_in_at TIMESTAMPTZ`, `whatsapp_opt_in_by TEXT CHECK (IN ('partner','admin'))` (who switched alerts on; stamped with the time on every off → on change). A valid number is only required to switch alerts on; otherwise the number is stored normalised or null.
- `properties`: `whatsapp_alerts BOOLEAN NOT NULL DEFAULT FALSE` (uses `contact_phone`).
- `guides`: `whatsapp_alerts BOOLEAN NOT NULL DEFAULT FALSE` (uses `phone`).
- `partner_staff`: `whatsapp_alerts BOOLEAN NOT NULL DEFAULT TRUE` (staff alerts only go out when the partner's alerts are on).
- `bookings`: `partner_response TEXT CHECK (partner_response IN ('accepted','declined'))`, `partner_responded_at TIMESTAMPTZ`.
- New `whatsapp_messages`: id, booking_id (FK, nullable), recipient_kind (`partner`,`staff`,`hotel`,`guide`,`customer`), to_phone, template, wa_message_id (unique), status (`queued`,`sent`,`delivered`,`read`,`failed`), error, created_at, updated_at. RLS on; admin read only; writes by service role.
- Protect `whatsapp_alerts`/`whatsapp_opt_in_at` like other partner fields? No — partners may change their own consent through the API only (profiles trigger already blocks direct browser writes to protected fields; add the WhatsApp fields to the trigger list so changes go through `/api/partner/profile`, `/api/partner/whatsapp` or the admin API).

## 6. Server
- `lib/whatsapp-cloud.ts`: `isWhatsAppConfigured()`, `sendTemplate({ to, template, params, buttons? })` → `{ ok, id?, error? }` (POST `https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages`), `verifySignature(rawBody, header)` (HMAC-SHA256 with app secret, timing-safe).
- `lib/booking-whatsapp.ts`: `whatsappNewBooking(bookingId, { customer: boolean })`, `whatsappCancelled(bookingId, reason)`, `whatsappReassignedAway(bookingId, previousPartnerId)` (uses the cancelled template with reason "Reassigned to another partner"). Builds recipients from the booking view (partner/staff/hotel/guide with alerts on and a valid Indian number), sends, logs each message. Never throws.
- Call sites: next to every existing email call — `app/api/admin/bookings/route.ts` (create), `app/api/admin/bookings/[id]/route.ts` (assign → new partner; reassign-away; cancel), `lib/booking-emails.ts` `sendBookingEmails` (website bookings → hotel alerts).
- `app/api/whatsapp/webhook/route.ts`: GET verification (`hub.mode=subscribe`, `hub.verify_token` matches → echo `hub.challenge`); POST with signature check → status updates update `whatsapp_messages`; button replies (`messages[].type === 'button'` / `interactive`, with `context.id`) → find the logged message → booking → set `partner_response` + time; on "Can't do it" email the admin. Always respond 200 quickly after a valid signature.
- `PATCH /api/partner/profile` and onboarding: WhatsApp number + consent checkbox. Admin partner detail, property edit, guide edit: alerts toggle + number.
- Admin booking detail: "WhatsApp" card listing messages (recipient, template, status, time) and the partner response; booking form gets "WhatsApp the customer" checkbox.

## 7. Errors
- Not configured → skip silently (log once per call).
- Meta error → log row `failed` with Meta's error message; admin sees it.
- Invalid number → not sent, logged `failed: invalid number`.
- Webhook bad signature → 401, nothing processed.

## 8. Testing
Unit: parameter sanitising, recipient selection rules, signature verification, webhook payload parsing (status + button). Route tests with mocked fetch/Supabase for webhook GET/POST. Live test on the test number after the owner verifies recipient numbers.
