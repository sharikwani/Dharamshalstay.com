# WhatsApp Booking Alerts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send new/cancelled booking alerts to partners, staff, hotels, guides (and optionally customers) on WhatsApp via Meta Cloud API, with Accept/Can't-do-it replies and delivery tracking; email stays as backup.

**Architecture:** A thin Cloud API client (`lib/whatsapp-cloud.ts`) plus a booking-level notifier (`lib/booking-whatsapp.ts`) called next to existing email calls. A webhook route receives Meta status updates and button replies (HMAC-verified) and updates a `whatsapp_messages` log and the booking's partner response. Without env credentials everything is a no-op.

**Tech Stack:** Next.js 14 app router, Supabase, Meta Graph API v21.0, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-10-whatsapp-booking-alerts-design.md`

## Global Constraints
- Graph API base: `https://graph.facebook.com/v21.0`.
- Env: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WABA_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`. Not configured (no token or phone id) → no sends, no errors.
- Templates: `booking_new_partner` (8 params, buttons "Accept", "Can't do it"), `booking_cancelled_partner` (4 params), `booking_confirmed_customer` (7 params); language `en`.
- Template params: no newlines/tabs, no 4+ consecutive spaces, trimmed, max 300 chars, empty → "-".
- Numbers: Indian numbers normalised with `normalizeIndianPhone` from `lib/whatsapp.ts` (returns `91XXXXXXXXXX`).
- Alerts only to recipients with alerts switched on and a valid number; staff only when their partner's alerts are on.
- WhatsApp sending never throws and never blocks a booking save; every attempt is logged in `whatsapp_messages`.
- Webhook: reject bad `X-Hub-Signature-256` with 401; process otherwise and return 200.
- Do not run SQL against Supabase or push from tasks. Commit trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; never commit `.superpowers/`.

## Review Focus
- **Forged webhook call** — bad/missing signature → 401, no DB writes (Task 3 test).
- **Partner without consent** — no message sent (Task 2 test).
- **Meta returns an error** — logged as failed with the message; booking save unaffected (Task 2 test).
- **Button reply for an unknown message** — ignored, 200 (Task 3 test).
- **Customer text with newlines in special requests or names** — sanitised so Meta doesn't reject the template (Task 1 test).

---

### Task 1: Migration v17 + Cloud API client

**Files:** Create `supabase/migration-v17-whatsapp.sql`, `lib/whatsapp-cloud.ts`, `tests/whatsapp-cloud.test.ts`

- [ ] **Step 1: Migration**
```sql
-- migration-v17: WhatsApp booking alerts. Additive; safe to re-run.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_alerts BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in_at TIMESTAMPTZ;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS whatsapp_alerts BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE guides ADD COLUMN IF NOT EXISTS whatsapp_alerts BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE partner_staff ADD COLUMN IF NOT EXISTS whatsapp_alerts BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS partner_response TEXT CHECK (partner_response IN ('accepted','declined')),
  ADD COLUMN IF NOT EXISTS partner_responded_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  recipient_kind TEXT NOT NULL CHECK (recipient_kind IN ('partner','staff','hotel','guide','customer')),
  to_phone TEXT NOT NULL,
  template TEXT NOT NULL,
  wa_message_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','delivered','read','failed')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_booking ON whatsapp_messages(booking_id);
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin reads whatsapp messages" ON whatsapp_messages;
CREATE POLICY "Admin reads whatsapp messages" ON whatsapp_messages FOR SELECT USING (is_admin());
```
Also extend the v15 `protect_profile_role()` guard: copy the current function from `supabase/migration-v15-partner-onboarding.sql` into v17 verbatim and add `OR NEW.whatsapp_number IS DISTINCT FROM OLD.whatsapp_number OR NEW.whatsapp_alerts IS DISTINCT FROM OLD.whatsapp_alerts OR NEW.whatsapp_opt_in_at IS DISTINCT FROM OLD.whatsapp_opt_in_at` to its field list (keep it non-SECURITY DEFINER).

- [ ] **Step 2: Failing tests** `tests/whatsapp-cloud.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'node:crypto';
import { cleanParam, isWhatsAppConfigured, sendTemplate, verifySignature } from '@/lib/whatsapp-cloud';

beforeEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('cleanParam', () => {
  it('removes newlines, tabs and long space runs, trims, caps length, fills empty', () => {
    expect(cleanParam('Room 4\nnear lift\t ok    please')).toBe('Room 4 near lift ok please');
    expect(cleanParam('   ')).toBe('-');
    expect(cleanParam('x'.repeat(400))).toHaveLength(300);
  });
});

describe('sendTemplate', () => {
  it('is a no-op when not configured', async () => {
    vi.stubEnv('WHATSAPP_TOKEN', ''); vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '');
    expect(isWhatsAppConfigured()).toBe(false);
    expect(await sendTemplate({ to: '919816000005', template: 't', params: [] })).toEqual({ ok: false, skipped: true });
  });
  it('posts the template and returns the message id', async () => {
    vi.stubEnv('WHATSAPP_TOKEN', 'tok'); vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '123');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ messages: [{ id: 'wamid.1' }] }), { status: 200 }));
    const r = await sendTemplate({ to: '919816000005', template: 'booking_new_partner', params: ['A', 'B\nC'] });
    expect(r).toEqual({ ok: true, id: 'wamid.1' });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://graph.facebook.com/v21.0/123/messages');
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({ messaging_product: 'whatsapp', to: '919816000005', type: 'template', template: { name: 'booking_new_partner', language: { code: 'en' } } });
    expect(body.template.components[0]).toEqual({ type: 'body', parameters: [{ type: 'text', text: 'A' }, { type: 'text', text: 'B C' }] });
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });
  it('returns Meta error text on failure', async () => {
    vi.stubEnv('WHATSAPP_TOKEN', 'tok'); vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '123');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: { message: 'Template not found' } }), { status: 400 }));
    expect(await sendTemplate({ to: '919816000005', template: 'x', params: [] })).toEqual({ ok: false, error: 'Template not found' });
  });
  it('never throws on network errors', async () => {
    vi.stubEnv('WHATSAPP_TOKEN', 'tok'); vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '123');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    expect(await sendTemplate({ to: '919816000005', template: 'x', params: [] })).toEqual({ ok: false, error: 'offline' });
  });
});

describe('verifySignature', () => {
  it('accepts a correct sha256 signature and rejects others', () => {
    vi.stubEnv('WHATSAPP_APP_SECRET', 'secret');
    const body = '{"a":1}';
    const sig = 'sha256=' + createHmac('sha256', 'secret').update(body).digest('hex');
    expect(verifySignature(body, sig)).toBe(true);
    expect(verifySignature(body, 'sha256=00')).toBe(false);
    expect(verifySignature(body, null)).toBe(false);
  });
  it('rejects everything when no app secret is set', () => {
    vi.stubEnv('WHATSAPP_APP_SECRET', '');
    expect(verifySignature('{}', 'sha256=abc')).toBe(false);
  });
});
```
Run → FAIL.

- [ ] **Step 3: Implement** `lib/whatsapp-cloud.ts`:
```ts
import { createHmac, timingSafeEqual } from 'node:crypto';

const GRAPH = 'https://graph.facebook.com/v21.0';

export function isWhatsAppConfigured(): boolean {
  return !!process.env.WHATSAPP_TOKEN && !!process.env.WHATSAPP_PHONE_NUMBER_ID;
}

export function cleanParam(v: unknown): string {
  const s = String(v ?? '').replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim().slice(0, 300);
  return s || '-';
}

export type SendResult = { ok: true; id: string } | { ok: false; error?: string; skipped?: true };

export async function sendTemplate(opts: { to: string; template: string; params: unknown[]; language?: string }): Promise<SendResult> {
  if (!isWhatsAppConfigured()) return { ok: false, skipped: true };
  try {
    const res = await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp', to: opts.to, type: 'template',
        template: {
          name: opts.template, language: { code: opts.language || 'en' },
          components: [{ type: 'body', parameters: opts.params.map((p) => ({ type: 'text', text: cleanParam(p) })) }],
        },
      }),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data?.error?.message || `HTTP ${res.status}` };
    const id = data?.messages?.[0]?.id;
    return id ? { ok: true, id } : { ok: false, error: 'No message id returned' };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Network error' };
  }
}

export function verifySignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !header?.startsWith('sha256=')) return false;
  const expected = Buffer.from(createHmac('sha256', secret).update(rawBody).digest('hex'));
  const got = Buffer.from(header.slice(7));
  return expected.length === got.length && timingSafeEqual(expected, got);
}
```
Quick-reply buttons are defined in the template itself, so sends need no button components.

- [ ] **Step 4:** `npm test`, `npx tsc --noEmit`; commit "Add migration v17 and WhatsApp Cloud API client".

---

### Task 2: Booking WhatsApp notifier + call sites

**Files:** Create `lib/booking-whatsapp.ts`, `tests/booking-whatsapp.test.ts`; modify `app/api/admin/bookings/route.ts`, `app/api/admin/bookings/[id]/route.ts`, `lib/booking-emails.ts`, `lib/manual-booking-emails.ts` (export what's needed), `app/api/admin/bookings/route.ts` zod (`notify_customer_whatsapp?: boolean`, default false).

**Interfaces — Produces:**
- `recipientsFor(view: BookingView, rows: { partner?: { whatsapp_number, whatsapp_alerts, phone }, staff?: { phone, whatsapp_alerts }, property?: { contact_phone, whatsapp_alerts }, guide?: { phone, whatsapp_alerts } }): { kind: 'partner'|'staff'|'hotel'|'guide'; phone: string }[]` — pure; partner uses `whatsapp_number || phone` and requires `whatsapp_alerts`; staff requires partner alerts on and staff `whatsapp_alerts`; hotel requires property `whatsapp_alerts` and `contact_phone`; guide requires `whatsapp_alerts` and `phone`; all numbers via `normalizeIndianPhone`, invalid dropped; duplicates (same phone) removed.
- `newBookingParams(view)`: `[ref, item_name, date_text, people, guest_name, guest_phone, 'Rs.' + amount (en-IN), payment_text]`.
- `cancelledParams(view, reason)`: `[ref, item_name, date_text, reason]`.
- `customerParams(view)`: `[ref, item_name, date_text, people, assignee line ("Your driver: …" / pilot / guide / '-'), 'Rs.' + amount, payment_text]`.
- `whatsappNewBooking(bookingId, opts: { customer: boolean }): Promise<void>`; `whatsappCancelled(bookingId, reason): Promise<void>`; `whatsappReassignedAway(bookingId, previousPartnerId): Promise<void>` — load view (`loadBookingView`) + recipient rows with `serviceClient()`, send via `sendTemplate`, insert one `whatsapp_messages` row per attempt (`status` 'sent' with `wa_message_id`, or 'failed' with `error`; skipped sends are not logged). Never throw (catch + console.error).

- [ ] **Step 1: Failing tests** (pure functions + one notifier test with mocked `sendTemplate`, `loadBookingView` and service client): recipients obey consent rules (partner off → none; staff only when partner on; invalid number dropped; duplicates removed); params sanitised count/order; notifier logs 'failed' with Meta error and doesn't throw; not configured → nothing logged.
- [ ] **Step 2: Implement** `lib/booking-whatsapp.ts`.
- [ ] **Step 3: Call sites** (each inside the existing try/catch next to the email call, after a successful write):
  - create: `await whatsappNewBooking(saved.id, { customer: body.notify_customer_whatsapp === true })` when `notify_partner` or `notify_customer_whatsapp`.
  - PATCH assign (notify): `whatsappNewBooking(id, { customer: false })`; reassign-away: `whatsappReassignedAway(id, booking.partner_id)`.
  - PATCH cancel (notify): `whatsappCancelled(id, body.reason)`.
  - website `sendBookingEmails(bookingId)`: after emails, `await whatsappNewBooking(bookingId, { customer: false })` (reaches hotels with alerts on).
- [ ] **Step 4:** tests, tsc; commit "Send booking alerts on WhatsApp next to emails".

---

### Task 3: Webhook (status updates + Accept/Can't do it)

**Files:** Create `app/api/whatsapp/webhook/route.ts`, `lib/whatsapp-webhook.ts`, `tests/api/whatsapp-webhook.test.ts`

**Interfaces:**
- `parseWebhook(payload): { statuses: { id: string; status: 'sent'|'delivered'|'read'|'failed'; error?: string }[]; replies: { contextId: string; from: string; text: string }[] }` — reads `entry[].changes[].value.statuses[]` (`errors[0].title`/`message` for failed) and `value.messages[]` where `type === 'button'` (`button.text`) or `type === 'interactive'` (`interactive.button_reply.title`), using `context.id`.
- `replyAction(text): 'accepted' | 'declined' | null` — case-insensitive "accept" → accepted; "can't do it"/"cant do it"/"cannot" → declined.
- Route:
  - `GET`: if `hub.mode === 'subscribe'` and `hub.verify_token === WHATSAPP_VERIFY_TOKEN` (non-empty) → 200 with `hub.challenge` as text; else 403.
  - `POST`: read raw text; `verifySignature(raw, x-hub-signature-256)` false → 401. Parse; for statuses update `whatsapp_messages` by `wa_message_id` (status + error + updated_at; never move backwards from read→delivered: only update when new rank > old rank, failed always wins). For replies: find message by `wa_message_id = contextId`; if found and it has a booking, set `bookings.partner_response`, `partner_responded_at`; on declined email the admin "Partner can't do booking {ref}" (use `sendEmail` + `adminEmail()`); unknown context → ignore. Return 200 `{ ok: true }`. `export const dynamic = 'force-dynamic'`.
- [ ] Tests: GET verify ok/403; POST bad signature 401 (no DB calls); status update; Accept reply updates booking; unknown context ignored; declined emails admin.
- [ ] Implement; tests, tsc; commit "Add WhatsApp webhook for delivery status and partner replies".

---

### Task 4: Consent and settings UI + admin visibility

**Files:** modify `app/api/partner/profile/route.ts` (+ `whatsapp_number` optional, `whatsapp_alerts` boolean; when alerts turn on set `whatsapp_opt_in_at = now()`, off → keep timestamp; validate number with `normalizeIndianPhone` → 400 "Enter a valid Indian mobile number for WhatsApp."), `app/(site)/partner/onboarding/page.tsx` (WhatsApp number field defaulting to phone + checkbox "Send me new bookings on WhatsApp"), `app/api/admin/partners/[id]/route.ts` (+ action `set_whatsapp` { whatsapp_number?, whatsapp_alerts }), `app/(site)/admin/partners/[id]/page.tsx` (toggle + number), `app/(site)/admin/properties/[id]/edit/page.tsx` (checkbox "Send booking alerts to this property's phone on WhatsApp" bound to `whatsapp_alerts`), `app/(site)/admin/guides/page.tsx` (checkbox per guide, same), `app/api/admin/bookings/[id]/route.ts` GET (include `whatsapp_messages` for the booking, newest first, and `partner_response`), `app/(site)/admin/bookings/[id]/page.tsx` (WhatsApp card: rows recipient kind · number (last 4 digits shown) · template · status pill · time; partner response badge "Accepted"/"Can't do it" with time), `app/(site)/admin/bookings/new/page.tsx` (checkbox "Send confirmation to the customer on WhatsApp", default off, sends `notify_customer_whatsapp`), `app/(site)/partner/bookings/page.tsx` (show "You accepted" / "You declined" badge when `partner_response` set; partner API must include `partner_response`).
- [ ] Tests for the profile route number validation and the admin `set_whatsapp` action; tsc; build; commit "Add WhatsApp alert settings and delivery status in admin".

---

### Task 5: Release (owner + controller)
- [ ] Owner/controller runs `supabase/migration-v17-whatsapp.sql` in the Supabase SQL editor.
- [ ] Controller creates the three templates in WhatsApp Manager (category Utility, language English) with the exact bodies from the spec §4.
- [ ] Owner: generate a permanent token (Business settings → System users → add system user (admin) → assign the app and WhatsApp account with full control → Generate token with `whatsapp_business_messaging`, `whatsapp_business_management`), copy App Secret (App settings → Basic), choose a verify token; put `WHATSAPP_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID=1357037027493117`, `WHATSAPP_WABA_ID=1408639064178047` in Vercel → redeploy.
- [ ] Configure webhook in the app (WhatsApp → Configuration): callback `https://www.dharamshalastay.com/api/whatsapp/webhook`, verify token as above, subscribe to `messages`.
- [ ] Add up to 5 test recipient numbers (owner verifies OTP), switch alerts on for a test partner, create a manual booking, confirm the WhatsApp arrives and the Accept button updates the booking.
- [ ] Later: add the real business number, payment method and business verification, then swap `WHATSAPP_PHONE_NUMBER_ID`.
