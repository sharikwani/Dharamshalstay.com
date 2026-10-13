// tests/offers/verify.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fake } from './fake-sb';

const h = vi.hoisted(() => ({ code: null as any, booking: null as any }));
vi.mock('@/lib/server-auth', async (orig) => {
  const real = await orig<any>();
  const m = await import('./fake-sb');
  return { ...real, serviceClient: () => m.fake.client };
});
vi.mock('@/lib/offers/store', () => ({
  findCode: async (c: string) => (h.code && h.code.code === c ? h.code : null),
  settle: async (c: any) => ({ code: c, booking: h.booking }),
}));

import { cancelCode, checkCode, redeemCode } from '@/lib/offers/verify';

const ADMIN = { id: 'a1', role: 'admin' as const };
const OWNER = { id: 'p1', role: 'partner' as const };
const OTHER = { id: 'p2', role: 'partner' as const };
const issued = (over: any = {}) => ({
  id: 'c1', offer_id: 'o1', code: 'PNV-7K3Q9', phone: '919800000001', conversation_id: 'conv1', percent: 25, issued_at: '2026-10-13T10:00:00Z',
  expires_at: new Date(Date.now() + 3600e3).toISOString(), booking_id: null, booked_percent: null, status: 'issued', redeemed_at: null, redeemed_by: null, notes: null, ...over,
});
const PAID = { id: 'b1', booking_ref: 'HTL-7', status: 'confirmed', payment_status: 'paid', created_at: '2026-10-13T10:00:00Z', guest_name: 'Asha Rao', guest_phone: '9800000001' };
function world() {
  fake.queue('offers', { data: { id: 'o1', property_id: 'h1', default_percent: 20, plan_percents: { 'Deluxe|Breakfast': 30, 'Deluxe|Room Only': 15 } } });
  fake.queue('properties', { data: { id: 'h1', name: 'Panchvati Cottages', owner_id: 'p1' } });
  fake.queue('whatsapp_conversations', { data: { profile_name: 'Asha' } });
}

beforeEach(() => { fake.reset(); h.code = issued(); h.booking = null; });

describe('checkCode', () => {
  it('shows a walk-in coupon to the hotel owner and logs the check', async () => {
    world();
    const r = await checkCode(' pnv 7k3q9 ', { viewer: OWNER });
    expect(r).toMatchObject({
      valid: true, reason: null, path: 'walk_in', percent: 25, default_percent: 20, code: 'PNV-7K3Q9',
      property_name: 'Panchvati Cottages', guest: { name: 'Asha', phone: '919800000001' }, booking_ref: null,
    });
    expect(r.plan_percents).toEqual({ 'Deluxe|Breakfast': 25, 'Deluxe|Room Only': 15 });
    expect(fake.ops('offer_code_checks', 'insert')).toEqual([[{ code_id: 'c1', code_entered: 'PNV-7K3Q9', checked_by: 'p1', result: 'valid' }]]);
  });
  it('says not found to a partner of another hotel and logs it', async () => {
    world();
    const r = await checkCode('PNV-7K3Q9', { viewer: OTHER });
    expect(r).toMatchObject({ valid: false, reason: 'not_found', guest: null, property_name: null, percent: null });
    expect(fake.ops('offer_code_checks', 'insert')[0][0]).toMatchObject({ code_id: null, checked_by: 'p2', result: 'not_found' });
  });
  it('lets the admin check any hotel', async () => {
    world();
    expect((await checkCode('PNV-7K3Q9', { viewer: ADMIN })).valid).toBe(true);
  });
  it('reports expired walk-in codes', async () => {
    h.code = issued({ expires_at: '2020-01-01T00:00:00Z' });
    world();
    expect(await checkCode('PNV-7K3Q9', { viewer: OWNER })).toMatchObject({ valid: false, reason: 'expired' });
  });
  it('shows a paid booking with its booked percent and no time limit', async () => {
    h.code = issued({ status: 'booked', booking_id: 'b1', booked_percent: 20, expires_at: '2020-01-01T00:00:00Z' });
    h.booking = PAID;
    world();
    expect(await checkCode('PNV-7K3Q9', { viewer: OWNER })).toMatchObject({
      valid: true, path: 'paid_booking', percent: 20, booking_ref: 'HTL-7', plan_percents: null, default_percent: null,
      guest: { name: 'Asha Rao', phone: '9800000001' },
    });
  });
  it('blocks a partner after 30 wrong codes in an hour, but never the admin', async () => {
    fake.queue('offer_code_checks', { count: 30 });
    await expect(checkCode('PNV-AAAAA', { viewer: OWNER })).rejects.toMatchObject({ status: 429 });
    expect(fake.ops('offer_code_checks', 'eq')).toEqual([['checked_by', 'p1'], ['result', 'not_found']]);
    fake.reset();
    fake.queue('offer_code_checks', { count: 99 });
    expect((await checkCode('PNV-AAAAA', { viewer: ADMIN })).reason).toBe('not_found');
  });
});

describe('redeemCode', () => {
  it('marks a valid walk-in code used, only while it is still issued and unexpired', async () => {
    world();
    fake.queue('offer_codes', { data: [{ id: 'c1' }] });
    const r = await redeemCode('pnv-7k3q9', OWNER);
    expect(r).toMatchObject({ ok: true, result: { status: 'redeemed', reason: 'already_used', valid: false } });
    expect(fake.ops('offer_codes', 'update')[0][0]).toMatchObject({ status: 'redeemed', redeemed_by: 'p1' });
    expect(fake.ops('offer_codes', 'eq')).toEqual([['id', 'c1'], ['status', 'issued']]);
    expect(fake.ops('offer_codes', 'gt')[0][0]).toBe('expires_at');
    expect(fake.ops('offer_code_checks', 'insert')[0][0]).toMatchObject({ result: 'redeemed' });
  });
  it('loses the race cleanly when someone else used it first', async () => {
    world();
    fake.queue('offer_codes', { data: [] });
    expect(await redeemCode('PNV-7K3Q9', OWNER)).toEqual({ ok: false, error: 'This code was just used or changed. Check it again.', status: 409 });
  });
  it('refuses a code that was already used', async () => {
    h.code = issued({ status: 'redeemed', redeemed_at: '2026-10-13T11:00:00Z' });
    world();
    expect(await redeemCode('PNV-7K3Q9', OWNER)).toMatchObject({ ok: false, status: 409, error: 'This code was already used' });
    expect(fake.ops('offer_codes', 'update')).toEqual([]);
  });
  it('refuses a booked code whose booking is not paid', async () => {
    h.code = issued({ status: 'booked', booking_id: 'b1', booked_percent: 20 });
    h.booking = { ...PAID, payment_status: 'pending', status: 'pending' };
    world();
    expect(await redeemCode('PNV-7K3Q9', OWNER)).toMatchObject({ ok: false, status: 409, error: 'This code is linked to a booking that is not paid yet' });
  });
  it('marks a paid booking code used while it is still booked', async () => {
    h.code = issued({ status: 'booked', booking_id: 'b1', booked_percent: 20 });
    h.booking = PAID;
    world();
    fake.queue('offer_codes', { data: [{ id: 'c1' }] });
    expect((await redeemCode('PNV-7K3Q9', OWNER)).ok).toBe(true);
    expect(fake.ops('offer_codes', 'eq')).toEqual([['id', 'c1'], ['status', 'booked'], ['booking_id', 'b1']]);
  });
  it('is not found for a partner of another hotel', async () => {
    world();
    expect(await redeemCode('PNV-7K3Q9', OTHER)).toEqual({ ok: false, error: 'Code not found', status: 404 });
    expect(fake.ops('offer_codes', 'update')).toEqual([]);
  });
});

describe('cancelCode', () => {
  it('is admin only', async () => {
    await expect(cancelCode('PNV-7K3Q9', OWNER)).rejects.toMatchObject({ status: 403 });
  });
  it('cancels an issued or booked code with a note', async () => {
    fake.queue('offer_codes', { data: [{ id: 'c1' }] });
    expect(await cancelCode('pnv-7k3q9', ADMIN, ' Asked twice ')).toEqual({ ok: true });
    expect(fake.ops('offer_codes', 'update')[0]).toEqual([{ status: 'cancelled', notes: 'Asked twice' }]);
    expect(fake.ops('offer_codes', 'in')).toEqual([['status', ['issued', 'booked']]]);
  });
  it('refuses unknown and finished codes', async () => {
    expect(await cancelCode('PNV-ZZZZZ', ADMIN)).toEqual({ ok: false, error: 'Code not found', status: 404 });
    fake.queue('offer_codes', { data: [] });
    expect(await cancelCode('PNV-7K3Q9', ADMIN)).toEqual({ ok: false, error: 'Only issued or booked codes can be cancelled', status: 409 });
  });
});
