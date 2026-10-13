// tests/wa-chat/booking-tools-offers.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const HOTEL_ID = '11111111-1111-4111-8111-111111111111';
const h = vi.hoisted(() => ({
  quotes: [] as any[], quote: null as any, created: [] as any[], createResult: null as any, checkout: null as any,
  released: [] as any[], linked: [] as any[], updates: [] as any[], emails: [] as any[],
  offer: null as any, offerCalls: [] as any[], claims: [] as any[], codeClaimed: true, codeReleased: [] as any[], codeLinked: [] as any[],
  codeLinkOk: true, ownerMails: [] as any[],
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
  getActiveTaxiRoutes: async () => [],
}));
vi.mock('@/lib/wa-chat/booking-store', () => ({
  saveQuote: async (q: any) => { const row = { id: 'q1', created_at: '2026-10-13T10:00:00Z', expires_at: new Date(Date.now() + 60e3).toISOString(), used_at: null, used_booking_id: null, ...q }; h.quotes.push(row); return row; },
  latestOpenQuote: async () => h.quote,
  claimQuote: async () => true,
  releaseQuote: async (id: string) => { h.released.push(id); },
  linkQuoteBooking: async (...a: any[]) => { h.linked.push(a); },
  confirmedAfter: async () => true,
  ownBookings: async () => [],
  findOwnBooking: async () => null,
}));
vi.mock('@/lib/bookings/create', async (orig) => {
  const actual = await orig<typeof import('@/lib/bookings/create')>();
  return { ...actual, createBooking: async (d: any, o: any) => { h.created.push([d, o]); return h.createResult; } };
});
vi.mock('@/lib/bookings/checkout', () => ({ createCheckoutLink: async () => { if (h.checkout === 'throw') throw new Error('stripe down'); return h.checkout; } }));
vi.mock('@/lib/booking-emails', () => ({ sendBookingEmails: async (id: string) => { h.emails.push(id); } }));
vi.mock('@/lib/server-auth', () => ({ serviceClient: () => ({ from: () => ({ update: (row: any) => ({ eq: async () => { h.updates.push(row); return { error: null }; } }) }) }) }));
vi.mock('@/lib/wa-chat/offer-tools', () => ({ offerForBooking: async (i: any) => { h.offerCalls.push(i); return h.offer; } }));
vi.mock('@/lib/offers/store', () => ({
  claimCode: async (...a: any[]) => { h.claims.push(a); return h.codeClaimed; },
  releaseCode: async (id: string) => { h.codeReleased.push(id); },
  linkCodeBooking: async (...a: any[]) => { h.codeLinked.push(a); return h.codeLinkOk; },
}));
vi.mock('@/lib/email', () => ({ adminEmail: () => 'owner@x', sendEmail: async (m: any) => { h.ownerMails.push(m); } }));
vi.mock('@/lib/availability/store', () => ({ availabilityFor: async () => ({}) }));

import { runBookingTool } from '@/lib/wa-chat/booking-tools';
import { OFFER_NEEDS_ONLINE } from '@/lib/offers/rules';

const ctx = () => ({ conversationId: 'c1', phone: '919800000001', profileName: 'Asha', handedOver: false });
const run = (name: string, a: any) => runBookingTool(name, a, ctx(), async () => ({ ok: true })) as Promise<any>;
const expiresIn3h = () => new Date(Date.now() + 3 * 3600e3 - 60e3).toISOString();
const hotelQuote = (input: any = {}) => ({
  id: 'q1', conversation_id: 'c1', category: 'hotel', amount: 4800, summary: 'Pine View', created_at: '2026-10-13T10:00:00Z',
  expires_at: new Date(Date.now() + 60e3).toISOString(), used_at: null, used_booking_id: null,
  input: { category: 'hotel', property_id: HOTEL_ID, check_in: '2099-10-24', check_out: '2099-10-26', num_guests: 2, room_name: 'Deluxe', plan_name: 'Breakfast', plan_index: 1, offer_code: 'PNV-7K3Q9', offer_percent: 20, ...input },
});
const hotelArgs = { category: 'hotel', name: 'Pine View', check_in: '2099-10-24', check_out: '2099-10-26', guests: 2, room_name: 'deluxe', plan_name: 'breakfast' };

beforeEach(() => {
  Object.assign(h, {
    quotes: [], quote: hotelQuote(), created: [], released: [], linked: [], updates: [], emails: [],
    offerCalls: [], claims: [], codeClaimed: true, codeReleased: [], codeLinked: [], codeLinkOk: true, ownerMails: [],
    offer: { ok: true, codeId: 'k1', code: 'PNV-7K3Q9', percent: 20, expiresAt: expiresIn3h() },
    createResult: { ok: true, booking: { id: 'b1', booking_ref: 'HTL-9' }, amount: 4800, payment_method: 'online' },
    checkout: { ok: true, url: 'https://pay/x', sessionId: 's' },
  });
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test');
});
afterEach(() => vi.unstubAllEnvs());

describe('quote_booking with an offer code', () => {
  it('takes the plan percent off and asks for online payment only', async () => {
    const r = await run('quote_booking', { ...hotelArgs, offer_code: 'pnv-7k3q9' });
    expect(h.offerCalls[0]).toEqual({ code: 'pnv-7k3q9', phone: '919800000001', propertyId: HOTEL_ID, room: 'Deluxe', plan: 'Breakfast' });
    expect(r).toMatchObject({ amount: 4800, online_payment_available: true, payment: 'online only', offer: { code: 'PNV-7K3Q9', percent: 20, full_price: 6000 } });
    expect(r.summary).toBe('Pine View – Deluxe (Breakfast) · 2099-10-24 to 2099-10-26 · 2 people · Total ₹4,800 (20% WhatsApp offer off ₹6,000, code PNV-7K3Q9) · Pay online only · Cannot be cancelled within 24 hours of the start');
    expect(h.quotes[0]).toMatchObject({ amount: 4800, input: { offer_code: 'PNV-7K3Q9', offer_percent: 20, room_name: 'Deluxe' } });
  });
  it('sends the customer to reception when online payment is off', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    const r = await run('quote_booking', { ...hotelArgs, offer_code: 'PNV-7K3Q9' });
    expect(r.error).toBe("This offer needs online payment, which isn't available right now; show the code at reception within 3 hours instead");
    expect(h.quotes).toEqual([]);
  });
  it('passes on a rejected code and saves no quote', async () => {
    h.offer = { error: 'That offer code was not found for this WhatsApp number. Use get_offer_code to get one.' };
    const r = await run('quote_booking', { ...hotelArgs, offer_code: 'PNV-ZZZZZ' });
    expect(r.error).toMatch(/not found for this WhatsApp number/);
    expect(h.quotes).toEqual([]);
  });
  it('only takes codes for hotels', async () => {
    const r = await run('quote_booking', { category: 'trek', name: 'triund', date: '2099-10-24', guests: 2, offer_code: 'PNV-7K3Q9' });
    expect(r.error).toBe('Offer codes are only for hotels.');
    expect(h.offerCalls).toEqual([]);
  });
  it('quotes normally without a code', async () => {
    const r = await run('quote_booking', hotelArgs);
    expect(r).toMatchObject({ amount: 6000 });
    expect(r).not.toHaveProperty('offer');
    expect(h.quotes[0].input).not.toHaveProperty('offer_code');
  });
});

describe('create_booking with an offer code', () => {
  it('refuses pay later for an offer quote', async () => {
    const r = await run('create_booking', { payment: 'later', guest_name: 'Asha Rao' });
    expect(r.error).toMatch(/needs online payment in full/);
    expect(h.claims).toEqual([]);
    expect(h.created).toEqual([]);
  });
  it('claims the code, books online at the quoted percent and links the code', async () => {
    const r = await run('create_booking', { payment: 'online', guest_name: 'Asha Rao' });
    expect(h.offerCalls[0]).toMatchObject({ code: 'PNV-7K3Q9', phone: '919800000001', propertyId: HOTEL_ID, room: 'Deluxe', plan: 'Breakfast' });
    expect(h.claims).toEqual([['k1', 20]]);
    const [data, opts] = h.created[0];
    expect(data).toMatchObject({ payment_method: 'online', property_id: HOTEL_ID, booking_source: 'whatsapp', guest_phone: '919800000001' });
    expect(data).not.toHaveProperty('offer_code');
    expect(opts).toEqual({ userId: null, callerRole: null, offer: { code: 'PNV-7K3Q9', percent: 20 } });
    expect(h.codeLinked).toEqual([['k1', 'b1']]);
    expect(r).toMatchObject({ booking_ref: 'HTL-9', payment: 'online', payment_url: 'https://pay/x', offer_code: 'PNV-7K3Q9', offer_percent: 20 });
    expect(h.ownerMails).toEqual([]);
  });
  it('emails the owner when the code cannot be linked to the new booking, and still books', async () => {
    h.codeLinkOk = false;
    const r = await run('create_booking', { payment: 'online', guest_name: 'Asha Rao' });
    expect(r).toMatchObject({ booking_ref: 'HTL-9', payment_url: 'https://pay/x' });
    expect(h.ownerMails).toHaveLength(1);
    expect(h.ownerMails[0]).toMatchObject({ to: 'owner@x', subject: 'Offer code PNV-7K3Q9 could not be linked to booking HTL-9' });
  });
  it('keeps the percent the customer said yes to', async () => {
    h.offer = { ...h.offer, percent: 15 };
    await run('create_booking', { payment: 'online', guest_name: 'Asha Rao' });
    expect(h.claims[0]).toEqual(['k1', 20]);
  });
  it('stops when the code is no longer valid', async () => {
    h.offer = { error: 'This offer code has expired. Use get_offer_code to get a new one if the offer is still on.' };
    const r = await run('create_booking', { payment: 'online', guest_name: 'Asha Rao' });
    expect(r.error).toMatch(/expired.*Make a new quote/);
    expect(h.claims).toEqual([]);
    expect(h.created).toEqual([]);
  });
  it('releases the quote when someone used the code first', async () => {
    h.codeClaimed = false;
    const r = await run('create_booking', { payment: 'online', guest_name: 'Asha Rao' });
    expect(r.error).toMatch(/just used/);
    expect(h.released).toEqual(['q1']);
    expect(h.created).toEqual([]);
  });
  it('releases the code and points to reception when online payment is not available', async () => {
    h.createResult = { ok: false, error: OFFER_NEEDS_ONLINE, status: 400 };
    const r = await run('create_booking', { payment: 'online', guest_name: 'Asha Rao' });
    expect(r.error).toMatch(/show the code at reception within 3 hours/);
    expect(h.codeReleased).toEqual(['k1']);
    expect(h.released).toEqual(['q1']);
  });
  it('releases the code when the booking fails for another reason', async () => {
    h.createResult = { ok: false, error: 'Sold out for these dates', status: 409 };
    expect((await run('create_booking', { payment: 'online', guest_name: 'Asha Rao' })).error).toBe('Sold out for these dates');
    expect(h.codeReleased).toEqual(['k1']);
    expect(h.released).toEqual(['q1']);
    expect(h.codeLinked).toEqual([]);
  });
  it('releases the code when booking is unavailable (503)', async () => {
    h.createResult = { ok: false, error: 'Booking is temporarily unavailable', status: 503 };
    expect((await run('create_booking', { payment: 'online', guest_name: 'Asha Rao' })).error).toBe('Booking is temporarily unavailable');
    expect(h.codeReleased).toEqual(['k1']);
    expect(h.released).toEqual(['q1']);
  });
  it('does not fall back to pay later when the payment link fails', async () => {
    h.checkout = { ok: false, error: 'Stripe down', status: 500 };
    const r = await run('create_booking', { payment: 'online', guest_name: 'Asha Rao' });
    expect(r.error).toMatch(/^The payment link could not be created\. Your code is free again – make a new quote with the same code in a minute, or show code PNV-7K3Q9 at reception before /);
    expect(h.updates).toEqual([{ status: 'failed', cancelled_reason: 'Offer booking: payment link failed' }]);
    expect(h.codeReleased).toEqual(['k1']);
    expect(h.emails).toEqual([]);
  });
  it('does not fall back to pay later when the payment link throws, and leaves no commission pending', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.checkout = 'throw';
    const r = await run('create_booking', { payment: 'online', guest_name: 'Asha Rao' });
    spy.mockRestore();
    expect(r.error).toMatch(/could not be created.*code is free again.*PNV-7K3Q9 at reception/);
    expect(r).not.toHaveProperty('payment_link_failed');
    expect(h.updates).toEqual([{ status: 'failed', cancelled_reason: 'Offer booking: payment link failed' }]);
    expect(h.updates.some((u) => 'commission_status' in u || 'payment_method' in u)).toBe(false);
    expect(h.codeReleased).toEqual(['k1']);
    expect(h.emails).toEqual([]);
  });
});
