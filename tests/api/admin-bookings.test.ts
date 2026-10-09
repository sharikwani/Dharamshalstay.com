import { describe, it, expect, vi, beforeEach } from 'vitest';

let role = 'admin';
let fixtures: Record<string, any> = {};
let insertError: any = null;
const inserts: any[] = [];
const sendManualBookingEmails = vi.fn(async (..._a: unknown[]) => {});

function builder(table: string) {
  let inserting = false;
  const b: any = {
    select: () => b, eq: () => b, in: () => b, order: () => b,
    insert: (row: any) => { inserting = true; inserts.push({ table, row }); return b; },
    maybeSingle: async () => ({ data: fixtures[table] ?? null, error: null }),
    single: async () => inserting
      ? (insertError ? { data: null, error: insertError } : { data: { id: 'b1', booking_ref: 'TRK-1' }, error: null })
      : { data: fixtures[table] ?? null, error: null },
  };
  return b;
}
const sb = { from: (t: string) => builder(t) };

vi.mock('@/lib/server-auth', async (orig) => {
  const actual = await orig<typeof import('@/lib/server-auth')>();
  return {
    ...actual,
    serviceClient: () => sb,
    requireCaller: async (_req: Request, roles?: string[]) => {
      if (roles && !roles.includes(role)) throw new actual.HttpError(403, 'You do not have access to this');
      return { user: {}, profile: { id: 'admin1', role } };
    },
  };
});
vi.mock('@/lib/manual-booking-emails', () => ({ sendManualBookingEmails: (...a: unknown[]) => sendManualBookingEmails(...a) }));

import { POST } from '@/app/api/admin/bookings/route';

const base = {
  category: 'trek', item_id: '11111111-1111-4111-8111-111111111111', activity_date: '2099-01-10',
  num_guests: 3, guest_name: 'Asha Rao', guest_phone: '9876543210', guest_email: 'a@x.com',
  payment: { choice: 'partner_collects' },
  partner_id: '22222222-2222-4222-8222-222222222222',
};
const post = (body: unknown) => POST(new Request('http://x', { method: 'POST', body: JSON.stringify(body) }));

beforeEach(() => {
  role = 'admin'; insertError = null; inserts.length = 0; sendManualBookingEmails.mockClear();
  fixtures = {
    treks: { id: 't1', status: 'published', price_per_person: 1500, commission_pct: null },
    profiles: { id: 'p1', role: 'partner', partner_type: 'trek', partner_status: 'verified', commission_pct: 20 },
  };
});

describe('POST /api/admin/bookings', () => {
  it('rejects a non-admin with 403', async () => {
    role = 'partner';
    expect((await post(base)).status).toBe(403);
  });

  it('creates a trek booking with server-side pricing and commission', async () => {
    const res = await post(base);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 'b1', booking_ref: 'TRK-1' });
    const row = inserts[0].row;
    expect(inserts[0].table).toBe('bookings');
    expect(row).toMatchObject({
      amount: 4500, list_amount: 4500, price_overridden: false, commission_pct: 20, commission_amount: 900,
      partner_share_amount: 3600, booking_source: 'admin', status: 'confirmed', partner_id: 'p1', created_by: 'admin1',
      collected_by: 'partner',
    });
    expect(sendManualBookingEmails).toHaveBeenCalledWith('b1', { customer: true, partner: true });
  });

  it('records a price override', async () => {
    const res = await post({ ...base, final_amount: 4000, price_override_reason: 'group' });
    expect(res.status).toBe(200);
    expect(inserts[0].row).toMatchObject({ amount: 4000, list_amount: 4500, price_overridden: true, commission_amount: 800 });
  });

  it('rejects an unverified partner', async () => {
    fixtures.profiles = { ...fixtures.profiles, partner_status: 'pending_verification' };
    const res = await post(base);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/approved/);
    expect(inserts).toHaveLength(0);
  });

  it("rejects a driver of another partner", async () => {
    fixtures.partner_staff = { id: 's1', partner_id: 'other', role: 'guide', active: true };
    const res = await post({ ...base, staff_id: '33333333-3333-4333-8333-333333333333' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/does not belong/);
  });

  it('requires a price for a custom taxi trip', async () => {
    const res = await post({ category: 'taxi', item_id: null, activity_date: '2099-01-10', pickup_location: 'A', drop_location: 'B',
      num_guests: 2, guest_name: 'Asha Rao', guest_phone: '9876543210', payment: { choice: 'unpaid' } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Enter the price for a custom trip.');
  });

  it('rejects a past date unless allowed', async () => {
    const past = { ...base, activity_date: '2020-01-01' };
    const res = await post(past);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/past/);
    expect((await post({ ...past, allow_past_date: true })).status).toBe(200);
  });

  it('returns 500 and sends no email when the insert fails', async () => {
    insertError = { message: 'db down' };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await post(base);
    expect(res.status).toBe(500);
    expect(sendManualBookingEmails).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('rejects an unpublished item', async () => {
    fixtures.treks = { ...fixtures.treks, status: 'draft' };
    const res = await post(base);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('This item is not available for booking.');
    expect(inserts).toHaveLength(0);
  });

  it('requires a price when the catalogue price is 0', async () => {
    fixtures.treks = { ...fixtures.treks, price_per_person: 0 };
    const res = await post(base);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Enter the price for this booking.');
    expect((await post({ ...base, final_amount: 3000 })).status).toBe(200);
  });
});
