// tests/bookings/create-offer.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const h = vi.hoisted(() => ({
  inserted: [] as any[], emails: [] as string[],
  hotel: { id: '11111111-1111-4111-8111-111111111111', name: 'Panchvati Cottages', price_min: 4000, commission_pct: 12, rooms: [] as any[] },
}));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: table === 'properties' ? h.hotel : null }) }) }),
      insert: (row: any) => {
        if (table === 'bookings') h.inserted.push(row);
        return {
          select: () => ({ single: async () => ({ data: { id: 'b1', booking_ref: 'HTL-1', ...row }, error: null }) }),
          then: (r: any) => r({ error: null }),
        };
      },
    }),
  }),
}));
vi.mock('@/lib/booking-emails', () => ({ sendBookingEmails: async (id: string) => { h.emails.push(id); } }));

import { bookingSchema, createBooking } from '@/lib/bookings/create';
import { OFFER_NEEDS_ONLINE } from '@/lib/offers/rules';

// No room_name: hotel priced from price_min (4000/night), so no room-availability lookup is involved.
const input = (over: Record<string, unknown> = {}) => bookingSchema.parse({
  category: 'hotel', property_id: h.hotel.id, guest_name: 'Asha Rao', guest_phone: '919800000001', num_guests: 2,
  check_in: '2099-01-10', check_out: '2099-01-12', payment_method: 'online', booking_source: 'whatsapp', ...over,
});
const OFFER = { code: 'PNV-7K3Q9', percent: 25 };

beforeEach(() => {
  h.inserted.length = 0; h.emails.length = 0;
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://sb');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'key');
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test');
});
afterEach(() => vi.unstubAllEnvs());

describe('createBooking with an offer', () => {
  it('takes the offer percent off the server price and records the code', async () => {
    const r = await createBooking(input(), { userId: null, callerRole: null, offer: OFFER });
    expect(r).toMatchObject({ ok: true, amount: 6000, payment_method: 'online' });
    expect(h.inserted[0]).toMatchObject({
      amount: 6000, payment_method: 'online', offer_code: 'PNV-7K3Q9', offer_percent: 25,
      commission_amount: 720, commission_status: 'not_applicable',
    });
    expect(h.emails).toEqual([]);
  });
  it('refuses an offer booking that is not paid online', async () => {
    expect(await createBooking(input({ payment_method: 'pay_at_hotel' }), { userId: null, callerRole: null, offer: OFFER }))
      .toEqual({ ok: false, error: OFFER_NEEDS_ONLINE, status: 400 });
    expect(h.inserted).toEqual([]);
  });
  it('refuses an offer booking when online payment is not set up', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    expect(await createBooking(input(), { userId: null, callerRole: null, offer: OFFER }))
      .toEqual({ ok: false, error: OFFER_NEEDS_ONLINE, status: 400 });
    expect(h.inserted).toEqual([]);
  });
  it('leaves bookings without an offer as they were', async () => {
    const r = await createBooking(input({ payment_method: 'pay_at_hotel' }), { userId: null, callerRole: null });
    expect(r).toMatchObject({ ok: true, amount: 8000 });
    expect(h.inserted[0]).not.toHaveProperty('offer_code');
    expect(h.inserted[0]).not.toHaveProperty('offer_percent');
  });
});
