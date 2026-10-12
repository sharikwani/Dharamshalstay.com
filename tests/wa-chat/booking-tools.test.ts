// tests/wa-chat/booking-tools.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const HOTEL_ID = '11111111-1111-4111-8111-111111111111';
const TREK_ID = '22222222-2222-4222-8222-222222222222';
const h = vi.hoisted(() => ({
  quotes: [] as any[], quote: null as any, claimed: true, spoke: true, own: [] as any[], created: [] as any[], createResult: null as any,
  checkout: { ok: true, url: 'https://pay/x', sessionId: 's' } as any, released: [] as any[], linked: [] as any[], updates: [] as any[], emails: [] as any[], handovers: [] as any[], commission: 0,
}));
vi.mock('@/lib/wa-chat/find', () => ({
  findHotel: async (n: string) => n.toLowerCase().includes('pine') ? {
    id: '11111111-1111-4111-8111-111111111111', name: 'Pine View', slug: 'pine-view', price_min: 2000,
    rooms: [{ name: 'Deluxe', base_price: 2500, is_active: true, rate_plans: [{ name: 'Room Only', price: 2500 }, { name: 'Breakfast', price: 3000 }] }],
  } : null,
}));
vi.mock('@/lib/db', () => ({
  getPublishedTreks: async () => [{ id: '22222222-2222-4222-8222-222222222222', slug: 'triund-trek', name: 'Triund Trek', price_per_person: 1500 }],
  getParaglidingPackages: async () => [],
  getActiveTaxiRoutes: async () => [
    { id: '33333333-3333-4333-8333-333333333333', from_location: 'Dharamshala', to_location: 'McLeod Ganj', vehicle_name: 'Sedan', vehicle_category: 'sedan', price: 500 },
    { id: '44444444-4444-4444-8444-444444444444', from_location: 'Dharamshala', to_location: 'McLeod Ganj', vehicle_name: 'SUV', vehicle_category: 'suv', price: 900 },
  ],
}));
vi.mock('@/lib/wa-chat/booking-store', () => ({
  saveQuote: async (q: any) => { const row = { id: 'q1', created_at: '2026-10-13T10:00:00Z', expires_at: new Date(Date.now() + 60e3).toISOString(), used_at: null, used_booking_id: null, ...q }; h.quotes.push(row); return row; },
  getQuote: async () => h.quote,
  claimQuote: async () => h.claimed,
  releaseQuote: async (id: string) => { h.released.push(id); },
  linkQuoteBooking: async (...a: any[]) => { h.linked.push(a); },
  customerSpokeSince: async () => h.spoke,
  ownBookings: async () => h.own,
  findOwnBooking: async (_p: string, ref: string) => h.own.find((b) => b.booking_ref === ref.toUpperCase()) ?? null,
}));
vi.mock('@/lib/bookings/create', async (orig) => {
  const actual = await orig<typeof import('@/lib/bookings/create')>();
  return { ...actual, createBooking: async (d: any, o: any) => { h.created.push([d, o]); return h.createResult; } };
});
vi.mock('@/lib/bookings/checkout', () => ({ createCheckoutLink: async () => { if (h.checkout === 'throw') throw new Error('stripe down'); return h.checkout; } }));
vi.mock('@/lib/booking-emails', () => ({ sendBookingEmails: async (id: string) => { h.emails.push(id); } }));
vi.mock('@/lib/server-auth', () => ({ serviceClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { commission_amount: h.commission } }) }) }), update: (row: any) => ({ eq: async () => { h.updates.push(row); return { error: null }; } }) }) }) }));

import { runBookingTool } from '@/lib/wa-chat/booking-tools';

const ctx = () => ({ conversationId: 'c1', phone: '919800000001', profileName: 'Asha', handedOver: false });
const handover = async (a: any, c: any) => { c.handedOver = true; h.handovers.push(a.reason); return { ok: true }; };
const run = (name: string, a: any, c = ctx()) => runBookingTool(name, a, c, handover) as Promise<any>;
const goodQuote = (over: any = {}) => ({
  id: 'q1', conversation_id: 'c1', category: 'trek', amount: 3000, summary: 'Triund', created_at: '2026-10-13T10:00:00Z',
  expires_at: new Date(Date.now() + 60e3).toISOString(), used_at: null, used_booking_id: null,
  input: { category: 'trek', trek_id: TREK_ID, activity_date: '2099-10-24', num_guests: 2 }, ...over,
});

beforeEach(() => {
  Object.assign(h, { quotes: [], quote: goodQuote(), claimed: true, spoke: true, own: [], created: [], released: [], linked: [], updates: [], emails: [], handovers: [], commission: 0,
    createResult: { ok: true, booking: { id: 'b1', booking_ref: 'TRK-9' }, amount: 3000, payment_method: 'offline' },
    checkout: { ok: true, url: 'https://pay/x', sessionId: 's' } });
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test');
});
afterEach(() => vi.unstubAllEnvs());

describe('quote_booking', () => {
  it('prices a trek from the database row and saves the quote', async () => {
    const r = await run('quote_booking', { category: 'trek', name: 'triund', date: '2099-10-24', guests: 2 });
    expect(r).toMatchObject({ quote_id: 'q1', amount: 3000, online_payment_available: true });
    expect(h.quotes[0]).toMatchObject({ conversation_id: 'c1', category: 'trek', amount: 3000, input: { category: 'trek', trek_id: TREK_ID, activity_date: '2099-10-24', num_guests: 2 } });
  });
  it('prices a hotel room and plan by name', async () => {
    const r = await run('quote_booking', { category: 'hotel', name: 'Pine View', check_in: '2099-10-24', check_out: '2099-10-26', guests: 2, room_name: 'deluxe', plan_name: 'breakfast' });
    expect(r.amount).toBe(6000);
    expect(h.quotes[0].input).toMatchObject({ property_id: HOTEL_ID, room_name: 'Deluxe', plan_name: 'Breakfast', plan_index: 1 });
  });
  it('asks for a room when the hotel has rooms', async () => {
    const r = await run('quote_booking', { category: 'hotel', name: 'Pine View', check_in: '2099-10-24', check_out: '2099-10-26', guests: 2 });
    expect(r.error).toMatch(/room/i);
    expect(r.rooms).toEqual(['Deluxe']);
  });
  it('asks which vehicle when a taxi route has several', async () => {
    const r = await run('quote_booking', { category: 'taxi', from: 'dharamshala', to: 'mcleod', date: '2099-10-24', guests: 2 });
    expect(r.vehicles).toEqual(['Sedan', 'SUV']);
    const ok = await run('quote_booking', { category: 'taxi', from: 'dharamshala', to: 'mcleod', vehicle: 'suv', date: '2099-10-24', pickup_time: '09:00', guests: 2 });
    expect(ok.amount).toBe(900);
    expect(h.quotes[0].input).toMatchObject({ taxi_route_id: '44444444-4444-4444-8444-444444444444', vehicle_type: 'SUV', pickup_time: '09:00' });
  });
  it('rejects past dates and unknown items', async () => {
    expect((await run('quote_booking', { category: 'trek', name: 'triund', date: '2001-01-01', guests: 2 })).error).toMatch(/past/);
    expect((await run('quote_booking', { category: 'trek', name: 'everest', date: '2099-10-24', guests: 2 })).error).toMatch(/not found/i);
  });
});

describe('create_booking', () => {
  it('books a confirmed quote with the chat phone and pay-later method', async () => {
    const r = await run('create_booking', { quote_id: 'q1', payment: 'later', guest_name: 'Asha Rao' });
    expect(r).toMatchObject({ booking_ref: 'TRK-9', status: 'requested', payment: 'later', amount: 3000 });
    const [data, opts] = h.created[0];
    expect(data).toMatchObject({ category: 'trek', guest_phone: '919800000001', guest_name: 'Asha Rao', payment_method: 'offline', booking_source: 'whatsapp', trek_id: TREK_ID });
    expect(opts).toEqual({ userId: null, callerRole: null });
    expect(h.linked[0]).toEqual(['q1', 'b1']);
  });
  it('uses pay_at_hotel for hotels', async () => {
    h.quote = goodQuote({ category: 'hotel', input: { category: 'hotel', property_id: HOTEL_ID, check_in: '2099-10-24', check_out: '2099-10-26', num_guests: 2, room_name: 'Deluxe' } });
    await run('create_booking', { quote_id: 'q1', payment: 'later', guest_name: 'Asha' });
    expect(h.created[0][0].payment_method).toBe('pay_at_hotel');
  });
  it('refuses when the customer has not replied since the quote (same-turn yes)', async () => {
    h.spoke = false;
    expect((await run('create_booking', { quote_id: 'q1', payment: 'later', guest_name: 'Asha' })).error).toMatch(/reply/i);
    expect(h.created).toEqual([]);
  });
  it('refuses another conversation\'s, expired or already-used quotes', async () => {
    h.quote = goodQuote({ conversation_id: 'other' });
    expect((await run('create_booking', { quote_id: 'q1', payment: 'later', guest_name: 'Asha' })).error).toMatch(/not found/i);
    h.quote = goodQuote({ expires_at: '2000-01-01T00:00:00Z' });
    expect((await run('create_booking', { quote_id: 'q1', payment: 'later', guest_name: 'Asha' })).error).toMatch(/expired/i);
    h.quote = goodQuote(); h.claimed = false;
    expect((await run('create_booking', { quote_id: 'q1', payment: 'later', guest_name: 'Asha' })).error).toMatch(/already/i);
    expect(h.created).toEqual([]);
  });
  it('hands over after 3 WhatsApp bookings in 24 hours', async () => {
    const recent = new Date().toISOString();
    h.own = [1, 2, 3].map((i) => ({ booking_ref: `T-${i}`, booking_source: 'whatsapp', created_at: recent }));
    const c = ctx();
    const r = await run('create_booking', { quote_id: 'q1', payment: 'later', guest_name: 'Asha' }, c);
    expect(r).toMatchObject({ handed_over: true });
    expect(c.handedOver).toBe(true);
    expect(h.created).toEqual([]);
  });
  it('releases the quote when booking fails', async () => {
    h.createResult = { ok: false, error: 'Activity date cannot be in the past', status: 400 };
    const r = await run('create_booking', { quote_id: 'q1', payment: 'later', guest_name: 'Asha' });
    expect(r.error).toMatch(/past/);
    expect(h.released).toEqual(['q1']);
  });
  it('returns a Stripe link for online payment', async () => {
    h.createResult = { ...h.createResult, payment_method: 'online' };
    const r = await run('create_booking', { quote_id: 'q1', payment: 'online', guest_name: 'Asha' });
    expect(r).toMatchObject({ payment: 'online', payment_url: 'https://pay/x' });
    expect(h.created[0][0].payment_method).toBe('online');
  });
  it('falls back to pay later and sends booking emails when the link fails', async () => {
    h.createResult = { ...h.createResult, payment_method: 'online' };
    h.checkout = { ok: false, error: 'Stripe down', status: 500 };
    const r = await run('create_booking', { quote_id: 'q1', payment: 'online', guest_name: 'Asha' });
    expect(r).toMatchObject({ payment: 'later', payment_link_failed: true });
    expect(h.updates[0]).toEqual({ payment_method: 'offline' });
    expect(h.emails).toEqual(['b1']);
  });
  it('marks commission pending in the fallback when the booking has commission', async () => {
    h.createResult = { ...h.createResult, payment_method: 'online' };
    h.checkout = { ok: false, error: 'Stripe down', status: 500 };
    h.commission = 300;
    await run('create_booking', { quote_id: 'q1', payment: 'online', guest_name: 'Asha' });
    expect(h.updates[0]).toEqual({ payment_method: 'offline', commission_status: 'pending' });
  });
  it('falls back the same way when the checkout call throws', async () => {
    h.createResult = { ...h.createResult, payment_method: 'online' };
    h.checkout = 'throw';
    h.commission = 300;
    const r = await run('create_booking', { quote_id: 'q1', payment: 'online', guest_name: 'Asha' });
    expect(r).toMatchObject({ payment: 'later', payment_link_failed: true });
    expect(h.updates[0]).toEqual({ payment_method: 'offline', commission_status: 'pending' });
    expect(h.emails).toEqual(['b1']);
  });
  it('payment_link returns an error when checkout throws', async () => {
    h.own = [{ id: 'b1', booking_ref: 'TRK-9', status: 'pending', payment_status: 'pending' }];
    h.checkout = 'throw';
    expect((await run('payment_link', { booking_ref: 'TRK-9' })).error).toMatch(/payment link/i);
  });
});

describe('payment_link and my_bookings', () => {
  it('gives a link only for own unpaid bookings', async () => {
    h.own = [{ id: 'b1', booking_ref: 'TRK-9', status: 'pending', payment_status: 'pending' }];
    expect(await run('payment_link', { booking_ref: 'trk-9' })).toEqual({ booking_ref: 'TRK-9', payment_url: 'https://pay/x' });
    expect((await run('payment_link', { booking_ref: 'TRK-1' })).error).toMatch(/not found/i);
    h.own[0].payment_status = 'paid';
    expect((await run('payment_link', { booking_ref: 'TRK-9' })).error).toMatch(/already paid/i);
  });
  it('lists up to 5 own bookings with plain status words', async () => {
    h.own = Array.from({ length: 7 }, (_, i) => ({ booking_ref: `T-${i}`, category: 'trek', status: i ? 'confirmed' : 'pending', payment_status: 'pending', amount: 100, activity_date: '2099-10-24', num_guests: 1 }));
    const r = await run('my_bookings', {});
    expect(r.bookings).toHaveLength(5);
    expect(r.bookings[0]).toMatchObject({ ref: 'T-0', status: 'requested, waiting for confirmation' });
    expect(r.bookings[1].status).toBe('confirmed by the property/operator');
  });
  it('returns null for tools it does not own', async () => {
    expect(await run('search_hotels', {})).toBeNull();
  });
});
