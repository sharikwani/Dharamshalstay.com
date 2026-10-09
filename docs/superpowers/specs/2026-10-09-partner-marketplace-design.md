# Partner Marketplace: Paragliding, Taxi and Trek Partners

Date: 2026-10-09
Status: draft for review

## 1. Goal

Let paragliding operators, taxi operators/drivers and trek agencies run their
business on dharamshalastay.com: sign up, get verified, sign a commission
agreement, receive and manage bookings, talk to customers and see reviews.
Dharamshala Stay keeps **20% of every booking**, whether the customer pays
online or in cash. Admin sees every booking, every rupee and who owes whom.

### What the owner asked for (verbatim intent)
- Partner accounts for paragliding, taxi and trek businesses with bookings,
  customer messages and reviews.
- 20% commission on every plan. Online: deducted automatically. Cash: the
  partner pays the 20% online.
- A proper signed legal agreement at signup.
- ID verification: Aadhaar front and back, PAN.
- Booking emails to partners; drivers notified of rides like a cab company.
- Admin sees everything, including money ownership.
- Payment provider: Stripe (owner has an account).

### Decisions taken on the owner's behalf ("do whatever is best")
| Topic | Decision | Why |
|---|---|---|
| Split payments | Platform collects the full amount in Stripe; a **partner ledger** records 80% owed to the partner; admin pays out weekly by bank/UPI and records it. Commission owed on cash bookings is netted off payouts first. | Stripe India cannot route funds to Indian connected accounts. The ledger makes the 20% automatic in accounting terms and is provider-independent (Razorpay Route can replace the payout step later). |
| Aadhaar | Collect **masked Aadhaar** images only (first 8 digits hidden), never the full number. | UIDAI rules restrict storing full Aadhaar numbers outside an Aadhaar Data Vault. |
| Agreement | Clickwrap e-signature: read agreement, tick consent, type full legal name; store version, text hash, timestamp, IP, user agent; email a copy. | Valid electronic acceptance under the IT Act for a commercial agreement; no third-party e-sign vendor needed. Text must be reviewed by a lawyer before launch. |
| Notifications | Email (Resend) for every event + in-portal live notifications (Supabase Realtime) with a sound alert on the driver/operator dashboard. SMS/WhatsApp API out of scope for v1. | Uses services already in the stack; no new vendor approvals. |
| Commission rate | Platform default 20%, stored per partner so admin can override for a specific partner. Snapshotted onto each booking. | Owner said 20% everywhere; per-partner override costs nothing and avoids a migration later. |
| Customer accounts | Not required. Every booking gets a private link (signed token) for status, chat, payment and review. Logged-in customers also see bookings in /account. | Most travellers book once; forcing sign-up loses bookings. |

## 2. Scope and phasing

Built and released in this order; each phase is usable on its own.

0. **Security fixes** (prerequisite; money must not flow before these).
1. **Partner onboarding**: partner types, KYC, agreement, admin verification.
2. **Partner listings and bookings**: partner-owned packages/routes/treks, server-priced bookings, accept/reject, taxi dispatch, notifications.
3. **Money**: Stripe payments, ledger, cash commission dues, partner pays dues online, payouts, refunds, admin money views.
4. **Messages and reviews**.

Out of scope for v1: SMS/WhatsApp Business API, native mobile app, GPS live
tracking, automatic bank payouts, GST invoicing (ledger keeps the data needed
to add it), multi-currency.

## 3. Phase 0: security fixes

1. **Bookings privacy**: drop the v4 policy that lets any partner/admin read all
   bookings. Partners read only bookings where `partner_id = auth.uid()` (new
   column, phase 2) or the booking's property is theirs. Admin keeps full access.
2. **Server-side pricing**: `/api/bookings` and `/api/checkout` ignore client
   `amount` and `commission_pct`; price is computed from the package/route/room
   in the database. Checkout charges the stored booking amount only.
3. **Customer sign-up role**: `auth/register` passes `role: 'user'` in sign-up
   metadata so the trigger creates a customer; one-off SQL repairs accounts
   created as `partner` that own nothing and never used the partner portal.
4. **Admin API auth**: `/api/admin/import-property` requires an admin bearer
   token, like the other admin routes. `/api/email/booking-confirmation`
   becomes internal-only (shared secret header), so it cannot be spammed.
5. **Server-side guards** for /partner and /admin pages: a small helper that
   verifies the Supabase session and role on the server before rendering
   (using the already-installed `@supabase/ssr`), instead of browser-only checks.

## 4. Data model (migration-v14 and onward)

New and changed tables. All money is stored in **paise (integer)**.

### Partners
- `profiles` adds: `partner_type` (`hotel` | `paragliding` | `taxi` | `trek`),
  `partner_status` (`onboarding` | `pending_verification` | `verified` |
  `changes_requested` | `suspended` | `rejected`), `commission_pct`
  (numeric, default 20), `payout_method` (`bank` | `upi`), `payout_details`
  (jsonb: account holder, account no., IFSC or UPI id), `legal_name`,
  `business_registration_no`. Existing hotel partners get `partner_type = 'hotel'`
  and keep their current flow.
- `partner_documents`: id, partner_id, `doc_type` (`aadhaar_front`,
  `aadhaar_back`, `pan`, `driving_licence`, `vehicle_rc`, `vehicle_permit`,
  `vehicle_insurance`, `pilot_licence`, `tourism_registration`, `other`),
  storage_path, status (`pending` | `approved` | `rejected`), reviewer_id,
  reviewed_at, rejection_reason, expires_on (licences/insurance), created_at.
- `partner_agreements`: id, partner_id, agreement_version, text_sha256,
  signed_name, signed_at, ip, user_agent, pdf_storage_path.
- `agreement_versions`: version, title, body_markdown, published_at (admin
  publishes new versions; partners must re-sign when a new version is required).

Required documents by type:
| Type | Required |
|---|---|
| All | masked Aadhaar front, Aadhaar back, PAN |
| Taxi | + driving licence, vehicle RC, commercial permit, insurance (per vehicle) |
| Paragliding | + pilot licence (per pilot), tourism registration |
| Trek | + tourism registration |

### Taxi fleet
- `vehicles`: id, partner_id, type (sedan/suv/innova/tempo), make_model,
  registration_no, seats, status, docs via `partner_documents.vehicle_id`.
- `drivers`: id, partner_id, name, phone, licence doc, `user_id` (nullable: a
  solo driver-owner is both partner and driver; a fleet operator can add
  drivers who get their own login with role `driver`), active.

### Partner-owned offerings
- `paragliding_packages`, `taxi_routes`, `treks` add `partner_id` (nullable;
  null = admin-run/legacy) and `approval_status` mirroring properties
  (`draft` → `pending_review` → `published`). Partners create and edit their
  own; admin approves before publishing. Admin can assign existing rows to a
  partner.
- `trek_offers` (a trek page can list several agencies): id, trek_id,
  partner_id, price_per_person, group_min/max, inclusions, status.

### Bookings
`bookings` adds: `partner_id`, `offer_id` (trek_offers), `vehicle_id`,
`driver_id`, `access_token_hash` (customer link), `pickup_at`, `dispatch_status`
(taxi: `unassigned` | `offered` | `accepted` | `driver_assigned` | `en_route` |
`arrived` | `on_trip` | `completed` | `cancelled`), `accepted_at`,
`cancel_reason`, `cancelled_by`, `amount_paise`, `commission_paise`,
`partner_share_paise`, `payment_mode` (`online` | `cash`).

Partner booking states (paragliding/trek): `pending` → `confirmed` (partner
accepted) → `completed` | `cancelled` | `no_show`. Partner must accept within
a time limit (2 h; taxi 15 min) or the booking is escalated to admin.

### Money
- `ledger_entries` (append-only; never updated or deleted): id, partner_id,
  booking_id (nullable), `kind`, `amount_paise` (signed: **positive = platform
  owes partner, negative = partner owes platform**), description,
  created_by, created_at, stripe_ref, payout_id.
  Kinds:
  | Kind | When | Amount |
  |---|---|---|
  | `online_booking_share` | online booking completed | + partner share (80%) |
  | `cash_commission` | cash booking completed | − commission (20%) |
  | `refund_reversal` | refund after a share was credited | − share refunded |
  | `commission_payment` | partner pays dues via Stripe | + amount paid |
  | `payout` | admin pays partner | − amount paid out |
  | `adjustment` | admin correction (reason required) | ± |
- Partner **balance** = sum of entries. Positive: we owe them. Negative: they owe us.
- `payouts`: id, partner_id, amount_paise, method, reference (UTR/UPI ref),
  period_start, period_end, status (`pending` | `paid` | `failed`), paid_at,
  created_by.
- Existing `commission_records` / `commission_*` columns on bookings stay for
  hotels; the ledger becomes the source of truth for new partner types and
  hotels are migrated onto it in phase 3.

### Messaging, reviews, notifications
- `booking_messages`: id, booking_id, sender (`customer` | `partner` |
  `admin`), sender_id, body, attachments, created_at, read_at.
- `reviews`: id, booking_id (unique), partner_id, target (package/route/trek
  offer/property), rating 1–5, body, partner_reply, replied_at, status
  (`published` | `hidden`), created_at.
- `notifications`: id, recipient_id, kind, booking_id, title, body, link,
  read_at, created_at (drives the in-portal bell and realtime alerts).
- Existing `notification_log` becomes the email send log (actually processed).

### Storage
- New **private** bucket `partner-kyc`. Uploads go through an API route
  (service role) that checks the caller owns the record; files are read only
  via short-lived signed URLs generated for admins (and for the owner, their
  own documents). Max 8 MB; jpg/png/pdf. Storage policies written as SQL in the
  migration, not set by hand.

### RLS summary
Partners read/write only their own rows (`partner_id = auth.uid()`); drivers
read only bookings assigned to them; customers reach their booking only through
the token API; ledger and payouts are read-only for partners and insert-only
via server routes; admin full access via `is_admin()`.

## 5. Flows

### 5.1 Partner signup and verification
1. `/partner/register`: choose type (Hotel, Paragliding, Taxi, Trek) → account
   details → email verification (existing).
2. Onboarding wizard at `/partner/onboarding`, resumable:
   business details → KYC uploads (type-specific checklist) → payout details
   → (taxi) vehicles and drivers / (paragliding) pilots → **agreement**.
3. Agreement step: full text shown, scroll to end, tick "I have read and agree",
   type full legal name, Sign. Server stores the signature row, renders a PDF
   copy into the private bucket and emails it to the partner and admin.
4. Status becomes `pending_verification`; admin is emailed.
5. Admin `Partners` queue: view documents (signed URLs), approve/reject each
   document with a reason, then Verify the partner or Request changes. Partner
   gets an email either way. Only `verified` partners receive bookings and can
   publish offerings.
6. Expiring documents (licence, insurance, permit) trigger reminder emails at
   30 and 7 days; expired mandatory documents pause new bookings for that
   vehicle/partner.

### 5.2 Paragliding and trek bookings
1. Customer picks a package/offer, date, slot, people; price shown is computed
   on the server. Chooses **Pay online** (Stripe) or **Pay at activity (cash)**
   if the partner allows cash.
2. Booking created `pending`; partner gets email + portal alert; customer gets
   "request received" email with their private booking link.
3. Partner accepts (optionally assigns pilot/guide) or rejects with a reason.
   Accept → customer email "confirmed" with partner contact. Reject or no
   response in 2 h → admin alerted to reassign or refund.
4. After the activity date the partner marks Completed / No-show. Completion
   writes the ledger entry. Bookings not marked within 48 h are auto-completed
   and the partner is notified.
5. Customer gets a review request email.

### 5.3 Taxi dispatch (cab-company model)
1. Customer books a route (fixed fare from `taxi_routes`) or a custom trip
   (quote request → admin/operator sets fare → customer confirms).
2. Ride is **offered** to the route's operator (or, for admin-run routes, to the
   verified taxi partners serving that area, first to accept wins). Operators
   see a live "New ride" card with sound; 15 min to accept, then admin is
   alerted.
3. Operator accepts and **assigns driver + vehicle**. Customer receives driver
   name, phone, vehicle and registration number by email and on the booking page.
4. Driver view (mobile-first `/partner/rides`): today's and upcoming rides,
   tap-to-call customer, Google Maps link for pickup, buttons
   **On the way → Arrived → Start trip → Complete**. Each step updates the
   customer's booking page in real time and the arrival step emails the customer.
5. Cash rides: driver marks "cash collected" at completion → `cash_commission`
   ledger entry. Online rides: `online_booking_share` on completion.
6. Admin **Dispatch board**: all rides by status, overdue offers, reassign
   driver/operator, cancel.

### 5.4 Money
- **Online payment**: Stripe Checkout for the server-computed amount; webhook
  marks paid. The partner share is credited to the ledger when the booking is
  completed (not at payment), so cancellations before service do not need
  reversals.
- **Cash payment**: completion records −20% in the ledger.
- **Weekly settlement** (admin `Payouts` screen, every Monday): for each
  partner with a positive balance, admin pays by bank/UPI and records the
  reference → `payout` entry; partner emailed a statement. Negative balances
  are never paid out; they carry forward.
- **Partner pays dues**: partner portal shows balance; if negative, a
  **Pay now** button opens Stripe Checkout for the owed amount →
  `commission_payment` entry on webhook.
- **Overdue dues**: if a partner owes money for more than 14 days, they get
  reminders at 7 and 14 days; at 21 days new bookings are paused until paid
  (admin can override).
- **Cancellations and refunds**: per-category cancellation policy shown at
  booking (default: free cancellation up to 24 h before; 50% after; no refund
  for no-show; full refund if the partner cancels or never accepts). Admin
  issues refunds from the booking screen via the Stripe API; any already
  credited share is reversed.
- **Admin Money dashboard**: totals for gross bookings, platform commission
  earned (online and cash), money held for partners, dues owed by partners,
  payouts made, refunds; per-partner balance table with drill-down to every
  ledger entry; CSV export.

### 5.5 Messages and reviews
- Each booking has a chat thread between customer and partner, visible to
  admin. New message → email + portal notification to the other side. Customer
  phone/email are shown to the partner only after the booking is confirmed.
- After completion, the customer can leave one review (1–5 stars + text) via
  their booking link. Partner can reply once. Admin can hide abusive reviews.
  Ratings and counts on packages/routes/treks/partners are computed from
  reviews, replacing hand-set ratings for these types.

## 6. Notifications matrix

| Event | Customer | Partner | Driver | Admin |
|---|---|---|---|---|
| Booking requested | email | email + alert | | email |
| Accepted / confirmed | email | | | |
| Driver assigned | email | | email + alert | |
| Driver on the way / arrived | email (arrived) + live page | | | |
| Rejected / not accepted in time | | | | email |
| Cancelled | email | email + alert | email + alert | email |
| Payment received | email receipt | alert | | |
| New message | email | email + alert | | |
| Completed | review request | | | |
| Partner signed up / documents uploaded | | | | email |
| Partner verified / changes requested | | email | | |
| Dues reminder / paused | | email | | |
| Payout made | | email statement | | |
| Document expiring | | email | | |

Emails are sent through Resend from server routes and logged in
`notification_log`. Scheduled jobs (offer timeouts, auto-complete, reminders,
expiry checks) run from a Vercel Cron route every 5 minutes, protected by
`CRON_SECRET`.

## 7. Pages

Partner portal (`/partner`, mobile-first):
- Dashboard: today's bookings/rides, pending actions, balance, rating.
- Bookings / Rides (driver view for taxi), booking detail with chat.
- Listings: packages / routes / trek offers (create, edit, submit for approval).
- Fleet (taxi): vehicles, drivers. Team (paragliding): pilots.
- Money: balance, ledger, payouts, Pay dues.
- Reviews: list and reply.
- Profile and documents: KYC status, re-upload, payout details, agreement copy.

Customer: `/booking/[ref]?t=token`: status, live ride status, driver details,
pay, chat, cancel, review.

Admin (new sidebar items): Partners (verification queue and partner detail),
Dispatch board, Money (dashboard, ledger, payouts, dues), Reviews moderation,
Agreement versions. Existing Bookings page gains partner, payment mode, ledger
and refund actions.

## 8. Error handling and integrity
- Every money change is an append-only ledger row created inside the same
  database transaction (Postgres function) as the state change that caused it;
  a unique constraint `(booking_id, kind)` prevents double crediting.
- Stripe webhooks are idempotent (event id stored); checkout amounts always
  come from the database.
- Partner/driver actions go through server routes that check ownership and
  allowed state transitions; invalid transitions return 409.
- Email failures are logged and retried by the cron job; they never block the
  booking.
- KYC files are never publicly reachable; signed URLs expire in 5 minutes.

## 9. Legal and compliance notes
- Agreement covers: services, 20% commission on all bookings (online and cash),
  payment and settlement terms, dues and suspension, customer data use,
  cancellations and refunds, service quality and safety, licences and
  insurance, liability, termination, governing law (Himachal Pradesh courts).
  **Drafted by us; must be reviewed by a lawyer before the first partner signs.**
- DPDP Act 2023: consent notice at KYC upload stating purpose, retention
  (duration of partnership + 3 years, then deletion) and contact for
  correction/deletion.
- Masked Aadhaar only; PAN number validated by format.

## 10. Testing
The repo has no automated tests today. Add Vitest for unit tests of pricing,
commission/ledger maths, state-transition rules and token signing; and
Playwright smoke tests for: partner onboarding, booking → accept → complete
(cash and online with Stripe test mode), driver status flow, partner pays dues,
admin payout. SQL policies verified with tests that query as partner A against
partner B's data.

## 11. Configuration needed from the owner
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (test keys first) in Vercel.
- Resend: `RESEND_API_KEY`, verified sending domain, `EMAIL_FROM`, `ADMIN_EMAIL`.
- `CRON_SECRET`, `BOOKING_TOKEN_SECRET`.
- Lawyer-reviewed agreement text.
- Running each `supabase/migration-v14+.sql` file in the Supabase SQL editor.
