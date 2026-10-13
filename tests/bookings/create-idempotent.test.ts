import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const TREK_ID = '22222222-2222-4222-8222-222222222222';
const RID = '33333333-3333-4333-8333-333333333333';
const h = vi.hoisted(() => ({
  inserted: [] as any[], lookups: [] as any[], emails: [] as string[], logs: [] as any[], waited: [] as Promise<unknown>[],
  existing: null as any, insertError: null as any, emailsFail: false,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: (col: string, val: string) => ({
          single: async () => ({ data: table === 'treks' ? { id: TREK_ID, name: 'Triund', price_per_person: 1500, commission_pct: 10 } : null }),
          maybeSingle: async () => { h.lookups.push([table, col, val]); return { data: h.existing, error: null }; },
        }),
      }),
      insert: (row: any) => {
        if (table === 'bookings') h.inserted.push(row);
        if (table === 'notification_log') h.logs.push(row);
        return {
          select: () => ({ single: async () => (h.insertError ? { data: null, error: h.insertError } : { data: { id: 'b1', booking_ref: 'TRK-1', created_at: '2099-01-01T00:00:00Z', ...row }, error: null }) }),
          then: (r: any) => r({ error: null }),
        };
      },
    }),
  }),
}));
vi.mock('@/lib/booking-emails', () => ({
  sendBookingEmails: async (id: string) => { if (h.emailsFail) throw new Error('smtp down'); h.emails.push(id); },
}));
vi.mock('@vercel/functions', () => ({ waitUntil: (p: Promise<unknown>) => { h.waited.push(p); } }));

import { bookingSchema, createBooking } from '@/lib/bookings/create';

const input = (over: Record<string, any> = {}) => bookingSchema.parse({
  category: 'trek', trek_id: TREK_ID, guest_name: 'Asha Rao', guest_phone: '9999999999', num_guests: 2,
  activity_date: '2099-10-21', payment_method: 'offline', ...over,
});
const settle = () => Promise.all(h.waited);

beforeEach(() => {
  Object.assign(h, { inserted: [], lookups: [], emails: [], logs: [], waited: [], existing: null, insertError: null, emailsFail: false });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://supabase.test');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
  vi.stubEnv('STRIPE_SECRET_KEY', '');
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('createBooking client_request_id', () => {
  it('accepts an optional uuid and rejects anything else', () => {
    expect(input({ client_request_id: RID }).client_request_id).toBe(RID);
    expect(input().client_request_id).toBeUndefined();
    expect(bookingSchema.safeParse({ ...input(), client_request_id: 'abc' }).success).toBe(false);
  });

  it('stores the request id on a new booking', async () => {
    const r = await createBooking(input({ client_request_id: RID }), { userId: null });
    expect(r).toMatchObject({ ok: true, booking: { id: 'b1', booking_ref: 'TRK-1' } });
    expect(r).not.toHaveProperty('duplicate');
    expect(h.inserted[0].client_request_id).toBe(RID);
    expect(h.lookups).toEqual([['bookings', 'client_request_id', RID]]);
    await settle();
    expect(h.emails).toEqual(['b1']);
  });

  it('leaves the column out when no request id is sent', async () => {
    await createBooking(input(), { userId: null });
    expect(h.inserted[0]).not.toHaveProperty('client_request_id');
    expect(h.lookups).toEqual([]);
  });

  it('returns the booking a retried request already made, with no insert and no notices', async () => {
    h.existing = { id: 'b0', booking_ref: 'TRK-0', amount: 3000, payment_method: 'offline', status: 'pending' };
    const r = await createBooking(input({ client_request_id: RID }), { userId: null });
    expect(r).toEqual({ ok: true, booking: { id: 'b0', booking_ref: 'TRK-0' }, amount: 3000, payment_method: 'offline', duplicate: true });
    expect(h.inserted).toEqual([]);
    await settle();
    expect(h.emails).toEqual([]);
    expect(h.logs).toEqual([]);
  });

  it('a concurrent duplicate that loses the unique index returns the other booking, with no notices', async () => {
    let calls = 0;
    const existing = { id: 'b0', booking_ref: 'TRK-0', amount: 3000, payment_method: 'online', status: 'pending' };
    Object.defineProperty(h, 'existing', { configurable: true, get: () => (calls++ === 0 ? null : existing), set: () => {} });
    h.insertError = { code: '23505', message: 'duplicate key value violates unique constraint "uq_bookings_client_request_id"' };
    const r = await createBooking(input({ client_request_id: RID }), { userId: null });
    Object.defineProperty(h, 'existing', { configurable: true, writable: true, value: null });
    expect(r).toEqual({ ok: true, booking: { id: 'b0', booking_ref: 'TRK-0' }, amount: 3000, payment_method: 'online', duplicate: true });
    await settle();
    expect(h.emails).toEqual([]);
    expect(h.logs).toEqual([]);
  });

  it('a retry of a request that lost the last room is still sold out', async () => {
    h.existing = { id: 'b0', booking_ref: 'TRK-0', amount: 3000, payment_method: 'offline', status: 'failed' };
    expect(await createBooking(input({ client_request_id: RID }), { userId: null })).toEqual({ ok: false, error: 'Sold out for these dates', status: 409 });
    expect(h.inserted).toEqual([]);
  });

  it('a unique violation without a request id is still a failure', async () => {
    h.insertError = { code: '23505', message: 'duplicate' };
    expect(await createBooking(input(), { userId: null })).toMatchObject({ ok: false, status: 500 });
  });
});

describe('createBooking notices in the background', () => {
  it('hands the booking emails to waitUntil', async () => {
    await createBooking(input(), { userId: null });
    expect(h.waited).toHaveLength(1);
    await settle();
    expect(h.emails).toEqual(['b1']);
  });

  it('a failing email never fails the committed booking', async () => {
    h.emailsFail = true;
    const r = await createBooking(input(), { userId: null });
    expect(r.ok).toBe(true);
    await settle();
  });
});
