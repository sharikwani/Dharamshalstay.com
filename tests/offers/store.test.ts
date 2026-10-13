// tests/offers/store.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fake } from './fake-sb';

vi.mock('@/lib/server-auth', async () => {
  const m = await import('./fake-sb');
  return { serviceClient: () => m.fake.client };
});

import { attachPaidOffer, claimCode, issueCode, offerFor, releaseCode, releaseForBooking, settle } from '@/lib/offers/store';

const OFFER = { id: 'o1', property_id: 'p1', name: 'Panchvati', active: true, default_percent: 20, plan_percents: { 'Deluxe|Breakfast': 25 }, valid_hours: 3, code_prefix: 'PNV' };
const code = (over: any = {}): any => ({
  id: 'c1', offer_id: 'o1', code: 'PNV-7K3Q9', phone: '919800000001', conversation_id: 'conv1', percent: 25, issued_at: '2026-10-13T10:00:00Z',
  expires_at: new Date(Date.now() + 3600e3).toISOString(), booking_id: null, booked_percent: null, status: 'issued', redeemed_at: null, redeemed_by: null, notes: null, ...over,
});
const bookingRow = (over: any = {}) => ({ id: 'b1', booking_ref: 'HTL-1', status: 'pending', payment_status: 'pending', created_at: new Date().toISOString(), guest_name: 'Asha', guest_phone: '9800000001', ...over });

beforeEach(() => fake.reset());
afterEach(() => vi.useRealTimers());

describe('offerFor', () => {
  it('asks for the active offer of the property', async () => {
    fake.queue('offers', { data: OFFER });
    expect(await offerFor('p1')).toEqual(OFFER);
    expect(fake.ops('offers', 'eq')).toEqual([['property_id', 'p1'], ['active', true]]);
  });
  it('is null when there is none', async () => {
    expect(await offerFor('p1')).toBeNull();
  });
});

describe('issueCode', () => {
  it('returns the unexpired code this phone already has', async () => {
    const existing = code();
    fake.queue('offers', { data: OFFER });
    fake.queue('offer_codes', { data: existing });
    expect(await issueCode('o1', '919800000001', 'conv1')).toEqual({ ok: true, code: existing, reused: true });
    expect(fake.ops('offer_codes', 'eq')).toEqual([['offer_id', 'o1'], ['phone', '919800000001']]);
    expect(fake.ops('offer_codes', 'in')).toEqual([['status', ['issued', 'booked']]]);
    expect(fake.ops('offer_codes', 'gt')[0][0]).toBe('expires_at');
    expect(fake.ops('offer_codes', 'insert')).toEqual([]);
  });
  it('creates a new code with the prefix, the max percent and the validity window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-13T10:00:00Z'));
    fake.queue('offers', { data: OFFER });
    fake.queue('offer_codes', { data: null }, { data: code() });
    expect(await issueCode('o1', '919800000001', 'conv1')).toMatchObject({ ok: true, reused: false });
    const row = fake.ops('offer_codes', 'insert')[0][0] as any;
    expect(row.code).toMatch(/^PNV-[ABCDEFGHJKLMNPQRSTUVWXYZ2-9]{5}$/);
    expect(row).toMatchObject({
      offer_id: 'o1', phone: '919800000001', conversation_id: 'conv1', percent: 25, status: 'issued',
      issued_at: '2026-10-13T10:00:00.000Z', expires_at: '2026-10-13T13:00:00.000Z',
    });
  });
  it('tries a new code when the random one is taken', async () => {
    fake.queue('offers', { data: OFFER });
    fake.queue('offer_codes', { data: null }, { error: { code: '23505', message: 'duplicate key' } }, { data: code() });
    expect((await issueCode('o1', '919800000001', 'conv1')).ok).toBe(true);
    expect(fake.ops('offer_codes', 'insert')).toHaveLength(2);
  });
  it('gives up after 5 taken codes and passes other errors on', async () => {
    fake.queue('offers', { data: OFFER });
    fake.queue('offer_codes', { data: null }, ...Array(5).fill({ error: { code: '23505' } }));
    await expect(issueCode('o1', '919800000001', 'conv1')).rejects.toThrow(/unique/);
    fake.reset();
    fake.queue('offers', { data: OFFER });
    fake.queue('offer_codes', { data: null }, { error: { code: '42P01', message: 'missing table' } });
    await expect(issueCode('o1', '919800000001', 'conv1')).rejects.toMatchObject({ code: '42P01' });
  });
  it('cancels its own new code and returns the oldest when two were issued at once', async () => {
    const oldest = code({ id: 'c0', code: 'PNV-OLDES' });
    const mine = code({ id: 'c2', code: 'PNV-NEWER' });
    fake.queue('offers', { data: OFFER });
    fake.queue('offer_codes', { data: null }, { data: mine }, { data: [oldest, mine] }, {});
    expect(await issueCode('o1', '919800000001', 'conv1')).toEqual({ ok: true, code: oldest, reused: true });
    expect(fake.ops('offer_codes', 'update')).toEqual([[{ status: 'cancelled', notes: 'duplicate' }]]);
    expect(fake.ops('offer_codes', 'eq')).toContainEqual(['id', 'c2']);
  });
  it('keeps its new code when it is the oldest active one', async () => {
    const mine = code();
    fake.queue('offers', { data: OFFER });
    fake.queue('offer_codes', { data: null }, { data: mine }, { data: [mine, code({ id: 'c9' })] });
    expect(await issueCode('o1', '919800000001', 'conv1')).toEqual({ ok: true, code: mine, reused: false });
    expect(fake.ops('offer_codes', 'update')).toEqual([]);
  });
  it('refuses when the offer is off', async () => {
    fake.queue('offers', { data: { ...OFFER, active: false } });
    expect(await issueCode('o1', '919800000001', 'conv1')).toEqual({ ok: false, error: 'This hotel has no WhatsApp offer right now.' });
    expect(fake.ops('offer_codes', 'insert')).toEqual([]);
  });
});

describe('claim and release', () => {
  it('claims only an issued, unexpired code', async () => {
    fake.queue('offer_codes', { data: [{ id: 'c1' }] }, { data: [] });
    expect(await claimCode('c1', 20)).toBe(true);
    expect(await claimCode('c1', 20)).toBe(false);
    expect(fake.ops('offer_codes', 'update')[0]).toEqual([{ status: 'booked', booked_percent: 20 }]);
    expect(fake.ops('offer_codes', 'eq')).toContainEqual(['status', 'issued']);
    expect(fake.ops('offer_codes', 'gt')[0][0]).toBe('expires_at');
  });
  it('releases only a booked code', async () => {
    await releaseCode('c1');
    expect(fake.ops('offer_codes', 'update')[0]).toEqual([{ status: 'issued', booking_id: null, booked_percent: null }]);
    expect(fake.ops('offer_codes', 'eq')).toEqual([['id', 'c1'], ['status', 'booked']]);
  });
  it('releases the code of a cancelled booking', async () => {
    await releaseForBooking('b1');
    expect(fake.ops('offer_codes', 'update')[0]).toEqual([{ status: 'issued', booking_id: null, booked_percent: null }]);
    expect(fake.ops('offer_codes', 'eq')).toEqual([['booking_id', 'b1'], ['status', 'booked']]);
  });
});

describe('settle', () => {
  it('releases a code whose booking was cancelled', async () => {
    fake.queue('bookings', { data: bookingRow({ status: 'cancelled' }) });
    const r = await settle(code({ status: 'booked', booking_id: 'b1', booked_percent: 20 }));
    expect(r.code).toMatchObject({ status: 'issued', booking_id: null, booked_percent: null });
    expect(r.booking).toBeNull();
    expect(fake.ops('offer_codes', 'update')).toHaveLength(1);
  });
  it('keeps a code whose booking is paid', async () => {
    const paid = bookingRow({ status: 'confirmed', payment_status: 'paid', created_at: '2026-01-01T00:00:00Z' });
    fake.queue('bookings', { data: paid });
    const r = await settle(code({ status: 'booked', booking_id: 'b1', booked_percent: 20 }));
    expect(r).toMatchObject({ code: { status: 'booked' }, booking: paid });
    expect(fake.ops('offer_codes', 'update')).toEqual([]);
  });
  it('does not look up a booking for a walk-in code', async () => {
    const r = await settle(code());
    expect(r).toMatchObject({ code: { status: 'issued' }, booking: null });
    expect(fake.calls.filter((c) => c.table === 'bookings')).toEqual([]);
  });
});

describe('attachPaidOffer', () => {
  it('does nothing for bookings without an offer', async () => {
    fake.queue('bookings', { data: { id: 'b1', offer_code: null, offer_percent: null } });
    expect(await attachPaidOffer('b1')).toBe('none');
  });
  it('re-attaches a released code to the paid booking', async () => {
    fake.queue('bookings', { data: { id: 'b1', offer_code: 'PNV-7K3Q9', offer_percent: 20 } });
    fake.queue('offer_codes', { data: { id: 'c1', status: 'issued', booking_id: null } }, { data: [{ id: 'c1' }] });
    expect(await attachPaidOffer('b1')).toBe('attached');
    expect(fake.ops('offer_codes', 'update')[0]).toEqual([{ status: 'booked', booking_id: 'b1', booked_percent: 20 }]);
  });
  it('leaves a code already on this booking alone', async () => {
    fake.queue('bookings', { data: { id: 'b1', offer_code: 'PNV-7K3Q9', offer_percent: 20 } });
    fake.queue('offer_codes', { data: { id: 'c1', status: 'booked', booking_id: 'b1' } });
    expect(await attachPaidOffer('b1')).toBe('attached');
    expect(fake.ops('offer_codes', 'update')).toEqual([]);
  });
  it('reports a conflict when the code was used or cancelled meanwhile', async () => {
    fake.queue('bookings', { data: { id: 'b1', offer_code: 'PNV-7K3Q9', offer_percent: 20 } });
    fake.queue('offer_codes', { data: { id: 'c1', status: 'redeemed', booking_id: null } });
    expect(await attachPaidOffer('b1')).toBe('conflict');
  });
});
