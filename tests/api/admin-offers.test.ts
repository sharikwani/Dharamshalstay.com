// tests/api/admin-offers.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fake } from '../offers/fake-sb';

const h = vi.hoisted(() => ({
  role: 'admin', verify: [] as any[],
  checkResult: { valid: true, code: 'PNV-7K3Q9' } as any, redeemResult: { ok: true, result: { status: 'redeemed' } } as any, cancelResult: { ok: true } as any,
}));
vi.mock('@/lib/server-auth', async (orig) => {
  const real = await orig<any>();
  const m = await import('../offers/fake-sb');
  return {
    ...real,
    requireCaller: async (_req: Request, roles: string[]) => {
      if (!roles.includes(h.role)) throw new real.HttpError(403, 'You do not have access to this');
      return { user: { id: 'a1' }, profile: { id: 'a1', role: h.role } };
    },
    serviceClient: () => m.fake.client,
  };
});
vi.mock('@/lib/offers/verify', () => ({
  checkCode: async (...a: any[]) => { h.verify.push(['check', ...a]); return h.checkResult; },
  redeemCode: async (...a: any[]) => { h.verify.push(['redeem', ...a]); return h.redeemResult; },
  cancelCode: async (...a: any[]) => { h.verify.push(['cancel', ...a]); return h.cancelResult; },
}));

import { GET, POST } from '@/app/api/admin/offers/route';
import { PATCH } from '@/app/api/admin/offers/[id]/route';
import { POST as codesPost } from '@/app/api/admin/offers/codes/route';

const OFFER_ID = '22222222-2222-4222-8222-222222222222';
const PROP_ID = 'da442d47-cd48-41d5-a301-a1513999d9a8';
const ROOMS = [{ name: 'Super Deluxe', is_active: true, rate_plans: [{ name: 'Room Only', price: 4000 }, { name: 'Breakfast', price: 4500 }] }];
const json = (method: string, body?: unknown, url = 'http://x/api/admin/offers') =>
  new Request(url, { method, body: body === undefined ? undefined : JSON.stringify(body), headers: { Authorization: 'Bearer t' } });
const patch = (body: unknown) => PATCH(json('PATCH', body), { params: { id: OFFER_ID } });
const codes = (body: unknown) => codesPost(json('POST', body));

beforeEach(() => {
  fake.reset();
  h.role = 'admin'; h.verify = [];
  h.redeemResult = { ok: true, result: { status: 'redeemed' } };
  h.cancelResult = { ok: true };
});

describe('GET /api/admin/offers', () => {
  it('is admin only', async () => {
    h.role = 'partner';
    expect((await GET(json('GET'))).status).toBe(403);
  });
  it('lists offers with rooms and up-to percent, and codes with their state', async () => {
    fake.queue('offers', { data: [{ id: OFFER_ID, property_id: PROP_ID, name: 'Panchvati', active: true, default_percent: 20, plan_percents: { 'Super Deluxe|Breakfast': 25 }, valid_hours: 3, code_prefix: 'PNV', properties: { name: 'Panchvati Cottages', rooms: ROOMS } }] });
    fake.queue('properties', { data: [{ id: PROP_ID, name: 'Panchvati Cottages' }] });
    fake.queue('offer_codes', { data: [{ id: 'k1', code: 'PNV-7K3Q9', status: 'issued', expires_at: '2020-01-01T00:00:00Z', offers: { name: 'Panchvati' }, bookings: null }] });
    const res = await GET(json('GET', undefined, `http://x/api/admin/offers?status=expired&offer_id=${OFFER_ID}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.offers[0]).toMatchObject({ property_name: 'Panchvati Cottages', up_to: 25, rooms: [{ room: 'Super Deluxe', plans: ['Room Only', 'Breakfast'] }] });
    expect(body.offers[0]).not.toHaveProperty('properties');
    expect(body.codes[0]).toMatchObject({ code: 'PNV-7K3Q9', state: 'expired', offer_name: 'Panchvati', booking_ref: null });
    expect(body.properties).toEqual([{ id: PROP_ID, name: 'Panchvati Cottages' }]);
    expect(fake.ops('offer_codes', 'eq')).toEqual([['offer_id', OFFER_ID], ['status', 'issued']]);
    expect(fake.ops('offer_codes', 'lte')[0][0]).toBe('expires_at');
  });
});

describe('POST /api/admin/offers', () => {
  it('creates an inactive offer for an existing property', async () => {
    fake.queue('properties', { data: { id: PROP_ID, name: 'Panchvati Cottages' } });
    fake.queue('offers', { data: null }, { data: { id: OFFER_ID } });
    const res = await POST(json('POST', { property_id: PROP_ID, default_percent: 25, valid_hours: 3, code_prefix: 'PNV' }));
    expect(res.status).toBe(200);
    expect(fake.ops('offers', 'insert')[0][0]).toEqual({
      property_id: PROP_ID, default_percent: 25, valid_hours: 3, code_prefix: 'PNV', name: 'WhatsApp offer – Panchvati Cottages', active: false, plan_percents: {},
    });
  });
  it('a repeated Add within 10 minutes returns the inactive offer it just made', async () => {
    fake.queue('properties', { data: { id: PROP_ID, name: 'Panchvati Cottages' } });
    fake.queue('offers', { data: { id: OFFER_ID, property_id: PROP_ID, active: false } });
    const before = Date.now();
    const res = await POST(json('POST', { property_id: PROP_ID, default_percent: 25, valid_hours: 3, code_prefix: 'PNV' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ offer: { id: OFFER_ID, property_id: PROP_ID, active: false }, duplicate: true });
    expect(fake.ops('offers', 'insert')).toEqual([]);
    expect(fake.ops('offers', 'eq')).toEqual([['property_id', PROP_ID], ['active', false]]);
    const [[col, since]] = fake.ops('offers', 'gte') as [string, string][];
    expect(col).toBe('created_at');
    expect(before - Date.parse(since)).toBeGreaterThanOrEqual(10 * 60 * 1000 - 50);
    expect(before - Date.parse(since)).toBeLessThan(10 * 60 * 1000 + 1000);
  });
  it('rejects a bad percent or prefix', async () => {
    expect((await POST(json('POST', { property_id: PROP_ID, default_percent: 95, code_prefix: 'PNV' }))).status).toBe(400);
    expect((await POST(json('POST', { property_id: PROP_ID, default_percent: 25, code_prefix: 'pn1' }))).status).toBe(400);
    expect(fake.ops('offers', 'insert')).toEqual([]);
  });
  it('404s an unknown property', async () => {
    expect((await POST(json('POST', { property_id: PROP_ID, default_percent: 25, code_prefix: 'PNV' }))).status).toBe(404);
  });
});

describe('PATCH /api/admin/offers/[id]', () => {
  const existing = { id: OFFER_ID, property_id: PROP_ID, properties: { rooms: ROOMS } };
  it('is admin only', async () => {
    h.role = 'partner';
    expect((await patch({ active: false })).status).toBe(403);
  });
  it('saves percents per rate plan and the validity', async () => {
    fake.queue('offers', { data: existing }, { data: { id: OFFER_ID } });
    const res = await patch({ default_percent: 20, plan_percents: { 'Super Deluxe|Breakfast': 25 }, valid_hours: 3 });
    expect(res.status).toBe(200);
    const row = fake.ops('offers', 'update')[0][0] as any;
    expect(row).toMatchObject({ default_percent: 20, plan_percents: { 'Super Deluxe|Breakfast': 25 }, valid_hours: 3 });
    expect(typeof row.updated_at).toBe('string');
  });
  it('rejects a rate plan the hotel does not have', async () => {
    fake.queue('offers', { data: existing });
    const res = await patch({ plan_percents: { 'Suite|Breakfast': 25 } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Unknown room or rate plan: Suite|Breakfast');
    expect(fake.ops('offers', 'update')).toEqual([]);
  });
  it('rejects percents outside 1-90 and validity outside 1-168 hours', async () => {
    expect((await patch({ default_percent: 0 })).status).toBe(400);
    expect((await patch({ plan_percents: { 'Super Deluxe|Breakfast': 91 } })).status).toBe(400);
    expect((await patch({ valid_hours: 200 })).status).toBe(400);
    expect((await patch({ code_prefix: 'TOOLONG' })).status).toBe(400);
  });
  it('allows only one active offer per hotel', async () => {
    fake.queue('offers', { data: existing }, { data: [{ id: 'other' }] });
    const res = await patch({ active: true });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/Another offer is already on/);
    expect(fake.ops('offers', 'update')).toEqual([]);
  });
  it('turns an offer on when it is the only one', async () => {
    fake.queue('offers', { data: existing }, { data: [] }, { data: { id: OFFER_ID, active: true } });
    expect((await patch({ active: true })).status).toBe(200);
    expect(fake.ops('offers', 'neq')).toEqual([['id', OFFER_ID]]);
  });
  it('maps the database one-active guard to 409', async () => {
    fake.queue('offers', { data: existing }, { data: [] }, { error: { code: '23505', message: 'duplicate' } });
    expect((await patch({ active: true })).status).toBe(409);
  });
  it('404s an unknown offer', async () => {
    expect((await patch({ active: false })).status).toBe(404);
  });
});

describe('POST /api/admin/offers/codes', () => {
  it('is admin only', async () => {
    h.role = 'partner';
    expect((await codes({ action: 'check', code: 'PNV-7K3Q9' })).status).toBe(403);
    expect(h.verify).toEqual([]);
  });
  it('checks, marks used and cancels as the admin', async () => {
    const res = await codes({ action: 'check', code: 'pnv-7k3q9' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ result: h.checkResult });
    expect(h.verify[0]).toEqual(['check', 'pnv-7k3q9', { viewer: { id: 'a1', role: 'admin' } }]);
    await codes({ action: 'redeem', code: 'PNV-7K3Q9' });
    expect(h.verify[1]).toEqual(['redeem', 'PNV-7K3Q9', { id: 'a1', role: 'admin' }]);
    expect((await codes({ action: 'cancel', code: 'PNV-7K3Q9', notes: 'Duplicate' })).status).toBe(200);
    expect(h.verify[2]).toEqual(['cancel', 'PNV-7K3Q9', { id: 'a1', role: 'admin' }, 'Duplicate']);
  });
  it('passes a refusal on with its status', async () => {
    h.redeemResult = { ok: false, error: 'This code was already used', status: 409, result: { reason: 'already_used' } };
    const res = await codes({ action: 'redeem', code: 'PNV-7K3Q9' });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'This code was already used', result: { reason: 'already_used' } });
    h.cancelResult = { ok: false, error: 'Code not found', status: 404 };
    expect((await codes({ action: 'cancel', code: 'PNV-ZZZZZ' })).status).toBe(404);
  });
  it('rejects a bad request', async () => {
    expect((await codes({ action: 'delete', code: 'PNV-7K3Q9' })).status).toBe(400);
    expect((await codes({ action: 'check', code: 'X' })).status).toBe(400);
  });
});
