import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({ inserts: [] as any[], insertError: null as any, existing: null as any, lookups: [] as any[] }));

vi.mock('@/lib/server-auth', async (orig) => {
  const actual = await orig<typeof import('@/lib/server-auth')>();
  const sb = {
    from: () => ({
      insert: (row: any) => { h.inserts.push(row); return { select: () => ({ single: async () => (h.insertError ? { data: null, error: h.insertError } : { data: { id: 'v-new' }, error: null }) }) }; },
      select: () => ({ eq: (c: string, v: string) => ({ maybeSingle: async () => { h.lookups.push([c, v]); return { data: h.existing, error: null }; } }) }),
    }),
  };
  return { ...actual, serviceClient: () => sb };
});
vi.mock('@/lib/partners/load', () => ({
  requireActivityPartner: async () => ({ user: {}, profile: { id: 'p1', partner_type: 'taxi', partner_status: 'onboarding' } }),
}));

import { POST } from '@/app/api/partner/vehicles/route';

const post = () => POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ vehicle_type: 'sedan', make_model: 'Swift Dzire', registration_no: 'hp39a1234', seats: 4 }) }));

beforeEach(() => { h.inserts = []; h.insertError = null; h.existing = null; h.lookups = []; });

describe('POST /api/partner/vehicles', () => {
  it('adds a vehicle', async () => {
    const res = await post();
    expect(await res.json()).toEqual({ ok: true, id: 'v-new' });
    expect(h.inserts[0]).toMatchObject({ registration_no: 'HP39A1234', partner_id: 'p1' });
  });

  it('a repeated add of the caller\'s own vehicle returns that vehicle as success', async () => {
    h.insertError = { code: '23505', message: 'duplicate key' };
    h.existing = { id: 'v-old', partner_id: 'p1' };
    const res = await post();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, id: 'v-old', duplicate: true });
    expect(h.lookups).toEqual([['registration_no', 'HP39A1234']]);
  });

  it('a number registered by someone else keeps the 409', async () => {
    h.insertError = { code: '23505', message: 'duplicate key' };
    h.existing = { id: 'v-other', partner_id: 'p2' };
    const res = await post();
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('This vehicle number is already registered with us.');
    expect(JSON.stringify(body)).not.toContain('v-other');
  });
});
