import { describe, it, expect, vi, beforeEach } from 'vitest';

let role = 'partner';
let partnerType = 'trek';
let partnerStatus: string | null = 'verified';
let bookingRows: any[] = [];
let propertyRows: any[] = [];
let bookingsError: any = null;
let viewsThrow = false;
const eqCalls: any[] = [];
const inCalls: any[] = [];
// PATCH: the one booking looked up by id, and the caller's property it belongs to (null = not theirs).
let bookingRow: any = null;
let ownedProperty: any = null;
const confirmBooking = vi.fn(async (..._a: unknown[]): Promise<any> => ({ ok: true, already: false }));
vi.mock('@/lib/bookings/confirm', () => ({ confirmBooking: (...a: unknown[]) => confirmBooking(...a) }));

function builder(table: string) {
  const b: any = {
    select: () => b, order: () => b, limit: () => b,
    eq: (c: string, v: unknown) => { eqCalls.push({ table, c, v }); return b; },
    in: (c: string, v: unknown) => { inCalls.push({ table, c, v }); return b; },
    maybeSingle: async () => ({ data: table === 'bookings' ? bookingRow : table === 'properties' ? ownedProperty : null, error: null }),
    then: (res: any) => res(
      table === 'bookings' ? { data: bookingRows, error: bookingsError }
        : table === 'properties' ? { data: propertyRows, error: null }
        : { data: [], error: null }),
  };
  return b;
}
vi.mock('@/lib/server-auth', async (orig) => {
  const actual = await orig<typeof import('@/lib/server-auth')>();
  return {
    ...actual,
    serviceClient: () => ({ from: (t: string) => builder(t) }),
    requireCaller: async (_req: Request, roles?: string[]) => {
      if (roles && !roles.includes(role)) throw new actual.HttpError(403, 'You do not have access to this');
      return { user: {}, profile: { id: 'p1', role, partner_type: partnerType, partner_status: partnerStatus } };
    },
  };
});
import { effectiveCollector } from '@/lib/manual-booking';
vi.mock('@/lib/manual-booking-emails', () => ({
  toBookingViews: async (rows: any[]) => { if (viewsThrow) throw new Error('lookup failed'); return rows.map((r) => ({ ...r, effective_collector: effectiveCollector(r), item_name: 'Trek', date_text: 'd', assignee_text: null, payment_text: 'p', partner_contact: null })); },
}));

import { GET, PATCH } from '@/app/api/partner/bookings/route';
const get = () => GET(new Request('http://x'));

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  role = 'partner'; partnerType = 'trek'; partnerStatus = 'verified'; bookingsError = null; viewsThrow = false; eqCalls.length = 0; inCalls.length = 0; propertyRows = [];
  bookingRows = [
    { id: 'b1', status: 'pending', guest_name: 'A', guest_phone: '111', guest_email: 'a@x.com', commission_pct: 20, created_by: 'admin', list_amount: 5, price_override_reason: 'x', amount: 100, commission_amount: 20, commission_status: 'pending', partner_share_amount: 80 },
    { id: 'b2', status: 'confirmed', guest_name: 'B', guest_phone: '222', guest_email: 'b@x.com', amount: 100 },
  ];
});

describe('GET /api/partner/bookings', () => {
  it('rejects a non-partner with 403', async () => {
    role = 'customer';
    expect((await get()).status).toBe(403);
  });

  it('blocks suspended and rejected partners with 403 before loading bookings', async () => {
    for (const s of ['suspended', 'rejected']) {
      partnerStatus = s;
      const res = await get();
      expect(res.status).toBe(403);
      expect((await res.json()).error).toMatch(/suspended|not approved/);
    }
    expect(eqCalls).toHaveLength(0);
  });

  it('queries activity partners by partner_id = caller', async () => {
    await get();
    expect(eqCalls).toContainEqual({ table: 'bookings', c: 'partner_id', v: 'p1' });
  });

  it('queries hotel partners by their own properties', async () => {
    partnerType = 'hotel'; propertyRows = [{ id: 'h1' }, { id: 'h2' }];
    await get();
    expect(eqCalls).toContainEqual({ table: 'properties', c: 'owner_id', v: 'p1' });
    expect(inCalls).toContainEqual({ table: 'bookings', c: 'property_id', v: ['h1', 'h2'] });
  });

  it('returns nothing for a hotel partner with no properties', async () => {
    partnerType = 'hotel';
    const body = await (await get()).json();
    expect(body.bookings).toEqual([]);
  });

  it('hides contact details until confirmed and strips internal fields', async () => {
    const { bookings } = await (await get()).json();
    expect(bookings[0].guest_phone).toBeNull();
    expect(bookings[0].guest_email).toBeNull();
    expect(bookings[1].guest_phone).toBe('222');
    for (const k of ['commission_pct', 'created_by', 'list_amount', 'price_override_reason']) expect(bookings[0]).not.toHaveProperty(k);
    expect(bookings[0].commission_amount).toBe(20);
    expect(bookings[0].commission_status).toBe('pending');
    expect(bookings[0].partner_share_amount).toBe(80);
  });

  it('returns collected_by null for an unpaid admin booking', async () => {
    bookingRows = [{ id: 'b3', status: 'pending', booking_source: 'admin', payment_status: 'pending', collected_by: null, amount: 100, commission_amount: 20 }];
    const { bookings } = await (await get()).json();
    expect(bookings[0].collected_by).toBeNull();
  });

  it('passes the offer code through so the partner sees no further discount applies', async () => {
    bookingRows = [{ id: 'b4', status: 'pending', amount: 6000, offer_code: 'PNV-7K3Q9', offer_percent: 25 }];
    const { bookings } = await (await get()).json();
    expect(bookings[0]).toMatchObject({ offer_code: 'PNV-7K3Q9', offer_percent: 25 });
  });

  it('returns 500 when the bookings query fails', async () => {
    bookingsError = { message: 'boom' };
    expect((await get()).status).toBe(500);
  });

  it('treats a partner with no partner_type as a property owner', async () => {
    partnerType = null as any; propertyRows = [{ id: 'h1' }];
    await get();
    expect(eqCalls).toContainEqual({ table: 'properties', c: 'owner_id', v: 'p1' });
    expect(eqCalls).not.toContainEqual({ table: 'bookings', c: 'partner_id', v: 'p1' });
  });

  it('returns 500 when building the views fails', async () => {
    viewsThrow = true;
    expect((await get()).status).toBe(500);
  });
});

const BID = '55555555-5555-4555-8555-555555555555';
const patch = (body: unknown) => PATCH(new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) }));

describe('PATCH /api/partner/bookings (confirm)', () => {
  beforeEach(() => {
    confirmBooking.mockClear();
    bookingRow = { id: BID, status: 'pending', property_id: 'h1', partner_id: 'p1', payment_method: 'pay_at_hotel', payment_status: 'pending' };
    ownedProperty = null;
  });

  it('rejects a non-partner with 403', async () => {
    role = 'admin';
    expect((await patch({ id: BID, action: 'confirm' })).status).toBe(403);
    expect(confirmBooking).not.toHaveBeenCalled();
  });

  it('blocks a suspended partner with 403', async () => {
    partnerStatus = 'suspended';
    expect((await patch({ id: BID, action: 'confirm' })).status).toBe(403);
    expect(confirmBooking).not.toHaveBeenCalled();
  });

  it('400 on a bad body', async () => {
    expect((await patch({ id: 'nope', action: 'confirm' })).status).toBe(400);
    expect((await patch({ id: BID, action: 'cancel' })).status).toBe(400);
  });

  it('an activity partner confirms their own pay-later booking', async () => {
    const res = await patch({ id: BID, action: 'confirm' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, already: false });
    expect(confirmBooking).toHaveBeenCalledWith(BID, 'partner');
  });

  it('reports an already confirmed booking', async () => {
    confirmBooking.mockResolvedValueOnce({ ok: true, already: true });
    expect(await (await patch({ id: BID, action: 'confirm' })).json()).toEqual({ ok: true, already: true });
  });

  it("404 for an activity partner's booking that is someone else's", async () => {
    bookingRow = { ...bookingRow, partner_id: 'other' };
    const res = await patch({ id: BID, action: 'confirm' });
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('Booking not found.');
    expect(confirmBooking).not.toHaveBeenCalled();
  });

  it('404 for a booking that does not exist', async () => {
    bookingRow = null;
    expect((await patch({ id: BID, action: 'confirm' })).status).toBe(404);
  });

  it('a hotel partner confirms a booking at a property they own', async () => {
    partnerType = 'hotel'; ownedProperty = { id: 'h1' };
    bookingRow = { ...bookingRow, partner_id: null };
    expect((await patch({ id: BID, action: 'confirm' })).status).toBe(200);
    expect(eqCalls).toContainEqual({ table: 'properties', c: 'id', v: 'h1' });
    expect(eqCalls).toContainEqual({ table: 'properties', c: 'owner_id', v: 'p1' });
    expect(confirmBooking).toHaveBeenCalledWith(BID, 'partner');
  });

  it("404 for a hotel partner on another owner's property", async () => {
    partnerType = 'hotel'; ownedProperty = null;
    expect((await patch({ id: BID, action: 'confirm' })).status).toBe(404);
    expect(confirmBooking).not.toHaveBeenCalled();
  });

  it('409 for an unpaid online booking: payment confirms it', async () => {
    bookingRow = { ...bookingRow, payment_method: 'online', payment_status: 'pending' };
    const res = await patch({ id: BID, action: 'confirm' });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('This booking is waiting for online payment.');
    expect(confirmBooking).not.toHaveBeenCalled();
  });

  it('a paid online booking can be confirmed', async () => {
    bookingRow = { ...bookingRow, payment_method: 'online', payment_status: 'paid' };
    expect((await patch({ id: BID, action: 'confirm' })).status).toBe(200);
    expect(confirmBooking).toHaveBeenCalled();
  });

  it('passes on a refusal from the confirm path', async () => {
    confirmBooking.mockResolvedValueOnce({ ok: false, status: 409, error: 'This booking is cancelled.' });
    const res = await patch({ id: BID, action: 'confirm' });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('This booking is cancelled.');
  });
});
