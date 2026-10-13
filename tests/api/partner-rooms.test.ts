import { describe, it, expect, vi, beforeEach } from 'vitest';

const OWN = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const DRAFT = '33333333-3333-4333-8333-333333333333';
const UPDATED = '2099-01-01T00:00:00.000Z';
const SAVED_AT = '2099-01-02T00:00:00.000Z';

const room = (over: Record<string, any> = {}) => ({
  id: 'r1', name: 'Deluxe', max_adults: 2, max_children: 0, base_price: 2000, total_inventory: 10,
  is_active: true, extra_beds_max: 0, extra_bed_price: 0, rate_plans: [], images: [], ...over,
});

const h = vi.hoisted(() => ({
  role: 'partner', status: 'verified' as string | null, profile: { full_name: 'Asha' } as Record<string, any>,
  bookings: 0, saveResult: null as any, saves: [] as any[], emails: [] as any[], counts: [] as any[],
  props: {} as Record<string, any>,
}));

vi.mock('@/lib/server-auth', async (orig) => {
  const actual = await orig<typeof import('@/lib/server-auth')>();
  return {
    ...actual,
    requireCaller: async (_req: Request, roles?: string[]) => {
      if (roles && !roles.includes(h.role)) throw new actual.HttpError(403, 'You do not have access to this');
      return { user: { id: 'user-p1' }, profile: { id: 'p1', role: h.role, partner_status: h.status, email: 'asha@x.test', ...h.profile } };
    },
  };
});
vi.mock('@/lib/rooms/store', () => ({
  loadRoomsProperty: async (id: string) => h.props[id] ?? null,
  ownedRoomsProperties: async (owner: string) => Object.values(h.props).filter((p: any) => p.owner_id === owner).map((p: any) => ({ id: p.id, name: p.name, status: p.status })),
  upcomingBookingCount: async (...a: any[]) => { h.counts.push(a); return h.bookings; },
  saveRooms: async (...a: any[]) => { h.saves.push(a); return h.saveResult ?? { ok: true, updated_at: SAVED_AT }; },
}));
vi.mock('@/lib/rooms/notify', () => ({ sendRoomChangeEmail: async (p: any) => { h.emails.push(p); } }));
vi.mock('@/lib/background', () => ({ inBackground: (_l: string, work: () => Promise<unknown>) => { void work(); } }));

import { GET, PUT } from '@/app/api/partner/rooms/route';

const URL_BASE = 'http://x/api/partner/rooms';
const get = (q = '') => GET(new Request(`${URL_BASE}${q}`));
const put = (body: any) => PUT(new Request(URL_BASE, { method: 'PUT', body: typeof body === 'string' ? body : JSON.stringify(body) }));
const valid = (over: Record<string, any> = {}) => ({ property_id: OWN, total_rooms: 21, rooms: [room()], expected_updated_at: UPDATED, ...over });

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  Object.assign(h, {
    role: 'partner', status: 'verified', profile: { full_name: 'Asha' }, bookings: 0, saveResult: null, saves: [], emails: [], counts: [],
    props: {
      [OWN]: { id: OWN, name: 'Own Hotel', owner_id: 'p1', status: 'published', total_rooms: 20, extra_bed_charge: 500, rooms: [room()], updated_at: UPDATED },
      [OTHER]: { id: OTHER, name: 'Other', owner_id: 'p2', status: 'published', total_rooms: 5, extra_bed_charge: 0, rooms: [], updated_at: UPDATED },
      [DRAFT]: { id: DRAFT, name: 'Draft', owner_id: 'p1', status: 'draft', total_rooms: 5, extra_bed_charge: 0, rooms: [], updated_at: UPDATED },
    },
  });
});

describe('GET /api/partner/rooms', () => {
  it('lists owned properties of any status', async () => {
    const body = await (await get()).json();
    expect(body.properties.map((p: any) => p.id).sort()).toEqual([OWN, DRAFT].sort());
  });
  it('returns one property', async () => {
    const body = await (await get(`?property_id=${OWN}`)).json();
    expect(body.property).toMatchObject({ id: OWN, name: 'Own Hotel', status: 'published', total_rooms: 20, extra_bed_charge: 500, updated_at: UPDATED });
    expect(body.property.owner_id).toBeUndefined();
  });
  it('reads a draft but hides another owner', async () => {
    expect((await get(`?property_id=${DRAFT}`)).status).toBe(200);
    expect((await get(`?property_id=${OTHER}`)).status).toBe(404);
  });
  it('blocks wrong role and suspended partners', async () => {
    h.role = 'customer';
    expect((await get()).status).toBe(403);
    h.role = 'partner'; h.status = 'suspended';
    expect((await get()).status).toBe(403);
  });
});

describe('PUT /api/partner/rooms', () => {
  it('blocks wrong role and suspended partners', async () => {
    h.role = 'customer';
    expect((await put(valid())).status).toBe(403);
    h.role = 'partner'; h.status = 'suspended';
    expect((await put(valid())).status).toBe(403);
    expect(h.saves).toEqual([]);
  });
  it('404s another owner\'s property', async () => {
    expect((await put(valid({ property_id: OTHER }))).status).toBe(404);
  });
  it('refuses draft listings', async () => {
    const res = await put(valid({ property_id: DRAFT }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('Use the listing form to edit rooms on a draft listing.');
  });
  it('400s bad JSON', async () => {
    expect((await put('{nope')).status).toBe(400);
  });
  it('400s total_rooms out of range', async () => {
    for (const t of [0, 501]) {
      const res = await put(valid({ total_rooms: t }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('Total rooms must be 1-500.');
    }
  });
  it('400s a cap breach', async () => {
    const res = await put(valid({ total_rooms: 21, rooms: [room({ total_inventory: 22 })] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Rooms assigned (22) exceed the hotel total (21)');
    expect(h.saves).toEqual([]);
  });
  it('400s a swap rename', async () => {
    h.props[OWN].rooms = [room({ id: 'a', name: 'Aa' }), room({ id: 'b', name: 'Bb' })];
    const res = await put(valid({ rooms: [room({ id: 'a', name: 'Bb' }), room({ id: 'b', name: 'Aa' })] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Rename one room at a time.');
  });
  it('400s a missing expected_updated_at', async () => {
    const res = await put(valid({ expected_updated_at: undefined }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Please reload the page and try again.');
  });
  it('409s a stale expected_updated_at without saving', async () => {
    const res = await put(valid({ expected_updated_at: '2000-01-01T00:00:00.000Z' }));
    expect(res.status).toBe(409);
    expect(h.saves).toEqual([]);
  });
  it('409s removing a category with upcoming bookings', async () => {
    h.props[OWN].rooms = [room(), room({ id: 'r2', name: 'Suite' })];
    h.bookings = 2;
    const res = await put(valid());
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('"Suite" has upcoming bookings. Switch it off instead of deleting it.');
    expect(h.counts[0].slice(0, 3)).toEqual([OWN, 'Suite', 'r2']);
    expect(h.saves).toEqual([]);
  });
  it('allows removal when there are no bookings', async () => {
    h.props[OWN].rooms = [room(), room({ id: 'r2', name: 'Suite' })];
    expect((await put(valid())).status).toBe(200);
  });
  it('passes a store conflict through and sends no email', async () => {
    h.saveResult = { ok: false, status: 409, error: 'Someone else changed these rooms. Reload to see the latest.' };
    const res = await put(valid());
    expect(res.status).toBe(409);
    expect(h.emails).toEqual([]);
  });
  it('saves, returns the fresh property and emails the owner notice', async () => {
    const res = await put(valid({ rooms: [room({ base_price: 2500 })] }));
    expect(res.status).toBe(200);
    const { property } = await res.json();
    expect(property).toMatchObject({ id: OWN, total_rooms: 21, updated_at: SAVED_AT });
    expect(property.rooms[0].base_price).toBe(2500);
    expect(h.saves).toHaveLength(1);
    const [p, next, , today] = h.saves[0];
    expect(p.id).toBe(OWN);
    expect(next.total_rooms).toBe(21);
    expect(next.rooms[0]).toMatchObject({ id: 'r1', name: 'Deluxe', base_price: 2500 });
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(h.emails).toHaveLength(1);
    expect(h.emails[0]).toMatchObject({ hotel: 'Own Hotel', who: 'Asha (partner)', totalBefore: 20, totalAfter: 21 });
    expect(h.emails[0].diff.lines).toEqual(['Deluxe: price Rs.2,000 → Rs.2,500']);
  });
  it('labels the partner by email when there is no name', async () => {
    h.profile = { full_name: null };
    await put(valid());
    expect(h.emails[0].who).toBe('asha@x.test (partner)');
  });
  it('saves but sends no email when nothing changed', async () => {
    const res = await put(valid({ total_rooms: 20 }));
    expect(res.status).toBe(200);
    expect(h.saves).toHaveLength(1);
    expect(h.emails).toEqual([]);
  });
});
