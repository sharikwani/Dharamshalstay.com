# Emergency Medicine Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A public `/medicine-delivery-dharamshala` page where people request emergency medicines with a prescription; the owner screens each request in `/admin/medicine`.

**Architecture:** Copies the local-guides sign-up pattern: multipart POST -> zod schema + magic-byte file check -> private Supabase bucket + table row -> admin email whose subject reaches the owner's WhatsApp via `lib/owner-alerts.ts`. Admin GET returns 1-hour signed URLs and purges prescription files older than 30 days.

**Tech Stack:** Next.js 14 App Router, Supabase (service client), zod, vitest, Tailwind.

**Spec:** `docs/superpowers/specs/2026-11-20-medicine-delivery-design.md`

## Global Constraints
- Chemist is never named: "a licensed partner chemist".
- Areas served, exactly: Kandi, Dharnu, Dari, Barol, Shyam Nagar, Khaniyara.
- Pay on delivery by UPI or cash (owner, 20 Nov); nothing is paid on the website. Delivery hours 10 am - 10 pm: free 10 am - 6 pm, Rs 200 extra on every delivery 6 pm - 10 pm (owner, 20 Nov). Requests after 10 pm are handled from 10 am next day (our call; page tells people to call 108 for life-threatening cases). Put these in `lib/medicine/options.ts` as `DELIVERY_HOURS` and use them in the page and quick-facts table.
- No delivery without a prescription confirmed with the doctor; never Schedule X / narcotic / controlled drugs.
- Prescription files: private bucket `medicine-prescriptions`, max 5 MB, JPEG/PNG/WebP/PDF, deleted after 30 days.
- Admin email / WhatsApp alert carries no medicine names or diagnosis: name, area, admin link only.
- CRLF preserved; no apostrophes in single-quoted TS strings; content follows the SEO+AEO+GEO rule in CLAUDE.md.

## Review Focus
- A PDF prescription renamed from a non-PDF -> rejected by the magic-byte check (test in Task 1).
- Area "Other" (outside the six) -> accepted but flagged in admin "outside delivery area" (test in Task 1).
- A phone with +91 / spaces -> normalised to 91XXXXXXXXXX (test in Task 1).
- Fourth request from one IP in 24 h -> HTTP 429 with "call 108 if this is life-threatening" wording (Task 2).
- Migration not yet run -> admin shows "Run migration v57 first" instead of crashing (Task 3).

---

### Task 1: Schema, file check, options

**Files:**
- Create: `lib/medicine/options.ts`, `lib/medicine/validate.ts`
- Test: `tests/medicine.test.ts`

**Interfaces:**
- Produces: `MEDICINE_AREAS` (the six + `'Other'`), `MEDICINE_STATUSES = ['new','checking','doctor_confirmed','delivered','rejected'] as const`, `MEDICINE_BUCKET = 'medicine-prescriptions'`, `PRESCRIPTION_MAX_BYTES = 5*1024*1024`, `PRESCRIPTION_RETENTION_DAYS = 30`; `medicineRequestSchema` (zod: patient_name 2-80, phone -> 91XXXXXXXXXX like guides, area enum, address 10-300, medicines 3-1000, urgency 10-600, doctor_name 3-80, doctor_phone (same phone rule), consent literal true, website max 0); `checkPrescriptionFile(f: {type: string; size: number; head: Uint8Array}): { ext: 'jpg'|'png'|'webp'|'pdf'; contentType: string } | { error: string }`; `isOutsideArea(area: string): boolean`.

- [ ] Step 1: tests — valid request parses and phone becomes `919816012345`; missing consent fails; unknown area fails; `checkPrescriptionFile` accepts `%PDF` head as pdf, rejects `application/pdf` with JPEG bytes, rejects 6 MB, rejects `text/plain`; `isOutsideArea('Other') === true`, `isOutsideArea('Kandi') === false`.
- [ ] Step 2: `npx vitest run tests/medicine.test.ts` -> FAIL (module missing).
- [ ] Step 3: implement; PDF magic = bytes `25 50 44 46`; image magic as in `lib/reviews/validate.ts`.
- [ ] Step 4: tests PASS.

### Task 2: Migration v57, store, public API

**Files:**
- Create: `supabase/migration-v57-medicine-requests.sql`, `lib/medicine/store.ts`, `app/api/medicine/route.ts`

**Interfaces:**
- Consumes: Task 1 exports.
- Produces: table `medicine_requests` (id uuid pk, created_at, updated_at, patient_name, phone, area, address, medicines, urgency, doctor_name, doctor_phone, prescription_path text null, prescription_type text, status text check in MEDICINE_STATUSES default 'new', admin_notes, ip_hash); RLS enabled, no policies; bucket `medicine-prescriptions` public=false, 5 MB, mime jpeg/png/webp/pdf. `submitMedicineRequest(input, ipHash: string | null, file: { bytes: Buffer; ext: string; contentType: string }): Promise<{ id: string }>`.

- [ ] Step 1: write migration (safe to re-run, ends with a check SELECT; no secrets).
- [ ] Step 2: `submitMedicineRequest`: rate limit 3 per ip_hash per 24 h -> `HttpError(429, 'Too many requests from this connection today. Please WhatsApp us. If this is life-threatening, call 108.')`; upload `${id}.${ext}`; insert; on insert error remove file. Then `sendEmail` to `adminEmail()` with subject `Urgent medicine request: ${area}` and body: patient name, phone, area (+ "outside delivery area" when `isOutsideArea`), admin link `/admin/medicine`. No medicines in the email.
- [ ] Step 3: route `POST` multipart, mirrors `app/api/guides/route.ts` (honeypot, `consent === 'true'`, `checkPrescriptionFile`, `hashIp(clientIp(req))`), `runtime='nodejs'`, `dynamic='force-dynamic'`.
- [ ] Step 4: `npx tsc --noEmit -p .` clean.

### Task 3: Admin screen

**Files:**
- Create: `app/api/admin/medicine/route.ts`, `app/(site)/admin/medicine/page.tsx`
- Modify: `components/admin/AdminShell.tsx` (Customers group: `/admin/medicine`, "Medicine requests", icon `Pill`)

**Interfaces:**
- GET `?status=` (default `new`): `requireCaller(req,['admin'])`; first deletes storage files + nulls `prescription_path` for rows older than `PRESCRIPTION_RETENTION_DAYS`; returns rows with `prescription_url` (signed, 3600 s). Error -> 'Run migration v57 first (medicine requests).'
- PATCH `{ id, status, note? }` -> updates status/admin_notes/updated_at.
- Page: status tabs, card per request with all fields, "View prescription" link (opens signed URL), click-to-call doctor and patient, status buttons, note box, amber "Outside delivery area" badge.

- [ ] Step 1: implement both; `npx tsc --noEmit -p .` clean.

### Task 4: Public page, form, sitemap, footer

**Files:**
- Create: `app/(site)/medicine-delivery-dharamshala/page.tsx`, `components/medicine/MedicineRequestForm.tsx`
- Modify: `lib/sitemap-entries.ts` (priority 0.6, weekly, lastModified 2026-11-20), `components/layout/Footer.tsx` (English: "Emergency medicine delivery")

- [ ] Step 1: page per spec: title "Medicine Delivery in Dharamshala 2026: Emergency Only" (meta_title < 60), description < 155 leading with the answer, bold Short answer, question H2s, quick-facts table, how it works (4 steps), areas, what we cannot deliver, emergency numbers (108; Zonal Hospital Dharamshala; Delek Hospital McLeod Ganj), 6-8 FAQs + `faqSchema`, sources list, internal links (taxis, hotels, essentials/guides). Facts about hospitals verified by a sonnet fact-checker before commit.
- [ ] Step 2: form mirrors `GuideSignupForm` (file input accepts `image/jpeg,image/png,image/webp,application/pdf`, 5 MB client check), success message says we will call within working hours and to call 108 for life-threatening emergencies.
- [ ] Step 3: `npx tsc --noEmit -p .` and `npx vitest run` (incl. sitemap-coverage) PASS.
- [ ] Step 4: commit all tasks (no push).
