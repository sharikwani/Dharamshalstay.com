// tests/wa-chat/offer-tools.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const h = vi.hoisted(() => ({ offer: null as any, issued: null as any, issueCalls: [] as any[], code: null as any, offerById: null as any, active: [] as any, booking: null as any }));
vi.mock('@/lib/wa-chat/find', () => ({
  findHotel: async (n: string) => (n.toLowerCase().includes('panch') ? { id: 'h1', name: 'Panchvati Cottages', slug: 'panchvati-cottages' } : null),
}));
vi.mock('@/lib/offers/store', () => ({
  offerFor: async () => h.offer,
  issueCode: async (...a: any[]) => { h.issueCalls.push(a); return h.issued; },
  findCode: async (c: string) => (h.code && h.code.code === c ? h.code : null),
  settle: async (c: any) => ({ code: c, booking: h.booking }),
  getOffer: async () => h.offerById,
  activeOffers: async () => { if (h.active === 'throw') throw new Error('db down'); return h.active; },
}));

import { getOfferCode, offerForBooking, offerNotes, OFFER_TOOL_DEF } from '@/lib/wa-chat/offer-tools';

const OFFER = { id: 'o1', property_id: 'h1', name: 'Panchvati', active: true, default_percent: 20, plan_percents: { 'Deluxe|Breakfast': 25 }, valid_hours: 3, code_prefix: 'PNV' };
const ctx = () => ({ conversationId: 'c1', phone: '919800000001', profileName: 'Asha', handedOver: false });
const code = (over: any = {}) => ({
  id: 'k1', offer_id: 'o1', code: 'PNV-7K3Q9', phone: '919800000001', conversation_id: 'c1', percent: 25, issued_at: '2026-10-13T10:00:00Z',
  expires_at: new Date(Date.now() + 3 * 3600e3 - 60e3).toISOString(), booking_id: null, booked_percent: null, status: 'issued',
  redeemed_at: null, redeemed_by: null, notes: null, ...over,
});

beforeEach(() => {
  Object.assign(h, { offer: OFFER, issued: { ok: true, code: code(), reused: false }, issueCalls: [], code: code(), offerById: OFFER, active: [OFFER], booking: null });
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test');
});
afterEach(() => vi.unstubAllEnvs());

describe('get_offer_code', () => {
  it('takes only a hotel name', () => {
    expect(OFFER_TOOL_DEF.function.name).toBe('get_offer_code');
    expect(OFFER_TOOL_DEF.function.parameters.required).toEqual(['hotel_name']);
    expect(Object.keys(OFFER_TOOL_DEF.function.parameters.properties)).toEqual(['hotel_name']);
  });
  it('issues the code to the chat phone and explains the rules', async () => {
    const r: any = await getOfferCode({ hotel_name: 'Panchvati' }, ctx());
    expect(h.issueCalls[0]).toEqual(['o1', '919800000001', 'c1']);
    expect(r).toMatchObject({ hotel: 'Panchvati Cottages', code: 'PNV-7K3Q9', up_to_percent: 25 });
    expect(r.expires_at_india_time).toMatch(/\d{1,2}:\d{2}/);
    expect(r.rules).toMatch(/pay online in full/);
    expect(r.rules).toMatch(/Not valid with pay later/);
  });
  it('records a side effect only when a new code is issued', async () => {
    const c1: any = ctx();
    await getOfferCode({ hotel_name: 'Panchvati' }, c1);
    expect(c1.sideEffects).toEqual(['get_offer_code']);
    h.issued = { ok: true, code: code(), reused: true };
    const c2: any = ctx();
    await getOfferCode({ hotel_name: 'Panchvati' }, c2);
    expect(c2.sideEffects ?? []).toEqual([]);
  });
  it('sends the customer to reception when online payment is off', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    const r: any = await getOfferCode({ hotel_name: 'Panchvati' }, ctx());
    expect(r.rules).toMatch(/reception/);
    expect(r.rules).not.toMatch(/pay online in full/);
  });
  it('says a reused code is already used when its booking is paid', async () => {
    h.issued = { ok: true, code: code({ status: 'booked', booking_id: 'b9' }), reused: true };
    h.booking = { id: 'b9', booking_ref: 'HTL-9', status: 'confirmed', payment_status: 'paid', created_at: new Date().toISOString(), guest_name: null, guest_phone: '919800000001' };
    const r: any = await getOfferCode({ hotel_name: 'Panchvati' }, ctx());
    expect(r.rules).toBe('Your code PNV-7K3Q9 is already used for booking HTL-9.');
  });
  it('points a reused code held by this phone’s unpaid booking to payment_link', async () => {
    h.issued = { ok: true, code: code({ status: 'booked', booking_id: 'b9' }), reused: true };
    h.booking = { id: 'b9', booking_ref: 'HTL-9', status: 'pending', payment_status: 'pending', created_at: new Date(Date.now() - 10 * 60e3).toISOString(), guest_name: null, guest_phone: '+91 98000 00001' };
    const r: any = await getOfferCode({ hotel_name: 'Panchvati' }, ctx());
    expect(r.rules).toMatch(/^Code PNV-7K3Q9 is held by your unpaid booking HTL-9\. Pay it with payment_link, or the code frees up in about 25 minutes/);
  });
  it('errors when the hotel has no offer or is unknown', async () => {
    h.offer = null;
    expect(await getOfferCode({ hotel_name: 'Panchvati' }, ctx())).toEqual({ error: 'This hotel has no WhatsApp offer right now.' });
    expect(((await getOfferCode({ hotel_name: 'Nowhere' }, ctx())) as any).error).toMatch(/not found/i);
    expect(h.issueCalls).toEqual([]);
  });
});

describe('offerForBooking', () => {
  const base = { code: 'pnv 7k3q9', phone: '+91 98000 00001', propertyId: 'h1', room: 'Deluxe', plan: 'Breakfast' };
  it('accepts the code typed loosely by its own customer and uses the plan percent', async () => {
    expect(await offerForBooking(base)).toMatchObject({ ok: true, codeId: 'k1', code: 'PNV-7K3Q9', percent: 25 });
    expect(await offerForBooking({ ...base, plan: 'Room Only' })).toMatchObject({ ok: true, percent: 20 });
  });
  it('never gives more than the code promised', async () => {
    h.offerById = { ...OFFER, plan_percents: { 'Deluxe|Breakfast': 40 } };
    expect(await offerForBooking(base)).toMatchObject({ percent: 25 });
  });
  it('still honours a code after the offer was switched off', async () => {
    h.offerById = { ...OFFER, active: false };
    expect(await offerForBooking(base)).toMatchObject({ ok: true });
  });
  it('rejects another phone, another hotel, expired, booked and used codes', async () => {
    expect(((await offerForBooking({ ...base, phone: '919811111111' })) as any).error).toMatch(/not found for this WhatsApp number/);
    expect(((await offerForBooking({ ...base, propertyId: 'h2' })) as any).error).toMatch(/different hotel/);
    h.code = code({ expires_at: '2020-01-01T00:00:00Z' });
    expect(((await offerForBooking(base)) as any).error).toMatch(/expired/);
    h.code = code({ status: 'booked', booking_id: 'b9' });
    expect(((await offerForBooking(base)) as any).error).toMatch(/already used/);
    h.code = code({ status: 'redeemed' });
    expect(((await offerForBooking(base)) as any).error).toMatch(/can no longer be used/);
  });
  it('tells the customer their own unpaid booking holds the code, with the minutes left (at least 1)', async () => {
    h.code = code({ status: 'booked', booking_id: 'b9' });
    h.booking = { id: 'b9', booking_ref: 'HTL-9', status: 'pending', payment_status: 'pending', created_at: new Date(Date.now() - 20 * 60e3).toISOString(), guest_name: null, guest_phone: '919800000001' };
    expect(((await offerForBooking(base)) as any).error).toBe(
      'Code PNV-7K3Q9 is held by your unpaid booking HTL-9. Pay it with payment_link, or the code frees up in about 15 minutes (35 minutes after that booking was made).');
    h.booking = { ...h.booking, created_at: new Date(Date.now() - 34.99 * 60e3).toISOString() };
    expect(((await offerForBooking(base)) as any).error).toMatch(/about 1 minutes/);
  });
  it('says which paid booking already used the code', async () => {
    h.code = code({ status: 'booked', booking_id: 'b9' });
    h.booking = { id: 'b9', booking_ref: 'HTL-9', status: 'confirmed', payment_status: 'paid', created_at: new Date().toISOString(), guest_name: null, guest_phone: '919800000001' };
    expect(((await offerForBooking(base)) as any).error).toBe('Your code PNV-7K3Q9 is already used for booking HTL-9.');
  });
});

describe('offerNotes', () => {
  it('maps hotels with an active offer to the up-to wording', async () => {
    expect(await offerNotes(['h1', 'h2'])).toEqual({ h1: 'Up to 25% off, only through this WhatsApp chat' });
    expect(await offerNotes([])).toEqual({});
  });
  it('never breaks hotel answers when the lookup fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.active = 'throw';
    expect(await offerNotes(['h1'])).toEqual({});
    spy.mockRestore();
  });
});
