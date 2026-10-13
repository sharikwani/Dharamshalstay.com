# Partner Rooms Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Partners (and admin) manage live room categories (counts, guests, beds, extra beds, prices, rate plans, photos, on/off) under a hotel-total cap; customers are always told by email and WhatsApp when a booking is confirmed; every WhatsApp message reads cleanly.

**Architecture:** Pure validation/diff in `lib/rooms/validate.ts`, service-role persistence in `lib/rooms/store.ts`, a shared handler for the partner and admin API routes, and one client `RoomsEditor` component used by both pages. Confirmations go through one `confirmBooking()` in `lib/bookings/confirm.ts` that every confirm path calls. WhatsApp text goes through `tidyWhatsApp()`.

**Tech Stack:** Next.js 14 app router, Supabase (service role on the server), zod, Vitest, Tailwind, Resend email, WhatsApp Cloud API templates.

**Spec:** `docs/superpowers/specs/2026-10-13-partner-rooms-design.md` (read it first; sections 6-8 are the owner's additions).

## Global Constraints

- No database migration. Rooms live in `properties.rooms` JSONB; `properties.total_rooms` exists; extra beds are recorded in the booking's room label.
- Ranges: total_rooms 1-500; per category name 2-60 chars (unique per hotel, case-insensitive), total_inventory 1-500, max_adults 1-20, max_children 0-20, base_price 100-1,000,000, rate plans 0-6 (price 100-1,000,000, name 1-60, cancellation <= 300), description <= 500, images 0-8 (https URLs), extra_beds_max 0-3, extra_bed_price 0-50,000.
- Cap error text exactly: `Rooms assigned (N) exceed the hotel total (M)` (400).
- Removal blocked text: `"<name>" has upcoming bookings. Switch it off instead of deleting it.` (409).
- Extra bed error text: `This room allows at most N extra bed(s)` (400).
- Partner scope: `requireCaller(req, ['partner'])`, `assertActive(...)`, `owner_id === caller.profile.id`, and property status `published` or `approved` (else 403 `Use the listing form to edit rooms on a draft listing.`). Admin scope: `requireCaller(req, ['admin'])`, any property.
- Match existing style: every API route `export const dynamic = 'force-dynamic'`, `try { … } catch (e) { return jsonError(e); }`, `HttpError(status, msg)`. Notifications never throw and never block a save.
- Customer-facing money format stays `Rs.12,345` (existing `rupees`).
- Run the full suite with `npx vitest run` and type-check with `npx tsc --noEmit -p tsconfig.json` before every commit.

## Review Focus

- A hotel whose existing rooms have no `id` and some have `total_inventory` null: the first GET must give every room a permanent id (persisted once), and the editor must force a room count before save, without losing other room fields (room_size, amenities, weekend/peak price, meal_plan). → tests in Task 1 and Task 2.
- Two people saving the same hotel at once: the second save must get 409 `Someone else changed these rooms. Reload to see the latest.` instead of overwriting. → test in Task 2/3 (`expected_updated_at`).
- A rename to a name another category had before this same save (swap): refused with 400 `Rename one room at a time.`, so availability rows never collide. → test in Task 1.
- An admin confirm and a partner WhatsApp "Accept" for the same booking within a second: exactly one customer notice. → test in Task 7.
- An AI reply already containing `*bold*`, emoji and blank lines must pass through `tidyWhatsApp` unchanged (idempotent), and URLs with `_`/`*` must not be altered. → test in Task 9.

---

### Task 1: Room types and pure validation

**Files:**
- Modify: `types/index.ts` (RoomType, ~L117-135)
- Create: `lib/rooms/validate.ts`
- Test: `tests/rooms/validate.test.ts`

**Interfaces — Produces:**
```ts
export type RatePlan = { name: string; meal_plan: MealPlan; price: number; cancellation: string };
export type RoomCategory = RoomType & { id: string; total_inventory: number; rate_plans: RatePlan[]; images: string[]; extra_beds_max: number; extra_bed_price: number; is_active: boolean };
export const LIMITS: { totalRooms: [1, 500]; rooms: [1, 500]; adults: [1, 20]; children: [0, 20]; price: [100, 1_000_000]; plans: 6; images: 8; extraBeds: [0, 3]; extraBedPrice: [0, 50_000] };
export function normaliseRooms(input: unknown, opts: { newId: () => string; defaultExtraBedPrice: number }): { rooms: RoomCategory[] } | { error: string };
export function assignedTotal(rooms: RoomCategory[]): number;            // sum total_inventory over is_active
export function capProblem(totalRooms: number, rooms: RoomCategory[]): string | null;
export type RoomDiff = { added: string[]; removed: { id: string | null; name: string }[]; renamed: { id: string; from: string; to: string }[]; switchedOff: string[]; switchedOn: string[]; lines: string[] };
export function diffRooms(before: any[], after: RoomCategory[]): RoomDiff | { error: string };
export function withIds(rooms: any[], newId: () => string): { rooms: any[]; changed: boolean };
export function priceRange(rooms: RoomCategory[]): { price_min: number; price_max: number } | null;
```

- [ ] **Step 1: Types.** In `types/index.ts` add to `RoomType`: `rate_plans?: { name: string; meal_plan: MealPlan; price: number; cancellation: string }[]; extra_beds_max?: number; extra_bed_price?: number;` and widen `images: (string | { url: string; alt?: string })[]`. Run `npx tsc --noEmit -p tsconfig.json`; fix any fallout (none expected beyond images usages that already handle both).

- [ ] **Step 2: Write failing tests** `tests/rooms/validate.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { normaliseRooms, capProblem, assignedTotal, diffRooms, withIds, priceRange } from '@/lib/rooms/validate';

let n = 0; const newId = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`;
const room = (o: any = {}) => ({ name: 'Deluxe', bed_type: 'Double', max_adults: 2, max_children: 1, base_price: 3000, total_inventory: 5, is_active: true, ...o });
const ok = (input: unknown) => { const r = normaliseRooms(input, { newId, defaultExtraBedPrice: 700 }); if ('error' in r) throw new Error(r.error); return r.rooms; };

describe('normaliseRooms', () => {
  it('keeps unknown fields, trims, assigns ids, defaults extra bed price from the hotel', () => {
    const [r] = ok([room({ name: '  Deluxe ', room_size: '200 sq ft', amenities: ['TV'], extra_beds_max: 1 })]);
    expect(r).toMatchObject({ name: 'Deluxe', room_size: '200 sq ft', amenities: ['TV'], extra_beds_max: 1, extra_bed_price: 700, rate_plans: [], images: [], max_occupancy: 3 });
    expect(r.id).toMatch(/^[0-9a-f-]{36}$/);
  });
  it('keeps an existing id', () => { expect(ok([room({ id: '11111111-1111-4111-8111-111111111111' })])[0].id).toBe('11111111-1111-4111-8111-111111111111'); });
  it('turns image objects into urls and refuses non-https', () => {
    expect(ok([room({ images: [{ url: 'https://x/a.jpg' }, 'https://x/b.jpg'] })])[0].images).toEqual(['https://x/a.jpg', 'https://x/b.jpg']);
    expect(normaliseRooms([room({ images: ['http://x/a.jpg'] })], { newId, defaultExtraBedPrice: 0 })).toEqual({ error: 'Deluxe: photos must be https links.' });
  });
  it.each([
    [{ name: 'D' }, 'Room name must be 2-60 characters.'],
    [{ total_inventory: 0 }, 'Deluxe: number of rooms must be 1-500.'],
    [{ total_inventory: null }, 'Deluxe: number of rooms must be 1-500.'],
    [{ max_adults: 0 }, 'Deluxe: adults must be 1-20.'],
    [{ max_children: 21 }, 'Deluxe: children must be 0-20.'],
    [{ base_price: 99 }, 'Deluxe: price per night must be Rs.100 - Rs.10,00,000.'],
    [{ extra_beds_max: 4 }, 'Deluxe: extra beds must be 0-3.'],
    [{ extra_beds_max: 1, extra_bed_price: 50001 }, 'Deluxe: extra bed price must be Rs.0 - Rs.50,000.'],
    [{ rate_plans: Array(7).fill({ name: 'EP', meal_plan: 'ep', price: 3000, cancellation: '' }) }, 'Deluxe: at most 6 rate plans.'],
    [{ rate_plans: [{ name: 'EP', meal_plan: 'xx', price: 3000, cancellation: '' }] }, 'Deluxe: rate plan "EP" has an unknown meal plan.'],
    [{ images: Array(9).fill('https://x/a.jpg') }, 'Deluxe: at most 8 photos.'],
    [{ description: 'x'.repeat(501) }, 'Deluxe: description is too long (500 characters max).'],
  ])('refuses %o', (o, msg) => { expect(normaliseRooms([room(o)], { newId, defaultExtraBedPrice: 0 })).toEqual({ error: msg }); });
  it('refuses duplicate names case-insensitively', () => {
    expect(normaliseRooms([room(), room({ name: 'deluxe ' })], { newId, defaultExtraBedPrice: 0 })).toEqual({ error: 'Two rooms are called "deluxe". Each room type needs its own name.' });
  });
  it('refuses a non-array and more than 30 categories', () => {
    expect(normaliseRooms({}, { newId, defaultExtraBedPrice: 0 })).toEqual({ error: 'Rooms must be a list.' });
    expect(normaliseRooms(Array.from({ length: 31 }, (_, i) => room({ name: `Room ${i}` })), { newId, defaultExtraBedPrice: 0 })).toEqual({ error: 'At most 30 room types.' });
  });
});

describe('cap', () => {
  it('counts active rooms only and reports the exact message', () => {
    const rooms = ok([room({ total_inventory: 10 }), room({ name: 'Suite', total_inventory: 12 }), room({ name: 'Old', total_inventory: 50, is_active: false })]);
    expect(assignedTotal(rooms)).toBe(22);
    expect(capProblem(21, rooms)).toBe('Rooms assigned (22) exceed the hotel total (21)');
    expect(capProblem(22, rooms)).toBeNull();
  });
});

describe('diffRooms', () => {
  const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222';
  it('detects rename by id, removal, add, switch off/on, and describes counts and prices', () => {
    const before = [room({ id: A, name: 'Deluxe' }), room({ id: B, name: 'Suite' }), { name: 'Legacy', base_price: 2000 }, room({ name: 'Dorm', is_active: false })];
    const after = ok([room({ id: A, name: 'Deluxe Valley', total_inventory: 6, base_price: 3500, is_active: false }), room({ name: 'Dorm', is_active: true }), room({ name: 'Family' })]);
    const d = diffRooms(before, after);
    if ('error' in d) throw new Error(d.error);
    expect(d.renamed).toEqual([{ id: A, from: 'Deluxe', to: 'Deluxe Valley' }]);
    expect(d.removed).toEqual([{ id: B, name: 'Suite' }, { id: null, name: 'Legacy' }]);
    expect(d.added).toEqual(['Family']);
    expect(d.switchedOff).toEqual(['Deluxe Valley']);
    expect(d.switchedOn).toEqual(['Dorm']);
    expect(d.lines).toEqual(expect.arrayContaining(['Renamed "Deluxe" to "Deluxe Valley"', 'Deluxe Valley: rooms 5 → 6', 'Deluxe Valley: price Rs.3,000 → Rs.3,500', 'Switched off "Deluxe Valley"', 'Removed "Suite"', 'Added "Family"']));
  });
  it('matches id-less old rooms by name (no rename, no removal)', () => {
    const d = diffRooms([{ name: 'Deluxe', base_price: 3000, total_inventory: 5 }], ok([room()]));
    expect(d).toMatchObject({ renamed: [], removed: [], added: [] });
  });
  it('refuses a swap', () => {
    expect(diffRooms([room({ id: A, name: 'X1' }), room({ id: B, name: 'X2' })], ok([room({ id: A, name: 'X2' }), room({ id: B, name: 'X1' })]))).toEqual({ error: 'Rename one room at a time.' });
  });
});

describe('withIds / priceRange', () => {
  it('adds ids only where missing', () => {
    const r = withIds([{ name: 'A' }, { id: 'keep', name: 'B' }], newId);
    expect(r.changed).toBe(true); expect(r.rooms[1].id).toBe('keep'); expect(r.rooms[0].id).toBeTruthy();
    expect(withIds([{ id: 'x' }], newId).changed).toBe(false);
  });
  it('spans active rooms and their plans', () => {
    expect(priceRange(ok([room({ base_price: 3000, rate_plans: [{ name: 'CP', meal_plan: 'cp', price: 3600, cancellation: '' }] }), room({ name: 'Off', base_price: 100, is_active: false })]))).toEqual({ price_min: 3000, price_max: 3600 });
    expect(priceRange([])).toBeNull();
  });
});
```

- [ ] **Step 3: Run** `npx vitest run tests/rooms/validate.test.ts` — expect FAIL (module missing).

- [ ] **Step 4: Implement `lib/rooms/validate.ts`** (pure, no imports besides types). Rules:
  - `normaliseRooms`: must be array (else `Rooms must be a list.`), <= 30 (`At most 30 room types.`). For each raw object: copy all its fields (`{ ...raw }`), then set trimmed `name`, `description` (default `''`), `bed_type` (trimmed, <= 40, default `''`), integers via `Math.floor(Number(x))` with range checks in the order of the test table, `max_occupancy = max_adults + max_children`, `is_active = raw.is_active !== false`, `extra_beds_max` default 0, `extra_bed_price` default `opts.defaultExtraBedPrice` when absent/null, `rate_plans` each `{ name: trim 1-60, meal_plan ∈ ep|cp|map|ap, price 100-1,000,000, cancellation: trim <= 300 }` (errors `"<room>: rate plan "<plan>" …"`), images → string urls (`typeof i === 'string' ? i : i?.url`), each must start with `https://` and be <= 500 chars, `id` = existing non-empty string id or `opts.newId()`. Duplicate check after trimming, lower-cased. Error messages exactly as in the tests; rupee formatting uses `toLocaleString('en-IN')`.
  - `diffRooms`: map before rooms by id; before rooms without id are matched to an after room with the same (case-sensitive trimmed) name. A before room matched by id with a different name → renamed. Swap check: if any `to` equals the `from` of another rename, or equals the name of an unmatched before room → `{ error: 'Rename one room at a time.' }`. Unmatched before → removed (`id` or null). Unmatched after → added. `is_active` true→false switchedOff, false→true switchedOn (by after name). `lines` in this order per category: rename line, `"<after name>: rooms X → Y"` when total_inventory changed, `"<after name>: price Rs.X → Rs.Y"` when base_price changed, `"<after name>: rate plans changed"` when JSON of rate_plans differs, `"<after name>: extra beds X → Y"`, switched lines; then removed, then added.
  - `priceRange`: over active rooms, all base_price and plan prices > 0; null when none.

- [ ] **Step 5: Run** the test file, then the full suite + tsc. Expect PASS.

- [ ] **Step 6: Commit** `git add types/index.ts lib/rooms/validate.ts tests/rooms/validate.test.ts && git commit -m "Rooms: pure validation, cap and change detection"`

---

### Task 2: Rooms store (service role)

**Files:**
- Create: `lib/rooms/store.ts`
- Test: `tests/rooms/store.test.ts` (use the chainable `fakeSb` style of `tests/availability/store.test.ts` — copy its helper into the test file or import it if it is exported)

**Interfaces:**
- Consumes: `withIds`, `RoomCategory`, `RoomDiff`, `priceRange` from Task 1.
- Produces:
```ts
export type RoomsProperty = { id: string; name: string; owner_id: string | null; status: string; total_rooms: number | null; extra_bed_charge: number | null; rooms: any[]; updated_at: string };
export async function loadRoomsProperty(id: string, sb?: SupabaseClient): Promise<RoomsProperty | null>; // assigns+persists missing ids once
export async function ownedRoomsProperties(ownerId: string, sb?: SupabaseClient): Promise<{ id: string; name: string; status: string }[]>;
export async function upcomingBookingCount(propertyId: string, roomName: string, roomId: string | null, today: string, sb?: SupabaseClient): Promise<number>;
export async function saveRooms(p: RoomsProperty, next: { total_rooms: number; rooms: RoomCategory[] }, diff: RoomDiff, today: string, sb?: SupabaseClient): Promise<{ ok: true; updated_at: string } | { ok: false; status: 409; error: string }>;
```

- [ ] **Step 1: Failing tests** covering:
  - `loadRoomsProperty` selects `id, name, owner_id, status, total_rooms, extra_bed_charge, rooms, updated_at`; when a room lacks `id`, it updates `properties.rooms` once with ids, conditioned `.eq('updated_at', old)`, and returns the new `updated_at`; returns `null` when not found.
  - `upcomingBookingCount` queries `bookings` with `property_id`, `status in ('pending','confirmed')`, `check_out >= today`, and counts rows where `room_key === name` or (`room_key` null and `room_name === name || room_name.startsWith(name + ' - ')`) (filter in JS after selecting `room_key, room_name`, using `matchesRoom` from `@/lib/availability/calc`).
  - `saveRooms`: (a) updates `properties` with `{ rooms, total_rooms, price_min, price_max, updated_at: now }` (price fields only when `priceRange` is non-null) filtered `.eq('id').eq('updated_at', p.updated_at)` and `.select('updated_at')`; zero rows → `{ ok:false, status:409, error:'Someone else changed these rooms. Reload to see the latest.' }` and **no** follow-up writes; (b) for each rename: `room_availability` update `room_key` old→new for the property; `bookings` update for future non-cancelled rows (`status in pending,confirmed`, `check_out >= today`) with `room_key = old` → `room_key = new`, and their `room_name` prefix rewritten (`old` or `old - …` → `new` / `new - …`, done per row after selecting `id, room_key, room_name`); `offers` rows with `property_id` have `plan_percents` keys `old|plan` → `new|plan` (select `id, plan_percents`, update only changed rows); (c) for each removed category: delete its `room_availability` rows with `date >= today`. Errors in (b)/(c) are logged with `console.error` and do not fail the save.

- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** following `lib/availability/store.ts` (every function takes `sb: SupabaseClient = serviceClient()`). **Step 4: Run** file + full suite + tsc — PASS.

- [ ] **Step 5: Commit** `"Rooms: store with optimistic save, rename and removal follow-ups"`

---

### Task 3: Rooms API (partner + admin) and owner change email

**Files:**
- Create: `lib/rooms/handlers.ts`, `lib/rooms/notify.ts`, `app/api/partner/rooms/route.ts`, `app/api/admin/rooms/route.ts`
- Test: `tests/api/partner-rooms.test.ts`, `tests/api/admin-rooms.test.ts`, `tests/rooms/notify.test.ts`

**Interfaces:**
- Consumes: Task 1 + Task 2 functions; `requireCaller`, `HttpError`, `jsonError` (`lib/server-auth.ts`); `assertActive` (`lib/partners/load.ts`); `sendEmail`, `adminEmail` (`lib/email.ts`); `todayIST` (`lib/bookings/timing.ts`).
- Produces:
  - `GET /api/partner/rooms` → `{ properties: {id,name,status}[] }` (owned, any status; the page shows non-live ones disabled). `GET ?property_id=` → `{ property: { id, name, status, total_rooms, extra_bed_charge, rooms, updated_at } }`.
  - `PUT` body `{ property_id, total_rooms, rooms, expected_updated_at }` → 200 `{ property: …same shape… }`, 400 (validation/cap/swap), 403 (draft / not active partner), 404, 409 (removal with bookings, or stale).
  - Admin routes identical with admin scope.
  - `export async function roomsGet(prop: RoomsProperty)`, `export async function roomsPut(prop: RoomsProperty, body: unknown, who: { label: string })` in handlers.ts returning `NextResponse`.
  - `export function roomChangeEmail(p: { hotel: string; who: string; totalBefore: number | null; totalAfter: number; diff: RoomDiff }): { subject: string; html: string }` and `export async function sendRoomChangeEmail(...)` (never throws) in notify.ts.

- [ ] **Step 1: Failing tests** (mock style of `tests/api/partner-availability.test.ts`: `vi.hoisted` state, `vi.mock('@/lib/server-auth', …)`, `vi.mock('@/lib/rooms/store', …)`, `vi.mock('@/lib/rooms/notify', …)`):
  - partner: wrong role 403; suspended 403; property of another owner 404; status `draft` → 403 `Use the listing form to edit rooms on a draft listing.`; bad JSON 400; `total_rooms` 0 or 501 → 400 `Total rooms must be 1-500.`; cap → 400 `Rooms assigned (22) exceed the hotel total (21)`; removed category with `upcomingBookingCount` 2 → 409 `"Suite" has upcoming bookings. Switch it off instead of deleting it.` and `saveRooms` not called; `expected_updated_at` missing → 400 `Please reload the page and try again.`; store returns stale 409 → 409 passed through and no email; success → 200, `saveRooms` called with normalised rooms and `today`, `sendRoomChangeEmail` called with `who` = `"<partner name or email> (partner)"`; a save with no changes (diff lines empty and total unchanged) sends no email.
  - admin: non-admin 403; any owner OK; draft allowed; `who` = `"Admin"`.
  - notify: subject `Rooms updated: <hotel>`; html escapes `<` in hotel/room names; lists `Total rooms 20 → 21` when changed, then each diff line; `sendRoomChangeEmail` swallows a throwing `sendEmail`.

- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** Route shape (partner):

```ts
import { NextResponse } from 'next/server';
import { HttpError, jsonError, requireCaller } from '@/lib/server-auth';
import { assertActive } from '@/lib/partners/load';
import { isUuid } from '@/lib/availability/validate';
import { loadRoomsProperty, ownedRoomsProperties } from '@/lib/rooms/store';
import { readJson } from '@/lib/availability/handlers';
import { roomsGet, roomsPut } from '@/lib/rooms/handlers';

export const dynamic = 'force-dynamic';
const LIVE = ['published', 'approved'];

async function activePartner(req: Request) { const c = await requireCaller(req, ['partner']); assertActive(c.profile.partner_status); return c; }
async function ownProperty(id: string | null, caller: any, forWrite: boolean) {
  if (!id || !isUuid(id)) throw new HttpError(400, 'property_id is required');
  const p = await loadRoomsProperty(id);
  if (!p || p.owner_id !== caller.profile.id) throw new HttpError(404, 'Property not found');
  if (forWrite && !LIVE.includes(p.status)) throw new HttpError(403, 'Use the listing form to edit rooms on a draft listing.');
  return p;
}
export async function GET(req: Request) {
  try {
    const caller = await activePartner(req);
    const id = new URL(req.url).searchParams.get('property_id');
    if (!id) return NextResponse.json({ properties: await ownedRoomsProperties(caller.profile.id) });
    return roomsGet(await ownProperty(id, caller, false));
  } catch (e) { return jsonError(e); }
}
export async function PUT(req: Request) {
  try {
    const caller = await activePartner(req);
    const body = await readJson(req);
    if (!body) throw new HttpError(400, 'Invalid request');
    const p = await ownProperty(String(body.property_id || ''), caller, true);
    const name = caller.profile.full_name || caller.profile.email || 'Partner';
    return roomsPut(p, body, { label: `${name} (partner)` });
  } catch (e) { return jsonError(e); }
}
```
(Check that `readJson` is exported from `lib/availability/handlers.ts` and what profile name field exists — `grep -n "full_name" lib/server-auth.ts types/index.ts`; adapt.) `roomsPut` order: validate `total_rooms` int 1-500 → `expected_updated_at` must equal string → `normaliseRooms(body.rooms, { newId: () => crypto.randomUUID(), defaultExtraBedPrice: p.extra_bed_charge ?? 0 })` → `capProblem` → `diffRooms(p.rooms, rooms)` → if `expected_updated_at !== p.updated_at` 409 stale → for each removed, `upcomingBookingCount` > 0 → 409 → `saveRooms` → email (in `inBackground` from `lib/background.ts` if that's how other routes do fire-and-forget; otherwise `await` inside try/catch) → 200 with the fresh property.

- [ ] **Step 4: Run** tests + suite + tsc — PASS. **Step 5: Commit** `"Rooms: partner and admin API with owner change email"`

---

### Task 4: Rooms editor page (partner + admin) with photo upload

**Files:**
- Create: `components/rooms/RoomsEditor.tsx` (client), `components/rooms/RoomPhotos.tsx` (client), `lib/client-image.ts`, `app/(site)/partner/rooms/page.tsx`, `app/(site)/admin/properties/[id]/rooms/page.tsx`
- Modify: `app/(site)/partner/dashboard/page.tsx` (header link "Rooms" next to Availability, same condition/class, icon `BedDouble` from lucide-react), `app/(site)/admin/properties/[id]/edit/page.tsx` (link "Rooms" next to "Room availability" ~L135)
- Test: `tests/rooms/client-image.test.ts` (pure size math only)

**Interfaces:**
- Consumes: API from Task 3; `authFetch` (`lib/supabase.ts`); Supabase browser client for storage (as in `components/forms/ImageUploader.tsx`, bucket `property-images`).
- Produces: `<RoomsEditor apiUrl="/api/partner/rooms" | "/api/admin/rooms" propertyId={string} userId={string} />`; `export function fitWithin(w: number, h: number, max: number): { width: number; height: number }` and `export async function shrinkImage(file: File, max = 1600, quality = 0.82): Promise<Blob>` in `lib/client-image.ts`.

- [ ] **Step 1: Failing test** for `fitWithin`: `(4000,3000,1600)→(1600,1200)`, `(1000,3000,1600)→(533,1600)`, `(800,600,1600)→(800,600)` (rounded).
- [ ] **Step 2: Implement `lib/client-image.ts`**: `fitWithin` pure; `shrinkImage` uses `createImageBitmap` + `OffscreenCanvas` (fallback `document.createElement('canvas')`) → `convertToBlob({ type: 'image/webp', quality })`, falling back to `image/jpeg`; files already under 300 KB and within `max` are returned as-is.
- [ ] **Step 3: RoomPhotos**: accepts `images: string[]`, `onChange`, `userId`, `folder` (`${userId}/${propertyId}/rooms`). Accept `image/jpeg,image/png,image/webp`, refuse > 5 MB before shrinking with inline message `Photos must be JPEG, PNG or WebP, up to 5 MB.`, max 8 (hide the add button at 8), upload like ImageUploader (`upsert:false`, `cacheControl:'3600'`, public URL), thumbnails with remove buttons and left/right reorder.
- [ ] **Step 4: RoomsEditor** (mirror visual style of `components/availability/AvailabilityCalendar.tsx` and the partner edit form inputs):
  - Loads `GET apiUrl?property_id=`; keeps `updated_at`.
  - Top: hotel name, "Total rooms in the hotel" number input, live counter `Rooms assigned: N of M` (red text + `Over by K` when N > M; counts active only).
  - One card per category: name, rooms count, max adults, max children, bed type select (Single/Double/Queen/King/Twin/Bunk/Other), price per night, extra beds allowed (0-3 select), extra bed price per night (shown when > 0), description textarea (500 counter), rate plans list (name, meal plan select EP/CP/MAP/AP with labels "Room only / Breakfast / Breakfast + dinner / All meals", price, cancellation text; add up to 6; remove), RoomPhotos, an "On sale" toggle, and Delete (confirmation inline: "Delete <name>? Click again to confirm" — no `window.confirm`).
  - "Add room type" adds a blank card with `is_active: true`, `total_inventory: 1`, `max_adults: 2`, `max_children: 0`, `extra_beds_max: 0`.
  - One sticky "Save changes" button; disabled while saving; client-side mirrors of the cap and duplicate-name checks; server error text shown in a red banner above the button; on 409 stale show the message with a "Reload" button; success shows "Saved. Changes are live." and replaces state with the response.
  - Warn before leaving with unsaved changes (`beforeunload`).
- [ ] **Step 5: Pages.** Partner page: copy session/redirect logic and property `<select>` from `app/(site)/partner/availability/page.tsx`; non-live properties appear disabled with "(draft — use the listing form)". Admin page: copy `app/(site)/admin/properties/[id]/availability/page.tsx`.
- [ ] **Step 6:** `npx vitest run`, `npx tsc --noEmit -p tsconfig.json`, `npx next lint --dir app/(site)/partner/rooms --dir components/rooms` (or `npm run lint`) — clean. **Commit** `"Rooms: editor page for partners and admin with photo upload"`

---

### Task 5: Extra beds in pricing and booking; hide switched-off rooms

**Files:**
- Modify: `lib/pricing.ts`, `lib/bookings/create.ts`, `components/hotels/HotelBooking.tsx`, `lib/wa-chat/tools.ts` (~L79-82), `lib/wa-chat/booking-tools.ts` (room matching ~L57-67, quote ~L120-150, and wherever the stored quote input is turned into a booking)
- Test: `tests/pricing.test.ts`, `tests/bookings/create.test.ts`, `tests/wa-chat/booking-tools.test.ts`, `tests/wa-chat/tools.test.ts` (create if missing)

**Interfaces — Produces:**
```ts
// lib/pricing.ts
export type QuoteInput = { …existing…; extra_beds?: number | null };
export function extraBedOption(property: HotelLike & { extra_bed_charge?: number | null }, roomName?: string | null): { max: number; price: number };
export function extraBedProblem(property: …, roomName: string | null | undefined, beds: number): string | null; // 'This room allows at most N extra bed(s)'
// lib/bookings/create.ts
bookingSchema.extra_beds: z.number().int().min(0).max(3).default(0)
export const roomLabel: (d: { room_name?: string; plan_name?: string; extra_beds?: number }) => string | null;
```

- [ ] **Step 1: Failing tests.**
  - pricing: room `{ name:'Deluxe', base_price:3000, extra_beds_max:2, extra_bed_price:800 }`, 2 nights, 1 bed → amount 7600; property `extra_bed_charge: 500` used when room has `extra_beds_max` but no `extra_bed_price`; room with `extra_beds_max` 0 → `extraBedProblem(…,1)` = `This room allows at most 0 extra bed(s)`; 3 beds on max 2 → message with 2; 0 beds → null; `extra_beds` ignored for non-hotel categories.
  - create: label `Deluxe - Breakfast + 1 extra bed`, `Deluxe - 2 extra beds` (no plan), `Deluxe - Breakfast` (0 beds); too many beds → `{ ok:false, status:400, error:'This room allows at most 1 extra bed(s)' }` before insert; inserted `amount` includes the beds.
  - wa tools: `getHotel` omits rooms with `is_active === false` (check it already does) and includes `extra_bed: { max, price_per_night }` only when max > 0; `quote_booking` accepts `extra_beds`, rejects too many with the same message, the summary shows the bed line, the stored quote input carries `extra_beds`, and `create_booking` passes it to `createBooking`. Room matching ignores inactive rooms.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** In `quoteBooking` hotel branch: `amount = (nightly + beds * bedPrice) * nights` where `beds = Math.min(max, Math.max(0, floor(input.extra_beds || 0)))`. In `createBooking`, after the price lookup and before the availability check: `if (data.category === 'hotel' && data.extra_beds) { const p = extraBedProblem(entity || {}, data.room_name, data.extra_beds); if (p) return { ok:false, error:p, status:400 }; }`. `roomLabel` builds `room - [plan, beds?`${n} extra bed${n>1?'s':''}`:null].filter(Boolean).join(' + ')` (no ` - ` when both empty). The idempotency `matchEarlier` call uses `roomLabel(data)` so it stays consistent.
- [ ] **Step 4: HotelBooking.tsx**: filter `hotel.rooms` to `room.is_active !== false` before mapping; when the selected room's `extra_beds_max > 0`, show a select "Extra bed" (`None`, `1 bed (+Rs.X/night)`…), include it in the price estimate and in the POST body as `extra_beds`. Also exclude inactive rooms from the gallery in `components/pages/HotelDetailView.tsx` L71-76.
- [ ] **Step 5: Run** suite + tsc — PASS. **Commit** `"Extra beds per room type; switched-off rooms hidden from the hotel page and chat"`

---

### Task 6: Stripe webhook — overbooking alert and customer WhatsApp on payment

**Files:**
- Modify: `app/api/webhooks/stripe/route.ts` (success branch ~L171-179), `lib/booking-emails.ts`
- Test: `tests/api/stripe-webhook.test.ts`

**Interfaces:**
- Produces: `sendBookingEmails(bookingId: string, stage: 'requested' | 'confirmed' = 'requested')` — `requested`: customer gets the "request received" email (Task 8 provides `sendBookingRequestReceived`; until then keep the existing call), admin + partner alerts, no customer WhatsApp; `confirmed`: customer gets `sendBookingConfirmation`, admin + partner alerts, and `whatsappNewBooking(id, { customer: true, partners: true })`.

- [ ] **Step 1: Failing tests**: paid booking → `sendBookingEmails(id, 'confirmed')`; hotel booking whose `availabilityFor` (mock `@/lib/availability/store`) gives `{ [key]: { tracked: true, left: -1 } }` → owner email subject `Possible overbooking: <ref>` (payment still recorded, 200); `left: 0` → no alert; untracked → no alert; `availabilityFor` throwing → no alert, still 200. Room key choice copies `lib/bookings/checkout.ts:19`.
- [ ] **Step 2-4:** implement, run, pass. Update other `sendBookingEmails` callers' tests if their expectations break (create.ts and pay-later.ts keep the default stage).
- [ ] **Step 5: Commit** `"Stripe: customer WhatsApp on payment and overbooking alert to the owner"`

---

### Task 7: One confirm path for admin, partner and WhatsApp Accept

**Files:**
- Create: `lib/bookings/confirm.ts`
- Modify: `app/api/admin/bookings/[id]/route.ts` (new `confirm` action), `app/api/partner/bookings/route.ts` (new `PATCH`), `app/api/whatsapp/webhook/route.ts` (`handleReply`), `app/(site)/admin/bookings/page.tsx`, `app/(site)/admin/bookings/[id]/page.tsx`, `app/(site)/partner/bookings/page.tsx`
- Test: `tests/bookings/confirm.test.ts`, `tests/api/admin-bookings.test.ts`, `tests/api/partner-bookings.test.ts`, `tests/api/whatsapp-webhook.test.ts`

**Interfaces — Produces:**
```ts
export type ConfirmBy = 'admin' | 'partner';
export type ConfirmResult = { ok: true; already: boolean } | { ok: false; status: 404 | 409 | 500; error: string };
export async function confirmBooking(id: string, by: ConfirmBy, sb?: SupabaseClient): Promise<ConfirmResult>;
export async function sendConfirmedNotices(id: string): Promise<void>; // customer email (if any) + customer WhatsApp template; never throws
```

- [ ] **Step 1: Failing tests** (`tests/bookings/confirm.test.ts`, fake sb + mocked `@/lib/email` and `@/lib/booking-whatsapp`):
  - pending → update `{ status:'confirmed', updated_at }` with `.eq('id').eq('status','pending').select('id')`; one row → notices sent once (`sendBookingConfirmation` with the booking + property name, `whatsappNewBooking(id, { customer: true, partners: false })`), result `{ ok:true, already:false }`.
  - zero rows and the row is `confirmed` → `{ ok:true, already:true }`, **no** notices (covers the double-confirm race).
  - zero rows and `cancelled`/`failed`/`completed` → `{ ok:false, status:409, error:'This booking is cancelled.' }` (status word); missing → 404 `Booking not found.`.
  - a throwing email does not change the result.
- [ ] **Step 2: Implement `lib/bookings/confirm.ts`** (`sendConfirmedNotices` loads the booking with `select('*')` and the property name like `lib/booking-emails.ts`).
- [ ] **Step 3: Admin route.** Add `z.object({ action: z.literal('confirm') })` to the union; branch before the `cancelled` 409 is fine (confirmBooking handles states): `const r = await confirmBooking(id, 'admin'); if (!r.ok) throw new HttpError(r.status, r.error); return NextResponse.json({ booking: await loadBookingView(id), already: r.already });`. Tests: confirm pending → 200 + `confirmBooking` called; cancelled → 409.
- [ ] **Step 4: Partner route `PATCH`** body `{ id, action: 'confirm' }`: active partner; booking must belong to them (hotel partners: `property_id` in their properties; others: `partner_id === caller.profile.id`) else 404; `payment_method === 'online'` and `payment_status !== 'paid'` → 409 `This booking is waiting for online payment.`; else `confirmBooking(id,'partner')` and return `{ ok:true, already }`. Tests for each branch.
- [ ] **Step 5: WhatsApp Accept.** In `handleReply` add `payment_method` to the booking select; after a successful `accepted` update, when `booking.status === 'pending' && booking.payment_method !== 'online'` call `confirmBooking(msg.booking_id, 'partner')`. Test: Accept on a pay-later pending booking → `confirmBooking` called; on online → not called; decline → not called.
- [ ] **Step 6: Admin UI.** List page: "Confirm" calls `authFetch(\`/api/admin/bookings/${id}\`, { method:'PATCH', body: JSON.stringify({ action:'confirm' }) })` then reloads, showing the server error inline on failure and "Confirmed — customer notified by email and WhatsApp" on success; the list's direct "Cancel" button becomes a link to the detail page (`/admin/bookings/<id>`) labelled "Cancel…"; pending rows show a badge `Waiting for hotel · 3h` (age from `created_at`: `<1h` → minutes, `<48h` → hours, else days) in amber when ≥ 2 hours. Detail page: a "Confirm booking" button for `pending` bookings calling the same PATCH. Partner bookings page: a "Confirm booking" button on pending, pay-later bookings calling `PATCH /api/partner/bookings`.
- [ ] **Step 7:** suite + tsc — PASS. **Commit** `"Bookings: one confirm path that always tells the customer by email and WhatsApp"`

---

### Task 8: Honest pay-later email and customer cancellation WhatsApp

**Files:**
- Modify: `lib/email.ts` (new `sendBookingRequestReceived`), `lib/booking-emails.ts` (`requested` stage uses it), `scripts/create-whatsapp-templates.mjs` (new `booking_cancelled_customer`), `lib/booking-whatsapp.ts` (new `whatsappCancelledCustomer`), `lib/bookings/cancel.ts`, `lib/wa-chat/cancellations.ts` (pass the opt-out)
- Test: `tests/booking-whatsapp.test.ts`, `tests/bookings/cancel.test.ts`, `tests/bookings/pay-later.test.ts`

**Interfaces — Produces:**
```ts
export async function sendBookingRequestReceived(b: Parameters<typeof sendBookingConfirmation>[0]): Promise<void>; // never throws
export async function whatsappCancelledCustomer(bookingId: string, reason: string): Promise<void>; // never throws
// cancelBooking(…, opts: { notify?: boolean; customerWhatsApp?: boolean /* default true */ })
```

- [ ] **Step 1: Failing tests:** `requested` stage sends `sendBookingRequestReceived` not `sendBookingConfirmation`; `booking_cancelled_customer` params are `[ref, item_name, date, reason]` and the count matches the template body in the script (extend the existing param-count test at `tests/booking-whatsapp.test.ts:129-141`); `cancelBooking` with notify sends `whatsappCancelledCustomer` unless `customerWhatsApp: false`; the WhatsApp-chat cancellation path passes `customerWhatsApp: false` (it already replies in chat).
- [ ] **Step 2: Implement.** Request-received email: same layout as `sendBookingConfirmation`, header `Booking Request Received`, intro `Thank you! We've received your booking request. The hotel will confirm it shortly, and we'll send you a confirmation by email and WhatsApp.`, subject `Booking Request Received - <ref> | Dharamshala Stay`, payment row `Pay at property`. Template (category UTILITY, same footer as the others):

```js
{
  name: 'booking_cancelled_customer',
  body: [
    '*❌ Your booking is cancelled*', '',
    'Your Dharamshala Stay booking below has been cancelled.', '',
    '📋 *Booking ID:* {{1}}', '🛎️ *Service:* {{2}}', '📅 *Date:* {{3}}', '📝 *Reason:* {{4}}', '',
    'If a refund is due, our team will contact you about it.', '',
    'Want to book again or need help? Just reply to this message. 🙏',
  ].join('\n'),
  example: ['DS-AB12CD', 'Hotel Snow View - Deluxe', 'Mon, 12 Oct 2026 to Wed, 14 Oct 2026 (2 nights)', 'Cancelled at your request'],
}
```
(Match the script's real object shape for templates — copy from `booking_cancelled_partner_v2`.) `whatsappCancelledCustomer` uses `sendAndLog(bookingId, 'customer', phone, msg)`; give `Msg.fallback` the same template/params (or make `fallback` optional in the `Msg` type and skip the retry when absent).
- [ ] **Step 3:** suite + tsc — PASS. **Commit** `"Pay-later bookings get a request-received email; customers get a WhatsApp cancellation notice"`

---

### Task 9: Professional WhatsApp messages

**Files:**
- Create: `lib/whatsapp-format.ts`
- Modify: `lib/wa-chat/assistant.ts` (prompt "How to write" + REMINDER), `lib/wa-chat/process.ts` (apply `tidyWhatsApp` next to `stripSentinel`; HOLDING_REPLY), `lib/wa-chat/cancellations.ts` (PROOF_REVIEW_REPLY, cancelled texts), `lib/wa-chat/booking-tools.ts` (quote summary), `lib/whatsapp.ts` (`bookingShareText`)
- Test: `tests/whatsapp-format.test.ts`, update `tests/whatsapp.test.ts`, `tests/wa-chat/booking-tools.test.ts`, `tests/wa-chat/process.test.ts`, `tests/wa-chat/assistant.test.ts` as needed

**Interfaces — Produces:** `export function tidyWhatsApp(text: string): string`.

- [ ] **Step 1: Failing tests** for `tidyWhatsApp`:

```ts
import { tidyWhatsApp as t } from '@/lib/whatsapp-format';
it('bold markdown → WhatsApp bold', () => expect(t('Total **Rs.6,000**')).toBe('Total *Rs.6,000*'));
it('headings → bold line', () => expect(t('## Your options\nA')).toBe('*Your options*\nA'));
it('bullets → •', () => expect(t('- one\n* two\n• three')).toBe('• one\n• two\n• three'));
it('collapses blank lines and trims', () => expect(t('  Hi  \n\n\n\nThere \n')).toBe('Hi\n\nThere'));
it('is idempotent on good text', () => { const s = 'Hi Priya 👋\n\n🏨 *Hotel Snow View*\n📅 12-14 Oct\n\nShall I book it?'; expect(t(s)).toBe(s); expect(t(t(s))).toBe(s); });
it('leaves urls alone', () => expect(t('Pay here: https://x.com/a_b*c__d')).toBe('Pay here: https://x.com/a_b*c__d'));
it('drops markdown links to "text: url"', () => expect(t('[Pay now](https://x.com/p)')).toBe('Pay now: https://x.com/p'));
```
- [ ] **Step 2: Implement** line-wise (skip transforms inside URL tokens: split each line on `/(https?:\/\/\S+)/` and only transform non-URL parts).
- [ ] **Step 3: Prompt.** Replace the "How to write" bullets with:

```
How to write (WhatsApp):
- Warm, polite and professional, like a helpful local travel desk. Reply in the customer's language and style (English, Hindi, or Hinglish in Roman script). Use their name when you know it.
- Lay messages out cleanly: a short greeting or acknowledgement line, then short blocks separated by one blank line. Never one long run-on paragraph.
- Put details one per line with a fitting emoji: 🏨 hotel/room, 📅 dates, 👥 guests, 💰 price, 🍳 meals, 🚕 taxi, 🥾 trek, 🪂 paragliding, 📍 place, 🔗 link.
- Use *single asterisks* for bold on key facts (names, totals, booking reference). Never use **double asterisks**, # headings, tables or markdown links.
- When comparing options, number them (1️⃣ 2️⃣ 3️⃣), one option per block.
- 2-4 emojis per message, only where they help; none in apologies or serious messages.
- End with one clear question or next step on its own line.
- Keep it short: at most about 8 lines unless listing options.
- Ask one question at a time when you need details.
```
and add `clean WhatsApp layout with line breaks and a few emojis` into REMINDER. Keep every other prompt section unchanged. Update the assistant test if it snapshots the prompt.
- [ ] **Step 4: Quote summary** (booking-tools): build multi-line text:

```ts
const ICON: Record<string, string> = { hotel: '🏨', taxi: '🚕', trek: '🥾', paragliding: '🪂' };
const lines = [
  `${ICON[category] || '🛎️'} *${r.label}*`,
  r.when ? `📅 ${r.when}` : null,
  `👥 ${n} ${n === 1 ? 'person' : 'people'}`,
  amount <= 0 ? '💰 Price confirmed by our team' : `💰 *Total: ${rupees(amount)}*`,
  offer ? `🎁 ${offer.percent}% WhatsApp offer applied (was ${rupees(offer.full_price)}) · code *${offer.code}* · pay online only` : null,
  '⚠️ Cannot be cancelled within 24 hours of the start',
];
const summary = lines.filter(Boolean).join('\n');
```
(The extra-bed text is part of `r.label` via Task 5; if Task 5 added a separate bed line, keep it as `🛏️ …`.) Update the tests that asserted the old `' · '` joined string.
- [ ] **Step 5: Fixed texts.**
  - HOLDING_REPLY: `'Thank you for your message! 🙏\n\nA member of our team will reply here shortly.'`
  - PROOF_REVIEW_REPLY: `'Thank you, we have received your document. 📄\n\nA team member will review your cancellation request and reply here shortly. 🙏'`
  - cancelled: `` `✅ Your booking *${ref}* is cancelled.\n\nNo payment was taken, so nothing is owed.` `` / already: `` `Your booking *${ref}* is already cancelled.` ``
- [ ] **Step 6: Apply `tidyWhatsApp`** to every assistant reply in `process.ts` (`turn()` after `stripSentinel`) — not to admin-typed inbox messages.
- [ ] **Step 7: `bookingShareText`** layout:

```
partner: '*🆕 New booking from Dharamshala Stay*' | customer: '*✅ Your Dharamshala Stay booking is confirmed*'
''
'📋 *Booking ID:* REF'
'🛎️ *<Type>:* <item>'
'📅 *When:* <date_text>'
'👥 *People:* N'
(partner) '👤 *Customer:* name, phone'
(assignee) '🧑‍✈️ *Assigned:* …' / '🧑‍✈️ *Your <driver|pilot|guide|host>:* …'
''
'💰 *Price:* Rs.X'
'💳 *Payment:* …'
(partner, commission) '🏷️ *Dharamshala Stay commission:* Rs.Y'
```
Update `tests/whatsapp.test.ts`.
- [ ] **Step 8:** suite + tsc — PASS. **Commit** `"WhatsApp: clean professional layout for chat replies, quotes and fixed messages"`

---

### Task 10: Final verification and ship

- [ ] `npx vitest run` (all green), `npx tsc --noEmit -p tsconfig.json`, `npm run build` (succeeds).
- [ ] Manual run (`npm run dev`): partner rooms page loads for a published hotel; total 21 with 10+11 saves; 22 refused with the cap message; rename a room that has a calendar override and see the override follow it in Availability; hotel page shows the extra bed picker and hides a switched-off room.
- [ ] Merge to main, push (Vercel deploys), then run `npm run whatsapp:templates` only if the owner agrees (it submits `booking_cancelled_customer` to Meta for approval).
