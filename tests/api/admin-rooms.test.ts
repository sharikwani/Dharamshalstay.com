import { describe, it, expect, vi, beforeEach } from 'vitest';

const OWN = '11111111-1111-4111-8111-111111111111';
const DRAFT = '33333333-3333-4333-8333-333333333333';
const UPDATED = '2099-01-01T00:00:00.000Z';

const room = (over: Record<string, any> = {}) => ({
  id: 'r1', name: 'Deluxe', max_adults: 2, max_children: 0, base_price: 2000, total_inventory: 10,
  is_active: true, extra_beds_max: 0, extra_bed_price: 0, rate_plans: [], images: [], ...over,
});

const h = vi.hoisted(() => ({
  role: 'admin', saves: [] as any[], emails: [] as any[], props: {} as Record<string, any>,
}));

vi.mock('@/lib/server-auth', async (orig) => {
  const actual = await orig<typeof import('@/lib/server-auth')>();
  return {
    ...actual,
    requireCaller: async (_req: Request, roles?: string[]) => {
      if (roles && !roles.includes(h.role)) throw new actual.HttpError(403, 'You do not have access to this');
      return { user: { id: 'user-a' }, profile: { id: 'a1', role: h.role } };
    },
  };
});
vi.mock('@/lib/rooms/store', () => ({
  loadRoomsProperty: async (id: string) => h.props[id] ?? null,
  ownedRoomsProperties: async () => [],
  upcomingBookingCount: async () => 0,
  saveRooms: async (...a: any[]) => { h.saves.push(a); return { ok: true, updated_at: '2099-01-02T00:00:00.000Z' }; },
}));
vi.mock('@/lib/rooms/notify', () => ({ sendRoomChangeEmail: async (p: any) => { h.emails.push(p); } }));
vi.mock('@/lib/background', () => ({ inBackground: (_l: string, work: () => Promise<unknown>) => { void work(); } }));

import { GET, PUT } from '@/app/api/admin/rooms/route';

const URL_BASE = 'http://x/api/admin/rooms';
const get = (q = '') => GET(new Request(`${URL_BASE}${q}`));
const put = (body: any) => PUT(new Request(URL_BASE, { method: 'PUT', body: JSON.stringify(body) }));
const valid = (over: Record<string, any> = {}) => ({ property_id: OWN, total_rooms: 21, rooms: [room()], expected_updated_at: UPDATED, ...over });

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  Object.assign(h, {
    role: 'admin', saves: [], emails: [],
    props: {
      [OWN]: { id: OWN, name: 'Own Hotel', owner_id: 'someone', status: 'published', total_rooms: 20, extra_bed_charge: 0, rooms: [room()], updated_at: UPDATED },
      [DRAFT]: { id: DRAFT, name: 'Draft', owner_id: 'someone', status: 'draft', total_rooms: 5, extra_bed_charge: 0, rooms: [], updated_at: UPDATED },
    },
  });
});

describe('admin rooms', () => {
  it('blocks non-admins', async () => {
    h.role = 'partner';
    expect((await get(`?property_id=${OWN}`)).status).toBe(403);
    expect((await put(valid())).status).toBe(403);
  });
  it('reads any owner\'s property and 404s an unknown one', async () => {
    expect((await get(`?property_id=${OWN}`)).status).toBe(200);
    expect((await get('?property_id=44444444-4444-4444-8444-444444444444')).status).toBe(404);
    expect((await get()).status).toBe(400);
  });
  it('saves any owner\'s property and labels the change Admin', async () => {
    const res = await put(valid());
    expect(res.status).toBe(200);
    expect(h.saves).toHaveLength(1);
    expect(h.emails[0].who).toBe('Admin');
  });
  it('allows editing a draft', async () => {
    const res = await put(valid({ property_id: DRAFT, total_rooms: 10 }));
    expect(res.status).toBe(200);
  });
});
