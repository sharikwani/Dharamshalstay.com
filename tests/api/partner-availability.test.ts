// tests/api/partner-availability.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const OWN = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const h = vi.hoisted(() => ({
  role: 'partner', status: 'verified' as string | null, setCalls: [] as any[], gridCalls: [] as any[],
  props: {
    '11111111-1111-4111-8111-111111111111': { id: '11111111-1111-4111-8111-111111111111', name: 'Own Hotel', owner_id: 'p1', rooms: [{ key: 'Standard', tracked: true, total: 3 }, { key: 'Dorm', tracked: false, total: 0 }] },
    '22222222-2222-4222-8222-222222222222': { id: '22222222-2222-4222-8222-222222222222', name: 'Other Hotel', owner_id: 'p2', rooms: [{ key: 'Standard', tracked: true, total: 2 }] },
  } as Record<string, any>,
}));

vi.mock('@/lib/server-auth', async (orig) => {
  const actual = await orig<typeof import('@/lib/server-auth')>();
  return {
    ...actual,
    requireCaller: async (_req: Request, roles?: string[]) => {
      if (roles && !roles.includes(h.role)) throw new actual.HttpError(403, 'You do not have access to this');
      return { user: { id: 'user-p1' }, profile: { id: 'p1', role: h.role, partner_status: h.status } };
    },
  };
});
vi.mock('@/lib/availability/store', () => ({
  loadProperty: async (id: string) => h.props[id] ?? null,
  ownedProperties: async (owner: string) => Object.values(h.props).filter((p: any) => p.owner_id === owner),
  monthGrid: async (...a: any[]) => { h.gridCalls.push(a); return { room_key: a[1], tracked: true, total: 3, days: [] }; },
  setUnits: async (...a: any[]) => { h.setCalls.push(a); return 3; },
}));

import { GET, PUT } from '@/app/api/partner/availability/route';

const URL_BASE = 'http://x/api/partner/availability';
const get = (q = '') => GET(new Request(`${URL_BASE}${q}`));
const put = (body: any) => PUT(new Request(URL_BASE, { method: 'PUT', body: typeof body === 'string' ? body : JSON.stringify(body) }));
const range = (over: Record<string, any> = {}) => ({ property_id: OWN, room_key: 'Standard', from: '2099-10-20', to: '2099-10-22', units: 0, ...over });

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  Object.assign(h, { role: 'partner', status: 'verified', setCalls: [], gridCalls: [] });
});

describe('GET /api/partner/availability', () => {
  it('lists only the caller\'s properties, without owner ids', async () => {
    const body = await (await get()).json();
    expect(body.properties).toEqual([{ id: OWN, name: 'Own Hotel', rooms: h.props[OWN].rooms }]);
  });
  it('returns the month grid for an own property', async () => {
    const res = await get(`?property_id=${OWN}&room_key=Standard&month=2099-10`);
    expect(res.status).toBe(200);
    expect((await res.json()).grid.room_key).toBe('Standard');
    expect(h.gridCalls).toEqual([[OWN, 'Standard', '2099-10']]);
  });
  it('returns the property alone when no room is chosen', async () => {
    const body = await (await get(`?property_id=${OWN}`)).json();
    expect(body).toEqual({ property: { id: OWN, name: 'Own Hotel', rooms: h.props[OWN].rooms } });
  });
  it('hides another owner\'s property (404) and never reads its grid', async () => {
    expect((await get(`?property_id=${OTHER}&room_key=Standard&month=2099-10`)).status).toBe(404);
    expect(h.gridCalls).toEqual([]);
  });
  it('rejects a bad month, unknown room or bad id with 400', async () => {
    expect((await get(`?property_id=${OWN}&room_key=Standard&month=2099-13`)).status).toBe(400);
    expect((await get(`?property_id=${OWN}&room_key=Penthouse&month=2099-10`)).status).toBe(400);
    expect((await get('?property_id=nope')).status).toBe(400);
  });
  it('blocks non-partners and suspended or rejected partners', async () => {
    h.role = 'customer';
    expect((await get()).status).toBe(403);
    h.role = 'partner';
    for (const s of ['suspended', 'rejected']) { h.status = s; expect((await get()).status).toBe(403); }
  });
});

describe('PUT /api/partner/availability', () => {
  it('saves a range for an own property', async () => {
    const res = await put(range());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, days: 3 });
    expect(h.setCalls).toEqual([[OWN, 'Standard', '2099-10-20', '2099-10-22', 0, 'user-p1']]);
  });
  it('refuses another owner\'s property with 404', async () => {
    expect((await put(range({ property_id: OTHER }))).status).toBe(404);
    expect(h.setCalls).toEqual([]);
  });
  it('validates the range', async () => {
    for (const over of [{ units: 1000 }, { units: -1 }, { from: '2001-01-01' }, { room_key: 'Penthouse' }, { to: '2099-10-19' }]) {
      expect((await put(range(over))).status).toBe(400);
    }
    expect((await put('not json')).status).toBe(400);
    expect((await put({ room_key: 'Standard' })).status).toBe(400);
    expect(h.setCalls).toEqual([]);
  });
  it('refuses a room type without a room count with 409', async () => {
    const res = await put(range({ room_key: 'Dorm' }));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/no room count/);
    expect(h.setCalls).toEqual([]);
  });
  it('blocks suspended partners before writing', async () => {
    h.status = 'suspended';
    expect((await put(range())).status).toBe(403);
    expect(h.setCalls).toEqual([]);
  });
});
