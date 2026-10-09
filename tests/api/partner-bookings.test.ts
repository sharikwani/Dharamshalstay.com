import { describe, it, expect, vi, beforeEach } from 'vitest';

let role = 'partner';
let partnerType = 'trek';
let bookingRows: any[] = [];
let propertyRows: any[] = [];
let bookingsError: any = null;
let viewsThrow = false;
const eqCalls: any[] = [];
const inCalls: any[] = [];

function builder(table: string) {
  const b: any = {
    select: () => b, order: () => b, limit: () => b,
    eq: (c: string, v: unknown) => { eqCalls.push({ table, c, v }); return b; },
    in: (c: string, v: unknown) => { inCalls.push({ table, c, v }); return b; },
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
      return { user: {}, profile: { id: 'p1', role, partner_type: partnerType } };
    },
  };
});
import { effectiveCollector } from '@/lib/manual-booking';
vi.mock('@/lib/manual-booking-emails', () => ({
  toBookingViews: async (rows: any[]) => { if (viewsThrow) throw new Error('lookup failed'); return rows.map((r) => ({ ...r, effective_collector: effectiveCollector(r), item_name: 'Trek', date_text: 'd', assignee_text: null, payment_text: 'p', partner_contact: null })); },
}));

import { GET } from '@/app/api/partner/bookings/route';
const get = () => GET(new Request('http://x'));

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  role = 'partner'; partnerType = 'trek'; bookingsError = null; viewsThrow = false; eqCalls.length = 0; inCalls.length = 0; propertyRows = [];
  bookingRows = [
    { id: 'b1', status: 'pending', guest_name: 'A', guest_phone: '111', guest_email: 'a@x.com', commission_pct: 20, created_by: 'admin', list_amount: 5, price_override_reason: 'x', amount: 100, commission_amount: 20, partner_share_amount: 80 },
    { id: 'b2', status: 'confirmed', guest_name: 'B', guest_phone: '222', guest_email: 'b@x.com', amount: 100 },
  ];
});

describe('GET /api/partner/bookings', () => {
  it('rejects a non-partner with 403', async () => {
    role = 'customer';
    expect((await get()).status).toBe(403);
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
    expect(bookings[0].partner_share_amount).toBe(80);
  });

  it('returns collected_by null for an unpaid admin booking', async () => {
    bookingRows = [{ id: 'b3', status: 'pending', booking_source: 'admin', payment_status: 'pending', collected_by: null, amount: 100, commission_amount: 20 }];
    const { bookings } = await (await get()).json();
    expect(bookings[0].collected_by).toBeNull();
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
