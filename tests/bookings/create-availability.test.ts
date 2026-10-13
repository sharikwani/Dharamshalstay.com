import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const HOTEL_ID = '11111111-1111-4111-8111-111111111111';
const h = vi.hoisted(() => ({
  inserted: [] as any[], updates: [] as any[], waives: [] as any[], emails: [] as string[],
  avail: [] as any[], availCalls: [] as any[], throwOnCall: 0,
  hotel: {
    id: '11111111-1111-4111-8111-111111111111', name: 'Cedar Lodge', price_min: 500, commission_pct: 10,
    rooms: [
      { name: 'Standard', base_price: 1500, total_inventory: 2, rate_plans: [] },
      { name: 'Dorm', base_price: 500, rate_plans: [] },
      { name: 'Deluxe', base_price: 3000, extra_beds_max: 1, extra_bed_price: 800, rate_plans: [{ name: 'Breakfast', price: 3500 }] },
      { name: 'Old Wing', base_price: 1200, rate_plans: [], is_active: false },
    ],
  },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: table === 'properties' ? h.hotel : null }) }) }),
      insert: (row: any) => {
        if (table === 'bookings') h.inserted.push(row);
        return {
          select: () => ({ single: async () => ({ data: { id: 'b1', booking_ref: 'BKG-1', created_at: '2099-01-01T00:00:00.000Z', ...row }, error: null }) }),
          then: (r: any) => r({ error: null }),
        };
      },
      update: (patch: any) => ({ eq: (_c: string, id: string) => {
        h.updates.push({ table, patch, id });
        return { in: async (_col: string, vals: string[]) => { h.waives.push({ id, vals }); return { error: null }; }, then: (r: any) => r({ error: null }) };
      } }),
    }),
  }),
}));
vi.mock('@/lib/availability/store', () => ({
  availabilityFor: async (...args: any[]) => {
    h.availCalls.push(args);
    if (h.throwOnCall === h.availCalls.length) throw new Error('db down');
    return h.avail.shift() ?? {};
  },
}));
vi.mock('@/lib/booking-emails', () => ({ sendBookingEmails: async (id: string) => { h.emails.push(id); } }));

import { bookingSchema, createBooking } from '@/lib/bookings/create';

const input = (over: Record<string, any> = {}) => bookingSchema.parse({
  category: 'hotel', property_id: HOTEL_ID, guest_name: 'Asha Rao', guest_phone: '9999999999', num_guests: 2,
  check_in: '2099-10-21', check_out: '2099-10-23', room_name: 'Standard', payment_method: 'pay_at_hotel', ...over,
});
const book = (over: Record<string, any> = {}) => createBooking(input(over), { userId: null });

beforeEach(() => {
  Object.assign(h, { inserted: [], updates: [], waives: [], emails: [], avail: [], availCalls: [], throwOnCall: 0 });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://supabase.test');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
  vi.stubEnv('STRIPE_SECRET_KEY', '');
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('createBooking room availability', () => {
  it('refuses a sold-out room type with 409 and inserts nothing', async () => {
    h.avail = [{ Standard: { tracked: true, left: 0 } }];
    expect(await book()).toEqual({ ok: false, error: 'Sold out for these dates', status: 409 });
    expect(h.inserted).toEqual([]);
    expect(h.emails).toEqual([]);
    expect(h.availCalls[0].slice(0, 3)).toEqual([HOTEL_ID, '2099-10-21', '2099-10-23']);
  });

  it('books when a room is left, stores room_key and re-checks against the new booking', async () => {
    h.avail = [{ Standard: { tracked: true, left: 1 } }, { Standard: { tracked: true, left: 0 } }];
    const r = await book({ plan_name: 'Room Only' });
    expect(r).toMatchObject({ ok: true, booking: { id: 'b1' }, amount: 3000 });
    expect(h.inserted[0]).toMatchObject({ room_key: 'Standard', room_name: 'Standard - Room Only' });
    expect(h.availCalls).toHaveLength(2);
    expect(h.availCalls[1][3]).toMatchObject({ excludeAfter: { id: 'b1', created_at: '2099-01-01T00:00:00.000Z' } });
    expect(h.emails).toEqual(['b1']);
  });

  it('marks the new booking failed when the re-check finds a night oversold, and sends no emails', async () => {
    h.avail = [{ Standard: { tracked: true, left: 1 } }, { Standard: { tracked: true, left: -1 } }];
    expect(await book()).toEqual({ ok: false, error: 'Sold out for these dates', status: 409 });
    expect(h.updates).toEqual([{ table: 'bookings', patch: { status: 'failed', cancelled_reason: 'Sold out (race)', commission_status: 'waived' }, id: 'b1' },
      { table: 'commission_records', patch: { status: 'waived' }, id: 'b1' }]);
    expect(h.waives).toEqual([{ id: 'b1', vals: ['pending', 'due', 'overdue'] }]);
    expect(h.emails).toEqual([]);
  });

  it('leaves untracked room types alone', async () => {
    const r = await book({ room_name: 'Dorm' });
    expect(r.ok).toBe(true);
    expect(h.availCalls).toEqual([]);
    expect(h.inserted[0].room_key).toBe('Dorm');
  });

  it('stores room_key null for a room name that is not one of the room types', async () => {
    const r = await book({ room_name: 'Penthouse' });
    expect(r.ok).toBe(true);
    expect(h.availCalls).toEqual([]);
    expect(h.inserted[0].room_key).toBeNull();
  });

  it('pre-check failure: no booking, 503 with a clear message', async () => {
    h.throwOnCall = 1;
    expect(await book()).toEqual({ ok: false, error: 'Could not check room availability. Please try again in a minute.', status: 503 });
    expect(h.inserted).toEqual([]);
  });

  it('re-check failure: the booking that passed the pre-check is kept', async () => {
    h.avail = [{ Standard: { tracked: true, left: 1 } }];
    h.throwOnCall = 2;
    const r = await book();
    expect(r.ok).toBe(true);
    expect(h.updates).toEqual([]);
    expect(h.emails).toEqual(['b1']);
  });
});

describe('createBooking switched-off rooms', () => {
  it('refuses a room the hotel switched off with 409, before pricing or inserting', async () => {
    expect(await book({ room_name: 'Old Wing' })).toEqual({ ok: false, status: 409, error: 'This room is not available any more.' });
    expect(await book({ room_name: 'Old Wing', extra_beds: 1 })).toEqual({ ok: false, status: 409, error: 'This room is not available any more.' });
    expect(h.inserted).toEqual([]);
    expect(h.availCalls).toEqual([]);
    expect(h.emails).toEqual([]);
  });
  it('still books rooms without is_active (legacy) and active rooms', async () => {
    expect((await book({ room_name: 'Dorm' })).ok).toBe(true);
  });
});

describe('createBooking extra beds', () => {
  it('stores the beds in the room label and prices them', async () => {
    const r = await book({ room_name: 'Deluxe', plan_name: 'Breakfast', plan_index: 0, extra_beds: 1 });
    expect(r).toMatchObject({ ok: true, amount: 2 * (3500 + 800) });
    expect(h.inserted[0]).toMatchObject({ room_name: 'Deluxe - Breakfast + 1 extra bed', amount: 8600 });
  });
  it('labels beds without a plan', async () => {
    await book({ room_name: 'Deluxe', extra_beds: 1 });
    expect(h.inserted[0].room_name).toBe('Deluxe - 1 extra bed');
  });
  it('refuses too many beds with 400 before inserting', async () => {
    expect(await book({ room_name: 'Deluxe', extra_beds: 2 })).toEqual({ ok: false, status: 400, error: 'This room allows at most 1 extra bed(s)' });
    expect(await book({ room_name: 'Standard', extra_beds: 1 })).toEqual({ ok: false, status: 400, error: 'This room allows at most 0 extra bed(s)' });
    expect(h.inserted).toEqual([]);
    expect(h.availCalls).toEqual([]);
  });
});
