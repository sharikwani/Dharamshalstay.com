// tests/api/admin-availability.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const PID = '22222222-2222-4222-8222-222222222222';
const h = vi.hoisted(() => ({
  role: 'admin', setCalls: [] as any[], gridCalls: [] as any[],
  props: {
    '22222222-2222-4222-8222-222222222222': { id: '22222222-2222-4222-8222-222222222222', name: 'Someone Else Hotel', owner_id: 'p2', rooms: [{ key: 'Standard', tracked: true, total: 2 }] },
  } as Record<string, any>,
}));

vi.mock('@/lib/server-auth', async (orig) => {
  const actual = await orig<typeof import('@/lib/server-auth')>();
  return {
    ...actual,
    requireCaller: async (_req: Request, roles?: string[]) => {
      if (roles && !roles.includes(h.role)) throw new actual.HttpError(403, 'You do not have access to this');
      return { user: { id: 'admin-user' }, profile: { id: 'admin-1', role: h.role } };
    },
  };
});
vi.mock('@/lib/availability/store', () => ({
  loadProperty: async (id: string) => h.props[id] ?? null,
  ownedProperties: async () => [],
  monthGrid: async (...a: any[]) => { h.gridCalls.push(a); return { room_key: a[1], tracked: true, total: 2, days: [] }; },
  setUnits: async (...a: any[]) => { h.setCalls.push(a); return 1; },
}));

import { GET, PUT } from '@/app/api/admin/availability/route';

const URL_BASE = 'http://x/api/admin/availability';
const get = (q = '') => GET(new Request(`${URL_BASE}${q}`));
const put = (body: any) => PUT(new Request(URL_BASE, { method: 'PUT', body: JSON.stringify(body) }));

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  Object.assign(h, { role: 'admin', setCalls: [], gridCalls: [] });
});

describe('admin availability API', () => {
  it('reads any property\'s grid', async () => {
    const res = await get(`?property_id=${PID}&room_key=Standard&month=2099-10`);
    expect(res.status).toBe(200);
    expect(h.gridCalls).toEqual([[PID, 'Standard', '2099-10']]);
  });
  it('writes any property\'s calendar and records the admin as editor', async () => {
    const res = await put({ property_id: PID, room_key: 'Standard', from: '2099-10-20', to: '2099-10-20', units: 1 });
    expect(await res.json()).toEqual({ ok: true, days: 1 });
    expect(h.setCalls).toEqual([[PID, 'Standard', '2099-10-20', '2099-10-20', 1, 'admin-user']]);
  });
  it('requires a property id and a known property', async () => {
    expect((await get()).status).toBe(400);
    expect((await get('?property_id=33333333-3333-4333-8333-333333333333')).status).toBe(404);
  });
  it('is admin only', async () => {
    h.role = 'partner';
    expect((await get(`?property_id=${PID}`)).status).toBe(403);
    expect((await put({ property_id: PID, room_key: 'Standard', from: '2099-10-20', to: '2099-10-20', units: 1 })).status).toBe(403);
    expect(h.setCalls).toEqual([]);
  });
});
