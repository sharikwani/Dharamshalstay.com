# Hotel Reviews and SEO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let anyone write a moderated review on every hotel page (partner and directory listings), show approved reviews with photos and replies, and feed only those real reviews into Google/Bing structured data, page titles, the image sitemap, IndexNow and the AI-readable Markdown pages.

**Architecture:** A new `hotel_reviews` table (migration v23) with a `public_hotel_reviews` view that never exposes phone or IP hash. Pure logic (validation, summaries, verified-stay matching) lives in `lib/reviews/{types,validate,summary}.ts`; database and storage access in `lib/reviews/store.ts`; approve/hide/reject/reply in `lib/reviews/moderate.ts`. Routes (`/api/reviews`, `/api/admin/reviews/*`, `/api/partner/reviews`) are thin wrappers. The hotel page loads one `ReviewBundle` and hands it to the JSON-LD, the metadata and the client `HotelReviews` component, so every surface shows the same approved data.

**Tech Stack:** Next.js 14 app router, TypeScript, Supabase (Postgres + Storage, service role), zod, Resend (`lib/email.ts`), Vitest (node environment).

**Spec:** `docs/superpowers/specs/2026-10-13-hotel-reviews-seo-design.md`

**Sequencing:** run this plan after the room-availability plan (migration v21) and the WhatsApp-offers plan (migration v22). Those plans also edit some of the files below, so every edit to a shared file is described by the code around it, never by line number. Before editing a shared file, read it and find the quoted anchor; if a later plan has moved things, keep both changes. Shared touch points in this plan:
- `components/pages/HotelDetailView.tsx` – imports, `hotelMetadata`, the two `JsonLd` blocks, the rating badge under the `<h1>`, a new section before the FAQs (Tasks 9, 10, 13).
- `components/hotels/DirectoryListing.tsx` – props and a new section before the amber "independent directory listing" notice (Task 13).
- `components/admin/AdminShell.tsx` – one nav item in the "Hotels & stays" group, one badge count (Task 14). v22 adds an "Offers" item; keep it.
- `app/(site)/partner/dashboard/page.tsx` – one header link next to "Bookings" (Task 15). v21/v22 add links there too; keep them.
- `next.config.js` – one extra rewrite (Task 4).
- `lib/seo.ts`, `lib/llms.ts`, `lib/sitemap-entries.ts`, `lib/images.ts`, `lib/i18n/en.ts`, `lib/i18n/hi.ts` (Tasks 9-13).
- Admin property pages `app/(site)/admin/approvals/[id]/page.tsx`, `app/(site)/admin/properties/page.tsx`, `app/(site)/admin/properties/[id]/edit/page.tsx` and `app/api/admin/import-property/route.ts` (Tasks 4, 14).
- `components/hotels/HotelBooking.tsx` and `lib/wa-chat/*` are **not** touched.

## Global Constraints

- Migration file: `supabase/migration-v23-hotel-reviews.sql`, run after v22. Safe to re-run.
- Nothing fake: only `status = 'approved'` reviews reach the hotel page, JSON-LD, page titles, Markdown, `/llms.txt`. Public reads go through the view `public_hotel_reviews` (no `phone`, no `ip_hash`).
- `properties.rating` (average, 1 decimal) and `properties.review_count` are derived only: recomputed from approved reviews on every approve / hide / reject. Admin can no longer type them and the importer no longer copies them.
- Fields: name (2-60 chars), phone (private, stored as its last 10 digits), overall 1-5, optional cleanliness/location/staff/value 1-5, title 5-100, text 30-2000, stay month `YYYY-MM` not in the future (India time), trip type `family|couple|solo|friends|business`, up to 3 photos, JPEG/PNG/WebP, 5 MB each.
- Limits: one review per phone per property (`UNIQUE (property_id, phone)`); honeypot form field `website`; max 5 submissions per IP per hour = count of `hotel_reviews` rows with the same `ip_hash` created in the last 60 minutes.
- Verified stay badge: last 10 digits of `bookings.guest_phone` equal the review phone, same `property_id`, status not `cancelled`/`failed`/`no_show`, `check_out` on or before today (IST).
- Replies: one owner reply (admin, shown as "Dharamshala Stay") and one partner reply per review; saving again replaces it. Partners may reply only to approved reviews of properties they own.
- Photos: uploads go to private bucket `review-uploads` at `<property_id>/<review_id>/<n>.<ext>`; on approval they are copied to public bucket `review-photos` at the same path; hide/reject removes the public copies.
- Success message, exactly: `Thanks – your review will appear after a quick check.` Owner email subject: `New review to approve: <hotel name>`.
- JSON-LD: `image` up to 10 absolute URLs (property images first, then room images); `containsPlace` = one `HotelRoom` per active room type; `aggregateRating` only with at least one approved review (`ratingCount` = `reviewCount` = approved count); `review` = latest 5 approved, `reviewBody` at most 500 characters.
- Title template: `<Name>, <Area> · Rated <x>/5 by <n> guests · Rooms from ₹<min>`; the rating part only when n ≥ 1; with neither rating nor price the current text stays.
- IndexNow: `INDEXNOW_KEY` is 32 lowercase hex characters (`openssl rand -hex 16`); key file served at `/<key>.txt`; pings `https://api.indexnow.org/indexnow` on review approval and on hotel publish/save; a failed ping never breaks anything.
- Hotel pages are bilingual (`/hotels/[slug]` and `/hi/hotels/[slug]` render the same `HotelDetailView`): every new public UI string goes into both `lib/i18n/en.ts` and `lib/i18n/hi.ts` (`hi: Dict` makes `tsc` enforce the same shape). API error messages stay English.
- Vercel caps a request body at 4.5 MB: the review form shrinks photos in the browser and refuses a set larger than 4 MB in total.
- No new npm dependencies. `tsconfig.json` has no `target` (ES5 iteration rules): never spread or `for...of` a `Set`/`Map`/iterator; use `Array.from`.
- Tests: `npx vitest run` (node environment, `tests/**/*.test.ts` only). Typecheck: `npx tsc --noEmit -p .`. Shell: Windows Git Bash; quote paths that contain `(site)` or `[id]`.

## Review Focus

- A guest attaches three phone photos of 3-5 MB each → the review still submits (photos are shrunk in the browser; Vercel's 4.5 MB request limit would otherwise return a bare 413), and a set still too large gets a clear message instead of "could not send".
- The same person types their number as `+91 98057-00665` once and `09805700665` the next time → treated as the same phone (second review refused as a duplicate) and matched to their booking for the verified badge; a different number with the same last 4 digits is not.
- The hotel page is deployed before migration v23 is run, or the reviews query fails → the page still renders with "No reviews yet", and no `aggregateRating` (or old imported 4.2 / 150 numbers) appears in JSON-LD or the title.
- An approved review is later hidden → its photos disappear from the public bucket and the hotel's rating/count, JSON-LD and title are recomputed without it.
- A partner replies to a review of another owner's property, or to a review still pending → 404 and nothing is written.

Each line above has a test in the task that owns it (Tasks 13, 1-2-6, 3-9-10, 5, 5-8).

---

### Task 1: Review types and input validation

**Files:**
- Create: `lib/reviews/types.ts`
- Create: `lib/reviews/validate.ts`
- Test: `tests/reviews/validate.test.ts`

**Interfaces:**
- Produces (`lib/reviews/types.ts`, safe for client components – no server imports):
  - `TRIP_TYPES` (`readonly ['family','couple','solo','friends','business']`), `type TripType`
  - `CATEGORIES` (`readonly ['cleanliness','location','staff','value']`), `type Category`
  - `type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'hidden'`
  - `REVIEWS_PAGE_SIZE = 10`, `MAX_PHOTOS = 3`, `MAX_PHOTO_BYTES = 5242880`, `PHOTO_TYPES: Record<string, string>` (mime → extension), `UPLOAD_BUCKET = 'review-uploads'`, `PUBLIC_BUCKET = 'review-photos'`
  - `type ReviewInput`, `type PublicReview`, `type ReviewRow`, `type RatingRow`, `type ReviewSummary`, `type ReviewBundle = { summary; reviews: PublicReview[]; total: number }`, `type ReviewFeed = { summary: ReviewSummary; latest: PublicReview[] }`
  - `emptySummary(): ReviewSummary`, `photoUrl(path: string): string`, `contentTypeFor(path: string): string`
- Produces (`lib/reviews/validate.ts`, server only):
  - `normalizeReviewPhone(raw: unknown): string | null` (last 10 digits; null unless 10-15 digits)
  - `currentMonthIST(now?: Date): string` (`YYYY-MM`)
  - `parseReview(fields: Record<string, unknown>, now?: Date): { ok: true; data: ReviewInput } | { ok: false; error: string }`
  - `checkReviewPhoto(f: { type: string; size: number; head: Uint8Array }): string | null`, `checkPhotoCount(n: number): string | null`
  - `hashIp(ip: string): string` (64 hex chars)
- Consumes: `todayIST` from `lib/bookings/timing.ts` (exists).

- [ ] **Step 1: Write the failing test**

```ts
// tests/reviews/validate.test.ts
import { describe, expect, it } from 'vitest';
import { checkPhotoCount, checkReviewPhoto, currentMonthIST, hashIp, normalizeReviewPhone, parseReview } from '@/lib/reviews/validate';

const PID = '11111111-1111-4111-8111-111111111111';
const NOW = new Date('2026-10-13T06:00:00Z');
const base = {
  property_id: PID, name: 'Ravi Kumar', phone: '+91 98057-00665', rating: '5',
  rating_cleanliness: '4', rating_location: '', rating_staff: '5', rating_value: '',
  title: 'Lovely quiet stay', body: 'Clean rooms, warm staff and a great view of the Dhauladhar range.',
  stay_month: '2026-09', trip_type: 'couple',
};
const err = (over: Record<string, unknown>, now = NOW) => {
  const r = parseReview({ ...base, ...over }, now);
  return r.ok ? null : r.error;
};

describe('normalizeReviewPhone', () => {
  it('keeps the last 10 digits whatever the format', () => {
    expect(normalizeReviewPhone('+91 98057-00665')).toBe('9805700665');
    expect(normalizeReviewPhone('09805700665')).toBe('9805700665');
    expect(normalizeReviewPhone('919805700665')).toBe('9805700665');
    expect(normalizeReviewPhone('9805700665')).toBe('9805700665');
  });
  it('rejects too short or too long numbers', () => {
    expect(normalizeReviewPhone('98057')).toBeNull();
    expect(normalizeReviewPhone('1234567890123456')).toBeNull();
    expect(normalizeReviewPhone(undefined)).toBeNull();
  });
});

describe('parseReview', () => {
  it('accepts a full review and normalises it', () => {
    expect(parseReview(base, NOW)).toEqual({
      ok: true,
      data: {
        property_id: PID, name: 'Ravi Kumar', phone: '9805700665', rating: 5,
        rating_cleanliness: 4, rating_location: null, rating_staff: 5, rating_value: null,
        title: 'Lovely quiet stay', body: base.body, stay_month: '2026-09', trip_type: 'couple',
      },
    });
  });
  it('rejects bad overall ratings', () => {
    for (const rating of ['', '0', '6', '4.5', 'x']) expect(err({ rating })).toBe('Please choose an overall rating from 1 to 5.');
  });
  it('rejects a bad optional category rating', () => {
    expect(err({ rating_staff: '9' })).toBe('Ratings must be from 1 to 5.');
  });
  it('enforces title and text lengths after trimming', () => {
    expect(err({ title: 'Nice' })).toBe('The title needs at least 5 characters.');
    expect(err({ title: 'x'.repeat(101) })).toBe('Please keep the title under 100 characters.');
    expect(err({ body: 'x'.repeat(29) })).toBe('Please write at least 30 characters.');
    expect(err({ body: 'x'.repeat(2001) })).toBe('Please keep your review under 2000 characters.');
    expect(err({ body: '   ' + 'x'.repeat(30) + '   ' })).toBeNull();
  });
  it('rejects an invalid phone, name, trip type and property', () => {
    expect(err({ phone: '12345' })).toBe('Please enter a valid mobile number.');
    expect(err({ name: 'R' })).toBe('Please enter your name.');
    expect(err({ name: 'x'.repeat(61) })).toBe('Please keep your name under 60 characters.');
    expect(err({ trip_type: 'pilgrimage' })).toBe('Please choose a trip type.');
    expect(err({ property_id: 'abc' })).toBe('Unknown property.');
  });
  it('accepts this month in India and rejects next month, across the IST month boundary', () => {
    const lateOct31Utc = new Date('2026-10-31T19:00:00Z'); // already 1 Nov 00:30 in India
    expect(currentMonthIST(lateOct31Utc)).toBe('2026-11');
    expect(err({ stay_month: '2026-11' }, lateOct31Utc)).toBeNull();
    expect(err({ stay_month: '2026-12' }, lateOct31Utc)).toBe('The month of your stay cannot be in the future.');
    expect(err({ stay_month: '2026-11' })).toBe('The month of your stay cannot be in the future.');
    expect(err({ stay_month: '2026-13' })).toBe('Please choose the month you stayed.');
    expect(err({ stay_month: 'Sept 2026' })).toBe('Please choose the month you stayed.');
  });
});

describe('photos', () => {
  const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
  it('accepts real JPEG, PNG and WebP up to 5 MB', () => {
    expect(checkReviewPhoto({ type: 'image/jpeg', size: 100, head: jpg })).toBeNull();
    expect(checkReviewPhoto({ type: 'image/png', size: 100, head: png })).toBeNull();
    expect(checkReviewPhoto({ type: 'image/webp', size: 100, head: webp })).toBeNull();
    expect(checkReviewPhoto({ type: 'image/jpeg', size: 5 * 1024 * 1024, head: jpg })).toBeNull();
  });
  it('rejects other types, empty, oversized and disguised files', () => {
    expect(checkReviewPhoto({ type: 'image/gif', size: 100, head: jpg })).toBe('Photos must be JPG, PNG or WebP.');
    expect(checkReviewPhoto({ type: 'image/jpeg', size: 0, head: jpg })).toBe('One of the photos is empty.');
    expect(checkReviewPhoto({ type: 'image/jpeg', size: 5 * 1024 * 1024 + 1, head: jpg })).toBe('Each photo must be 5 MB or smaller.');
    expect(checkReviewPhoto({ type: 'image/png', size: 100, head: jpg })).toMatch(/does not look like a real image/);
  });
  it('allows at most 3 photos', () => {
    expect(checkPhotoCount(3)).toBeNull();
    expect(checkPhotoCount(4)).toBe('You can add up to 3 photos.');
  });
});

describe('hashIp', () => {
  it('is stable, differs per IP and does not contain the IP', () => {
    expect(hashIp('1.2.3.4')).toBe(hashIp('1.2.3.4'));
    expect(hashIp('1.2.3.4')).not.toBe(hashIp('1.2.3.5'));
    expect(hashIp('1.2.3.4')).toMatch(/^[a-f0-9]{64}$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/reviews/validate.test.ts`
Expected: FAIL, cannot resolve `@/lib/reviews/validate`.

- [ ] **Step 3: Create `lib/reviews/types.ts`**

```ts
// lib/reviews/types.ts
/** Shared review types and limits. Safe to import from client components (no server imports). */
export const TRIP_TYPES = ['family', 'couple', 'solo', 'friends', 'business'] as const;
export type TripType = (typeof TRIP_TYPES)[number];

export const CATEGORIES = ['cleanliness', 'location', 'staff', 'value'] as const;
export type Category = (typeof CATEGORIES)[number];

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'hidden';

export const REVIEWS_PAGE_SIZE = 10;
export const MAX_PHOTOS = 3;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
/** Allowed photo types and the extension each is stored with. */
export const PHOTO_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
/** Private: every upload lands here. */
export const UPLOAD_BUCKET = 'review-uploads';
/** Public: approved photos only. */
export const PUBLIC_BUCKET = 'review-photos';

export type ReviewInput = {
  property_id: string;
  name: string;
  /** Last 10 digits only. Never shown publicly. */
  phone: string;
  rating: number;
  rating_cleanliness: number | null;
  rating_location: number | null;
  rating_staff: number | null;
  rating_value: number | null;
  title: string;
  body: string;
  stay_month: string;
  trip_type: TripType;
};

/** What anyone may see (from the public_hotel_reviews view). `photos` are absolute URLs. */
export type PublicReview = {
  id: string;
  property_id: string;
  name: string;
  rating: number;
  rating_cleanliness: number | null;
  rating_location: number | null;
  rating_staff: number | null;
  rating_value: number | null;
  title: string;
  body: string;
  stay_month: string;
  trip_type: TripType;
  photos: string[];
  verified_stay: boolean;
  owner_reply: string | null;
  owner_reply_at: string | null;
  partner_reply: string | null;
  partner_reply_at: string | null;
  created_at: string;
};

/** A full hotel_reviews row (service role only). Here `photos` are storage paths. */
export type ReviewRow = PublicReview & {
  phone: string;
  status: ReviewStatus;
  ip_hash: string | null;
  moderated_by: string | null;
  moderated_at: string | null;
};

export type RatingRow = Pick<PublicReview, 'rating' | 'rating_cleanliness' | 'rating_location' | 'rating_staff' | 'rating_value'>;

export type ReviewSummary = {
  count: number;
  /** Mean overall rating, 1 decimal; 0 when there are no reviews. */
  average: number;
  /** Mean per category over the reviews that rated it, 1 decimal; null when nobody did. */
  categories: Record<Category, number | null>;
  /** distribution[0] = number of 1-star reviews ... distribution[4] = 5-star. */
  distribution: number[];
};

export type ReviewBundle = { summary: ReviewSummary; reviews: PublicReview[]; total: number };

/** Approved reviews handed to JSON-LD and Markdown. */
export type ReviewFeed = { summary: ReviewSummary; latest: PublicReview[] };

export function emptySummary(): ReviewSummary {
  return { count: 0, average: 0, categories: { cleanliness: null, location: null, staff: null, value: null }, distribution: [0, 0, 0, 0, 0] };
}

/** Public URL of an approved photo (storage path in the review-photos bucket). */
export function photoUrl(path: string): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL || '') + '/storage/v1/object/public/' + PUBLIC_BUCKET + '/' + path;
}

export function contentTypeFor(path: string): string {
  const ext = path.split('.').pop() || '';
  return Object.keys(PHOTO_TYPES).find((t) => PHOTO_TYPES[t] === ext) || 'application/octet-stream';
}
```

- [ ] **Step 4: Create `lib/reviews/validate.ts`**

```ts
// lib/reviews/validate.ts
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { todayIST } from '@/lib/bookings/timing';
import { MAX_PHOTOS, MAX_PHOTO_BYTES, PHOTO_TYPES, TRIP_TYPES, type ReviewInput } from './types';

/** Last 10 digits of a phone number; null unless it has 10-15 digits. */
export function normalizeReviewPhone(raw: unknown): string | null {
  const d = String(raw ?? '').replace(/\D/g, '');
  return d.length >= 10 && d.length <= 15 ? d.slice(-10) : null;
}

/** This month in India as YYYY-MM. */
export const currentMonthIST = (now = new Date()) => todayIST(now).slice(0, 7);

const stars = (msg: string) => z.coerce.number({ invalid_type_error: msg }).int(msg).min(1, msg).max(5, msg);
const optionalStars = (msg: string) =>
  z.preprocess((v) => (v === '' || v === null || v === undefined ? null : v), stars(msg).nullable());

function schema(now: Date) {
  return z.object({
    property_id: z.string().uuid('Unknown property.'),
    name: z.string().trim().min(2, 'Please enter your name.').max(60, 'Please keep your name under 60 characters.'),
    phone: z.string()
      .refine((s) => normalizeReviewPhone(s) !== null, 'Please enter a valid mobile number.')
      .transform((s) => normalizeReviewPhone(s)!),
    rating: stars('Please choose an overall rating from 1 to 5.'),
    rating_cleanliness: optionalStars('Ratings must be from 1 to 5.'),
    rating_location: optionalStars('Ratings must be from 1 to 5.'),
    rating_staff: optionalStars('Ratings must be from 1 to 5.'),
    rating_value: optionalStars('Ratings must be from 1 to 5.'),
    title: z.string().trim().min(5, 'The title needs at least 5 characters.').max(100, 'Please keep the title under 100 characters.'),
    body: z.string().trim().min(30, 'Please write at least 30 characters.').max(2000, 'Please keep your review under 2000 characters.'),
    stay_month: z.string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Please choose the month you stayed.')
      .refine((m) => m >= '2000-01' && m <= currentMonthIST(now), 'The month of your stay cannot be in the future.'),
    trip_type: z.enum(TRIP_TYPES, { errorMap: () => ({ message: 'Please choose a trip type.' }) }),
  });
}

export type ParseResult = { ok: true; data: ReviewInput } | { ok: false; error: string };

/** Validate the review form fields (all strings from FormData). Returns the first problem in field order. */
export function parseReview(fields: Record<string, unknown>, now = new Date()): ParseResult {
  const r = schema(now).safeParse(fields);
  return r.success ? { ok: true, data: r.data } : { ok: false, error: r.error.issues[0]?.message || 'Please check the form.' };
}

const isWebp = (b: Uint8Array) =>
  b.length >= 12 && String.fromCharCode(b[0], b[1], b[2], b[3]) === 'RIFF' && String.fromCharCode(b[8], b[9], b[10], b[11]) === 'WEBP';
const MAGIC: Record<string, (b: Uint8Array) => boolean> = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  'image/webp': isWebp,
};

export function checkPhotoCount(n: number): string | null {
  return n > MAX_PHOTOS ? 'You can add up to 3 photos.' : null;
}

/** Pass the file's first 12 bytes as `head` so a renamed file cannot pass as a photo. */
export function checkReviewPhoto(f: { type: string; size: number; head: Uint8Array }): string | null {
  if (!PHOTO_TYPES[f.type]) return 'Photos must be JPG, PNG or WebP.';
  if (f.size <= 0) return 'One of the photos is empty.';
  if (f.size > MAX_PHOTO_BYTES) return 'Each photo must be 5 MB or smaller.';
  if (!MAGIC[f.type](f.head)) return 'One of the photos does not look like a real image. Please choose the original photo.';
  return null;
}

/** One-way hash of the client IP for the rate limit; the IP itself is never stored. */
export function hashIp(ip: string): string {
  return createHash('sha256').update('review-ip:' + (process.env.REVIEW_IP_SALT || '') + ':' + ip).digest('hex');
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/reviews/validate.test.ts`
Expected: PASS (12 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/reviews/types.ts lib/reviews/validate.ts tests/reviews/validate.test.ts
git commit -m "Add hotel review types and input validation"
```

---

### Task 2: Review summaries and verified-stay matching

**Files:**
- Create: `lib/reviews/summary.ts`
- Test: `tests/reviews/summary.test.ts`

**Interfaces:**
- Consumes: `CATEGORIES`, `emptySummary`, `RatingRow`, `ReviewSummary` (Task 1).
- Produces (pure, client-safe):
  - `round1(n: number): number`
  - `summarize(rows: RatingRow[]): ReviewSummary`
  - `type StayRow = { guest_phone: string | null; status: string | null; check_out: string | null }`
  - `isVerifiedStay(phone10: string, bookings: StayRow[], today: string): boolean`
  - `monthLabel(ym: string, lang?: 'en' | 'hi'): string` (`'2026-09'` → `'Sep 2026'` / `'सितंबर 2026'`)
  - `initialName(name: string): string` (`'ravi kumar'` → `'R.'`)
  - `shortQuote(text: string, max?: number): string` (default 200, ends with `…` when cut)

- [ ] **Step 1: Write the failing test**

```ts
// tests/reviews/summary.test.ts
import { describe, expect, it } from 'vitest';
import { initialName, isVerifiedStay, monthLabel, shortQuote, summarize } from '@/lib/reviews/summary';
import { emptySummary, type RatingRow } from '@/lib/reviews/types';

const row = (rating: number, c: Partial<RatingRow> = {}): RatingRow => ({
  rating, rating_cleanliness: null, rating_location: null, rating_staff: null, rating_value: null, ...c,
});

describe('summarize', () => {
  it('returns the empty summary for no reviews', () => {
    expect(summarize([])).toEqual(emptySummary());
  });
  it('counts, averages to 1 decimal and builds the star distribution', () => {
    const s = summarize([row(5, { rating_cleanliness: 5, rating_staff: 4 }), row(4, { rating_cleanliness: 4 }), row(4)]);
    expect(s.count).toBe(3);
    expect(s.average).toBe(4.3);
    expect(s.distribution).toEqual([0, 0, 0, 2, 1]);
    expect(s.categories).toEqual({ cleanliness: 4.5, location: null, staff: 4, value: null });
  });
  it('ignores out-of-range values', () => {
    expect(summarize([row(0), row(5), row(7)]).count).toBe(1);
  });
});

describe('isVerifiedStay', () => {
  const today = '2026-10-13';
  it('matches the last 10 digits whatever the format, once checked out', () => {
    expect(isVerifiedStay('9805700665', [{ guest_phone: '+91 98057-00665', status: 'completed', check_out: '2026-10-12' }], today)).toBe(true);
    expect(isVerifiedStay('9805700665', [{ guest_phone: '09805700665', status: 'confirmed', check_out: '2026-10-13' }], today)).toBe(true);
  });
  it('needs a check-out today or earlier', () => {
    expect(isVerifiedStay('9805700665', [{ guest_phone: '9805700665', status: 'confirmed', check_out: '2026-10-14' }], today)).toBe(false);
    expect(isVerifiedStay('9805700665', [{ guest_phone: '9805700665', status: 'confirmed', check_out: null }], today)).toBe(false);
  });
  it('ignores cancelled, failed and no-show bookings', () => {
    for (const status of ['cancelled', 'failed', 'no_show']) {
      expect(isVerifiedStay('9805700665', [{ guest_phone: '9805700665', status, check_out: '2026-10-01' }], today)).toBe(false);
    }
  });
  it('does not match a different number with the same last 4 digits, or a short number', () => {
    expect(isVerifiedStay('9805700665', [{ guest_phone: '9811100665', status: 'completed', check_out: '2026-10-01' }], today)).toBe(false);
    expect(isVerifiedStay('9805700665', [{ guest_phone: '00665', status: 'completed', check_out: '2026-10-01' }], today)).toBe(false);
  });
});

describe('labels', () => {
  it('monthLabel in English and Hindi, unknown input unchanged', () => {
    expect(monthLabel('2026-09')).toBe('Sep 2026');
    expect(monthLabel('2026-09', 'hi')).toBe('सितंबर 2026');
    expect(monthLabel('soon')).toBe('soon');
  });
  it('initialName gives the first initial', () => {
    expect(initialName('ravi kumar')).toBe('R.');
    expect(initialName('   ')).toBe('Guest');
  });
  it('shortQuote cuts long text at a word with an ellipsis', () => {
    expect(shortQuote('Short and sweet.')).toBe('Short and sweet.');
    const q = shortQuote('word '.repeat(100), 50);
    expect(q.length).toBeLessThanOrEqual(50);
    expect(q.endsWith('word…')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/reviews/summary.test.ts`
Expected: FAIL, cannot resolve `@/lib/reviews/summary`.

- [ ] **Step 3: Implement**

```ts
// lib/reviews/summary.ts
import { CATEGORIES, emptySummary, type RatingRow, type ReviewSummary } from './types';

export const round1 = (n: number) => Math.round(n * 10) / 10;
const isStar = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 5;
const mean = (xs: number[]): number | null => (xs.length ? round1(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

/** Count, average, per-category averages and star distribution of (approved) reviews. */
export function summarize(rows: RatingRow[]): ReviewSummary {
  const s = emptySummary();
  const overall = rows.map((r) => r.rating).filter(isStar);
  if (!overall.length) return s;
  s.count = overall.length;
  s.average = mean(overall) ?? 0;
  for (const n of overall) s.distribution[n - 1]++;
  for (const c of CATEGORIES) {
    s.categories[c] = mean(rows.map((r) => r[('rating_' + c) as keyof RatingRow]).filter(isStar));
  }
  return s;
}

export type StayRow = { guest_phone: string | null; status: string | null; check_out: string | null };
const NOT_STAYED = ['cancelled', 'failed', 'no_show'];

/** A booking proves the stay: same last 10 digits, not cancelled/failed/no-show, checked out today or earlier (IST date). */
export function isVerifiedStay(phone10: string, bookings: StayRow[], today: string): boolean {
  return bookings.some((b) => {
    const d = String(b.guest_phone ?? '').replace(/\D/g, '');
    return d.length >= 10 && d.slice(-10) === phone10
      && !NOT_STAYED.includes(String(b.status))
      && !!b.check_out && b.check_out.slice(0, 10) <= today;
  });
}

const MONTHS: Record<'en' | 'hi', string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  hi: ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'],
};

/** '2026-09' -> 'Sep 2026' (fixed names, so server and browser render the same text). */
export function monthLabel(ym: string, lang: 'en' | 'hi' = 'en'): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym || '');
  const name = m ? MONTHS[lang][Number(m[2]) - 1] : undefined;
  return m && name ? name + ' ' + m[1] : ym;
}

export function initialName(name: string): string {
  const first = name.trim().charAt(0).toUpperCase();
  return first ? first + '.' : 'Guest';
}

/** Whitespace-collapsed text, cut at a word boundary with '…' when longer than `max`. */
export function shortQuote(text: string, max = 200): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return (space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd() + '…';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/reviews/summary.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/reviews/summary.ts tests/reviews/summary.test.ts
git commit -m "Add review summaries and verified-stay matching"
```

---

### Task 3: Migration v23 and the review store

**Files:**
- Create: `supabase/migration-v23-hotel-reviews.sql`
- Create: `lib/reviews/store.ts`
- Test: `tests/reviews/store.test.ts`

**Interfaces:**
- Consumes: Task 1 types/constants, `summarize`, `isVerifiedStay` (Task 2), `serviceClient`, `HttpError` (`lib/server-auth.ts`), `todayIST` (`lib/bookings/timing.ts`).
- Produces (server only, `lib/reviews/store.ts`):
  - `loadSummary(propertyId: string): Promise<ReviewSummary>` – never throws; empty summary when Supabase is not configured or the query fails
  - `loadApprovedPage(propertyId: string, page?: number, pageSize?: number): Promise<{ reviews: PublicReview[]; total: number }>` – never throws
  - `loadReviewBundle(propertyId: string): Promise<ReviewBundle>` – never throws
  - `countRecentByIp(ipHash: string, sinceIso: string): Promise<number>`
  - `phoneAlreadyReviewed(propertyId: string, phone: string): Promise<boolean>`
  - `hadVerifiedStay(propertyId: string, phone: string, today?: string): Promise<boolean>`
  - `type NewReview = ReviewInput & { id: string; photos: string[]; verified_stay: boolean; ip_hash: string }`
  - `insertReview(row: NewReview): Promise<void>` – inserts with `status: 'pending'`; unique violation → `HttpError(409, 'You have already reviewed this property with this mobile number.')`
  - `getReview(id: string): Promise<ReviewRow | null>`, `updateReview(id: string, patch: Partial<ReviewRow>): Promise<void>`
  - `recomputePropertyRating(propertyId: string): Promise<ReviewSummary>`
  - `type PropertyRef = { id: string; name: string; slug: string; owner_id: string | null; status: string }`, `propertyRef(id: string): Promise<PropertyRef | null>`
  - `uploadReviewPhoto(path: string, bytes: Uint8Array, contentType: string): Promise<void>`, `removeUploads(paths: string[]): Promise<void>` (logs, never throws), `publishPhotos(paths: string[]): Promise<void>`, `unpublishPhotos(paths: string[]): Promise<void>`
  - `type AdminReview = ReviewRow & { property_name: string; property_slug: string; photo_urls: string[] }`, `listAdminReviews(status: ReviewStatus, limit?: number): Promise<AdminReview[]>`
  - `type PartnerReview = PublicReview & { property_name: string }`, `listPartnerReviews(ownerId: string): Promise<PartnerReview[]>`

- [ ] **Step 1: Write the migration**

```sql
-- migration-v23: hotel reviews. Run once in the Supabase SQL editor after v22. Safe to re-run.
-- Writes only go through our API routes (service role). The public reads approved reviews via the
-- public_hotel_reviews view, which leaves out phone and ip_hash.

CREATE TABLE IF NOT EXISTS hotel_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL CHECK (phone ~ '^[0-9]{10}$'),
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  rating_cleanliness INT CHECK (rating_cleanliness BETWEEN 1 AND 5),
  rating_location INT CHECK (rating_location BETWEEN 1 AND 5),
  rating_staff INT CHECK (rating_staff BETWEEN 1 AND 5),
  rating_value INT CHECK (rating_value BETWEEN 1 AND 5),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  stay_month TEXT NOT NULL CHECK (stay_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  trip_type TEXT NOT NULL CHECK (trip_type IN ('family','couple','solo','friends','business')),
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  verified_stay BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','hidden')),
  owner_reply TEXT,
  owner_reply_at TIMESTAMPTZ,
  partner_reply TEXT,
  partner_reply_at TIMESTAMPTZ,
  moderated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  moderated_at TIMESTAMPTZ,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (property_id, phone)
);
CREATE INDEX IF NOT EXISTS idx_hotel_reviews_property ON hotel_reviews(property_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hotel_reviews_status ON hotel_reviews(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hotel_reviews_ip ON hotel_reviews(ip_hash, created_at DESC);

ALTER TABLE hotel_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access hotel reviews" ON hotel_reviews;
CREATE POLICY "Admin full access hotel reviews" ON hotel_reviews FOR ALL USING (is_admin());

-- Approved reviews without private columns. A plain view runs as its owner, so anon can read it
-- even though hotel_reviews itself has no public policy.
CREATE OR REPLACE VIEW public_hotel_reviews AS
SELECT id, property_id, name, rating, rating_cleanliness, rating_location, rating_staff, rating_value,
       title, body, stay_month, trip_type, photos, verified_stay,
       owner_reply, owner_reply_at, partner_reply, partner_reply_at, created_at
FROM hotel_reviews
WHERE status = 'approved';
GRANT SELECT ON public_hotel_reviews TO anon, authenticated;

-- Uploads land in a private bucket; approved photos are copied to the public one.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('review-uploads', 'review-uploads', false, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp'];
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('review-photos', 'review-photos', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp'];

-- Ratings now come only from approved reviews. This replaces imported or hand-typed numbers
-- (0 / 0 until real reviews are approved). Re-running recomputes the same values.
UPDATE properties p
SET rating = s.avg_rating, review_count = s.n
FROM (
  SELECT pr.id, COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) AS avg_rating, COUNT(r.id)::int AS n
  FROM properties pr
  LEFT JOIN hotel_reviews r ON r.property_id = pr.id AND r.status = 'approved'
  GROUP BY pr.id
) s
WHERE s.id = p.id;
```

- [ ] **Step 2: Write the failing store test**

```ts
// tests/reviews/store.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  calls: [] as any[][],
  results: {} as Record<string, { data?: any; error?: any; count?: number }>,
  inserts: [] as any[][],
  updates: [] as any[][],
  storage: [] as any[][],
  throwOnClient: false,
}));

vi.mock('@/lib/server-auth', async (orig) => {
  const real = await orig<typeof import('@/lib/server-auth')>();
  const builder = (t: string) => {
    const b: any = {};
    for (const m of ['select', 'eq', 'in', 'ilike', 'gte', 'order', 'range', 'limit']) {
      b[m] = (...a: any[]) => { h.calls.push([t, m, ...a]); return b; };
    }
    b.insert = async (row: any) => { h.inserts.push([t, row]); return { error: h.results[t + ':insert']?.error ?? null }; };
    b.update = (row: any) => { h.updates.push([t, row]); return b; };
    b.maybeSingle = async () => ({ data: h.results[t]?.data ?? null, error: h.results[t]?.error ?? null });
    b.then = (res: any, rej: any) => Promise.resolve({
      data: h.results[t]?.data ?? [], error: h.results[t]?.error ?? null, count: h.results[t]?.count ?? null,
    }).then(res, rej);
    return b;
  };
  return {
    ...real,
    serviceClient: () => {
      if (h.throwOnClient) throw new Error('no db');
      return {
        from: builder,
        storage: {
          from: (bucket: string) => ({
            download: async (p: string) => { h.storage.push(['download', bucket, p]); return { data: new Blob(['img']), error: null }; },
            upload: async (p: string, _b: unknown, o: any) => { h.storage.push(['upload', bucket, p, o?.contentType, o?.upsert]); return { error: null }; },
            remove: async (l: string[]) => { h.storage.push(['remove', bucket, l]); return { error: null }; },
            createSignedUrls: async (l: string[]) => ({ data: l.map((p) => ({ signedUrl: 'https://signed/' + p })), error: null }),
          }),
        },
      };
    },
  };
});

import {
  hadVerifiedStay, insertReview, listAdminReviews, loadApprovedPage, loadSummary,
  publishPhotos, recomputePropertyRating, unpublishPhotos,
} from '@/lib/reviews/store';

const rating = (r: number, c: number | null = null) => ({ rating: r, rating_cleanliness: c, rating_location: null, rating_staff: null, rating_value: null });

beforeEach(() => {
  h.calls = []; h.results = {}; h.inserts = []; h.updates = []; h.storage = []; h.throwOnClient = false;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://sb.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('review store', () => {
  it('loadSummary reads approved ratings from the public view', async () => {
    h.results.public_hotel_reviews = { data: [rating(5, 5), rating(4, 4)] };
    const s = await loadSummary('p1');
    expect(s.count).toBe(2);
    expect(s.average).toBe(4.5);
    expect(s.categories.cleanliness).toBe(4.5);
    expect(h.calls).toContainEqual(['public_hotel_reviews', 'eq', 'property_id', 'p1']);
  });

  it('loadSummary returns an empty summary when the table is missing, the DB is down or Supabase is not configured', async () => {
    h.results.public_hotel_reviews = { error: { message: 'relation "public_hotel_reviews" does not exist' } };
    expect((await loadSummary('p1')).count).toBe(0);
    h.throwOnClient = true;
    expect((await loadSummary('p1')).count).toBe(0);
    h.throwOnClient = false;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    h.calls = [];
    expect((await loadSummary('p1')).count).toBe(0);
    expect(h.calls).toEqual([]);
  });

  it('loadApprovedPage pages through the public view and returns public photo URLs', async () => {
    h.results.public_hotel_reviews = { data: [{ id: 'r1', photos: ['p1/r1/1.jpg'], name: 'Ravi' }], count: 11 };
    const { reviews, total } = await loadApprovedPage('p1', 2);
    expect(total).toBe(11);
    expect(reviews[0].photos).toEqual(['https://sb.test/storage/v1/object/public/review-photos/p1/r1/1.jpg']);
    expect(h.calls).toContainEqual(['public_hotel_reviews', 'range', 10, 19]);
    expect(h.calls.some((c) => c[0] === 'hotel_reviews')).toBe(false);
  });

  it('loadApprovedPage is empty on error', async () => {
    h.results.public_hotel_reviews = { error: { message: 'boom' } };
    expect(await loadApprovedPage('p1')).toEqual({ reviews: [], total: 0 });
  });

  it('hadVerifiedStay narrows by the last 4 digits, then applies the stay rule', async () => {
    h.results.bookings = { data: [
      { guest_phone: '9811100665', status: 'completed', check_out: '2026-10-01' },
      { guest_phone: '+91 98057 00665', status: 'completed', check_out: '2026-10-01' },
    ] };
    expect(await hadVerifiedStay('p1', '9805700665', '2026-10-13')).toBe(true);
    expect(h.calls).toContainEqual(['bookings', 'ilike', 'guest_phone', '%0665']);
    expect(h.calls).toContainEqual(['bookings', 'eq', 'property_id', 'p1']);
  });

  it('insertReview stores a pending row and turns a duplicate phone into a 409', async () => {
    const row = {
      id: 'r1', property_id: 'p1', name: 'Ravi', phone: '9805700665', rating: 5,
      rating_cleanliness: null, rating_location: null, rating_staff: null, rating_value: null,
      title: 'Lovely stay', body: 'x'.repeat(40), stay_month: '2026-09', trip_type: 'couple' as const,
      photos: [], verified_stay: false, ip_hash: 'abc',
    };
    await insertReview(row);
    expect(h.inserts[0]).toEqual(['hotel_reviews', { ...row, status: 'pending' }]);
    h.results['hotel_reviews:insert'] = { error: { code: '23505', message: 'duplicate key' } };
    await expect(insertReview(row)).rejects.toMatchObject({ status: 409 });
  });

  it('recomputePropertyRating writes the approved average and count to the property', async () => {
    h.results.hotel_reviews = { data: [rating(5), rating(4)] };
    const s = await recomputePropertyRating('p1');
    expect(s.count).toBe(2);
    expect(h.calls).toContainEqual(['hotel_reviews', 'eq', 'status', 'approved']);
    expect(h.updates).toContainEqual(['properties', { rating: 4.5, review_count: 2 }]);
    expect(h.calls).toContainEqual(['properties', 'eq', 'id', 'p1']);
  });

  it('publishPhotos copies private uploads to the public bucket; unpublishPhotos removes them', async () => {
    await publishPhotos(['p1/r1/1.jpg', 'p1/r1/2.webp']);
    expect(h.storage).toEqual([
      ['download', 'review-uploads', 'p1/r1/1.jpg'], ['upload', 'review-photos', 'p1/r1/1.jpg', 'image/jpeg', true],
      ['download', 'review-uploads', 'p1/r1/2.webp'], ['upload', 'review-photos', 'p1/r1/2.webp', 'image/webp', true],
    ]);
    h.storage = [];
    await unpublishPhotos([]);
    expect(h.storage).toEqual([]);
    await unpublishPhotos(['p1/r1/1.jpg']);
    expect(h.storage).toEqual([['remove', 'review-photos', ['p1/r1/1.jpg']]]);
  });

  it('listAdminReviews shows pending photos through short-lived signed links', async () => {
    h.results.hotel_reviews = { data: [{ id: 'r1', phone: '9805700665', photos: ['p1/r1/1.jpg'], properties: { name: 'Snow View', slug: 'snow-view' } }] };
    const [r] = await listAdminReviews('pending');
    expect(r.property_name).toBe('Snow View');
    expect(r.property_slug).toBe('snow-view');
    expect(r.phone).toBe('9805700665');
    expect(r.photo_urls).toEqual(['https://signed/p1/r1/1.jpg']);
    expect((r as any).properties).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/reviews/store.test.ts`
Expected: FAIL, cannot resolve `@/lib/reviews/store`.

- [ ] **Step 4: Implement `lib/reviews/store.ts`**

```ts
// lib/reviews/store.ts
/**
 * Database and storage access for hotel reviews (service role). Public reads use the
 * public_hotel_reviews view so a phone number or IP hash can never reach a page.
 */
import { HttpError, serviceClient } from '@/lib/server-auth';
import { todayIST } from '@/lib/bookings/timing';
import { isVerifiedStay, summarize } from './summary';
import {
  PUBLIC_BUCKET, REVIEWS_PAGE_SIZE, UPLOAD_BUCKET, contentTypeFor, emptySummary, photoUrl,
  type PublicReview, type ReviewBundle, type ReviewInput, type ReviewRow, type ReviewStatus, type ReviewSummary,
} from './types';

const PUBLIC_COLS = 'id, property_id, name, rating, rating_cleanliness, rating_location, rating_staff, rating_value, title, body, stay_month, trip_type, photos, verified_stay, owner_reply, owner_reply_at, partner_reply, partner_reply_at, created_at';
const RATING_COLS = 'rating, rating_cleanliness, rating_location, rating_staff, rating_value';
const SIGNED_URL_SECONDS = 300;

const configured = () => !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const pathsOf = (v: unknown): string[] => (Array.isArray(v) ? v.filter((p): p is string => typeof p === 'string' && p !== '') : []);
const toPublic = (r: any): PublicReview => ({ ...r, photos: pathsOf(r.photos).map(photoUrl) });

// ---------- Public reads (never throw: a review problem must not break a hotel page) ----------

export async function loadSummary(propertyId: string): Promise<ReviewSummary> {
  if (!configured()) return emptySummary();
  try {
    const { data, error } = await serviceClient().from('public_hotel_reviews').select(RATING_COLS).eq('property_id', propertyId);
    if (error) { console.error('Review summary load failed:', error.message); return emptySummary(); }
    return summarize((data as any[]) || []);
  } catch (e) {
    console.error('Review summary load failed:', e);
    return emptySummary();
  }
}

export async function loadApprovedPage(propertyId: string, page = 1, pageSize = REVIEWS_PAGE_SIZE): Promise<{ reviews: PublicReview[]; total: number }> {
  if (!configured()) return { reviews: [], total: 0 };
  const from = (Math.max(1, page) - 1) * pageSize;
  try {
    const { data, error, count } = await serviceClient().from('public_hotel_reviews')
      .select(PUBLIC_COLS, { count: 'exact' })
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) { console.error('Review page load failed:', error.message); return { reviews: [], total: 0 }; }
    return { reviews: ((data as any[]) || []).map(toPublic), total: count ?? 0 };
  } catch (e) {
    console.error('Review page load failed:', e);
    return { reviews: [], total: 0 };
  }
}

export async function loadReviewBundle(propertyId: string): Promise<ReviewBundle> {
  const [summary, page] = await Promise.all([loadSummary(propertyId), loadApprovedPage(propertyId)]);
  return { summary, reviews: page.reviews, total: page.total };
}

// ---------- Submission ----------

export async function countRecentByIp(ipHash: string, sinceIso: string): Promise<number> {
  const { count, error } = await serviceClient().from('hotel_reviews')
    .select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', sinceIso);
  if (error) throw error;
  return count ?? 0;
}

export async function phoneAlreadyReviewed(propertyId: string, phone: string): Promise<boolean> {
  const { data, error } = await serviceClient().from('hotel_reviews')
    .select('id').eq('property_id', propertyId).eq('phone', phone).limit(1);
  if (error) throw error;
  return ((data as any[]) || []).length > 0;
}

/** True when this phone has a real, finished stay at the property (see isVerifiedStay). */
export async function hadVerifiedStay(propertyId: string, phone: string, today = todayIST()): Promise<boolean> {
  const { data, error } = await serviceClient().from('bookings')
    .select('guest_phone, status, check_out')
    .eq('property_id', propertyId)
    .ilike('guest_phone', '%' + phone.slice(-4))
    .limit(200);
  if (error) { console.error('Verified-stay lookup failed:', error.message); return false; }
  return isVerifiedStay(phone, (data as any[]) || [], today);
}

export type NewReview = ReviewInput & { id: string; photos: string[]; verified_stay: boolean; ip_hash: string };

export async function insertReview(row: NewReview): Promise<void> {
  const { error } = await serviceClient().from('hotel_reviews').insert({ ...row, status: 'pending' });
  if (error?.code === '23505') throw new HttpError(409, 'You have already reviewed this property with this mobile number.');
  if (error) throw error;
}

// ---------- Moderation ----------

export async function getReview(id: string): Promise<ReviewRow | null> {
  const { data, error } = await serviceClient().from('hotel_reviews').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? ({ ...(data as any), photos: pathsOf((data as any).photos) } as ReviewRow) : null;
}

export async function updateReview(id: string, patch: Partial<ReviewRow>): Promise<void> {
  const { error } = await serviceClient().from('hotel_reviews').update(patch).eq('id', id);
  if (error) throw error;
}

/** properties.rating / review_count = approved reviews only. Returns the new summary. */
export async function recomputePropertyRating(propertyId: string): Promise<ReviewSummary> {
  const sb = serviceClient();
  const { data, error } = await sb.from('hotel_reviews').select(RATING_COLS).eq('property_id', propertyId).eq('status', 'approved');
  if (error) throw error;
  const s = summarize((data as any[]) || []);
  const { error: upErr } = await sb.from('properties').update({ rating: s.average, review_count: s.count }).eq('id', propertyId);
  if (upErr) throw upErr;
  return s;
}

export type PropertyRef = { id: string; name: string; slug: string; owner_id: string | null; status: string };

export async function propertyRef(id: string): Promise<PropertyRef | null> {
  const { data, error } = await serviceClient().from('properties').select('id, name, slug, owner_id, status').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as PropertyRef) || null;
}

// ---------- Photos ----------

export async function uploadReviewPhoto(path: string, bytes: Uint8Array, contentType: string): Promise<void> {
  const { error } = await serviceClient().storage.from(UPLOAD_BUCKET).upload(path, bytes, { contentType, upsert: false });
  if (error) throw error;
}

export async function removeUploads(paths: string[]): Promise<void> {
  if (!paths.length) return;
  const { error } = await serviceClient().storage.from(UPLOAD_BUCKET).remove(paths);
  if (error) console.error('Review upload cleanup failed:', error);
}

/** Copy approved photos from the private bucket to the public one (same paths). */
export async function publishPhotos(paths: string[]): Promise<void> {
  const sb = serviceClient();
  for (const p of paths) {
    const { data, error } = await sb.storage.from(UPLOAD_BUCKET).download(p);
    if (error || !data) throw error || new Error('Review photo missing: ' + p);
    const { error: upErr } = await sb.storage.from(PUBLIC_BUCKET).upload(p, data, { contentType: contentTypeFor(p), upsert: true });
    if (upErr) throw upErr;
  }
}

export async function unpublishPhotos(paths: string[]): Promise<void> {
  if (!paths.length) return;
  const { error } = await serviceClient().storage.from(PUBLIC_BUCKET).remove(paths);
  if (error) throw error;
}

async function signedUploadUrls(paths: string[]): Promise<string[]> {
  if (!paths.length) return [];
  const { data, error } = await serviceClient().storage.from(UPLOAD_BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
  if (error) { console.error('Review photo links failed:', error); return []; }
  return ((data as any[]) || []).map((d) => d.signedUrl).filter(Boolean);
}

// ---------- Admin and partner lists ----------

export type AdminReview = ReviewRow & { property_name: string; property_slug: string; photo_urls: string[] };

export async function listAdminReviews(status: ReviewStatus, limit = 100): Promise<AdminReview[]> {
  const { data, error } = await serviceClient().from('hotel_reviews')
    .select('*, properties(name, slug)')
    .eq('status', status)
    .order('created_at', { ascending: status === 'pending' })
    .limit(limit);
  if (error) throw error;
  return Promise.all(((data as any[]) || []).map(async (r) => {
    const { properties: p, ...rest } = r;
    const photos = pathsOf(r.photos);
    return {
      ...rest, photos,
      property_name: p?.name ?? '', property_slug: p?.slug ?? '',
      photo_urls: status === 'approved' ? photos.map(photoUrl) : await signedUploadUrls(photos),
    } as AdminReview;
  }));
}

export type PartnerReview = PublicReview & { property_name: string };

export async function listPartnerReviews(ownerId: string): Promise<PartnerReview[]> {
  const sb = serviceClient();
  const { data: props, error: pErr } = await sb.from('properties').select('id, name').eq('owner_id', ownerId);
  if (pErr) throw pErr;
  const list = (props as { id: string; name: string }[]) || [];
  if (!list.length) return [];
  const names: Record<string, string> = {};
  list.forEach((p) => { names[p.id] = p.name; });
  const { data, error } = await sb.from('public_hotel_reviews').select(PUBLIC_COLS)
    .in('property_id', list.map((p) => p.id)).order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return ((data as any[]) || []).map((r) => ({ ...toPublic(r), property_name: names[r.property_id] ?? '' }));
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/reviews/store.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add supabase/migration-v23-hotel-reviews.sql lib/reviews/store.ts tests/reviews/store.test.ts
git commit -m "Add hotel reviews migration and review store"
```

(The migration is applied to Supabase in Task 16.)

---

### Task 4: IndexNow pings and key file

**Files:**
- Create: `lib/indexnow.ts`
- Create: `app/indexnow-key/[key]/route.ts`
- Create: `app/api/admin/indexnow/route.ts`
- Create: `lib/indexnow-client.ts`
- Modify: `next.config.js` (the `rewrites()` array)
- Modify: `app/(site)/admin/approvals/[id]/page.tsx` (`handleApprove`)
- Modify: `app/(site)/admin/properties/page.tsx` (`changeStatus`)
- Modify: `app/(site)/admin/properties/[id]/edit/page.tsx` (the save handler that calls `supabase.from('properties').update(payload)`)
- Test: `tests/indexnow.test.ts`

**Interfaces:**
- Produces:
  - `indexNowKey(): string`, `hotelUrls(slug: string): string[]` (English then Hindi absolute URL), `pingIndexNow(urls: string[], fetchImpl?: typeof fetch): Promise<boolean>` (never throws; false when skipped or failed)
  - `GET /<key>.txt` → rewritten to `GET /indexnow-key/<key>` → the key as text, or 404
  - `POST /api/admin/indexnow` body `{ slug }` (admin only) → `{ ok: true, sent: boolean }`
  - `notifyHotelChanged(slug: string | null | undefined): Promise<void>` (browser helper, never throws)

- [ ] **Step 1: Write the failing test**

```ts
// tests/indexnow.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ role: 'admin' }));
vi.mock('@/lib/server-auth', async (orig) => {
  const real = await orig<typeof import('@/lib/server-auth')>();
  return {
    ...real,
    requireCaller: async (_req: Request, roles?: string[]) => {
      if (roles && !roles.includes(h.role)) throw new real.HttpError(403, 'You do not have access to this');
      return { user: { id: 'admin1' }, profile: { id: 'admin1', role: h.role } };
    },
  };
});

import { siteConfig } from '@/lib/config';
import { hotelUrls, pingIndexNow } from '@/lib/indexnow';
import { GET as keyFile } from '@/app/indexnow-key/[key]/route';
import { POST as pingRoute } from '@/app/api/admin/indexnow/route';

const KEY = '0123456789abcdef0123456789abcdef';
beforeEach(() => { h.role = 'admin'; vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { delete process.env.INDEXNOW_KEY; vi.restoreAllMocks(); });

describe('IndexNow', () => {
  it('hotelUrls gives the English and Hindi page', () => {
    expect(hotelUrls('snow-view')).toEqual([siteConfig.url + '/hotels/snow-view', siteConfig.url + '/hi/hotels/snow-view']);
  });

  it('skips without a valid key', async () => {
    const f = vi.fn();
    expect(await pingIndexNow(['https://x'], f as any)).toBe(false);
    process.env.INDEXNOW_KEY = 'short';
    expect(await pingIndexNow(['https://x'], f as any)).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });

  it('posts the IndexNow payload', async () => {
    process.env.INDEXNOW_KEY = KEY;
    const f = vi.fn(async () => new Response(null, { status: 202 }));
    expect(await pingIndexNow(['https://a', 'https://b'], f as any)).toBe(true);
    const [url, init] = f.mock.calls[0] as any[];
    expect(url).toBe('https://api.indexnow.org/indexnow');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      host: new URL(siteConfig.url).host, key: KEY, keyLocation: siteConfig.url + '/' + KEY + '.txt', urlList: ['https://a', 'https://b'],
    });
  });

  it('never throws on a network error or a bad status', async () => {
    process.env.INDEXNOW_KEY = KEY;
    expect(await pingIndexNow(['https://a'], (async () => { throw new Error('offline'); }) as any)).toBe(false);
    expect(await pingIndexNow(['https://a'], (async () => new Response('no', { status: 422 })) as any)).toBe(false);
  });

  it('serves the key file only under its own name', async () => {
    process.env.INDEXNOW_KEY = KEY;
    const ok = keyFile(new Request('http://x'), { params: { key: KEY } });
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe(KEY);
    expect(keyFile(new Request('http://x'), { params: { key: 'f'.repeat(32) } }).status).toBe(404);
    delete process.env.INDEXNOW_KEY;
    expect(keyFile(new Request('http://x'), { params: { key: KEY } }).status).toBe(404);
  });
});

describe('POST /api/admin/indexnow', () => {
  const post = (body: unknown) => pingRoute(new Request('http://x', { method: 'POST', body: JSON.stringify(body), headers: { Authorization: 'Bearer t' } }));

  it('is admin only', async () => {
    h.role = 'partner';
    expect((await post({ slug: 'snow-view' })).status).toBe(403);
  });
  it('rejects a bad slug', async () => {
    expect((await post({ slug: '../etc' })).status).toBe(400);
  });
  it('answers ok even when no key is configured', async () => {
    const res = await post({ slug: 'snow-view' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, sent: false });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/indexnow.test.ts`
Expected: FAIL, cannot resolve `@/lib/indexnow`.

- [ ] **Step 3: Implement `lib/indexnow.ts`**

```ts
// lib/indexnow.ts
/**
 * IndexNow (Bing, Yandex, Seznam, Naver...): tell search engines a page changed so they recrawl it
 * quickly. Key file: /<INDEXNOW_KEY>.txt (next.config.js rewrites it to app/indexnow-key).
 */
import { siteConfig } from './config';
import { localizePath } from './i18n/core';

const KEY_RE = /^[a-f0-9]{32}$/;
export const indexNowKey = () => (process.env.INDEXNOW_KEY || '').trim();

export function hotelUrls(slug: string): string[] {
  const p = '/hotels/' + slug;
  return [siteConfig.url + p, siteConfig.url + localizePath(p, 'hi')];
}

/** Never throws. False when no valid key is configured or the ping failed. */
export async function pingIndexNow(urls: string[], fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const key = indexNowKey();
  if (!KEY_RE.test(key) || !urls.length) return false;
  try {
    const res = await fetchImpl('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: new URL(siteConfig.url).host, key, keyLocation: siteConfig.url + '/' + key + '.txt', urlList: urls }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error('IndexNow ping failed:', res.status);
    return res.ok;
  } catch (e) {
    console.error('IndexNow ping failed:', e);
    return false;
  }
}
```

- [ ] **Step 4: Implement the key file, the admin ping route and the browser helper**

```ts
// app/indexnow-key/[key]/route.ts
import { indexNowKey } from '@/lib/indexnow';

// /<key>.txt is rewritten here (next.config.js). IndexNow fetches it to check we own the site.
export const dynamic = 'force-dynamic';

export function GET(_req: Request, { params }: { params: { key: string } }) {
  const key = indexNowKey();
  if (!key || params.key !== key) {
    return new Response('Not found\n', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
  return new Response(key, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
}
```

```ts
// app/api/admin/indexnow/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, requireCaller } from '@/lib/server-auth';
import { hotelUrls, pingIndexNow } from '@/lib/indexnow';

export const dynamic = 'force-dynamic';

const schema = z.object({ slug: z.string().regex(/^[a-z0-9-]{1,200}$/) });

/** Admin pages call this after publishing or saving a hotel (lib/indexnow-client.ts). */
export async function POST(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    const body = schema.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new HttpError(400, 'Invalid hotel');
    const sent = await pingIndexNow(hotelUrls(body.data.slug));
    return NextResponse.json({ ok: true, sent });
  } catch (e) { return jsonError(e); }
}
```

```ts
// lib/indexnow-client.ts
import { supabase } from '@/lib/supabase';

/** Browser helper for admin pages: ask the server to ping IndexNow for a hotel page. Best effort, never throws. */
export async function notifyHotelChanged(slug: string | null | undefined): Promise<void> {
  if (!slug) return;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch('/api/admin/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ slug }),
    });
  } catch {
    // A missed ping only delays recrawling.
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/indexnow.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 6: Add the rewrite**

In `next.config.js`, inside `async rewrites() { return [ ... ]; }`, add this entry after the existing `/:section(blog|destinations|treks|hotels)/:slug([a-z0-9-]+).md` entry (keep any entries other plans added):

```js
      // IndexNow key file: /<32 hex chars>.txt -> app/indexnow-key/[key] (lib/indexnow.ts).
      { source: '/:key([a-f0-9]{32}).txt', destination: '/indexnow-key/:key' },
```

- [ ] **Step 7: Ping after an admin publishes or saves a hotel**

1. `app/(site)/admin/approvals/[id]/page.tsx`: add `import { notifyHotelChanged } from '@/lib/indexnow-client';` with the other imports. In `handleApprove`, between the line `if (error || !saved?.length) { alert('Could not save: ' + ...); setAction(null); return; }` and `router.push('/admin/approvals');`, add:

```tsx
    void notifyHotelChanged(property?.slug);
```

2. `app/(site)/admin/properties/page.tsx`: add the same import. In `changeStatus`, replace

```tsx
    if (error) alert('Failed: ' + error.message);
    load();
```

with

```tsx
    if (error) alert('Failed: ' + error.message);
    else if (newStatus === 'published') void notifyHotelChanged(allProperties.find((p) => p.id === id)?.slug);
    load();
```

(only inside `changeStatus`; `toggleFeatured` has the same `alert` line and stays as it is).

3. `app/(site)/admin/properties/[id]/edit/page.tsx`: add the same import. In the save handler (the one with `const { error: e } = await supabase.from('properties').update(payload).eq('id', params.id);`), replace

```tsx
    else setSuccess('Saved successfully!');
```

with

```tsx
    else {
      setSuccess('Saved successfully!');
      if (form.status === 'published') void notifyHotelChanged(slug);
    }
```

- [ ] **Step 8: Typecheck and run all tests**

Run: `npx tsc --noEmit -p . && npx vitest run`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add lib/indexnow.ts lib/indexnow-client.ts "app/indexnow-key/[key]/route.ts" app/api/admin/indexnow/route.ts next.config.js "app/(site)/admin/approvals/[id]/page.tsx" "app/(site)/admin/properties/page.tsx" "app/(site)/admin/properties/[id]/edit/page.tsx" tests/indexnow.test.ts
git commit -m "Ping IndexNow when hotels are published or saved"
```

---

### Task 5: Moderation and replies

**Files:**
- Create: `lib/reviews/moderate.ts`
- Test: `tests/reviews/moderate.test.ts`

**Interfaces:**
- Consumes: `getReview`, `updateReview`, `recomputePropertyRating`, `propertyRef`, `publishPhotos`, `unpublishPhotos` (Task 3); `hotelUrls`, `pingIndexNow` (Task 4); `revalidatePath` from `next/cache`.
- Produces:
  - `type ModerationStatus = 'approved' | 'rejected' | 'hidden'`
  - `setReviewStatus(id: string, status: ModerationStatus, adminId: string): Promise<ReviewSummary>` – `HttpError(404)` for an unknown id
  - `type ReplyBy = { by: 'owner' } | { by: 'partner'; partnerId: string }`
  - `setReply(id: string, who: ReplyBy, text: string): Promise<void>` – `HttpError(400)` outside 2-1000 characters, `HttpError(404)` when not allowed
  - `revalidateHotel(slug: string): void`

- [ ] **Step 1: Write the failing test**

```ts
// tests/reviews/moderate.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ review: null as any, prop: null as any, publishFail: false, calls: [] as any[][] }));
vi.mock('@/lib/reviews/store', () => ({
  getReview: async (id: string) => { h.calls.push(['getReview', id]); return h.review; },
  propertyRef: async () => h.prop,
  publishPhotos: async (p: string[]) => { h.calls.push(['publishPhotos', p]); if (h.publishFail) throw new Error('storage down'); },
  unpublishPhotos: async (p: string[]) => { h.calls.push(['unpublishPhotos', p]); },
  updateReview: async (id: string, patch: any) => { h.calls.push(['updateReview', id, patch]); },
  recomputePropertyRating: async (pid: string) => {
    h.calls.push(['recompute', pid]);
    return { count: 1, average: 5, categories: { cleanliness: null, location: null, staff: null, value: null }, distribution: [0, 0, 0, 0, 1] };
  },
}));
vi.mock('@/lib/indexnow', () => ({
  hotelUrls: (s: string) => ['https://x/hotels/' + s],
  pingIndexNow: async (u: string[]) => { h.calls.push(['ping', u]); return true; },
}));
vi.mock('next/cache', () => ({ revalidatePath: (p: string) => { h.calls.push(['revalidate', p]); } }));

import { setReply, setReviewStatus } from '@/lib/reviews/moderate';

const names = () => h.calls.map((c) => c[0]);
beforeEach(() => {
  h.review = { id: 'r1', property_id: 'p1', status: 'pending', photos: ['p1/r1/1.jpg'] };
  h.prop = { id: 'p1', name: 'Snow View', slug: 'snow-view', owner_id: 'owner1', status: 'published' };
  h.calls = []; h.publishFail = false;
});

describe('setReviewStatus', () => {
  it('approving copies photos, saves, recomputes, refreshes both pages and pings IndexNow', async () => {
    const s = await setReviewStatus('r1', 'approved', 'admin1');
    expect(s.count).toBe(1);
    expect(names()).toEqual(['getReview', 'publishPhotos', 'updateReview', 'recompute', 'revalidate', 'revalidate', 'ping']);
    expect(h.calls[2]).toEqual(['updateReview', 'r1', { status: 'approved', moderated_by: 'admin1', moderated_at: expect.any(String) }]);
    expect(h.calls.filter((c) => c[0] === 'revalidate').map((c) => c[1])).toEqual(['/hotels/snow-view', '/hi/hotels/snow-view']);
    expect(h.calls).toContainEqual(['ping', ['https://x/hotels/snow-view']]);
  });

  it('hiding an approved review removes its public photos and recomputes, without pinging', async () => {
    h.review.status = 'approved';
    await setReviewStatus('r1', 'hidden', 'admin1');
    expect(h.calls).toContainEqual(['unpublishPhotos', ['p1/r1/1.jpg']]);
    expect(names()).not.toContain('publishPhotos');
    expect(names()).toContain('recompute');
    expect(names()).not.toContain('ping');
  });

  it('rejecting a pending review touches no public photos', async () => {
    await setReviewStatus('r1', 'rejected', 'admin1');
    expect(names()).not.toContain('publishPhotos');
    expect(names()).not.toContain('unpublishPhotos');
    expect(names()).toContain('recompute');
  });

  it('does not ping for an unpublished property', async () => {
    h.prop.status = 'draft';
    await setReviewStatus('r1', 'approved', 'admin1');
    expect(names()).not.toContain('ping');
  });

  it('404s for an unknown review', async () => {
    h.review = null;
    await expect(setReviewStatus('nope', 'approved', 'admin1')).rejects.toMatchObject({ status: 404 });
  });

  it('leaves the review pending when copying photos fails', async () => {
    h.publishFail = true;
    await expect(setReviewStatus('r1', 'approved', 'admin1')).rejects.toThrow('storage down');
    expect(names()).not.toContain('updateReview');
    expect(names()).not.toContain('recompute');
  });
});

describe('setReply', () => {
  it('saves a trimmed partner reply on an approved review of their own property', async () => {
    h.review.status = 'approved';
    await setReply('r1', { by: 'partner', partnerId: 'owner1' }, '  Thank you for staying with us!  ');
    expect(h.calls).toContainEqual(['updateReview', 'r1', { partner_reply: 'Thank you for staying with us!', partner_reply_at: expect.any(String) }]);
    expect(names()).toContain('revalidate');
  });

  it("404s for another owner's property and writes nothing", async () => {
    h.review.status = 'approved';
    await expect(setReply('r1', { by: 'partner', partnerId: 'someone-else' }, 'Thanks a lot')).rejects.toMatchObject({ status: 404 });
    expect(names()).not.toContain('updateReview');
  });

  it('404s when a partner replies to a pending review', async () => {
    await expect(setReply('r1', { by: 'partner', partnerId: 'owner1' }, 'Thanks a lot')).rejects.toMatchObject({ status: 404 });
    expect(names()).not.toContain('updateReview');
  });

  it('lets the owner reply to any review', async () => {
    await setReply('r1', { by: 'owner' }, 'Thanks, we have passed this on.');
    expect(h.calls).toContainEqual(['updateReview', 'r1', { owner_reply: 'Thanks, we have passed this on.', owner_reply_at: expect.any(String) }]);
  });

  it('rejects too short and too long replies', async () => {
    h.review.status = 'approved';
    await expect(setReply('r1', { by: 'owner' }, ' x ')).rejects.toMatchObject({ status: 400 });
    await expect(setReply('r1', { by: 'owner' }, 'x'.repeat(1001))).rejects.toMatchObject({ status: 400 });
    expect(names()).not.toContain('updateReview');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/reviews/moderate.test.ts`
Expected: FAIL, cannot resolve `@/lib/reviews/moderate`.

- [ ] **Step 3: Implement**

```ts
// lib/reviews/moderate.ts
import { revalidatePath } from 'next/cache';
import { HttpError } from '@/lib/server-auth';
import { hotelUrls, pingIndexNow } from '@/lib/indexnow';
import { getReview, propertyRef, publishPhotos, recomputePropertyRating, unpublishPhotos, updateReview } from './store';
import type { ReviewSummary } from './types';

export type ModerationStatus = 'approved' | 'rejected' | 'hidden';
export type ReplyBy = { by: 'owner' } | { by: 'partner'; partnerId: string };
const REPLY_MAX = 1000;

/** Rebuild the English and Hindi hotel pages now instead of waiting for ISR. */
export function revalidateHotel(slug: string): void {
  for (const p of ['/hotels/' + slug, '/hi/hotels/' + slug]) {
    try { revalidatePath(p); } catch (e) { console.error('Revalidate failed:', p, e); }
  }
}

/**
 * Approve / reject / hide. Photos are copied to the public bucket before the status changes, so a
 * storage failure leaves the review as it was. Aggregates are recomputed after every change.
 */
export async function setReviewStatus(id: string, status: ModerationStatus, adminId: string): Promise<ReviewSummary> {
  const review = await getReview(id);
  if (!review) throw new HttpError(404, 'Review not found.');
  const wasApproved = review.status === 'approved';
  if (status === 'approved' && !wasApproved) await publishPhotos(review.photos);
  if (status !== 'approved' && wasApproved) await unpublishPhotos(review.photos);
  await updateReview(id, { status, moderated_by: adminId, moderated_at: new Date().toISOString() });
  const summary = await recomputePropertyRating(review.property_id);
  const prop = await propertyRef(review.property_id);
  if (prop) {
    revalidateHotel(prop.slug);
    if (status === 'approved' && !wasApproved && prop.status === 'published') await pingIndexNow(hotelUrls(prop.slug));
  }
  return summary;
}

/** One owner reply and one partner reply per review; saving again replaces it. */
export async function setReply(id: string, who: ReplyBy, text: string): Promise<void> {
  const reply = text.trim();
  if (reply.length < 2 || reply.length > REPLY_MAX) throw new HttpError(400, 'Replies must be 2 to 1000 characters.');
  const review = await getReview(id);
  if (!review) throw new HttpError(404, 'Review not found.');
  const prop = await propertyRef(review.property_id);
  if (who.by === 'partner' && (review.status !== 'approved' || !prop || prop.owner_id !== who.partnerId)) {
    throw new HttpError(404, 'Review not found.');
  }
  const now = new Date().toISOString();
  await updateReview(id, who.by === 'owner' ? { owner_reply: reply, owner_reply_at: now } : { partner_reply: reply, partner_reply_at: now });
  if (prop) revalidateHotel(prop.slug);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/reviews/moderate.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/reviews/moderate.ts tests/reviews/moderate.test.ts
git commit -m "Add review moderation and replies"
```

---

### Task 6: Public reviews API

**Files:**
- Create: `app/api/reviews/route.ts`
- Test: `tests/api/reviews.test.ts`

**Interfaces:**
- Consumes: `parseReview`, `checkReviewPhoto`, `checkPhotoCount`, `hashIp` (Task 1); `propertyRef`, `countRecentByIp`, `phoneAlreadyReviewed`, `hadVerifiedStay`, `uploadReviewPhoto`, `insertReview`, `removeUploads`, `loadSummary`, `loadApprovedPage` (Task 3); `clientIp`, `HttpError`, `jsonError` (`lib/server-auth.ts`); `sendEmail`, `adminEmail` (`lib/email.ts`).
- Produces:
  - `POST /api/reviews` (multipart): fields `property_id, name, phone, rating, rating_cleanliness, rating_location, rating_staff, rating_value, title, body, stay_month, trip_type, website` (honeypot), files `photos` (0-3) → `200 { ok: true }`, or `{ error }` with 400 / 404 / 409 / 429.
  - `GET /api/reviews?property_id=<uuid>&page=<n>` → `{ summary: ReviewSummary, reviews: PublicReview[], total: number, page: number, has_more: boolean }`

- [ ] **Step 1: Write the failing test**

```ts
// tests/api/reviews.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  prop: null as any, recent: 0, dup: false, verified: false, insertError: null as any, emailThrows: false,
  uploads: [] as any[][], inserted: [] as any[], removed: [] as string[][], emails: [] as any[], phoneChecks: [] as any[][],
  page: { reviews: [] as any[], total: 0 },
}));
vi.mock('@/lib/reviews/store', () => ({
  propertyRef: async (id: string) => (h.prop && h.prop.id === id ? h.prop : null),
  countRecentByIp: async () => h.recent,
  phoneAlreadyReviewed: async (pid: string, phone: string) => { h.phoneChecks.push([pid, phone]); return h.dup; },
  hadVerifiedStay: async () => h.verified,
  uploadReviewPhoto: async (path: string, _b: unknown, type: string) => { h.uploads.push([path, type]); },
  insertReview: async (row: any) => { if (h.insertError) throw h.insertError; h.inserted.push(row); },
  removeUploads: async (l: string[]) => { h.removed.push(l); },
  loadSummary: async () => ({ count: 25, average: 4.4, categories: { cleanliness: null, location: null, staff: null, value: null }, distribution: [0, 0, 2, 9, 14] }),
  loadApprovedPage: async () => h.page,
}));
vi.mock('@/lib/email', () => ({
  adminEmail: () => 'owner@x.test',
  sendEmail: async (m: any) => { if (h.emailThrows) throw new Error('mail down'); h.emails.push(m); },
}));

import { HttpError } from '@/lib/server-auth';
import { GET, POST } from '@/app/api/reviews/route';

const PID = '11111111-1111-4111-8111-111111111111';
const jpg = (name = 'a.jpg') => new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6, 7, 8])], name, { type: 'image/jpeg' });
function form(over: Record<string, string> = {}, files: File[] = []) {
  const f = new FormData();
  const v: Record<string, string> = {
    property_id: PID, name: 'Ravi Kumar', phone: '+91 98057-00665', rating: '5',
    rating_cleanliness: '', rating_location: '', rating_staff: '', rating_value: '',
    title: 'Lovely quiet stay', body: 'Clean rooms, warm staff and a great view of the mountains.',
    stay_month: '2026-01', trip_type: 'family', website: '', ...over,
  };
  for (const k of Object.keys(v)) f.set(k, v[k]);
  for (const file of files) f.append('photos', file);
  return f;
}
const post = (f: FormData) => POST(new Request('http://x/api/reviews', { method: 'POST', body: f, headers: { 'x-real-ip': '1.2.3.4' } }));

beforeEach(() => {
  h.prop = { id: PID, name: 'Snow View', slug: 'snow-view', owner_id: 'o1', status: 'published' };
  h.recent = 0; h.dup = false; h.verified = false; h.insertError = null; h.emailThrows = false;
  h.uploads = []; h.inserted = []; h.removed = []; h.emails = []; h.phoneChecks = [];
  h.page = { reviews: [], total: 0 };
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('POST /api/reviews', () => {
  it('pretends to accept a bot that fills the honeypot, and stores nothing', async () => {
    const res = await post(form({ website: 'http://spam.example' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(h.inserted).toEqual([]);
    expect(h.emails).toEqual([]);
    expect(h.phoneChecks).toEqual([]);
  });

  it('returns the first validation problem', async () => {
    const res = await post(form({ title: 'Nice' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('The title needs at least 5 characters.');
  });

  it('refuses a fourth photo or a disguised file before uploading anything', async () => {
    expect((await post(form({}, [jpg(), jpg(), jpg(), jpg()]))).status).toBe(400);
    const fake = new File([new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])], 'x.png', { type: 'image/png' });
    const res = await post(form({}, [fake]));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/does not look like a real image/);
    expect(h.uploads).toEqual([]);
  });

  it('404s for an unpublished property', async () => {
    h.prop.status = 'draft';
    expect((await post(form())).status).toBe(404);
  });

  it('allows 5 reviews per IP per hour, then 429', async () => {
    h.recent = 4;
    expect((await post(form())).status).toBe(200);
    h.recent = 5;
    const res = await post(form());
    expect(res.status).toBe(429);
    expect(h.inserted).toHaveLength(1);
  });

  it('refuses a second review from the same phone, however it is typed', async () => {
    h.dup = true;
    const res = await post(form({ phone: '09805700665' }));
    expect(res.status).toBe(409);
    expect(h.phoneChecks).toEqual([[PID, '9805700665']]);
    expect(h.inserted).toEqual([]);
  });

  it('stores a pending review with private photos, the verified flag and an IP hash, and emails the owner', async () => {
    h.verified = true;
    const res = await post(form({ name: '<b>Ravi</b>' }, [jpg('one.jpg'), jpg('two.jpg')]));
    expect(res.status).toBe(200);
    expect(h.uploads.map((u) => u[1])).toEqual(['image/jpeg', 'image/jpeg']);
    expect(h.uploads[0][0]).toMatch(new RegExp('^' + PID + '/[0-9a-f-]{36}/1\\.jpg$'));
    expect(h.uploads[1][0]).toMatch(/\/2\.jpg$/);
    const row = h.inserted[0];
    expect(row.photos).toEqual(h.uploads.map((u) => u[0]));
    expect(row.id).toBe(row.photos[0].split('/')[1]);
    expect(row).toMatchObject({ property_id: PID, phone: '9805700665', rating: 5, verified_stay: true, trip_type: 'family' });
    expect(row.ip_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(row).not.toHaveProperty('status');
    expect(h.emails[0].to).toBe('owner@x.test');
    expect(h.emails[0].subject).toBe('New review to approve: Snow View');
    expect(h.emails[0].html).toContain('&lt;b&gt;Ravi&lt;/b&gt;');
    expect(h.emails[0].html).toContain('(verified stay)');
  });

  it('removes uploaded photos when the insert fails', async () => {
    h.insertError = new HttpError(409, 'You have already reviewed this property with this mobile number.');
    const res = await post(form({}, [jpg()]));
    expect(res.status).toBe(409);
    expect(h.removed).toEqual([[h.uploads[0][0]]]);
  });

  it('still succeeds when the owner email fails', async () => {
    h.emailThrows = true;
    expect((await post(form())).status).toBe(200);
    expect(h.inserted).toHaveLength(1);
  });
});

describe('GET /api/reviews', () => {
  const get = (q: string) => GET(new Request('http://x/api/reviews?' + q));
  it('rejects a bad property id', async () => {
    expect((await get('property_id=abc')).status).toBe(400);
  });
  it('returns the summary and a page with has_more', async () => {
    h.page = { reviews: [{ id: 'r1' }], total: 25 };
    const two = await (await get('property_id=' + PID + '&page=2')).json();
    expect(two).toMatchObject({ page: 2, total: 25, has_more: true, reviews: [{ id: 'r1' }] });
    expect(two.summary.count).toBe(25);
    const three = await (await get('property_id=' + PID + '&page=3')).json();
    expect(three.has_more).toBe(false);
    const junk = await (await get('property_id=' + PID + '&page=x')).json();
    expect(junk.page).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api/reviews.test.ts`
Expected: FAIL, cannot resolve `@/app/api/reviews/route`.

- [ ] **Step 3: Implement**

```ts
// app/api/reviews/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, clientIp, jsonError } from '@/lib/server-auth';
import { adminEmail, sendEmail } from '@/lib/email';
import { siteConfig } from '@/lib/config';
import { checkPhotoCount, checkReviewPhoto, hashIp, parseReview } from '@/lib/reviews/validate';
import {
  countRecentByIp, hadVerifiedStay, insertReview, loadApprovedPage, loadSummary,
  phoneAlreadyReviewed, propertyRef, removeUploads, uploadReviewPhoto,
} from '@/lib/reviews/store';
import { PHOTO_TYPES, REVIEWS_PAGE_SIZE, type ReviewInput } from '@/lib/reviews/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RATE_LIMIT = 5;
const HOUR_MS = 3600e3;
const FIELDS = ['property_id', 'name', 'phone', 'rating', 'rating_cleanliness', 'rating_location', 'rating_staff', 'rating_value', 'title', 'body', 'stay_month', 'trip_type'];
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

async function emailOwner(hotel: string, r: ReviewInput, verified: boolean, photos: number) {
  try {
    await sendEmail({
      to: adminEmail(),
      subject: 'New review to approve: ' + hotel,
      html: `
        <h2>New review to approve</h2>
        <p><strong>${esc(hotel)}</strong> · ${r.rating}/5${verified ? ' (verified stay)' : ''}</p>
        <p><strong>${esc(r.title)}</strong></p>
        <p>${esc(r.body).replace(/\n/g, '<br>')}</p>
        <p>By ${esc(r.name)} · stayed ${esc(r.stay_month)} · ${esc(r.trip_type)} · ${photos} photo(s)</p>
        <p><a href="${siteConfig.url}/admin/reviews">Approve or reject it in the admin panel</a></p>
      `,
    });
  } catch (e) {
    console.error('Review email failed:', e);
  }
}

export async function POST(req: Request) {
  try {
    const form = await req.formData().catch(() => null);
    if (!form) throw new HttpError(400, 'Please fill in the review form.');
    // Honeypot: hidden from people, filled by bots. Pretend it worked so they do not retry.
    if (String(form.get('website') ?? '').trim()) return NextResponse.json({ ok: true });

    const fields: Record<string, string> = {};
    for (const k of FIELDS) fields[k] = String(form.get(k) ?? '');
    const parsed = parseReview(fields);
    if (!parsed.ok) throw new HttpError(400, parsed.error);
    const input = parsed.data;

    const files = form.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);
    const countProblem = checkPhotoCount(files.length);
    if (countProblem) throw new HttpError(400, countProblem);
    const photos: { type: string; bytes: Buffer }[] = [];
    for (const f of files) {
      const bytes = Buffer.from(await f.arrayBuffer());
      const problem = checkReviewPhoto({ type: f.type, size: bytes.length, head: bytes.subarray(0, 12) });
      if (problem) throw new HttpError(400, problem);
      photos.push({ type: f.type, bytes });
    }

    const property = await propertyRef(input.property_id);
    if (!property || property.status !== 'published') throw new HttpError(404, 'Property not found.');

    const ipHash = hashIp(clientIp(req));
    const recent = await countRecentByIp(ipHash, new Date(Date.now() - HOUR_MS).toISOString());
    if (recent >= RATE_LIMIT) throw new HttpError(429, 'Too many reviews from this connection. Please try again in an hour.');
    if (await phoneAlreadyReviewed(input.property_id, input.phone)) {
      throw new HttpError(409, 'You have already reviewed this property with this mobile number.');
    }

    const id = crypto.randomUUID();
    const verified = await hadVerifiedStay(input.property_id, input.phone);
    const paths: string[] = [];
    try {
      for (let i = 0; i < photos.length; i++) {
        const path = `${input.property_id}/${id}/${i + 1}.${PHOTO_TYPES[photos[i].type]}`;
        await uploadReviewPhoto(path, photos[i].bytes, photos[i].type);
        paths.push(path);
      }
      await insertReview({ ...input, id, photos: paths, verified_stay: verified, ip_hash: ipHash });
    } catch (e) {
      await removeUploads(paths);
      throw e;
    }

    await emailOwner(property.name, input, verified, paths.length);
    return NextResponse.json({ ok: true });
  } catch (e) { return jsonError(e); }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const propertyId = url.searchParams.get('property_id') || '';
  if (!z.string().uuid().safeParse(propertyId).success) return NextResponse.json({ error: 'Unknown property.' }, { status: 400 });
  const page = Math.min(1000, Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1));
  const [summary, { reviews, total }] = await Promise.all([loadSummary(propertyId), loadApprovedPage(propertyId, page)]);
  return NextResponse.json(
    { summary, reviews, total, page, has_more: page * REVIEWS_PAGE_SIZE < total },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/api/reviews.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/reviews/route.ts tests/api/reviews.test.ts
git commit -m "Add public hotel reviews API"
```

---

### Task 7: Admin reviews API

**Files:**
- Create: `app/api/admin/reviews/route.ts`
- Create: `app/api/admin/reviews/[id]/route.ts`
- Test: `tests/api/admin-reviews.test.ts`

**Interfaces:**
- Consumes: `listAdminReviews` (Task 3), `setReviewStatus`, `setReply` (Task 5), `requireCaller` (`lib/server-auth.ts`).
- Produces:
  - `GET /api/admin/reviews?status=pending|approved|rejected|hidden` (default `pending`) → `{ reviews: AdminReview[] }`
  - `PATCH /api/admin/reviews/<id>` with `{ status: 'approved'|'rejected'|'hidden' }` → `{ ok: true, summary }`, or with `{ owner_reply: string }` → `{ ok: true }`

- [ ] **Step 1: Write the failing test**

```ts
// tests/api/admin-reviews.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ role: 'admin', calls: [] as any[][] }));
vi.mock('@/lib/server-auth', async (orig) => {
  const real = await orig<typeof import('@/lib/server-auth')>();
  return {
    ...real,
    requireCaller: async (_req: Request, roles?: string[]) => {
      if (roles && !roles.includes(h.role)) throw new real.HttpError(403, 'You do not have access to this');
      return { user: { id: 'admin1' }, profile: { id: 'admin1', role: h.role } };
    },
  };
});
vi.mock('@/lib/reviews/store', () => ({
  listAdminReviews: async (status: string) => { h.calls.push(['list', status]); return [{ id: 'r1', status }]; },
}));
vi.mock('@/lib/reviews/moderate', async () => {
  const { HttpError } = await import('@/lib/server-auth');
  return {
    setReviewStatus: async (id: string, status: string, adminId: string) => {
      h.calls.push(['status', id, status, adminId]);
      if (id === '22222222-2222-4222-8222-222222222222') throw new HttpError(404, 'Review not found.');
      return { count: 3, average: 4.7 };
    },
    setReply: async (id: string, who: any, text: string) => { h.calls.push(['reply', id, who, text]); },
  };
});

import { GET } from '@/app/api/admin/reviews/route';
import { PATCH } from '@/app/api/admin/reviews/[id]/route';

const ID = '11111111-1111-4111-8111-111111111111';
const patch = (id: string, body: unknown) =>
  PATCH(new Request('http://x', { method: 'PATCH', body: JSON.stringify(body), headers: { Authorization: 'Bearer t' } }), { params: { id } });

beforeEach(() => { h.role = 'admin'; h.calls = []; });

describe('admin reviews API', () => {
  it('is admin only', async () => {
    h.role = 'partner';
    expect((await GET(new Request('http://x/api/admin/reviews'))).status).toBe(403);
    expect((await patch(ID, { status: 'approved' })).status).toBe(403);
    expect(h.calls).toEqual([]);
  });

  it('lists pending reviews by default and rejects an unknown status', async () => {
    const body = await (await GET(new Request('http://x/api/admin/reviews'))).json();
    expect(body.reviews).toEqual([{ id: 'r1', status: 'pending' }]);
    await GET(new Request('http://x/api/admin/reviews?status=hidden'));
    expect(h.calls).toContainEqual(['list', 'hidden']);
    expect((await GET(new Request('http://x/api/admin/reviews?status=deleted'))).status).toBe(400);
  });

  it('approves and hides as the signed-in admin', async () => {
    const res = await patch(ID, { status: 'approved' });
    expect(await res.json()).toEqual({ ok: true, summary: { count: 3, average: 4.7 } });
    expect(h.calls).toContainEqual(['status', ID, 'approved', 'admin1']);
    await patch(ID, { status: 'hidden' });
    expect(h.calls).toContainEqual(['status', ID, 'hidden', 'admin1']);
  });

  it('saves the owner reply', async () => {
    expect((await patch(ID, { owner_reply: 'Thank you!' })).status).toBe(200);
    expect(h.calls).toContainEqual(['reply', ID, { by: 'owner' }, 'Thank you!']);
  });

  it('rejects a bad id, an unknown status and a mixed body', async () => {
    expect((await patch('abc', { status: 'approved' })).status).toBe(400);
    expect((await patch(ID, { status: 'deleted' })).status).toBe(400);
    expect((await patch(ID, { status: 'approved', owner_reply: 'x' })).status).toBe(400);
    expect(h.calls).toEqual([]);
  });

  it('passes a 404 through', async () => {
    expect((await patch('22222222-2222-4222-8222-222222222222', { status: 'approved' })).status).toBe(404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api/admin-reviews.test.ts`
Expected: FAIL, cannot resolve `@/app/api/admin/reviews/route`.

- [ ] **Step 3: Implement**

```ts
// app/api/admin/reviews/route.ts
import { NextResponse } from 'next/server';
import { HttpError, jsonError, requireCaller } from '@/lib/server-auth';
import { listAdminReviews } from '@/lib/reviews/store';
import type { ReviewStatus } from '@/lib/reviews/types';

export const dynamic = 'force-dynamic';

const STATUSES: ReviewStatus[] = ['pending', 'approved', 'rejected', 'hidden'];

export async function GET(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    const status = (new URL(req.url).searchParams.get('status') || 'pending') as ReviewStatus;
    if (!STATUSES.includes(status)) throw new HttpError(400, 'Unknown status');
    return NextResponse.json({ reviews: await listAdminReviews(status) });
  } catch (e) { return jsonError(e); }
}
```

```ts
// app/api/admin/reviews/[id]/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, requireCaller } from '@/lib/server-auth';
import { setReply, setReviewStatus } from '@/lib/reviews/moderate';

export const dynamic = 'force-dynamic';

const bodySchema = z.union([
  z.object({ status: z.enum(['approved', 'rejected', 'hidden']) }).strict(),
  z.object({ owner_reply: z.string().max(5000) }).strict(),
]);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { user } = await requireCaller(req, ['admin']);
    if (!z.string().uuid().safeParse(params.id).success) throw new HttpError(400, 'Unknown review');
    const body = bodySchema.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new HttpError(400, 'Invalid request');
    if ('status' in body.data) {
      const summary = await setReviewStatus(params.id, body.data.status, user.id);
      return NextResponse.json({ ok: true, summary });
    }
    await setReply(params.id, { by: 'owner' }, body.data.owner_reply);
    return NextResponse.json({ ok: true });
  } catch (e) { return jsonError(e); }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/api/admin-reviews.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/reviews/route.ts "app/api/admin/reviews/[id]/route.ts" tests/api/admin-reviews.test.ts
git commit -m "Add admin review moderation API"
```

---

### Task 8: Partner reviews API

**Files:**
- Create: `app/api/partner/reviews/route.ts`
- Test: `tests/api/partner-reviews.test.ts`

**Interfaces:**
- Consumes: `listPartnerReviews` (Task 3), `setReply` (Task 5), `assertActive` (`lib/partners/load.ts`), `requireCaller`.
- Produces:
  - `GET /api/partner/reviews` → `{ reviews: PartnerReview[] }` (approved reviews of the caller's own properties; `[]` for paragliding/taxi/trek partners)
  - `POST /api/partner/reviews` body `{ review_id: uuid, reply: string }` → `{ ok: true }`

- [ ] **Step 1: Write the failing test**

```ts
// tests/api/partner-reviews.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ role: 'partner', partnerType: 'hotel' as string | null, partnerStatus: 'verified', calls: [] as any[][] }));
vi.mock('@/lib/server-auth', async (orig) => {
  const real = await orig<typeof import('@/lib/server-auth')>();
  return {
    ...real,
    requireCaller: async (_req: Request, roles?: string[]) => {
      if (roles && !roles.includes(h.role)) throw new real.HttpError(403, 'You do not have access to this');
      return { user: { id: 'p1' }, profile: { id: 'p1', role: h.role, partner_type: h.partnerType, partner_status: h.partnerStatus } };
    },
  };
});
vi.mock('@/lib/reviews/store', () => ({
  listPartnerReviews: async (ownerId: string) => { h.calls.push(['list', ownerId]); return [{ id: 'r1', property_name: 'Snow View' }]; },
}));
vi.mock('@/lib/reviews/moderate', async () => {
  const { HttpError } = await import('@/lib/server-auth');
  return {
    setReply: async (id: string, who: any, text: string) => {
      h.calls.push(['reply', id, who, text]);
      if (id === '22222222-2222-4222-8222-222222222222') throw new HttpError(404, 'Review not found.');
    },
  };
});

import { GET, POST } from '@/app/api/partner/reviews/route';

const ID = '11111111-1111-4111-8111-111111111111';
const get = () => GET(new Request('http://x'));
const post = (body: unknown) => POST(new Request('http://x', { method: 'POST', body: JSON.stringify(body) }));

beforeEach(() => { h.role = 'partner'; h.partnerType = 'hotel'; h.partnerStatus = 'verified'; h.calls = []; });

describe('partner reviews API', () => {
  it('is for partners only, and not for suspended partners', async () => {
    h.role = 'customer';
    expect((await get()).status).toBe(403);
    h.role = 'partner'; h.partnerStatus = 'suspended';
    expect((await get()).status).toBe(403);
    expect((await post({ review_id: ID, reply: 'Thanks!' })).status).toBe(403);
    expect(h.calls).toEqual([]);
  });

  it("lists reviews of the caller's own properties", async () => {
    const body = await (await get()).json();
    expect(body.reviews).toEqual([{ id: 'r1', property_name: 'Snow View' }]);
    expect(h.calls).toEqual([['list', 'p1']]);
  });

  it('treats a partner without a type as a property owner, and gives activity partners nothing', async () => {
    h.partnerType = null;
    await get();
    expect(h.calls).toEqual([['list', 'p1']]);
    h.calls = []; h.partnerType = 'trek';
    expect((await (await get()).json()).reviews).toEqual([]);
    expect(h.calls).toEqual([]);
  });

  it('replies as the calling partner', async () => {
    expect((await post({ review_id: ID, reply: 'Thanks for staying!' })).status).toBe(200);
    expect(h.calls).toEqual([['reply', ID, { by: 'partner', partnerId: 'p1' }, 'Thanks for staying!']]);
  });

  it("404s for someone else's review and 400s for a bad body", async () => {
    expect((await post({ review_id: '22222222-2222-4222-8222-222222222222', reply: 'Thanks!' })).status).toBe(404);
    expect((await post({ review_id: 'abc', reply: 'Thanks!' })).status).toBe(400);
    expect((await post({ review_id: ID })).status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api/partner-reviews.test.ts`
Expected: FAIL, cannot resolve `@/app/api/partner/reviews/route`.

- [ ] **Step 3: Implement**

```ts
// app/api/partner/reviews/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, requireCaller } from '@/lib/server-auth';
import { assertActive } from '@/lib/partners/load';
import { listPartnerReviews } from '@/lib/reviews/store';
import { setReply } from '@/lib/reviews/moderate';

export const dynamic = 'force-dynamic';

/** Property owners are partners with partner_type 'hotel' or none (older accounts). */
const ownsProperties = (type: unknown) => !type || type === 'hotel';

export async function GET(req: Request) {
  try {
    const { profile } = await requireCaller(req, ['partner']);
    assertActive(profile.partner_status);
    if (!ownsProperties(profile.partner_type)) return NextResponse.json({ reviews: [] });
    return NextResponse.json({ reviews: await listPartnerReviews(profile.id) });
  } catch (e) { return jsonError(e); }
}

const schema = z.object({ review_id: z.string().uuid(), reply: z.string().max(5000) });

export async function POST(req: Request) {
  try {
    const { profile } = await requireCaller(req, ['partner']);
    assertActive(profile.partner_status);
    const body = schema.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new HttpError(400, 'Invalid request');
    await setReply(body.data.review_id, { by: 'partner', partnerId: profile.id }, body.data.reply);
    return NextResponse.json({ ok: true });
  } catch (e) { return jsonError(e); }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/api/partner-reviews.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/partner/reviews/route.ts tests/api/partner-reviews.test.ts
git commit -m "Add partner review replies API"
```

---

### Task 9: Hotel JSON-LD from approved reviews

**Files:**
- Modify: `lib/images.ts` (add `roomImageUrls`)
- Modify: `lib/seo.ts` (`hotelSchemaFull` and its imports)
- Modify: `components/pages/HotelDetailView.tsx` (load reviews, pass them to both `JsonLd` blocks)
- Test: `tests/seo/hotel-schema.test.ts`

**Interfaces:**
- Consumes: `ReviewFeed`, `PublicReview`, `emptySummary` (Task 1), `loadReviewBundle` (Task 3).
- Produces:
  - `roomImageUrls(room: any): string[]` in `lib/images.ts` (room images may be strings or `{ url }`)
  - `hotelImageUrls(h: { images?: any[]; rooms?: any[] }, max?: number): string[]` in `lib/seo.ts` (absolute, property first, de-duplicated, default max 10)
  - `hotelSchemaFull(h, reviews?: ReviewFeed)` – second parameter is new and optional; `aggregateRating`/`review` come only from it
  - In `HotelDetailView`, a `reviews: ReviewBundle` constant (used again in Task 13)

- [ ] **Step 1: Write the failing test**

```ts
// tests/seo/hotel-schema.test.ts
import { describe, expect, it } from 'vitest';
import { hotelImageUrls, hotelSchemaFull } from '@/lib/seo';
import { siteConfig } from '@/lib/config';
import { safeJson } from '@/components/seo/JsonLd';
import { emptySummary, type PublicReview, type ReviewSummary } from '@/lib/reviews/types';

const B = siteConfig.url;
const hotel = (over: Record<string, unknown> = {}) => ({
  name: 'Snow View', slug: 'snow-view', destination_slug: 'mcleod-ganj',
  rating: 4.2, review_count: 150, // legacy imported numbers: must never reach JSON-LD
  total_rooms: 12, check_in_time: '12:00', check_out_time: '11:00',
  images: [{ url: 'https://cdn.test/a.jpg', alt: 'Front' }, { url: '/images/b.jpg', alt: 'Lobby' }],
  rooms: [
    { name: 'Deluxe', description: 'Valley view', base_price: 2500, max_occupancy: 3, bed_type: 'King', images: ['https://cdn.test/r1.jpg', { url: 'https://cdn.test/a.jpg' }], is_active: true },
    { name: 'Old wing', base_price: 1500, is_active: false, images: ['https://cdn.test/old.jpg'] },
    { name: 'Dorm bed', base_price: 0, images: [] },
  ],
  ...over,
});
const review = (i: number, body = 'Great stay number ' + i + ' with lovely mountain views.'): PublicReview => ({
  id: 'r' + i, property_id: 'p1', name: 'Guest ' + i, rating: 5 - (i % 2),
  rating_cleanliness: null, rating_location: null, rating_staff: null, rating_value: null,
  title: 'Title ' + i, body, stay_month: '2026-09', trip_type: 'family', photos: [], verified_stay: false,
  owner_reply: null, owner_reply_at: null, partner_reply: null, partner_reply_at: null,
  created_at: '2026-10-0' + ((i % 9) + 1) + 'T10:00:00Z',
});
const summary = (count: number, average: number): ReviewSummary => ({ ...emptySummary(), count, average });

describe('hotelSchemaFull', () => {
  it('never shows a rating without approved reviews, whatever properties.rating says', () => {
    const plain: any = hotelSchemaFull(hotel());
    expect(plain.aggregateRating).toBeUndefined();
    expect(plain.review).toBeUndefined();
    const empty: any = hotelSchemaFull(hotel(), { summary: emptySummary(), latest: [] });
    expect(empty.aggregateRating).toBeUndefined();
    expect(empty.review).toBeUndefined();
  });

  it('uses the approved-review summary for aggregateRating', () => {
    const ld: any = hotelSchemaFull(hotel(), { summary: summary(2, 4.5), latest: [review(1), review(2)] });
    expect(ld.aggregateRating).toEqual({ '@type': 'AggregateRating', ratingValue: 4.5, ratingCount: 2, reviewCount: 2, bestRating: 5, worstRating: 1 });
  });

  it('lists at most the 5 latest reviews with bodies cut to 500 characters', () => {
    const latest = [review(0, 'x'.repeat(800)), review(1), review(2), review(3), review(4), review(5), review(6)];
    const ld: any = hotelSchemaFull(hotel(), { summary: summary(7, 4.6), latest });
    expect(ld.review).toHaveLength(5);
    expect(ld.review[0]).toEqual({
      '@type': 'Review', author: { '@type': 'Person', name: 'Guest 0' }, datePublished: '2026-10-01', name: 'Title 0',
      reviewRating: { '@type': 'Rating', ratingValue: 5, bestRating: 5, worstRating: 1 }, reviewBody: 'x'.repeat(499) + '…',
    });
    expect(ld.review[0].reviewBody).toHaveLength(500);
    expect(ld.review[1].reviewBody).toBe('Great stay number 1 with lovely mountain views.');
  });

  it('gives absolute photo URLs, property photos first, then room photos, max 10', () => {
    const ld: any = hotelSchemaFull(hotel());
    expect(ld.image).toEqual(['https://cdn.test/a.jpg', B + '/images/b.jpg', 'https://cdn.test/r1.jpg', 'https://cdn.test/old.jpg']);
    const many = Array.from({ length: 15 }, (_, i) => ({ url: 'https://cdn.test/' + i + '.jpg' }));
    expect(hotelImageUrls({ images: many })).toHaveLength(10);
    expect(hotelSchemaFull(hotel({ images: [], rooms: [] })) as any).not.toHaveProperty('image');
  });

  it('describes each active room as a HotelRoom with occupancy, bed and price', () => {
    const ld: any = hotelSchemaFull(hotel());
    expect(ld.containsPlace).toEqual([
      {
        '@type': 'HotelRoom', name: 'Deluxe', description: 'Valley view', image: 'https://cdn.test/r1.jpg',
        occupancy: { '@type': 'QuantitativeValue', maxValue: 3, unitCode: 'C62' },
        bed: { '@type': 'BedDetails', typeOfBed: 'King' },
        offers: { '@type': 'Offer', price: 2500, priceCurrency: 'INR', availability: 'https://schema.org/InStock' },
      },
      { '@type': 'HotelRoom', name: 'Dorm bed' },
    ]);
  });

  it('adds numberOfRooms and check-in/out times when known', () => {
    const ld: any = hotelSchemaFull(hotel());
    expect(ld.numberOfRooms).toBe(12);
    expect(ld.checkinTime).toBe('12:00');
    expect(ld.checkoutTime).toBe('11:00');
    expect(hotelSchemaFull(hotel({ total_rooms: 0 })) as any).not.toHaveProperty('numberOfRooms');
  });

  it('stays safe to embed when a review contains markup', () => {
    const ld = hotelSchemaFull(hotel(), { summary: summary(1, 5), latest: [review(1, '</script><script>alert(1)</script> and a long enough body')] });
    expect(safeJson(ld)).not.toMatch(/</);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/seo/hotel-schema.test.ts`
Expected: FAIL, `hotelImageUrls` is not exported from `@/lib/seo`.

- [ ] **Step 3: Add `roomImageUrls` to `lib/images.ts`**

Append at the end of `lib/images.ts`, before the final `export { FALLBACK_IMG };` line:

```ts
/** Photo URLs of one room type (room images are plain strings or { url } objects). */
export function roomImageUrls(room: any): string[] {
  if (!room || !Array.isArray(room.images)) return [];
  return room.images
    .map((i: any) => (typeof i === 'string' ? i : i?.url))
    .filter((u: unknown): u is string => typeof u === 'string' && u.trim() !== '');
}
```

- [ ] **Step 4: Rewrite `hotelSchemaFull` in `lib/seo.ts`**

Add these imports below the existing `import { hasHindiVersion, localizePath, type Lang } from './i18n/core';`:

```ts
import { normalizeImages, roomImageUrls } from './images';
import type { PublicReview, ReviewFeed } from './reviews/types';
```

Replace the whole block from the comment `/**\n * Full Hotel schema markup with rooms as Offers.` down to the closing `}` of `hotelSchemaFull` (just above `// Backward-compatible simple version`) with:

```ts
const absUrl = (u: string) => (/^https?:\/\//.test(u) ? u : siteConfig.url + (u.startsWith('/') ? u : '/' + u));

/** Up to `max` absolute photo URLs: property photos first, then room photos, no duplicates. */
export function hotelImageUrls(h: { images?: any[]; rooms?: any[] }, max = 10): string[] {
  const all = normalizeImages(h.images).map((i) => i.url).concat(...(h.rooms || []).map(roomImageUrls)).map(absUrl);
  return Array.from(new Set(all)).slice(0, max);
}

function hotelRoomSchema(r: any) {
  const image = roomImageUrls(r)[0];
  return {
    '@type': 'HotelRoom',
    name: r.name,
    ...(r.description ? { description: r.description } : {}),
    ...(image ? { image: absUrl(image) } : {}),
    ...(r.max_occupancy > 0 ? { occupancy: { '@type': 'QuantitativeValue', maxValue: r.max_occupancy, unitCode: 'C62' } } : {}),
    ...(r.bed_type ? { bed: { '@type': 'BedDetails', typeOfBed: r.bed_type } } : {}),
    ...(r.base_price > 0 ? { offers: { '@type': 'Offer', price: r.base_price, priceCurrency: 'INR', availability: 'https://schema.org/InStock' } } : {}),
  };
}

function reviewSchema(r: PublicReview) {
  return {
    '@type': 'Review',
    author: { '@type': 'Person', name: r.name },
    datePublished: r.created_at.slice(0, 10),
    name: r.title,
    reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5, worstRating: 1 },
    reviewBody: r.body.length > 500 ? r.body.slice(0, 499).trimEnd() + '…' : r.body,
  };
}

/**
 * Full Hotel schema: photos, rooms (HotelRoom + Offer), amenities and, only when there are
 * approved reviews, aggregateRating and the latest 5 reviews. properties.rating is never used.
 */
export function hotelSchemaFull(h: {
  name: string; description?: string; short_description?: string;
  address_line1?: string; city?: string; state?: string; pincode?: string;
  destination_slug?: string;
  rating?: number; review_count?: number;
  price_min?: number; price_max?: number;
  latitude?: number; longitude?: number;
  slug: string; type?: string; star_rating?: number;
  check_in_time?: string; check_out_time?: string;
  amenities?: string[]; images?: any[]; total_rooms?: number;
  rooms?: any[]; contact_phone?: string; contact_email?: string;
}, reviews?: ReviewFeed) {
  const area = h.destination_slug?.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || h.city || 'Dharamshala';
  const images = hotelImageUrls(h);
  const rooms = (h.rooms || []).filter((r: any) => r?.name && r.is_active !== false);
  const s = reviews?.summary;
  const rated = !!s && s.count > 0;

  const roomOffers = (h.rooms || []).filter((r: any) => r.base_price > 0).map((r: any) => ({
    '@type': 'Offer',
    name: r.name || 'Room',
    description: r.description || '',
    price: r.base_price,
    priceCurrency: 'INR',
    availability: r.is_active === false ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
    ...(r.bed_type && { additionalProperty: { '@type': 'PropertyValue', name: 'Bed Type', value: r.bed_type } }),
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    name: h.name,
    description: h.description || h.short_description || '',
    url: siteConfig.url + '/hotels/' + h.slug,
    ...(images.length > 0 ? { image: images } : {}),
    ...(h.star_rating && { starRating: { '@type': 'Rating', ratingValue: h.star_rating } }),
    address: {
      '@type': 'PostalAddress',
      streetAddress: h.address_line1 || '',
      addressLocality: area,
      addressRegion: h.state || 'Himachal Pradesh',
      postalCode: h.pincode || '176215',
      addressCountry: 'IN',
    },
    ...(h.latitude && h.longitude && {
      geo: { '@type': 'GeoCoordinates', latitude: h.latitude, longitude: h.longitude },
    }),
    ...(rated ? {
      aggregateRating: { '@type': 'AggregateRating', ratingValue: s!.average, ratingCount: s!.count, reviewCount: s!.count, bestRating: 5, worstRating: 1 },
    } : {}),
    ...(rated && reviews!.latest.length > 0 ? { review: reviews!.latest.slice(0, 5).map(reviewSchema) } : {}),
    ...(h.price_min && h.price_max && {
      priceRange: '₹' + h.price_min + '–₹' + h.price_max,
    }),
    ...(h.check_in_time && { checkinTime: h.check_in_time }),
    ...(h.check_out_time && { checkoutTime: h.check_out_time }),
    ...(h.total_rooms && h.total_rooms > 0 ? { numberOfRooms: h.total_rooms } : {}),
    ...(h.amenities?.length && {
      amenityFeature: h.amenities.map((a: string) => ({
        '@type': 'LocationFeatureSpecification', name: a, value: true,
      })),
    }),
    ...(h.contact_phone && { telephone: h.contact_phone }),
    ...(h.contact_email && { email: h.contact_email }),
    ...(rooms.length > 0 ? { containsPlace: rooms.map(hotelRoomSchema) } : {}),
    ...(roomOffers.length > 0 && { makesOffer: roomOffers }),
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/seo/hotel-schema.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 6: Feed approved reviews into the hotel page JSON-LD**

In `components/pages/HotelDetailView.tsx`:

1. Add with the other imports:

```tsx
import { loadReviewBundle } from '@/lib/reviews/store';
```

2. In `export default async function HotelDetailView(...)`, directly after `const { t } = serverT(lang);`, add:

```tsx
  // Approved reviews only. Never throws: before migration v23 this is just "no reviews".
  const reviews = await loadReviewBundle(raw.id);
  const reviewLd = { summary: reviews.summary, latest: reviews.reviews.slice(0, 5) };
```

3. In the directory branch, replace `hotelSchemaFull({ ...hotel, rating: 0, review_count: 0 }),` with:

```tsx
          hotelSchemaFull(hotel, reviewLd),
```

4. In the partner-hotel `JsonLd` block, replace `hotelSchemaFull(hotel),` with:

```tsx
        hotelSchemaFull(hotel, reviewLd),
```

- [ ] **Step 7: Typecheck and run all tests**

Run: `npx tsc --noEmit -p . && npx vitest run`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/images.ts lib/seo.ts components/pages/HotelDetailView.tsx tests/seo/hotel-schema.test.ts
git commit -m "Build hotel JSON-LD from approved reviews, rooms and photos"
```

---

### Task 10: Hotel page title and description template

**Files:**
- Modify: `lib/seo.ts` (`generateHotelSEO`, `generateHotelSEOHindi`)
- Modify: `components/pages/HotelDetailView.tsx` (`hotelMetadata`)
- Test: `tests/seo/hotel-metadata.test.ts`

**Interfaces:**
- Consumes: `ReviewSummary` (Task 1), `loadSummary` (Task 3).
- Produces: `generateHotelSEO(hotel, lang?: Lang, reviews?: Pick<ReviewSummary, 'count' | 'average'>): Metadata` – the third parameter is new and optional.

- [ ] **Step 1: Write the failing test**

```ts
// tests/seo/hotel-metadata.test.ts
import { describe, expect, it } from 'vitest';
import { generateHotelSEO } from '@/lib/seo';

const base = {
  name: 'Snow View', slug: 'snow-view', destination_slug: 'bhagsu', type: 'hotel', price_min: 2500,
  short_description: 'Quiet rooms near the waterfall.', rating: 4.2, review_count: 150,
};
const title = (m: any) => m.title.absolute as string;

describe('generateHotelSEO', () => {
  it('puts the approved rating and the lowest price in the title', () => {
    const m = generateHotelSEO(base, 'en', { count: 3, average: 4.7 });
    expect(title(m)).toBe('Snow View, Bhagsu · Rated 4.7/5 by 3 guests · Rooms from ₹2,500 | Dharamshala Stay');
    expect(m.description).toBe('Snow View, Bhagsu · Rated 4.7/5 by 3 guests · Rooms from ₹2,500. Quiet rooms near the waterfall. Direct booking, best prices, local support.');
  });

  it('says "guest" for a single review', () => {
    expect(title(generateHotelSEO(base, 'en', { count: 1, average: 5 }))).toBe('Snow View, Bhagsu · Rated 5/5 by 1 guest · Rooms from ₹2,500 | Dharamshala Stay');
  });

  it('leaves the rating out without approved reviews, ignoring legacy properties.rating', () => {
    const m = generateHotelSEO(base);
    expect(title(m)).toBe('Snow View, Bhagsu · Rooms from ₹2,500 | Dharamshala Stay');
    expect(m.description).not.toMatch(/Rated/);
    expect(title(generateHotelSEO(base, 'en', { count: 0, average: 0 }))).toBe('Snow View, Bhagsu · Rooms from ₹2,500 | Dharamshala Stay');
  });

  it('keeps the current text when there is neither a rating nor a price', () => {
    const m = generateHotelSEO({ ...base, price_min: 0 });
    expect(title(m)).toBe('Snow View – Hotel in Bhagsu | Dharamshala Stay');
    expect(m.description).toBe('Book Snow View, a hotel in Bhagsu. Quiet rooms near the waterfall. Direct booking, best prices, local support.');
  });

  it('lets meta_title and meta_description win', () => {
    const m = generateHotelSEO({ ...base, meta_title: 'Custom title', meta_description: 'Custom description' }, 'en', { count: 3, average: 4.7 });
    expect(title(m)).toBe('Custom title | Dharamshala Stay');
    expect(m.description).toBe('Custom description');
  });

  it('adds the approved rating to the Hindi title only when there are reviews', () => {
    expect(title(generateHotelSEO(base, 'hi', { count: 3, average: 4.7 }))).toContain('4.7/5 रेटिंग (3 मेहमान)');
    expect(title(generateHotelSEO(base, 'hi'))).not.toContain('/5');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/seo/hotel-metadata.test.ts`
Expected: FAIL (the first test gets the old `Snow View – Hotel in Bhagsu from ₹2500/night` title).

- [ ] **Step 3: Implement**

In `lib/seo.ts`, change the import added in Task 9 to also bring in `ReviewSummary`:

```ts
import type { PublicReview, ReviewFeed, ReviewSummary } from './reviews/types';
```

Replace the whole `generateHotelSEO` function (from its doc comment `Auto-generated SEO for hotel pages.` to its closing brace) with:

```ts
type RatingSummary = Pick<ReviewSummary, 'count' | 'average'>;

/**
 * Auto-generated SEO for hotel pages. meta_title/meta_description win when set. Otherwise:
 * "<Name>, <Area> · Rated <x>/5 by <n> guests · Rooms from ₹<min>" (rating only from approved
 * reviews, n >= 1), falling back to the older keyword text when there is no rating and no price.
 */
export function generateHotelSEO(hotel: {
  name: string; meta_title?: string; meta_description?: string;
  short_description?: string; description?: string;
  type?: string; city?: string; destination_slug?: string;
  price_min?: number; price_max?: number;
  star_rating?: number; rating?: number; review_count?: number;
  slug: string; images?: any[];
}, lang: Lang = 'en', reviews?: RatingSummary): Metadata {
  if (lang === 'hi') return generateHotelSEOHindi(hotel, reviews);
  const area = hotel.destination_slug?.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || hotel.city || 'Dharamshala';
  const typeLabel = hotel.type ? hotel.type.charAt(0).toUpperCase() + hotel.type.slice(1) : 'Hotel';
  const starText = hotel.star_rating ? hotel.star_rating + '-Star ' : '';
  const priceText = hotel.price_min ? ' from ₹' + hotel.price_min + '/night' : '';
  const n = reviews?.count ?? 0;

  const parts = [
    hotel.name + ', ' + area,
    n >= 1 ? 'Rated ' + reviews!.average + '/5 by ' + n + (n === 1 ? ' guest' : ' guests') : '',
    hotel.price_min && hotel.price_min > 0 ? 'Rooms from ₹' + hotel.price_min.toLocaleString('en-IN') : '',
  ].filter(Boolean);
  const templated = parts.length > 1 ? parts.join(' · ') : null;
  const tail = ' ' + (hotel.short_description || '') + ' Direct booking, best prices, local support.';

  const autoTitle = templated || hotel.name + ' – ' + starText + typeLabel + ' in ' + area + priceText;
  const autoDescription = ((templated
    ? templated + '.'
    : 'Book ' + hotel.name + ', a ' + starText.toLowerCase() + typeLabel.toLowerCase() + ' in ' + area + priceText + '.'
  ) + tail).replace(/\s+/g, ' ').trim().substring(0, 160);

  const title = hotel.meta_title || autoTitle;
  const description = hotel.meta_description || autoDescription;
  const primaryImage = hotel.images?.[0]?.url || hotel.images?.[0];
  const imageUrl = typeof primaryImage === 'string' ? primaryImage : undefined;

  const keywords = [
    hotel.name, 'hotel in ' + area, area + ' hotels',
    typeLabel.toLowerCase() + ' in Dharamshala', 'best hotels ' + area,
    'book ' + hotel.name, 'Dharamshala accommodation', 'McLeod Ganj stays',
    area + ' stay', 'Dharamshala booking',
  ];

  return generateSEO({
    title, description,
    path: '/hotels/' + hotel.slug,
    image: imageUrl,
    keywords,
    ogTag: hotel.price_min ? 'From ₹' + hotel.price_min.toLocaleString('en-IN') + '/night' : typeLabel + ' in ' + area,
    markdown: true,
  });
}
```

Replace the `generateHotelSEOHindi` function (keep `HI_AREAS` and `HI_TYPES` above it) with:

```ts
function generateHotelSEOHindi(hotel: { name: string; short_description?: string; type?: string; destination_slug?: string; price_min?: number; slug: string; images?: any[] }, reviews?: RatingSummary): Metadata {
  const area = HI_AREAS[hotel.destination_slug || ''] || 'धर्मशाला';
  const type = HI_TYPES[hotel.type || ''] || 'होटल';
  const price = hotel.price_min ? ' -- ₹' + hotel.price_min.toLocaleString('en-IN') + '/रात से' : '';
  const n = reviews?.count ?? 0;
  const rated = n >= 1 ? ' · ' + reviews!.average + '/5 रेटिंग (' + n + ' मेहमान)' : '';
  const primaryImage = hotel.images?.[0]?.url || hotel.images?.[0];
  return generateSEO({
    title: hotel.name + ' -- ' + area + ' में ' + type + price + rated,
    description: (hotel.name + ', ' + area + ' में ' + type + '।' + (n >= 1 ? ' मेहमानों की रेटिंग ' + reviews!.average + '/5 (' + n + ' रिव्यू)।' : '') + ' ' + (hotel.short_description || '') + ' लोकेशन, फ़ोटो, आसपास की जगहें और बुकिंग में मदद।').slice(0, 158),
    path: '/hotels/' + hotel.slug,
    image: typeof primaryImage === 'string' ? primaryImage : undefined,
    keywords: [hotel.name, area + ' में ' + type, area + ' होटल'],
    lang: 'hi',
    ogTag: hotel.price_min ? '₹' + hotel.price_min.toLocaleString('en-IN') + '/रात से' : area + ' में ' + type,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/seo/hotel-metadata.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Pass the approved summary from the hotel page**

In `components/pages/HotelDetailView.tsx`, change the store import from Task 9 to:

```tsx
import { loadReviewBundle, loadSummary } from '@/lib/reviews/store';
```

In `hotelMetadata`, directly after `const h = localizeHotel(raw, lang);`, add:

```tsx
  const summary = await loadSummary(raw.id);
```

then replace `if (lang === 'hi') return generateHotelSEO(h, 'hi');` with `if (lang === 'hi') return generateHotelSEO(h, 'hi', summary);` and the last line `return generateHotelSEO(h);` with `return generateHotelSEO(h, 'en', summary);`. The directory-listing branch in between stays as it is.

- [ ] **Step 6: Typecheck and run all tests**

Run: `npx tsc --noEmit -p . && npx vitest run`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/seo.ts components/pages/HotelDetailView.tsx tests/seo/hotel-metadata.test.ts
git commit -m "Show approved rating and room price in hotel page titles"
```

---

### Task 11: Room photos in the image sitemap

**Files:**
- Modify: `lib/sitemap-entries.ts` (the `...hotels.map(...)` entry)
- Test: `tests/sitemap-images.test.ts`

**Interfaces:**
- Consumes: `roomImageUrls` (Task 9).
- Produces: hotel sitemap entries whose `images` include property photos and every room photo, whether stored as a string or as `{ url }`, absolute, on both the English and Hindi entries. `app/sitemap.xml/route.ts` already writes `<image:image>` for `entry.images`; it does not change.

- [ ] **Step 1: Write the failing test**

```ts
// tests/sitemap-images.test.ts
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  getPublishedProperties: async () => [{
    slug: 'snow-view', updated_at: '2026-10-01',
    images: [{ url: '/images/hotels/front.jpg', alt: 'Front' }],
    rooms: [{ name: 'Deluxe', images: ['https://cdn.test/r1.jpg', { url: 'https://cdn.test/r2.jpg' }] }, { name: 'Twin' }],
  }],
  getDestinations: async () => [],
  getPublishedTreks: async () => [],
}));
vi.mock('@/lib/taxi', () => ({ getTaxiRouteGroups: async () => [] }));

import { sitemapEntries } from '@/lib/sitemap-entries';
import { siteConfig } from '@/lib/config';

describe('hotel image sitemap', () => {
  it('lists hotel and room photos (string or object) as absolute URLs on both language versions', async () => {
    const entries = await sitemapEntries();
    const en = entries.find((e) => e.url === siteConfig.url + '/hotels/snow-view')!;
    const hi = entries.find((e) => e.url === siteConfig.url + '/hi/hotels/snow-view')!;
    expect(en.images).toEqual([siteConfig.url + '/images/hotels/front.jpg', 'https://cdn.test/r1.jpg', 'https://cdn.test/r2.jpg']);
    expect(hi.images).toEqual(en.images);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/sitemap-images.test.ts`
Expected: FAIL, `https://cdn.test/r2.jpg` is missing (object room images are dropped today).

- [ ] **Step 3: Implement**

In `lib/sitemap-entries.ts`, change the import `import { normalizeImages } from '@/lib/images';` to:

```ts
import { normalizeImages, roomImageUrls } from '@/lib/images';
```

In the `...hotels.map((h: any) => ({` entry, replace the room line

```ts
        ...(h.rooms || []).flatMap((r: any) => (Array.isArray(r.images) ? r.images : [])).filter((u: unknown) => typeof u === 'string'),
```

with

```ts
        ...(h.rooms || []).flatMap(roomImageUrls),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/sitemap-images.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add lib/sitemap-entries.ts tests/sitemap-images.test.ts
git commit -m "Include every room photo in the image sitemap"
```

---

### Task 12: Reviews in the AI Markdown pages and llms.txt

**Files:**
- Modify: `lib/llms.ts` (imports, `hotelMarkdown`, the hotels line in `llmsIndex`, the `hotels` case in `pageMarkdown`)
- Test: `tests/llms-reviews.test.ts`

**Interfaces:**
- Consumes: `ReviewFeed`, `CATEGORIES`, `Category` (Task 1); `monthLabel`, `initialName`, `shortQuote` (Task 2); `loadReviewBundle` (Task 3); `roomImageUrls` (Task 9).
- Produces: `hotelMarkdown(h: Property, reviews?: ReviewFeed): string` – the second parameter is new and optional. `/hotels/<slug>.md` includes the rating summary, category averages and up to 5 short quotes; `/llms.txt` hotel lines include `rated x/5 (n reviews)`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/llms-reviews.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ hotels: [] as any[], bundle: null as any }));
vi.mock('@/lib/db', () => ({
  getPublishedProperties: async () => h.hotels,
  getPropertyBySlug: async (s: string) => h.hotels.find((x) => x.slug === s) || null,
  getDestinations: async () => [], getDestinationBySlug: async () => null,
  getPublishedTreks: async () => [], getTrekBySlug: async () => null, getParaglidingPackages: async () => [],
}));
vi.mock('@/lib/taxi', () => ({ getTaxiRouteGroups: async () => [] }));
vi.mock('@/lib/reviews/store', () => ({ loadReviewBundle: async () => h.bundle }));

import { hotelMarkdown, llmsIndex, pageMarkdown } from '@/lib/llms';
import { siteConfig } from '@/lib/config';
import { emptySummary } from '@/lib/reviews/types';

const hotel: any = {
  id: 'p1', slug: 'snow-view', name: 'Snow View', type: 'hotel', destination_slug: 'bhagsu',
  price_min: 2500, price_max: 4000, rating: 4.5, review_count: 2, short_description: 'Quiet rooms.',
  images: [], amenities: [], faqs: [],
  rooms: [{ name: 'Deluxe', base_price: 2500, bed_type: 'King', max_occupancy: 3, images: ['/images/r1.jpg'], is_active: true }],
};
const quote = 'Spotless rooms and the staff arranged a taxi to Triund at 6 am for us.';
const feed = {
  summary: { count: 2, average: 4.5, categories: { cleanliness: 4, location: 5, staff: null, value: null }, distribution: [0, 0, 0, 1, 1] },
  latest: [{
    id: 'r1', property_id: 'p1', name: 'ravi kumar', rating: 5, rating_cleanliness: 4, rating_location: 5, rating_staff: null, rating_value: null,
    title: 'Great', body: quote, stay_month: '2026-09', trip_type: 'family', photos: [], verified_stay: true,
    owner_reply: null, owner_reply_at: null, partner_reply: null, partner_reply_at: null, created_at: '2026-10-01T00:00:00Z',
  }],
};

beforeEach(() => { h.hotels = [hotel]; h.bundle = { summary: feed.summary, reviews: feed.latest, total: 2 }; });

describe('hotel Markdown with reviews', () => {
  it('adds the rating summary, category averages and short quotes', () => {
    const md = hotelMarkdown(hotel, feed as any);
    expect(md).toContain('- **Guest rating:** 4.5/5 from 2 reviews');
    expect(md).toContain('## Guest reviews');
    expect(md).toContain('Rated 4.5/5 from 2 approved reviews on Dharamshala Stay.');
    expect(md).toContain('- Cleanliness: 4.0/5');
    expect(md).toContain('- Location: 5.0/5');
    expect(md).not.toContain('- Staff:');
    expect(md).toContain('> "' + quote + '" -- R., Sep 2026 (verified stay)');
  });

  it('lists rooms with price and a described photo', () => {
    expect(hotelMarkdown(hotel)).toContain('- **Deluxe** -- from Rs.2,500/night, King bed, sleeps 3. Photo: ' + siteConfig.url + '/images/r1.jpg -- Deluxe at Snow View');
  });

  it('shows no rating and no reviews section without approved reviews', () => {
    const md = hotelMarkdown(hotel, { summary: emptySummary(), latest: [] });
    expect(md).not.toContain('Guest rating');
    expect(md).not.toContain('## Guest reviews');
    expect(hotelMarkdown({ ...hotel, rating: 0, review_count: 0 })).not.toContain('Guest rating');
  });

  it('the .md page loads the approved reviews', async () => {
    expect(await pageMarkdown('/hotels/snow-view')).toContain('-- R., Sep 2026 (verified stay)');
  });

  it('llms.txt hotel lines carry the rating', async () => {
    expect(await llmsIndex()).toContain('rated 4.5/5 (2 reviews)');
    h.hotels = [{ ...hotel, rating: 0, review_count: 0 }];
    expect(await llmsIndex()).not.toMatch(/rated \d/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/llms-reviews.test.ts`
Expected: FAIL (no `## Guest reviews` section; no `rated 4.5/5` in llms.txt).

- [ ] **Step 3: Implement**

In `lib/llms.ts`:

1. Replace `import { normalizeImages } from './images';` with:

```ts
import { normalizeImages, roomImageUrls } from './images';
import { loadReviewBundle } from './reviews/store';
import { initialName, monthLabel, shortQuote } from './reviews/summary';
import { CATEGORIES, type Category, type ReviewFeed } from './reviews/types';
```

2. Replace the whole `export function hotelMarkdown(h: Property): string { ... }` function with:

```ts
const CATEGORY_LABELS: Record<Category, string> = { cleanliness: 'Cleanliness', location: 'Location', staff: 'Staff', value: 'Value for money' };
const outOf5 = (n: number) => Number(n).toFixed(1) + '/5';
const plural = (n: number, word: string) => n + ' ' + word + (n === 1 ? '' : 's');

/** Approved reviews only: summary, category averages and up to 5 short quotes (initial + month). */
function reviewsBlock(reviews?: ReviewFeed): string {
  const s = reviews?.summary;
  if (!s || s.count === 0) return '';
  const cats = CATEGORIES.filter((c) => s.categories[c] !== null).map((c) => '- ' + CATEGORY_LABELS[c] + ': ' + outOf5(s.categories[c]!));
  const quotes = reviews!.latest.slice(0, 5).map((r) =>
    '> "' + shortQuote(r.body, 200) + '" -- ' + initialName(r.name) + ', ' + monthLabel(r.stay_month) + (r.verified_stay ? ' (verified stay)' : ''));
  return join(
    '## Guest reviews',
    'Rated ' + outOf5(s.average) + ' from ' + plural(s.count, 'approved review') + ' on ' + siteConfig.name + '.',
    cats.join('\n'),
    quotes.join('\n\n'),
  );
}

export function hotelMarkdown(h: Property, reviews?: ReviewFeed): string {
  const directory = isDirectoryListing(h);
  const area = areaName(h.destination_slug);
  const images = normalizeImages(h.images);
  const rooms = (h.rooms || []).filter((r: any) => r?.name && r.is_active !== false);
  const extra = h as any;
  // With a review feed use it; otherwise properties.rating/review_count (derived from approved reviews since v23).
  const rating = reviews ? reviews.summary : { count: Number(h.review_count) || 0, average: Number(h.rating) || 0 };
  const roomLine = (r: any) => {
    const img = roomImageUrls(r)[0];
    return '- **' + r.name + '**' + (!directory && r.base_price > 0 ? ' -- from ' + rs(r.base_price) + '/night' : '') +
      (r.bed_type ? ', ' + r.bed_type + ' bed' : '') + (r.max_occupancy ? ', sleeps ' + r.max_occupancy : '') +
      (r.description ? '. ' + r.description : '') +
      (img ? '. Photo: ' + abs(img) + ' -- ' + r.name + ' at ' + h.name : '');
  };
  return join(
    '# ' + h.name + ' (' + (h.type || 'hotel') + ' in ' + area + ')',
    h.short_description && '> ' + h.short_description,
    facts([
      ['URL', B + '/hotels/' + h.slug],
      ['Area', area],
      ['Address', [h.address_line1, h.city, h.state, h.pincode].filter(Boolean).join(', ')],
      ['Landmark', h.landmark],
      ['Star rating', h.star_rating],
      ['Price', !directory && h.price_min > 0 ? rs(h.price_min) + (h.price_max > h.price_min ? ' - ' + rs(h.price_max) : '') + ' per night' : extra.price_band],
      ['Guest rating', rating.count > 0 && rating.average > 0 ? outOf5(rating.average) + ' from ' + plural(rating.count, 'review') : ''],
      ['Check-in / check-out', h.check_in_time && h.check_out_time ? h.check_in_time + ' / ' + h.check_out_time : ''],
      ['From bus stand', h.distance_from_bus_stand],
      ['From airport', h.distance_from_airport],
      ['Couple friendly', h.couple_friendly ? 'Yes' : ''],
      ['Booking', directory ? 'Enquire through Dharamshala Stay' : 'Book directly on Dharamshala Stay'],
    ]),
    h.description && absolutize(h.description.trim()),
    extra.highlights?.length && '## Highlights\n\n' + list(extra.highlights),
    extra.good_for?.length && '## Good for\n\n' + list(extra.good_for),
    rooms.length > 0 && '## Rooms\n\n' + rooms.map(roomLine).join('\n'),
    h.amenities?.length && '## Amenities\n\n' + list([...h.amenities, ...(h.room_amenities || [])]),
    (h.nearby_attractions?.length || extra.nearby?.length) && '## Nearby\n\n' + list([...(h.nearby_attractions || []), ...(extra.nearby || [])]),
    (h.cancellation_policy || h.child_policy || h.pet_policy) && '## Policies\n\n' + facts([
      ['Cancellation', h.cancellation_policy], ['Children', h.child_policy], ['Pets', h.pet_policy], ['Smoking', h.smoking_policy],
    ]),
    reviewsBlock(reviews),
    images.length > 0 && '## Photos\n\n' + images.slice(0, 12).map((i) => '- ' + abs(i.url) + (i.alt ? ' -- ' + i.alt : '')).join('\n'),
    faqBlock(h.faqs),
  );
}
```

3. In `llmsIndex`, replace the hotels line

```ts
    hotels.length > 0 && '## Hotels & homestays\n\n' + hotels.map((h) => link(h.name, '/hotels/' + h.slug,
      [h.type, areaName(h.destination_slug), !isDirectoryListing(h) && h.price_min > 0 && 'from ' + rs(h.price_min) + '/night'].filter(Boolean).join(', ') + '. ' + (h.short_description || ''))).join('\n'),
```

with

```ts
    hotels.length > 0 && '## Hotels & homestays\n\n' + hotels.map((h) => link(h.name, '/hotels/' + h.slug,
      [
        h.type, areaName(h.destination_slug),
        !isDirectoryListing(h) && h.price_min > 0 && 'from ' + rs(h.price_min) + '/night',
        h.review_count > 0 && h.rating > 0 && 'rated ' + outOf5(h.rating) + ' (' + plural(h.review_count, 'review') + ')',
      ].filter(Boolean).join(', ') + '. ' + (h.short_description || ''))).join('\n'),
```

4. In `pageMarkdown`, replace

```ts
    case 'hotels': { const h = await getPropertyBySlug(slug); return h ? hotelMarkdown(h) + footer : null; }
```

with

```ts
    case 'hotels': {
      const h = await getPropertyBySlug(slug);
      if (!h) return null;
      const b = await loadReviewBundle(h.id);
      return hotelMarkdown(h, { summary: b.summary, latest: b.reviews.slice(0, 5) }) + footer;
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/llms-reviews.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Typecheck and run all tests**

Run: `npx tsc --noEmit -p . && npx vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/llms.ts tests/llms-reviews.test.ts
git commit -m "Add approved reviews to hotel Markdown and llms.txt"
```

---

### Task 13: Reviews on the hotel page (English and Hindi)

**Files:**
- Modify: `lib/i18n/en.ts`, `lib/i18n/hi.ts` (new `reviews` block)
- Create: `lib/reviews/resize.ts`
- Create: `components/reviews/HotelReviews.tsx`
- Create: `components/reviews/ReviewForm.tsx`
- Modify: `components/pages/HotelDetailView.tsx` (rating badge, new section, pass reviews to `DirectoryListing`)
- Modify: `components/hotels/DirectoryListing.tsx` (new `reviews` prop and section)
- Test: `tests/reviews/ui-support.test.ts`

**Interfaces:**
- Consumes: `ReviewBundle`, `PublicReview`, `CATEGORIES`, `TRIP_TYPES`, `MAX_PHOTOS`, `Category` (Task 1); `monthLabel` (Task 2); `GET`/`POST /api/reviews` (Task 6); the `reviews` constant in `HotelDetailView` (Task 9); `useT` (`lib/i18n/client.ts`), `fmt` (`lib/i18n/dict.ts`); `todayIST` (`lib/bookings/timing.ts`).
- Produces:
  - `t.reviews.*` strings in both dictionaries (shape below)
  - `scaledSize(width: number, height: number, max?: number): { width: number; height: number }`, `photosTooBig(sizes: number[]): boolean`, `shrinkPhoto(file: File): Promise<File>`, `MAX_EDGE = 1600`, `MAX_REQUEST_PHOTO_BYTES = 4194304`
  - `<HotelReviews propertyId={string} hotelName={string} initial={ReviewBundle} />` (client component, section id `reviews`)
  - `<ReviewForm propertyId={string} hotelName={string} onClose={() => void} />` (client modal)
  - `DirectoryListing` props become `{ hotel; related; reviews: ReviewBundle; lang? }`

- [ ] **Step 1: Write the failing test**

```ts
// tests/reviews/ui-support.test.ts
import { describe, expect, it } from 'vitest';
import { en } from '@/lib/i18n/en';
import { hi } from '@/lib/i18n/hi';
import { CATEGORIES, TRIP_TYPES } from '@/lib/reviews/types';
import { MAX_EDGE, photosTooBig, scaledSize } from '@/lib/reviews/resize';

describe('review strings', () => {
  it('uses the approved thank-you message', () => {
    expect(en.reviews.form.thanks).toBe('Thanks – your review will appear after a quick check.');
  });
  it('labels every trip type and category in English and Hindi', () => {
    for (const d of [en, hi]) {
      for (const k of TRIP_TYPES) expect(d.reviews.trips[k]).toBeTruthy();
      for (const c of CATEGORIES) expect(d.reviews.categories[c]).toBeTruthy();
    }
  });
  it('really translates the Hindi page', () => {
    expect(hi.reviews.write).not.toBe(en.reviews.write);
    expect(hi.reviews.form.thanks).not.toBe(en.reviews.form.thanks);
  });
});

describe('photo shrinking', () => {
  it('scales the long side down to 1600 px and keeps the aspect ratio', () => {
    expect(MAX_EDGE).toBe(1600);
    expect(scaledSize(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(scaledSize(3000, 4000)).toEqual({ width: 1200, height: 1600 });
    expect(scaledSize(1200, 800)).toEqual({ width: 1200, height: 800 });
  });
  it('refuses three phone photos that would not fit one request (Vercel caps bodies at 4.5 MB)', () => {
    expect(photosTooBig([3_500_000, 4_200_000, 4_900_000])).toBe(true);
    expect(photosTooBig([400_000, 380_000, 520_000])).toBe(false);
    expect(photosTooBig([])).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/reviews/ui-support.test.ts`
Expected: FAIL, cannot resolve `@/lib/reviews/resize` (and `en.reviews` is undefined).

- [ ] **Step 3: Add the English strings**

In `lib/i18n/en.ts`, find the `directory: { ... },` block (it ends with `officialSite: 'Official website', moreStays: 'More stays in {place}',` and `},`) and insert directly after it, before `booking: {`:

```ts
  reviews: {
    heading: 'Guest reviews', write: 'Write a review',
    none: 'No reviews yet. Stayed here? Be the first to share your experience.',
    basedOn: 'Based on {n} reviews', basedOnOne: 'Based on 1 review',
    categories: { cleanliness: 'Cleanliness', location: 'Location', staff: 'Staff', value: 'Value for money' } as Record<string, string>,
    trips: { family: 'Family', couple: 'Couple', solo: 'Solo', friends: 'Friends', business: 'Business' } as Record<string, string>,
    verified: 'Verified stay', stayed: 'Stayed {month}', ownerReply: 'Reply from Dharamshala Stay', partnerReply: 'Reply from the property',
    photos: 'Guest photos', showMore: 'Show more reviews',
    form: {
      title: 'Review {name}', name: 'Your name', phone: 'Mobile number',
      phoneHint: 'Never shown. Used only to check whether you stayed with us.',
      overall: 'Overall rating', details: 'Rate the details (optional)', reviewTitle: 'Title',
      body: 'Your review', bodyHint: 'What did you like or dislike? (30-2000 characters)',
      month: 'Month of stay', trip: 'Trip type', choose: 'Choose…',
      photos: 'Photos (optional)', photosHint: 'Up to 3 photos, JPG, PNG or WebP, 5 MB each',
      submit: 'Submit review', sending: 'Sending…', cancel: 'Cancel', close: 'Close',
      thanks: 'Thanks – your review will appear after a quick check.',
      pickRating: 'Please choose an overall rating.', tooManyPhotos: 'You can add up to 3 photos.',
      photosTooBig: 'These photos are too large together. Please choose fewer or smaller photos.',
      failed: 'Could not send your review. Please try again.',
    },
  },
```

- [ ] **Step 4: Add the Hindi strings**

In `lib/i18n/hi.ts`, insert at the same place (after the `directory: { ... },` block that ends with `officialSite: 'आधिकारिक वेबसाइट', moreStays: '{place} में और होटल',`, before `booking: {`):

```ts
  reviews: {
    heading: 'मेहमानों के रिव्यू', write: 'रिव्यू लिखें',
    none: 'अभी कोई रिव्यू नहीं है। यहाँ रुके थे? सबसे पहले अपना अनुभव बताएं।',
    basedOn: '{n} रिव्यू के आधार पर', basedOnOne: '1 रिव्यू के आधार पर',
    categories: { cleanliness: 'साफ़-सफ़ाई', location: 'लोकेशन', staff: 'स्टाफ़', value: 'पैसे की वसूली' } as Record<string, string>,
    trips: { family: 'परिवार', couple: 'कपल', solo: 'अकेले', friends: 'दोस्त', business: 'बिज़नेस' } as Record<string, string>,
    verified: 'वेरिफ़ाइड स्टे', stayed: '{month} में रुके', ownerReply: 'Dharamshala Stay का जवाब', partnerReply: 'प्रॉपर्टी का जवाब',
    photos: 'मेहमानों की फ़ोटो', showMore: 'और रिव्यू देखें',
    form: {
      title: '{name} का रिव्यू लिखें', name: 'आपका नाम', phone: 'मोबाइल नंबर',
      phoneHint: 'यह कभी नहीं दिखाया जाता। सिर्फ़ यह जाँचने के लिए कि आप हमारे साथ रुके थे।',
      overall: 'कुल रेटिंग', details: 'बाकी रेटिंग (ज़रूरी नहीं)', reviewTitle: 'शीर्षक',
      body: 'आपका रिव्यू', bodyHint: 'क्या अच्छा लगा, क्या नहीं? (30-2000 अक्षर)',
      month: 'रुकने का महीना', trip: 'यात्रा का प्रकार', choose: 'चुनें…',
      photos: 'फ़ोटो (ज़रूरी नहीं)', photosHint: 'ज़्यादा से ज़्यादा 3 फ़ोटो, JPG, PNG या WebP, हर एक 5 MB तक',
      submit: 'रिव्यू भेजें', sending: 'भेज रहे हैं…', cancel: 'रद्द करें', close: 'बंद करें',
      thanks: 'धन्यवाद – आपका रिव्यू एक छोटी जाँच के बाद दिखेगा।',
      pickRating: 'कृपया कुल रेटिंग चुनें।', tooManyPhotos: 'आप ज़्यादा से ज़्यादा 3 फ़ोटो जोड़ सकते हैं।',
      photosTooBig: 'ये फ़ोटो मिलाकर बहुत बड़ी हैं। कृपया कम या छोटी फ़ोटो चुनें।',
      failed: 'रिव्यू नहीं भेजा जा सका। कृपया फिर से कोशिश करें।',
    },
  },
```

- [ ] **Step 5: Create `lib/reviews/resize.ts`**

```ts
// lib/reviews/resize.ts
/**
 * Browser-side photo shrinking. Vercel rejects request bodies over 4.5 MB, so three 5 MB phone
 * photos would never reach /api/reviews. We re-encode to JPEG at most 1600 px on the long side.
 */
export const MAX_EDGE = 1600;
export const MAX_REQUEST_PHOTO_BYTES = 4 * 1024 * 1024;

export function scaledSize(width: number, height: number, max = MAX_EDGE): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= max || longest <= 0) return { width, height };
  const k = max / longest;
  return { width: Math.round(width * k), height: Math.round(height * k) };
}

export function photosTooBig(sizes: number[]): boolean {
  return sizes.reduce((a, b) => a + b, 0) > MAX_REQUEST_PHOTO_BYTES;
}

/** Returns the original file when the browser cannot decode it or the result is not smaller. */
export async function shrinkPhoto(file: File): Promise<File> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;
  try {
    const bmp = await createImageBitmap(file);
    const { width, height } = scaledSize(bmp.width, bmp.height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bmp, 0, 0, width, height);
    bmp.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/reviews/ui-support.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 7: Create `components/reviews/ReviewForm.tsx`**

```tsx
'use client';
import { useEffect, useState } from 'react';
import { CheckCircle, Loader2, Star, X } from 'lucide-react';
import { useT } from '@/lib/i18n/client';
import { fmt } from '@/lib/i18n/dict';
import { cn } from '@/lib/utils';
import { todayIST } from '@/lib/bookings/timing';
import { photosTooBig, shrinkPhoto } from '@/lib/reviews/resize';
import { CATEGORIES, MAX_PHOTOS, TRIP_TYPES, type Category } from '@/lib/reviews/types';

function StarPicker({ label, value, onChange, required }: { label: string; value: number; onChange: (n: number) => void; required?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-700">{label}</span>
      <span className="flex" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={n + '/5'}
            onClick={() => onChange(value === n && !required ? 0 : n)} className="p-0.5">
            <Star className={cn('h-6 w-6', n <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />
          </button>
        ))}
      </span>
    </div>
  );
}

export default function ReviewForm({ propertyId, hotelName, onClose }: { propertyId: string; hotelName: string; onClose: () => void }) {
  const { t } = useT();
  const r = t.reviews;
  const f = r.form;
  const [rating, setRating] = useState(0);
  const [cats, setCats] = useState<Record<Category, number>>({ cleanliness: 0, location: 0, staff: 0, value: 0 });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const maxMonth = todayIST().slice(0, 7);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    if (!rating) { setError(f.pickRating); return; }
    const data = new FormData(e.currentTarget);
    const files = data.getAll('photos').filter((x): x is File => x instanceof File && x.size > 0);
    if (files.length > MAX_PHOTOS) { setError(f.tooManyPhotos); return; }
    setSending(true);
    try {
      const shrunk = await Promise.all(files.map(shrinkPhoto));
      if (photosTooBig(shrunk.map((x) => x.size))) { setError(f.photosTooBig); return; }
      data.delete('photos');
      shrunk.forEach((x) => data.append('photos', x));
      data.set('property_id', propertyId);
      data.set('rating', String(rating));
      for (const c of CATEGORIES) data.set('rating_' + c, cats[c] ? String(cats[c]) : '');
      const res = await fetch('/api/reviews', { method: 'POST', body: data });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setError(d.error || f.failed);
      else setDone(true);
    } catch {
      setError(f.failed);
    } finally {
      setSending(false);
    }
  }

  const input = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-brand-500';
  const label = 'block text-sm font-medium text-slate-700 mb-1';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="review-form-title" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2 id="review-form-title" className="text-lg font-heading font-bold text-slate-900">{fmt(f.title, { name: hotelName })}</h2>
          <button type="button" onClick={onClose} aria-label={f.close} className="p-1 text-slate-500 hover:text-slate-800"><X className="h-5 w-5" /></button>
        </div>

        {done ? (
          <div className="text-center py-6">
            <CheckCircle className="h-10 w-10 text-green-600 mx-auto mb-3" />
            <p className="text-slate-800 font-medium mb-4">{f.thanks}</p>
            <button type="button" onClick={onClose} className="bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-semibold">{f.close}</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-3 space-y-2">
              <StarPicker label={f.overall} value={rating} onChange={setRating} required />
              <p className="text-xs text-slate-500 pt-1">{f.details}</p>
              {CATEGORIES.map((c) => (
                <StarPicker key={c} label={r.categories[c]} value={cats[c]} onChange={(n) => setCats((p) => ({ ...p, [c]: n }))} />
              ))}
            </div>
            <label className="block"><span className={label}>{f.name}</span>
              <input name="name" required minLength={2} maxLength={60} autoComplete="name" className={input} /></label>
            <label className="block"><span className={label}>{f.phone}</span>
              <input name="phone" type="tel" required inputMode="tel" autoComplete="tel" className={input} />
              <span className="block text-xs text-slate-500 mt-1">{f.phoneHint}</span></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className={label}>{f.month}</span>
                <input name="stay_month" type="month" required max={maxMonth} placeholder="YYYY-MM" className={input} /></label>
              <label className="block"><span className={label}>{f.trip}</span>
                <select name="trip_type" required defaultValue="" className={input}>
                  <option value="" disabled>{f.choose}</option>
                  {TRIP_TYPES.map((k) => <option key={k} value={k}>{r.trips[k]}</option>)}
                </select></label>
            </div>
            <label className="block"><span className={label}>{f.reviewTitle}</span>
              <input name="title" required minLength={5} maxLength={100} className={input} /></label>
            <label className="block"><span className={label}>{f.body}</span>
              <textarea name="body" required minLength={30} maxLength={2000} rows={5} className={input} />
              <span className="block text-xs text-slate-500 mt-1">{f.bodyHint}</span></label>
            <label className="block"><span className={label}>{f.photos}</span>
              <input name="photos" type="file" multiple accept="image/jpeg,image/png,image/webp" className="block w-full text-sm" />
              <span className="block text-xs text-slate-500 mt-1">{f.photosHint}</span></label>
            {/* Honeypot: hidden from people; bots fill it and are silently ignored by the API. */}
            <div className="hidden" aria-hidden="true">
              <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
            </div>
            {error && <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg" role="alert">{error}</p>}
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 text-sm">{f.cancel}</button>
              <button type="submit" disabled={sending} className="flex items-center gap-2 bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
                {sending && <Loader2 className="h-4 w-4 animate-spin" />}{sending ? f.sending : f.submit}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Create `components/reviews/HotelReviews.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { BadgeCheck, Loader2, MessageSquare, Pencil, Star } from 'lucide-react';
import { useT } from '@/lib/i18n/client';
import { fmt } from '@/lib/i18n/dict';
import { cn } from '@/lib/utils';
import { monthLabel } from '@/lib/reviews/summary';
import { CATEGORIES, type PublicReview, type ReviewBundle } from '@/lib/reviews/types';
import ReviewForm from './ReviewForm';

function Stars({ value, size = 'h-4 w-4' }: { value: number; size?: string }) {
  return (
    <span className="inline-flex" aria-label={value + '/5'}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn(size, n <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />
      ))}
    </span>
  );
}

function Reply({ label, text }: { label: string; text: string }) {
  return (
    <div className="mt-3 ml-3 pl-3 border-l-2 border-brand-200">
      <p className="text-xs font-semibold text-brand-800 flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" />{label}</p>
      <p className="text-sm text-slate-700 whitespace-pre-line">{text}</p>
    </div>
  );
}

/** Approved reviews, rating summary, guest photos and the "Write a review" modal. */
export default function HotelReviews({ propertyId, hotelName, initial }: { propertyId: string; hotelName: string; initial: ReviewBundle }) {
  const { t, lang } = useT();
  const r = t.reviews;
  const s = initial.summary;
  const [reviews, setReviews] = useState<PublicReview[]>(initial.reviews);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const photos = reviews.flatMap((x) => x.photos.map((url) => ({ url, alt: x.title }))).slice(0, 12);

  async function loadMore() {
    setLoading(true);
    try {
      const res = await fetch('/api/reviews?property_id=' + encodeURIComponent(propertyId) + '&page=' + (page + 1));
      const d = await res.json().catch(() => null);
      if (res.ok && d) {
        setReviews((prev) => prev.concat((d.reviews as PublicReview[]).filter((x) => !prev.some((p) => p.id === x.id))));
        setPage(page + 1);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="reviews" className="mb-10 scroll-mt-24">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-heading font-bold text-slate-900">{r.heading}</h2>
        <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-700">
          <Pencil className="h-4 w-4" /> {r.write}
        </button>
      </div>

      {s.count === 0 ? (
        <p className="text-sm text-slate-600 bg-slate-50 rounded-xl px-4 py-3 mb-6">{r.none}</p>
      ) : (
        <div className="grid sm:grid-cols-[180px_1fr] gap-5 bg-slate-50 rounded-2xl p-5 mb-6">
          <div>
            <p className="text-4xl font-bold text-slate-900">{s.average.toFixed(1)}<span className="text-base font-normal text-slate-500"> / 5</span></p>
            <Stars value={s.average} />
            <p className="text-xs text-slate-500 mt-1">{s.count === 1 ? r.basedOnOne : fmt(r.basedOn, { n: s.count })}</p>
          </div>
          <div className="space-y-2">
            {CATEGORIES.filter((c) => s.categories[c] !== null).map((c) => (
              <div key={c} className="flex items-center gap-3 text-sm">
                <span className="w-36 shrink-0 text-slate-700">{r.categories[c]}</span>
                <span className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <span className="block h-full bg-green-600 rounded-full" style={{ width: (s.categories[c]! / 5) * 100 + '%' }} />
                </span>
                <span className="w-8 text-right font-medium text-slate-800">{s.categories[c]!.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {photos.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-2">{r.photos}</h3>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {photos.map((p) => (
              <a key={p.url} href={p.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.alt} loading="lazy" className="h-24 w-32 object-cover rounded-lg" />
              </a>
            ))}
          </div>
        </div>
      )}

      <ul className="space-y-4">
        {reviews.map((x) => (
          <li key={x.id} className="border border-slate-200 rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Stars value={x.rating} size="h-3.5 w-3.5" />
              <span className="font-semibold text-slate-900">{x.title}</span>
            </div>
            <p className="text-xs text-slate-500 mb-2 flex flex-wrap items-center gap-x-2">
              <span>{x.name}</span>
              <span>· {fmt(r.stayed, { month: monthLabel(x.stay_month, lang) })}</span>
              <span>· {r.trips[x.trip_type] || x.trip_type}</span>
              {x.verified_stay && <span className="inline-flex items-center gap-1 text-green-700 font-medium"><BadgeCheck className="h-3.5 w-3.5" />{r.verified}</span>}
            </p>
            <p className="text-sm text-slate-700 whitespace-pre-line">{x.body}</p>
            {x.owner_reply && <Reply label={r.ownerReply} text={x.owner_reply} />}
            {x.partner_reply && <Reply label={r.partnerReply} text={x.partner_reply} />}
          </li>
        ))}
      </ul>

      {reviews.length < initial.total && (
        <button type="button" onClick={loadMore} disabled={loading}
          className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}{r.showMore}
        </button>
      )}

      {open && <ReviewForm propertyId={propertyId} hotelName={hotelName} onClose={() => setOpen(false)} />}
    </section>
  );
}
```

- [ ] **Step 9: Show reviews on partner hotel pages**

In `components/pages/HotelDetailView.tsx`:

1. Add with the other imports: `import HotelReviews from '@/components/reviews/HotelReviews';`
2. Under the `<h1>`, replace the existing rating badge (the block that starts `{hotel.rating > 0 && (` and renders `<Star className="h-3.5 w-3.5 fill-white" />{hotel.rating}`) with a badge driven by approved reviews:

```tsx
            {reviews.summary.count > 0 && (
              <a href="#reviews" className="flex items-center gap-1 bg-green-700 text-white text-sm font-bold px-2 py-1 rounded-lg">
                <Star className="h-3.5 w-3.5 fill-white" />{reviews.summary.average.toFixed(1)}
                <span className="font-normal text-xs ml-1 text-green-100">({reviews.summary.count})</span>
              </a>
            )}
```

3. Insert the reviews section directly before the FAQ block `{hotel.faqs?.length > 0 && (` (that is, after the policies block that starts `{(hotel.check_in_time || hotel.cancellation_policy) && (`):

```tsx
        <HotelReviews propertyId={hotel.id} hotelName={hotel.name} initial={reviews} />

```

4. In the directory branch, replace `<DirectoryListing hotel={hotel} related={related} lang={lang} />` with:

```tsx
        <DirectoryListing hotel={hotel} related={related} reviews={reviews} lang={lang} />
```

- [ ] **Step 10: Show reviews on directory listings**

In `components/hotels/DirectoryListing.tsx`:

1. Add with the other imports:

```tsx
import HotelReviews from '@/components/reviews/HotelReviews';
import type { ReviewBundle } from '@/lib/reviews/types';
```

2. In the doc comment above the component, replace `ratings, and says plainly that rates are confirmed on enquiry.` with `ratings other than approved guest reviews, and says plainly that rates are confirmed on enquiry.` (the preceding line ends with `but no prices or`).

3. Change the component signature to:

```tsx
export default function DirectoryListing({ hotel, related, reviews, lang = 'en' }: { hotel: DirectoryProperty; related: Property[]; reviews: ReviewBundle; lang?: Lang }) {
```

4. Insert directly before the amber notice `<div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900 mb-8">` (after the FAQ `section`):

```tsx
          <HotelReviews propertyId={hotel.id} hotelName={hotel.name} initial={reviews} />

```

- [ ] **Step 11: Typecheck, run all tests, look at it**

Run: `npx tsc --noEmit -p . && npx vitest run`
Expected: PASS. (`tsc` also proves `hi.ts` has exactly the shape of `en.ts`.)

Then `npm run dev` and open a partner hotel and a directory listing at `/hotels/<slug>` and `/hi/hotels/<slug>` on a 375 px-wide window: the "Guest reviews" section with "No reviews yet…" and the "Write a review" button show in English and in Hindi; the modal opens, Escape and the X close it; submitting with no stars shows "Please choose an overall rating." Stop the dev server.

- [ ] **Step 12: Commit**

```bash
git add lib/i18n/en.ts lib/i18n/hi.ts lib/reviews/resize.ts components/reviews/HotelReviews.tsx components/reviews/ReviewForm.tsx components/pages/HotelDetailView.tsx components/hotels/DirectoryListing.tsx tests/reviews/ui-support.test.ts
git commit -m "Show guest reviews and a Write a review form on hotel pages"
```

---

### Task 14: Admin review queue, nav badge and derived ratings

**Files:**
- Create: `app/(site)/admin/reviews/page.tsx`
- Modify: `components/admin/AdminShell.tsx` (nav item + pending badge)
- Modify: `app/(site)/admin/properties/[id]/edit/page.tsx` (remove the hand-typed Rating / Reviews inputs)
- Modify: `app/api/admin/import-property/route.ts` (stop copying ratings from other sites)

**Interfaces:**
- Consumes: `GET /api/admin/reviews`, `PATCH /api/admin/reviews/<id>` (Task 7); `type AdminReview` (Task 3); `AdminPageHeader` (`components/admin/AdminShell.tsx`); RLS policy "Admin full access hotel reviews" (Task 3) for the browser-side badge count.
- Produces: page `/admin/reviews`; nav badge key `'reviews'`.

- [ ] **Step 1: Create the admin page**

```tsx
// app/(site)/admin/reviews/page.tsx
'use client';
import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, Ban, Check, EyeOff, Loader2, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import type { AdminReview } from '@/lib/reviews/store';
import type { ReviewStatus } from '@/lib/reviews/types';

const TABS: { key: ReviewStatus; label: string }[] = [
  { key: 'pending', label: 'Waiting' }, { key: 'approved', label: 'Live' }, { key: 'hidden', label: 'Hidden' }, { key: 'rejected', label: 'Rejected' },
];
const when = (s: string) => new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

async function api(path: string, init?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Something went wrong');
  return json;
}

export default function AdminReviewsPage() {
  const [tab, setTab] = useState<ReviewStatus>('pending');
  const [rows, setRows] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setRows((await api('/api/admin/reviews?status=' + tab)).reviews); }
    catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [tab]);
  useEffect(() => { load(); }, [load]);

  async function moderate(id: string, status: 'approved' | 'rejected' | 'hidden') {
    setBusy(id); setError('');
    try {
      await api('/api/admin/reviews/' + id, { method: 'PATCH', body: JSON.stringify({ status }) });
      setRows((list) => list.filter((x) => x.id !== id));
    } catch (e: any) { setError(e.message); }
    setBusy(null);
  }

  async function saveReply(x: AdminReview) {
    const owner_reply = drafts[x.id] ?? x.owner_reply ?? '';
    setBusy(x.id); setError('');
    try {
      await api('/api/admin/reviews/' + x.id, { method: 'PATCH', body: JSON.stringify({ owner_reply }) });
      setRows((list) => list.map((r) => (r.id === x.id ? { ...r, owner_reply: owner_reply.trim() } : r)));
    } catch (e: any) { setError(e.message); }
    setBusy(null);
  }

  const button = 'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50';

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <AdminPageHeader title="Guest reviews" description="New reviews wait here until you approve them. Only approved reviews show on hotel pages and in Google. The phone number is private: use it to check the guest really stayed." />

      <div className="flex gap-2 mb-4">
        {TABS.map((x) => (
          <button key={x.key} onClick={() => setTab(x.key)}
            className={cn('px-3 py-1.5 rounded-full text-sm font-medium', tab === x.key ? 'bg-slate-900 text-white' : 'bg-white border border-slate-300 text-slate-700')}>
            {x.label}
          </button>
        ))}
      </div>
      {error && <p className="mb-3 text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-600" /></div>
      ) : rows.length === 0 ? (
        <p className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">Nothing here.</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((x) => (
            <li key={x.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <a href={'/hotels/' + x.property_slug} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 hover:underline">{x.property_name}</a>
                <span className="text-xs text-slate-500">{when(x.created_at)}</span>
              </div>
              <p className="flex items-center gap-1 text-amber-500 mb-1">
                {Array.from({ length: x.rating }, (_, i) => <Star key={i} className="h-4 w-4 fill-amber-400" />)}
                <span className="ml-2 font-semibold text-slate-900">{x.title}</span>
              </p>
              <p className="text-sm text-slate-700 whitespace-pre-line mb-2">{x.body}</p>
              <p className="text-xs text-slate-500 mb-3 flex flex-wrap gap-x-3">
                <span>{x.name}</span>
                <a href={'tel:+91' + x.phone} className="underline">{x.phone}</a>
                <span>stayed {x.stay_month}</span>
                <span>{x.trip_type}</span>
                {x.verified_stay && <span className="inline-flex items-center gap-1 text-green-700 font-medium"><BadgeCheck className="h-3.5 w-3.5" />Verified stay</span>}
              </p>
              {x.photo_urls.length > 0 && (
                <div className="flex gap-2 mb-3">
                  {x.photo_urls.map((u) => (
                    <a key={u} href={u} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u} alt="Guest photo" className="h-20 w-28 object-cover rounded-lg border border-slate-200" />
                    </a>
                  ))}
                </div>
              )}
              {x.partner_reply && <p className="text-sm bg-slate-50 rounded-lg px-3 py-2 mb-3"><strong>Property replied:</strong> {x.partner_reply}</p>}

              <div className="flex flex-wrap gap-2 mb-3">
                {x.status !== 'approved' && (
                  <button disabled={busy === x.id} onClick={() => moderate(x.id, 'approved')} className={cn(button, 'bg-green-600 text-white')}><Check className="h-4 w-4" />Approve</button>
                )}
                {x.status === 'pending' && (
                  <button disabled={busy === x.id} onClick={() => moderate(x.id, 'rejected')} className={cn(button, 'bg-red-600 text-white')}><Ban className="h-4 w-4" />Reject</button>
                )}
                {x.status === 'approved' && (
                  <button disabled={busy === x.id} onClick={() => moderate(x.id, 'hidden')} className={cn(button, 'bg-slate-700 text-white')}><EyeOff className="h-4 w-4" />Hide</button>
                )}
              </div>

              <label className="block text-xs font-medium text-slate-600 mb-1">Reply as Dharamshala Stay (shown under the review)</label>
              <div className="flex gap-2">
                <textarea rows={2} value={drafts[x.id] ?? x.owner_reply ?? ''} onChange={(e) => setDrafts((d) => ({ ...d, [x.id]: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                <button disabled={busy === x.id || !(drafts[x.id] ?? '').trim()} onClick={() => saveReply(x)} className={cn(button, 'bg-brand-600 text-white self-start')}>Save reply</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add the nav item and the pending badge**

In `components/admin/AdminShell.tsx`:

1. Add `Star` to the `lucide-react` import list.
2. In `type NavItem`, extend the badge union with `'reviews'`, e.g. `badge?: 'review' | 'inquiries' | 'whatsapp' | 'reviews'` (keep any keys another plan added).
3. In the `'Hotels & stays'` group, add this item directly after the `{ href: '/admin/approvals', label: 'To review', ... }` item:

```tsx
      { href: '/admin/reviews', label: 'Guest reviews', hint: 'Approve, hide and reply to hotel reviews', icon: Star, tone: 'bg-yellow-500', badge: 'reviews' },
```

4. In the `counts` state, add `reviews: 0` to both the type and the initial value (e.g. `useState<{ review: number; inquiries: number; whatsapp: number; reviews: number }>({ review: 0, inquiries: 0, whatsapp: 0, reviews: 0 })`, keeping any keys another plan added).
5. In the `useEffect` `Promise.all([...])`, add a query after the `whatsapp_conversations` one:

```tsx
      supabase.from('hotel_reviews').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
```

and add it to the `.then(...)` destructuring and `setCounts` call, e.g. `.then(([r, i, w, v]) => setCounts({ review: r.count || 0, inquiries: i.count || 0, whatsapp: w.count || 0, reviews: v.count || 0 }))` (if another plan already added a fourth query, add this as the next one and keep theirs).

- [ ] **Step 3: Make ratings derived-only**

1. `app/(site)/admin/properties/[id]/edit/page.tsx`: delete these two lines in the grid that also holds Check-in / Check-out:

```tsx
            {Input({ label: "Rating", field: "rating", type: "number" })}
            {Input({ label: "Reviews", field: "review_count", type: "number" })}
```

and in the save handler, directly after `delete payload.created_at;`, add:

```tsx
    // Rating and review count are recomputed from approved guest reviews (lib/reviews/store.ts).
    delete payload.rating;
    delete payload.review_count;
```

2. `app/api/admin/import-property/route.ts`: in the example JSON inside the AI prompt, delete the two lines

```
  "rating": 4.2,
  "review_count": 150,
```

and in the object written to `properties`, replace `rating: prop.rating || 0, review_count: prop.review_count || 0,` with:

```ts
      rating: 0, review_count: 0, // only approved reviews on our site count (migration v23)
```

- [ ] **Step 4: Typecheck, run all tests, look at it**

Run: `npx tsc --noEmit -p . && npx vitest run`
Expected: PASS.

Then `npm run dev`, sign in as admin, open `/admin/reviews`: the "Guest reviews" item sits under "Hotels & stays" on desktop and in the phone tab row; the tabs switch; "Nothing here." shows with no reviews. Open a property's edit page and confirm the Rating/Reviews inputs are gone. Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add "app/(site)/admin/reviews/page.tsx" components/admin/AdminShell.tsx "app/(site)/admin/properties/[id]/edit/page.tsx" app/api/admin/import-property/route.ts
git commit -m "Add admin review queue and stop hand-typed hotel ratings"
```

---

### Task 15: Partner reviews page

**Files:**
- Create: `app/(site)/partner/reviews/page.tsx`
- Modify: `app/(site)/partner/dashboard/page.tsx` (header link)

**Interfaces:**
- Consumes: `GET`/`POST /api/partner/reviews` (Task 8); `type PartnerReview` (Task 3).
- Produces: page `/partner/reviews` (inherits `noindex` from `app/(site)/partner/layout.tsx`).

- [ ] **Step 1: Create the page**

```tsx
// app/(site)/partner/reviews/page.tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BadgeCheck, Loader2, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import type { PartnerReview } from '@/lib/reviews/store';

export default function PartnerReviewsPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [reviews, setReviews] = useState<PartnerReview[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/partner/login'); return; }
      setToken(session.access_token);
      try {
        const res = await fetch('/api/partner/reviews', { headers: { Authorization: `Bearer ${session.access_token}` } });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) setError(json.error || 'Could not load reviews');
        else setReviews(json.reviews || []);
      } catch { setError('Could not load reviews'); }
      setLoading(false);
    }
    load();
  }, [router]);

  async function reply(x: PartnerReview) {
    const text = drafts[x.id] ?? x.partner_reply ?? '';
    setBusy(x.id); setError(''); setSaved(null);
    try {
      const res = await fetch('/api/partner/reviews', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_id: x.id, reply: text }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setError(json.error || 'Could not save your reply');
      else { setReviews((list) => list.map((r) => (r.id === x.id ? { ...r, partner_reply: text.trim() } : r))); setSaved(x.id); }
    } catch { setError('Could not save your reply'); }
    setBusy(null);
  }

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/partner/dashboard" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-brand-600 mb-4"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
      <h1 className="text-2xl font-heading font-bold text-slate-900">Guest reviews</h1>
      <p className="text-slate-600 text-sm mb-6">Approved reviews of your properties. You can add one public reply to each; saving again replaces it.</p>
      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>}

      {!error && reviews.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Star className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600">No approved reviews yet.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {reviews.map((x) => (
            <li key={x.id} className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-brand-700 mb-1">{x.property_name}</p>
              <p className="flex items-center gap-1 mb-1">
                {Array.from({ length: x.rating }, (_, i) => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
                <span className="ml-2 font-semibold text-slate-900">{x.title}</span>
              </p>
              <p className="text-sm text-slate-700 whitespace-pre-line mb-2">{x.body}</p>
              <p className="text-xs text-slate-500 mb-3 flex flex-wrap gap-x-3">
                <span>{x.name}</span><span>stayed {x.stay_month}</span>
                {x.verified_stay && <span className="inline-flex items-center gap-1 text-green-700 font-medium"><BadgeCheck className="h-3.5 w-3.5" />Verified stay</span>}
              </p>
              {x.owner_reply && <p className="text-sm bg-slate-50 rounded-lg px-3 py-2 mb-3"><strong>Dharamshala Stay replied:</strong> {x.owner_reply}</p>}
              <label className="block text-xs font-medium text-slate-600 mb-1">Your public reply</label>
              <div className="flex gap-2">
                <textarea rows={2} value={drafts[x.id] ?? x.partner_reply ?? ''} onChange={(e) => setDrafts((d) => ({ ...d, [x.id]: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                <button disabled={busy === x.id || !(drafts[x.id] ?? '').trim()} onClick={() => reply(x)}
                  className={cn('self-start flex items-center gap-1 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50')}>
                  {busy === x.id && <Loader2 className="h-4 w-4 animate-spin" />}Save
                </button>
              </div>
              {saved === x.id && <p className="text-sm text-green-700 mt-2">Saved. Your reply now shows on the hotel page.</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Link it from the dashboard**

In `app/(site)/partner/dashboard/page.tsx`, in the header button row, directly after the `<Link href="/partner/bookings" ...>...Bookings</Link>` element, add (keep any links other plans added):

```tsx
          {(!partnerType || partnerType === 'hotel') && (
            <Link href="/partner/reviews" className="flex items-center gap-2 border border-brand-200 text-brand-700 px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-brand-50">
              <Star className="h-4 w-4" /> Reviews
            </Link>
          )}
```

(`Star` is already imported in that file; if not, add it to the `lucide-react` import.)

- [ ] **Step 3: Typecheck, run all tests, look at it**

Run: `npx tsc --noEmit -p . && npx vitest run`
Expected: PASS.

Then `npm run dev`, sign in as a hotel partner: the dashboard shows "Reviews", and `/partner/reviews` shows "No approved reviews yet." Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add "app/(site)/partner/reviews/page.tsx" "app/(site)/partner/dashboard/page.tsx"
git commit -m "Let hotel partners reply to their reviews"
```

---

### Task 16: Ship and verify live

- [ ] **Step 1: Apply the migration** – run `supabase/migration-v23-hotel-reviews.sql` in the Supabase SQL editor (after v21 and v22). Verify:

```bash
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/public_hotel_reviews?select=id&limit=1" -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/hotel_reviews?select=id&limit=1" -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```

Expected: first `[]` (the view is public); second `[]` too (RLS hides every row from anon – it must never return data). In Storage, buckets `review-uploads` (private) and `review-photos` (public) exist.

- [ ] **Step 2: Set the IndexNow key** – generate with `openssl rand -hex 16`, add `INDEXNOW_KEY=<value>` in Vercel (Production) and `.env.local`. Optional: `REVIEW_IP_SALT=<any random string>`.
- [ ] **Step 3: Full check** – `npx vitest run && npx tsc --noEmit -p .` → all PASS.
- [ ] **Step 4: Deploy** – push `main` only when the owner has asked for deploys in this session; wait for Vercel to finish.
- [ ] **Step 5: Manual test** (spec section 7):
  1. On a partner hotel page, "Write a review" with 3 phone photos → "Thanks – your review will appear after a quick check."; owner email "New review to approve: <hotel>" arrives.
  2. Submit again with the same number written differently → "You have already reviewed this property with this mobile number."
  3. `/admin/reviews` shows it with a pending badge in the menu; photos open; Approve.
  4. The hotel page (and `/hi/hotels/<slug>`) shows the review, rating summary, photo strip and the green rating badge; the title shows "Rated x/5 by 1 guest".
  5. As the owning partner, reply from `/partner/reviews` → the reply shows on the page.
  6. `/hotels/<slug>.md` has "## Guest reviews"; `/llms.txt` line has "rated x/5 (1 review)"; `/<INDEXNOW_KEY>.txt` returns the key; `/sitemap.xml` lists room photos.
  7. Paste the hotel URL into Google's Rich Results Test: Hotel detected with `aggregateRating`, `review`, `containsPlace`, no errors.
  8. Hide the review in admin → it disappears from the page, the badge and the title; its photo URL in `review-photos` returns 404.
  9. Repeat 1 and 3 on a directory listing.
- [ ] **Step 6: Clean up** – reject or hide the test reviews (or delete them in the SQL editor) and report the results to the owner.
