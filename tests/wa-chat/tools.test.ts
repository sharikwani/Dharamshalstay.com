import { describe, expect, it, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({ inserts: [] as any[], emails: [] as any[], statuses: [] as any[], existing: null as any, filters: [] as any[], status: 'ai', alerts: [] as string[] }));
vi.mock('@/lib/background', () => ({ inBackground: (_l: string, work: () => unknown) => { work(); } }));
vi.mock('@/lib/listings/enquiry-alert', () => ({ alertHotelOfEnquiry: async (id: string) => { h.alerts.push(id); return { sent: true }; } }));
vi.mock('@/lib/db', () => ({
  getPublishedProperties: async () => [
    { id: 'p-panch', slug: 'panchvati-cottages', name: 'Panchvati Cottages', type: 'cottage', destination_slug: 'dharamshala', star_rating: null, price_min: 4000, price_max: 9700, short_description: 'Quiet cottages', locality: 'Kharota' },
    { id: 'p-pine', slug: 'pine-view', name: 'Pine View', type: 'hotel', destination_slug: 'mcleod-ganj', star_rating: 3, price_min: 2500, price_max: 3500, short_description: 'Valley views' },
  ],
  getPropertyBySlug: async (s: string) => s === 'panchvati-cottages' ? {
    id: 'p-panch', slug: s, name: 'Panchvati Cottages', check_in_time: '12:00', check_out_time: '11:00', amenities: ['Parking'], cancellation_policy: 'Free cancellation',
    extra_bed_charge: 600,
    rooms: [
      { name: 'Super Deluxe', base_price: 5006, max_adults: 2, is_active: true, extra_beds_max: 2, extra_bed_price: 900, rate_plans: [{ name: 'Room Only', price: 4000 }] },
      { name: 'Cottage', base_price: 3000, is_active: true, extra_beds_max: 1, rate_plans: [] },
      { name: 'Plain', base_price: 2000, is_active: true, extra_beds_max: 0, rate_plans: [] },
      { name: 'Old Wing', base_price: 1000, is_active: false, extra_beds_max: 1, rate_plans: [] },
    ],
  } : null,
  getPublishedTreks: async () => [{ slug: 'triund-trek', name: 'Triund Trek', duration: '2 days', difficulty: 'moderate', price_per_person: 1500, short_description: 'Classic' }],
  getParaglidingPackages: async () => [{ slug: 'bir-tandem', name: 'Bir Tandem', destination: 'Bir', duration: '20 min', price_per_person: 3000, includes: ['Video'], description: 'Fly' }],
}));
vi.mock('@/lib/taxi', () => ({ getTaxiRouteGroups: async () => [{ slug: 'dharamshala-to-mcleod-ganj', from: 'Dharamshala', to: 'McLeod Ganj', distanceKm: 9, duration: '30 min', minPrice: 500, vehicles: [{ name: 'Sedan', maxPassengers: 4, price: 500 }] }] }));
vi.mock('@/lib/email', () => ({ sendEmail: async (m: any) => { h.emails.push(m); }, adminEmail: () => 'admin@x' }));
vi.mock('@/lib/wa-chat/store', () => ({
  setStatusIf: async (id: string, from: string, to: string, why: string) => { if (h.status !== from) return false; h.statuses.push([id, to, why]); return true; },
  history: async () => [{ author: 'customer', body: 'help' }],
}));
vi.mock('@/lib/server-auth', () => ({ serviceClient: () => ({ from: () => {
  const q: any = {
    select: () => q, order: () => q, limit: () => q,
    eq: (...a: any[]) => { h.filters.push(['eq', ...a]); return q; },
    is: (...a: any[]) => { h.filters.push(['is', ...a]); return q; },
    gte: (...a: any[]) => { h.filters.push(['gte', a[0]]); return q; },
    maybeSingle: async () => ({ data: h.existing, error: null }),
    insert: (row: any) => { h.inserts.push(row); return { select: () => ({ single: async () => ({ data: { id: 'inq1' }, error: null }) }) }; },
  };
  return q;
} }) }));

vi.mock('@/lib/wa-chat/booking-tools', () => ({ BOOKING_TOOL_DEFS: ['quote_booking', 'create_booking', 'payment_link', 'my_bookings'].map((name) => ({ type: 'function', function: { name } })), runBookingTool: async () => null }));
vi.mock('@/lib/wa-chat/cancellations', () => ({ CANCEL_TOOL_DEF: { type: 'function', function: { name: 'request_cancellation' } }, requestCancellation: async () => ({ result: 'need_proof' }) }));
vi.mock('@/lib/wa-chat/offer-tools', () => ({
  OFFER_TOOL_DEF: { type: 'function', function: { name: 'get_offer_code' } },
  getOfferCode: async () => ({ code: 'PNV-7K3Q9' }),
  offerNotes: async (ids: string[]) => Object.fromEntries(ids.filter((id) => id === 'p-panch').map((id) => [id, 'Up to 25% off, only through this WhatsApp chat'])),
}));

import { runTool, TOOL_DEFS } from '@/lib/wa-chat/tools';

const ctx = () => ({ conversationId: 'c1', phone: '919800000001', profileName: 'Asha', handedOver: false });
beforeEach(() => { h.inserts = []; h.emails = []; h.statuses = []; h.existing = null; h.filters = []; h.status = 'ai'; });

describe('tools', () => {
  it('defines every tool', () => {
    expect(TOOL_DEFS.map((t: any) => t.function.name).sort()).toEqual(
      ['answer_retention_offer', 'apply_coupon', 'check_coupon', 'create_booking', 'create_enquiry', 'get_hotel', 'get_offer_code', 'get_trek', 'handover', 'list_paragliding', 'list_taxi_routes', 'list_treks', 'my_bookings', 'payment_link', 'quote_booking', 'request_cancellation', 'save_contact', 'search_hotels']);
  });
  it('search_hotels filters by area and budget and links pages', async () => {
    const r = JSON.parse(await runTool('search_hotels', { area: 'mcleod', budget_max: 3000 }, ctx()));
    expect(r.hotels.map((x: any) => x.name)).toEqual(['Pine View']);
    expect(r.hotels[0].link).toBe('https://www.dharamshalastay.com/hotels/pine-view');
  });
  it('get_hotel returns rooms with rate plans', async () => {
    const r = JSON.parse(await runTool('get_hotel', { name: 'panchvati' }, ctx()));
    expect(r.rooms[0]).toMatchObject({ name: 'Super Deluxe', max_adults: 2, rates: [{ name: 'Room Only', price: 4000 }] });
    expect(r.check_in_time).toBe('12:00');
  });
  it('get_hotel hides switched-off rooms and shows the extra bed option only when allowed', async () => {
    const r = JSON.parse(await runTool('get_hotel', { name: 'panchvati' }, ctx()));
    expect(r.rooms.map((x: any) => x.name)).toEqual(['Super Deluxe', 'Cottage', 'Plain']);
    expect(r.rooms[0].extra_bed).toEqual({ max: 2, price_per_night: 900 });
    expect(r.rooms[1].extra_bed).toEqual({ max: 1, price_per_night: 600 });
    expect(r.rooms[2]).not.toHaveProperty('extra_bed');
  });
  it('list_taxi_routes matches either end', async () => {
    const r = JSON.parse(await runTool('list_taxi_routes', { to: 'mcleod' }, ctx()));
    expect(r.routes[0].vehicles[0]).toEqual({ name: 'Sedan', seats: 4, price: 500 });
  });
  it('create_enquiry saves a whatsapp enquiry and emails the owner', async () => {
    const r = JSON.parse(await runTool('create_enquiry', { type: 'hotel', name: 'Asha', item: 'Panchvati Cottages', check_in: '2026-10-13', check_out: '2026-10-15', guests: 2 }, ctx()));
    expect(r).toEqual({ ok: true, enquiry_id: 'inq1' });
    expect(h.inserts[0]).toMatchObject({ type: 'hotel', name: 'Asha', phone: '919800000001', source: 'whatsapp', whatsapp_conversation_id: 'c1', status: 'new', guests: 2 });
    expect(h.emails[0].subject).toMatch(/WhatsApp enquiry/);
  });
  it('create_enquiry links a listed hotel and alerts it; an unknown hotel is saved unlinked', async () => {
    h.alerts = [];
    await runTool('create_enquiry', { type: 'hotel', name: 'Asha', hotel: 'Panchvati Cottages', check_in: '2026-10-13' }, ctx());
    expect(h.inserts.at(-1)).toMatchObject({ property_id: 'p-panch' });
    expect(h.alerts).toEqual(['inq1']);
    await runTool('create_enquiry', { type: 'hotel', name: 'Ravi', hotel: 'Nowhere Inn', check_in: '2026-10-14' }, ctx());
    expect(h.inserts.at(-1)).toMatchObject({ property_id: null });
    expect(h.alerts).toEqual(['inq1']);
  });
  it('create_enquiry counts as an action the customer must hear about', async () => {
    const c: any = ctx();
    await runTool('create_enquiry', { type: 'hotel', name: 'Asha', check_in: '2099-10-13' }, c);
    expect(c.sideEffects).toEqual(['create_enquiry']);
    expect(c.actions).toEqual(['Enquiry inq1 saved']);
  });
  it('create_enquiry does not save or email the same enquiry twice within 30 minutes', async () => {
    h.existing = { id: 'inq0' };
    const c: any = ctx();
    const r = JSON.parse(await runTool('create_enquiry', { type: 'hotel', name: 'Asha', check_in: '2099-10-13' }, c));
    expect(r).toEqual({ ok: true, enquiry_id: 'inq0', duplicate: true });
    expect(h.inserts).toEqual([]);
    expect(h.emails).toEqual([]);
    expect(h.filters).toEqual(expect.arrayContaining([['eq', 'whatsapp_conversation_id', 'c1'], ['eq', 'type', 'hotel'], ['eq', 'name', 'Asha'], ['eq', 'check_in', '2099-10-13'], ['gte', 'created_at']]));
    expect(c.sideEffects).toEqual(['create_enquiry']);
    h.filters = [];
    await runTool('create_enquiry', { type: 'general', name: 'Asha' }, ctx());
    expect(h.filters).toContainEqual(['is', 'check_in', null]);
  });
  it('create_enquiry rejects bad dates', async () => {
    const r = JSON.parse(await runTool('create_enquiry', { type: 'hotel', name: 'A', check_in: 'tomorrow' }, ctx()));
    expect(r.error).toMatch(/YYYY-MM-DD/);
  });
  it('handover flags the chat and emails the owner', async () => {
    const c = ctx();
    await runTool('handover', { reason: 'Refund request' }, c);
    expect(c.handedOver).toBe(true);
    expect(h.statuses[0]).toEqual(['c1', 'needs_human', 'Refund request']);
    expect(h.emails[0].subject).toMatch(/needs you/);
    expect((c as any).sideEffects).toEqual(['handover']);
    expect((c as any).actions).toEqual(['Handed to the team: Refund request']);
  });
  it('handover never takes a chat back from an owner who took it over, but still emails them', async () => {
    h.status = 'human';
    const c = ctx();
    await runTool('handover', { reason: 'Refund request' }, c);
    expect(h.statuses).toEqual([]);
    expect(h.emails[0].subject).toMatch(/needs you/);
  });
  it('unknown tool returns an error string', async () => {
    expect(JSON.parse(await runTool('nope', {}, ctx()))).toEqual({ error: 'Unknown tool' });
  });
  it('get_hotel and search_hotels show an active offer', async () => {
    const one = JSON.parse(await runTool('get_hotel', { name: 'panchvati' }, ctx()));
    expect(one.offer).toBe('Up to 25% off, only through this WhatsApp chat');
    const list = JSON.parse(await runTool('search_hotels', {}, ctx()));
    expect(list.hotels.find((x: any) => x.name === 'Panchvati Cottages').offer).toBe('Up to 25% off, only through this WhatsApp chat');
    expect(list.hotels.find((x: any) => x.name === 'Pine View')).not.toHaveProperty('offer');
  });
  it('routes get_offer_code', async () => {
    expect(JSON.parse(await runTool('get_offer_code', { hotel_name: 'panchvati' }, ctx()))).toEqual({ code: 'PNV-7K3Q9' });
  });
});
