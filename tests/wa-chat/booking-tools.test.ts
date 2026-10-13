// tests/wa-chat/booking-tools.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const HOTEL_ID = '11111111-1111-4111-8111-111111111111';
const TREK_ID = '22222222-2222-4222-8222-222222222222';
const h = vi.hoisted(() => ({
  quotes: [] as any[], quote: null as any, claimed: true, claimCalls: [] as any[], confirmed: true, useSaved: false, own: [] as any[], confirmCalls: [] as any[], created: [] as any[], createResult: null as any,
  avail: {} as any, availCalls: [] as any[],
  checkout: { ok: true, url: 'https://pay/x', sessionId: 's' } as any, switchRows: [{ id: 'b1' }] as any[], released: [] as any[], linked: [] as any[], updates: [] as any[], emails: [] as any[], handovers: [] as any[], commission: 0,
}));
vi.mock('@/lib/wa-chat/find', () => ({
  findHotel: async (n: string) => n.toLowerCase().includes('pine') ? {
    id: '11111111-1111-4111-8111-111111111111', name: 'Pine View', slug: 'pine-view', price_min: 2000,
    rooms: [{ name: 'Deluxe', base_price: 2500, is_active: true, extra_beds_max: 1, extra_bed_price: 700, rate_plans: [{ name: 'Room Only', price: 2500 }, { name: 'Breakfast', price: 3000 }] }],
  } : n.toLowerCase().includes('cedar') ? {
    id: '77777777-7777-4777-8777-777777777777', name: 'Cedar Lodge', slug: 'cedar-lodge', price_min: 1800,
    rooms: [
      { name: 'Standard', base_price: 1800, total_inventory: 2, is_active: true, rate_plans: [] },
      { name: 'Deluxe', base_price: 2600, total_inventory: 1, is_active: true, rate_plans: [] },
      { name: 'Suite', base_price: 5000, total_inventory: 1, is_active: false, rate_plans: [] },
    ],
  } : null,
}));
vi.mock('@/lib/db', () => ({
  getPublishedTreks: async () => [{ id: '22222222-2222-4222-8222-222222222222', slug: 'triund-trek', name: 'Triund Trek', price_per_person: 1500 }],
  getParaglidingPackages: async () => [],
  getActiveTaxiRoutes: async () => [
    { id: '33333333-3333-4333-8333-333333333333', from_location: 'Dharamshala', to_location: 'McLeod Ganj', vehicle_name: 'Sedan', vehicle_category: 'sedan', price: 500 },
    { id: '44444444-4444-4444-8444-444444444444', from_location: 'Dharamshala', to_location: 'McLeod Ganj', vehicle_name: 'SUV', vehicle_category: 'suv', price: 900 },
    { id: '55555555-5555-4555-8555-555555555555', from_location: 'Dharamshala', to_location: 'McLeod Ganj', vehicle_name: 'Tempo', vehicle_category: 'tempo', price: 30, price_type: 'per_km' },
    { id: '66666666-6666-4666-8666-666666666666', from_location: 'Dharamshala', to_location: 'Bir Billing', vehicle_name: 'Sedan', vehicle_category: 'sedan', price: 18, price_type: 'per_km' },
  ],
}));
vi.mock('@/lib/wa-chat/booking-store', () => ({
  saveQuote: async (q: any) => { const row = { id: 'q1', created_at: '2026-10-13T10:00:00Z', expires_at: new Date(Date.now() + 60e3).toISOString(), used_at: null, used_booking_id: null, ...q }; h.quotes.push(row); return row; },
  latestQuote: async (cid: string) => h.useSaved ? (h.quotes.filter((q) => q.conversation_id === cid).at(-1) ?? null) : h.quote,
  claimQuote: async (id: string) => { h.claimCalls.push(id); return h.claimed; },
  releaseQuote: async (id: string) => { h.released.push(id); },
  linkQuoteBooking: async (...a: any[]) => { h.linked.push(a); },
  confirmedAfter: async (cid: string, iso: string) => { h.confirmCalls.push([cid, iso]); return h.confirmed; },
  ownBookings: async () => h.own,
  findOwnBooking: async (_p: string, ref: string) => h.own.find((b) => b.booking_ref === ref.toUpperCase()) ?? null,
}));
vi.mock('@/lib/bookings/create', async (orig) => {
  const actual = await orig<typeof import('@/lib/bookings/create')>();
  return { ...actual, createBooking: async (d: any, o: any) => { h.created.push([d, o]); return h.createResult; } };
});
vi.mock('@/lib/bookings/checkout', () => ({ createCheckoutLink: async () => { if (h.checkout === 'throw') throw new Error('stripe down'); return h.checkout; } }));
vi.mock('@/lib/booking-emails', () => ({ sendBookingEmails: async (id: string) => { h.emails.push(id); } }));
vi.mock('@/lib/server-auth', () => ({ serviceClient: () => ({ from: () => ({
  select: () => ({ eq: () => ({ single: async () => ({ data: { commission_amount: h.commission } }), maybeSingle: async () => ({ data: null }) }) }),
  update: (row: any) => { h.updates.push(row); const u: any = { eq: () => u, or: () => u, select: () => u, then: (res: any) => res({ data: h.switchRows, error: null }) }; return u; },
}) }) }));
vi.mock('@/lib/availability/store', () => ({ availabilityFor: async (...a: any[]) => { h.availCalls.push(a); return h.avail; } }));

import { BOOKING_TOOL_DEFS, runBookingTool } from '@/lib/wa-chat/booking-tools';

const ctx = () => ({ conversationId: 'c1', phone: '919800000001', profileName: 'Asha', handedOver: false });
const handover = async (a: any, c: any) => { c.handedOver = true; h.handovers.push(a.reason); return { ok: true }; };
const run = (name: string, a: any, c = ctx()) => runBookingTool(name, a, c, handover) as Promise<any>;
const goodQuote = (over: any = {}) => ({
  id: 'q1', conversation_id: 'c1', category: 'trek', amount: 3000, summary: 'Triund', created_at: '2026-10-13T10:00:00Z',
  expires_at: new Date(Date.now() + 60e3).toISOString(), used_at: null, used_booking_id: null,
  input: { category: 'trek', trek_id: TREK_ID, activity_date: '2099-10-24', num_guests: 2 }, ...over,
});

beforeEach(() => {
  Object.assign(h, { claimCalls: [], avail: {}, availCalls: [], quotes: [], quote: goodQuote(), claimed: true, confirmed: true, useSaved: false, own: [], confirmCalls: [], created: [], released: [], linked: [], updates: [], emails: [], handovers: [], commission: 0,
    createResult: { ok: true, booking: { id: 'b1', booking_ref: 'TRK-9' }, amount: 3000, payment_method: 'offline' },
    checkout: { ok: true, url: 'https://pay/x', sessionId: 's' }, switchRows: [{ id: 'b1' }] });
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test');
});
afterEach(() => vi.unstubAllEnvs());

describe('quote_booking', () => {
  it('prices a trek from the database row and saves the quote', async () => {
    const r = await run('quote_booking', { category: 'trek', name: 'triund', date: '2099-10-24', guests: 2 });
    expect(r).toMatchObject({ quote_id: 'q1', amount: 3000, online_payment_available: true });
    expect(h.quotes[0]).toMatchObject({ conversation_id: 'c1', category: 'trek', amount: 3000, input: { category: 'trek', trek_id: TREK_ID, activity_date: '2099-10-24', num_guests: 2 } });
    expect(r.summary).toBe('🥾 *Triund Trek*\n📅 2099-10-24\n👥 2 people\n💰 *Total: ₹3,000*\n⚠️ Cannot be cancelled within 24 hours of the start');
    expect(h.quotes[0].summary).toBe(r.summary);
  });
  it('treats per-km taxi routes as having no fixed fare', async () => {
    const r = await run('quote_booking', { category: 'taxi', from: 'dharamshala', to: 'bir', vehicle: 'sedan', date: '2099-10-24', guests: 2 });
    expect(r.error).toMatch(/No fixed fare.*create_enquiry/);
    expect(h.quotes).toEqual([]);
  });
  it('leaves per-km rows out of the vehicle choice on a mixed route', async () => {
    const r = await run('quote_booking', { category: 'taxi', from: 'dharamshala', to: 'mcleod', date: '2099-10-24', guests: 2 });
    expect(r.vehicles).not.toContain('Tempo');
  });
  it('prices a hotel room and plan by name', async () => {
    const r = await run('quote_booking', { category: 'hotel', name: 'Pine View', check_in: '2099-10-24', check_out: '2099-10-26', guests: 2, room_name: 'deluxe', plan_name: 'breakfast' });
    expect(r.amount).toBe(6000);
    expect(h.quotes[0].input).toMatchObject({ property_id: HOTEL_ID, room_name: 'Deluxe', plan_name: 'Breakfast', plan_index: 1 });
  });
  it('adds an extra bed to the quote, summary and stored input', async () => {
    const r = await run('quote_booking', { category: 'hotel', name: 'Pine View', check_in: '2099-10-24', check_out: '2099-10-26', guests: 2, room_name: 'deluxe', plan_name: 'breakfast', extra_beds: 1 });
    expect(r.amount).toBe(2 * (3000 + 700));
    expect(r.summary).toContain('Pine View – Deluxe (Breakfast) + 1 extra bed');
    expect(h.quotes[0].input).toMatchObject({ room_name: 'Deluxe', extra_beds: 1 });
  });
  it('refuses more beds than the room allows', async () => {
    const r = await run('quote_booking', { category: 'hotel', name: 'Pine View', check_in: '2099-10-24', check_out: '2099-10-26', guests: 2, room_name: 'deluxe', extra_beds: 2 });
    expect(r.error).toBe('This room allows at most 1 extra bed(s)');
    expect(h.quotes).toEqual([]);
  });
  it('does not match a switched-off room', async () => {
    const r = await run('quote_booking', { category: 'hotel', name: 'Cedar Lodge', check_in: '2099-10-21', check_out: '2099-10-23', guests: 2, room_name: 'Suite' });
    expect(r.error).toMatch(/Which room/);
    expect(r.rooms).toEqual(['Standard', 'Deluxe']);
  });
  it('book the saved quote with its extra beds', async () => {
    h.useSaved = true;
    await run('quote_booking', { category: 'hotel', name: 'Pine View', check_in: '2099-10-24', check_out: '2099-10-26', guests: 2, room_name: 'deluxe', extra_beds: 1 });
    h.createResult = { ok: true, booking: { id: 'b1', booking_ref: 'HTL-1' }, amount: 7400, payment_method: 'pay_at_hotel' };
    await run('create_booking', { payment: 'later', guest_name: 'Asha Rao' });
    expect(h.created[0][0]).toMatchObject({ room_name: 'Deluxe', extra_beds: 1 });
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
    const r = await run('create_booking', { payment: 'later', guest_name: 'Asha Rao' });
    expect(r).toMatchObject({ booking_ref: 'TRK-9', status: 'requested', payment: 'later', amount: 3000 });
    const [data, opts] = h.created[0];
    expect(data).toMatchObject({ category: 'trek', guest_phone: '919800000001', guest_name: 'Asha Rao', payment_method: 'offline', booking_source: 'whatsapp', trek_id: TREK_ID });
    expect(opts).toEqual({ userId: null, callerRole: null });
    expect(h.linked[0]).toEqual(['q1', 'b1']);
  });
  it('records a side effect on the context when a booking is made', async () => {
    const c: any = ctx();
    await run('create_booking', { payment: 'later', guest_name: 'Asha' }, c);
    expect(c.sideEffects).toEqual(['create_booking']);
    expect(c.actions).toEqual(['Booking TRK-9 made (pay later)']);
  });
  it('lists the booking and its payment link as actions', async () => {
    h.createResult = { ...h.createResult, payment_method: 'online' };
    const c: any = ctx();
    await run('create_booking', { payment: 'online', guest_name: 'Asha' }, c);
    expect(c.actions).toEqual(['Booking TRK-9 made (pay online)', 'Payment link for TRK-9: https://pay/x']);
  });
  it('records no side effect when create_booking refuses', async () => {
    h.quote = null;
    const c: any = ctx();
    await run('create_booking', { payment: 'later', guest_name: 'Asha' }, c);
    expect(c.sideEffects ?? []).toEqual([]);
  });
  it('uses pay_at_hotel for hotels', async () => {
    h.quote = goodQuote({ category: 'hotel', input: { category: 'hotel', property_id: HOTEL_ID, check_in: '2099-10-24', check_out: '2099-10-26', num_guests: 2, room_name: 'Deluxe' } });
    await run('create_booking', { payment: 'later', guest_name: 'Asha' });
    expect(h.created[0][0].payment_method).toBe('pay_at_hotel');
  });
  it('refuses when the summary was not sent and answered after the quote (same-turn yes)', async () => {
    h.confirmed = false;
    expect((await run('create_booking', { payment: 'later', guest_name: 'Asha' })).error).toMatch(/reply/i);
    expect(h.confirmCalls).toEqual([['c1', '2026-10-13T10:00:00Z']]);
    expect(h.created).toEqual([]);
  });
  it('refuses when there is no open quote', async () => {
    h.quote = null;
    expect((await run('create_booking', { payment: 'later', guest_name: 'Asha' })).error).toMatch(/No open quote/);
    expect(h.created).toEqual([]);
  });
  it('does not take a quote_id argument', () => {
    const def: any = BOOKING_TOOL_DEFS.find((d) => d.function.name === 'create_booking');
    expect(def.function.parameters.properties.quote_id).toBeUndefined();
    expect(def.function.parameters.required).toEqual(['payment', 'guest_name']);
  });
  it('refuses another conversation\'s, expired or already-used quotes', async () => {
    h.quote = goodQuote({ conversation_id: 'other' });
    expect((await run('create_booking', { payment: 'later', guest_name: 'Asha' })).error).toMatch(/No open quote/);
    h.quote = goodQuote({ expires_at: '2000-01-01T00:00:00Z' });
    expect((await run('create_booking', { payment: 'later', guest_name: 'Asha' })).error).toMatch(/expired/i);
    h.quote = goodQuote(); h.claimed = false;
    expect((await run('create_booking', { payment: 'later', guest_name: 'Asha' })).error).toMatch(/already/i);
    expect(h.created).toEqual([]);
  });
  it('never falls back to an older open quote when the newest one was already booked', async () => {
    h.useSaved = true;
    h.quotes = [
      goodQuote({ id: 'q1', created_at: '2026-10-13T10:00:00Z' }),
      goodQuote({ id: 'q2', created_at: '2026-10-13T10:05:00Z', used_at: '2026-10-13T10:06:00Z', used_booking_id: 'b2' }),
    ];
    const r = await run('create_booking', { payment: 'later', guest_name: 'Asha' });
    expect(r.error).toBe('This quote was already booked – make a new quote if the customer wants another booking.');
    expect(h.claimCalls).toEqual([]);
    expect(h.created).toEqual([]);
  });
  it('rejects the newest quote when it has expired, even if an older one is open', async () => {
    h.useSaved = true;
    h.quotes = [goodQuote({ id: 'q1' }), goodQuote({ id: 'q2', expires_at: '2000-01-01T00:00:00Z' })];
    expect((await run('create_booking', { payment: 'later', guest_name: 'Asha' })).error).toMatch(/expired/i);
    expect(h.created).toEqual([]);
  });
  it("describes payment as the customer's explicit choice", () => {
    const def: any = BOOKING_TOOL_DEFS.find((d) => d.function.name === 'create_booking');
    expect(def.function.parameters.required).toContain('payment');
    expect(def.function.parameters.properties.payment.description).toMatch(/the customer's explicit choice/);
    expect(def.function.description).toMatch(/explicitly chose/);
  });
  it('books the quote saved in an earlier turn without a quote_id (two turns)', async () => {
    h.useSaved = true;
    const t1 = await run('quote_booking', { category: 'trek', name: 'triund', date: '2099-10-24', guests: 2 });
    expect(t1.quote_id).toBe('q1');
    // Turn 2: the AI only sees chat text, so it calls create_booking with no quote_id.
    const r = await run('create_booking', { payment: 'later', guest_name: 'Asha Rao' });
    expect(r).toMatchObject({ booking_ref: 'TRK-9', status: 'requested' });
    expect(h.created[0][0]).toMatchObject({ category: 'trek', trek_id: TREK_ID, activity_date: '2099-10-24', num_guests: 2 });
    expect(h.linked[0]).toEqual(['q1', 'b1']);
  });
  it('hands over after 3 WhatsApp bookings in 24 hours', async () => {
    const recent = new Date().toISOString();
    h.own = [1, 2, 3].map((i) => ({ booking_ref: `T-${i}`, booking_source: 'whatsapp', created_at: recent }));
    const c = ctx();
    const r = await run('create_booking', { payment: 'later', guest_name: 'Asha' }, c);
    expect(r).toMatchObject({ handed_over: true });
    expect(c.handedOver).toBe(true);
    expect(h.created).toEqual([]);
  });
  it('releases the quote when booking fails', async () => {
    h.createResult = { ok: false, error: 'Activity date cannot be in the past', status: 400 };
    const r = await run('create_booking', { payment: 'later', guest_name: 'Asha' });
    expect(r.error).toMatch(/past/);
    expect(h.released).toEqual(['q1']);
  });
  it('returns a Stripe link for online payment', async () => {
    h.createResult = { ...h.createResult, payment_method: 'online' };
    const r = await run('create_booking', { payment: 'online', guest_name: 'Asha' });
    expect(r).toMatchObject({ payment: 'online', payment_url: 'https://pay/x' });
    expect(h.created[0][0].payment_method).toBe('online');
  });
  it('falls back to pay later and sends booking emails when the link fails', async () => {
    h.createResult = { ...h.createResult, payment_method: 'online' };
    h.checkout = { ok: false, error: 'Stripe down', status: 500 };
    const r = await run('create_booking', { payment: 'online', guest_name: 'Asha' });
    expect(r).toMatchObject({ payment: 'later', payment_link_failed: true });
    expect(h.updates[0]).toEqual({ payment_method: 'offline' });
    expect(h.emails).toEqual(['b1']);
  });
  it('never claims pay later when the booking could not be switched: error to the AI and a handover', async () => {
    h.createResult = { ...h.createResult, payment_method: 'online' };
    h.checkout = { ok: false, error: 'Stripe down', status: 500 };
    h.switchRows = []; // the conditional switch changed nothing (and the re-read shows it is not pay later)
    const c: any = ctx();
    const r = await run('create_booking', { payment: 'online', guest_name: 'Asha' }, c);
    expect(r).toEqual({ booking_ref: 'TRK-9', error: 'The payment link failed and the booking could not be switched to pay later; a team member will check it.' });
    expect(r).not.toHaveProperty('payment');
    expect(h.handovers[0]).toMatch(/TRK-9.*could not be switched to pay later/);
    expect(h.emails).toEqual([]);
  });
  it('marks commission pending in the fallback when the booking has commission', async () => {
    h.createResult = { ...h.createResult, payment_method: 'online' };
    h.checkout = { ok: false, error: 'Stripe down', status: 500 };
    h.commission = 300;
    await run('create_booking', { payment: 'online', guest_name: 'Asha' });
    expect(h.updates[0]).toEqual({ payment_method: 'offline', commission_status: 'pending' });
  });
  it('falls back the same way when the checkout call throws', async () => {
    h.createResult = { ...h.createResult, payment_method: 'online' };
    h.checkout = 'throw';
    h.commission = 300;
    const r = await run('create_booking', { payment: 'online', guest_name: 'Asha' });
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
  it('records a side effect when a payment link is made', async () => {
    h.own = [{ id: 'b1', booking_ref: 'TRK-9', status: 'pending', payment_status: 'pending' }];
    const c: any = ctx();
    await run('payment_link', { booking_ref: 'TRK-9' }, c);
    expect(c.sideEffects).toEqual(['payment_link']);
    expect(c.actions).toEqual(['Payment link for TRK-9: https://pay/x']);
    const c2: any = ctx();
    await run('payment_link', { booking_ref: 'TRK-404' }, c2);
    expect(c2.sideEffects ?? []).toEqual([]);
  });
  it('refuses failed bookings and passes checkout refusals through', async () => {
    h.own = [{ id: 'b1', booking_ref: 'TRK-9', status: 'failed', payment_status: 'pending' }];
    expect((await run('payment_link', { booking_ref: 'TRK-9' })).error).toBe('This booking can no longer be paid.');
    h.own[0].status = 'pending';
    h.checkout = { ok: false, error: 'Sold out for these dates', status: 409 };
    expect(await run('payment_link', { booking_ref: 'TRK-9' })).toEqual({ error: 'Sold out for these dates' });
    h.checkout = { ok: false, error: 'This booking can no longer be paid', status: 409 };
    expect(await run('payment_link', { booking_ref: 'TRK-9' })).toEqual({ error: 'This booking can no longer be paid' });
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

describe('quote_booking room availability', () => {
  const CEDAR_ID = '77777777-7777-4777-8777-777777777777';
  const ask = (room: string) => run('quote_booking', { category: 'hotel', name: 'Cedar Lodge', check_in: '2099-10-21', check_out: '2099-10-23', guests: 2, room_name: room });

  it('refuses a sold-out room and lists the active rooms that still have space', async () => {
    h.avail = { Standard: { tracked: true, left: 0 }, Deluxe: { tracked: true, left: 1 }, Suite: { tracked: true, left: 1 } };
    const r = await ask('Standard');
    expect(r.error).toBe('Standard is sold out for 2099-10-21 to 2099-10-23. Offer one of the rooms that still have space.');
    expect(r.rooms_available).toEqual(['Deluxe']);
    expect(h.availCalls).toEqual([[CEDAR_ID, '2099-10-21', '2099-10-23']]);
    expect(h.quotes).toEqual([]);
  });

  it('says the hotel is fully booked when no active room has space', async () => {
    h.avail = { Standard: { tracked: true, left: 0 }, Deluxe: { tracked: true, left: 0 }, Suite: { tracked: true, left: 1 } };
    const r = await ask('Deluxe');
    expect(r.error).toBe('Cedar Lodge is fully booked for 2099-10-21 to 2099-10-23. Ask the customer for other dates.');
    expect(r.rooms_available).toEqual([]);
    expect(h.quotes).toEqual([]);
  });

  it('quotes a tracked room that has space', async () => {
    h.avail = { Standard: { tracked: true, left: 1 }, Deluxe: { tracked: true, left: 0 }, Suite: { tracked: true, left: 0 } };
    const r = await ask('Standard');
    expect(r.amount).toBe(3600);
    expect(h.quotes).toHaveLength(1);
  });

  it('does not look up availability for room types without a room count', async () => {
    await run('quote_booking', { category: 'hotel', name: 'Pine View', check_in: '2099-10-24', check_out: '2099-10-26', guests: 2, room_name: 'deluxe' });
    expect(h.availCalls).toEqual([]);
    expect(h.quotes).toHaveLength(1);
  });
});

describe('create_booking duplicate guard with extra beds', () => {
  it('treats a booking labelled with the beds as the same booking', async () => {
    h.quote = goodQuote({ category: 'hotel', input: { category: 'hotel', property_id: HOTEL_ID, check_in: '2099-10-24', check_out: '2099-10-26', num_guests: 2, room_name: 'Deluxe', plan_name: 'Breakfast', plan_index: 1, extra_beds: 1 } });
    h.own = [{ id: 'b0', booking_ref: 'HTL-1', category: 'hotel', status: 'pending', payment_status: 'pending', booking_source: 'whatsapp', property_id: HOTEL_ID, trek_id: null, paragliding_id: null, taxi_route_id: null,
      check_in: '2099-10-24', check_out: '2099-10-26', activity_date: null, room_name: 'Deluxe - Breakfast + 1 extra bed', num_guests: 2, guest_name: 'Pallavi', pickup_time: null, payment_method: 'pay_at_hotel', created_at: new Date().toISOString() }];
    const r = await run('create_booking', { payment: 'later', guest_name: 'Pallavi' });
    expect(r).toMatchObject({ duplicate: true, booking_ref: 'HTL-1' });
    expect(h.created).toEqual([]);
  });
});

describe('create_booking duplicate guard', () => {
  const minsAgo = (m: number) => new Date(Date.now() - m * 60e3).toISOString();
  const hotelQuote = (input: any = {}) => goodQuote({ category: 'hotel', input: { category: 'hotel', property_id: HOTEL_ID, check_in: '2099-10-24', check_out: '2099-10-26', num_guests: 2, room_name: 'Deluxe', ...input } });
  const existing = (over: any = {}) => ({
    id: 'b0', booking_ref: 'HTL-261013-2F2F2', category: 'hotel', status: 'pending', payment_status: 'pending', booking_source: 'whatsapp',
    property_id: HOTEL_ID, trek_id: null, paragliding_id: null, taxi_route_id: null, check_in: '2099-10-24', check_out: '2099-10-26', activity_date: null,
    room_name: 'Deluxe', num_guests: 2, guest_name: 'Pallavi', pickup_time: null, payment_method: 'pay_at_hotel', created_at: minsAgo(1), ...over,
  });
  const NOTE = 'This booking was already made a moment ago – do not book it again. If the customer clearly wants an additional identical booking (e.g. a second room), call handover. If the customer wants to pay online and it is unpaid, call payment_link with this booking_ref.';

  it('returns the booking made a moment ago instead of booking the same stay again', async () => {
    h.quote = hotelQuote();
    h.own = [existing()];
    const c: any = ctx();
    const r = await run('create_booking', { payment: 'online', guest_name: 'Pallavi' }, c);
    expect(r).toEqual({ booking_ref: 'HTL-261013-2F2F2', status: 'requested, waiting for confirmation', payment_method: 'pay_at_hotel', paid: false, duplicate: true, note: NOTE });
    expect(h.created).toEqual([]);
    expect(h.claimCalls).toEqual([]);
    expect(h.linked).toEqual([]);
    expect(c.sideEffects ?? []).toEqual([]);
  });
  it('matches the stored room label "Room - Plan"', async () => {
    h.quote = hotelQuote({ plan_name: 'Breakfast', plan_index: 1 });
    h.own = [existing({ room_name: 'Deluxe - Breakfast' })];
    expect(await run('create_booking', { payment: 'later', guest_name: 'Pallavi' })).toMatchObject({ duplicate: true, booking_ref: 'HTL-261013-2F2F2' });
    h.own = [existing({ room_name: 'Deluxe' })];
    expect(await run('create_booking', { payment: 'later', guest_name: 'Pallavi' })).toMatchObject({ booking_ref: 'TRK-9' });
  });
  it('catches a duplicate trek on the same date', async () => {
    h.own = [existing({ booking_ref: 'TRK-1', category: 'trek', property_id: null, trek_id: TREK_ID, check_in: null, check_out: null, activity_date: '2099-10-24', room_name: null, guest_name: 'asha ' })];
    expect(await run('create_booking', { payment: 'later', guest_name: 'Asha' })).toMatchObject({ duplicate: true, booking_ref: 'TRK-1' });
    expect(h.created).toEqual([]);
  });
  it("reports the existing booking's real status and payment", async () => {
    h.quote = hotelQuote();
    h.own = [existing({ status: 'confirmed', payment_method: 'online', payment_status: 'paid' })];
    const r = await run('create_booking', { payment: 'online', guest_name: ' PALLAVI ' });
    expect(r).toMatchObject({ booking_ref: 'HTL-261013-2F2F2', duplicate: true, status: 'confirmed by the property/operator', payment_method: 'online', paid: true });
    expect(r.note).toMatch(/call payment_link with this booking_ref/);
  });
  it('treats a taxi at another pickup time as a new booking', async () => {
    const ROUTE = '44444444-4444-4444-8444-444444444444';
    h.quote = goodQuote({ category: 'taxi', input: { category: 'taxi', taxi_route_id: ROUTE, activity_date: '2099-10-24', pickup_time: '09:00', num_guests: 2, vehicle_type: 'SUV' } });
    const taxi = (t: string) => existing({ booking_ref: 'TXI-1', category: 'taxi', property_id: null, taxi_route_id: ROUTE, check_in: null, check_out: null, activity_date: '2099-10-24', room_name: null, pickup_time: t, guest_name: 'Asha' });
    h.own = [taxi('09:00')];
    expect(await run('create_booking', { payment: 'later', guest_name: 'Asha' })).toMatchObject({ duplicate: true, booking_ref: 'TXI-1' });
    h.own = [taxi('15:00')];
    const r = await run('create_booking', { payment: 'later', guest_name: 'Asha' });
    expect(r.duplicate).toBeUndefined();
    expect(h.created).toHaveLength(1);
  });
  it('wins over the daily limit so the customer gets the existing reference', async () => {
    h.quote = hotelQuote();
    h.own = [existing(), existing({ booking_ref: 'X-1', property_id: 'other' }), existing({ booking_ref: 'X-2', property_id: 'other' })];
    const c = ctx();
    expect(await run('create_booking', { payment: 'later', guest_name: 'Pallavi' }, c)).toMatchObject({ duplicate: true });
    expect(c.handedOver).toBe(false);
  });
  for (const [label, over] of [
    ['older than 30 minutes', { created_at: minsAgo(31) }],
    ['cancelled', { status: 'cancelled' }],
    ['failed', { status: 'failed' }],
    ['not from WhatsApp', { booking_source: 'website' }],
    ['other dates', { check_out: '2099-10-27' }],
    ['another room', { room_name: 'Suite' }],
    ['another hotel', { property_id: '99999999-9999-4999-8999-999999999999' }],
    ['for another guest name', { guest_name: 'Ravi Kumar' }],
    ['for a different number of guests', { num_guests: 3 }],
  ] as const) {
    it(`books normally when the earlier booking is ${label}`, async () => {
      h.quote = hotelQuote();
      h.own = [existing(over)];
      const r = await run('create_booking', { payment: 'later', guest_name: 'Pallavi' });
      expect(r).toMatchObject({ booking_ref: 'TRK-9', status: 'requested' });
      expect(r.duplicate).toBeUndefined();
      expect(h.created).toHaveLength(1);
    });
  }
});
