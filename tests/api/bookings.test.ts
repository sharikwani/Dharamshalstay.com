import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const inserted: Record<string, any>[] = [];
const hotel = {
  id: '11111111-1111-4111-8111-111111111111', name: 'Test Hotel', price_min: 1000, commission_pct: 12,
  rooms: [
    { name: 'Deluxe', base_price: 2000, rate_plans: [{ price: 2500 }, { price: 3000 }] },
    { name: 'Standard', base_price: 1500, rate_plans: [] },
  ],
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: table === 'properties' ? hotel : null }) }),
      }),
      insert: (row: Record<string, any>) => {
        if (table === 'bookings') inserted.push(row);
        return {
          select: () => ({ single: async () => ({ data: { id: 'b1', booking_ref: 'BKG-1', ...row }, error: null }) }),
          then: (r: any) => r({ error: null }),
        };
      },
    }),
  }),
}));
const sendBookingEmails = vi.fn(async (_id: string) => {});
vi.mock('@/lib/booking-emails', () => ({ sendBookingEmails: (id: string) => sendBookingEmails(id) }));

const getCaller = vi.fn(async (_req: any): Promise<any> => null);
vi.mock('@/lib/server-auth', () => ({ getCaller: (r: any) => getCaller(r) }));

import { POST } from '@/app/api/bookings/route';

const payload = (over: Record<string, any> = {}) => ({
  category: 'hotel', property_id: hotel.id, guest_name: 'Test Guest', guest_phone: '9999999999', num_guests: 2,
  check_in: '2099-01-10', check_out: '2099-01-12', room_name: 'Deluxe', plan_name: 'Breakfast', plan_index: 1,
  payment_method: 'offline', booking_source: 'website', amount: 1, commission_pct: 0, ...over,
});
const post = (body: any) => POST(new Request('http://x/api/bookings', { method: 'POST', body: JSON.stringify(body) }) as any);

describe('POST /api/bookings', () => {
  beforeEach(() => {
    inserted.length = 0; sendBookingEmails.mockClear(); getCaller.mockReset(); getCaller.mockResolvedValue(null);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://supabase.test');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
    vi.stubEnv('STRIPE_SECRET_KEY', '');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('rejects booking_source admin from the public API', async () => {
    const res = await post(payload({ booking_source: 'admin' }));
    expect(res.status).toBe(400);
    expect(inserted).toHaveLength(0);
  });

  it('prices the selected plan on the server and ignores tampered amounts', async () => {
    const res = await post(payload());
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(inserted[0].amount).toBe(6000); // 3000 x 2 nights
    expect(inserted[0].commission_pct).toBe(12);
    expect(inserted[0].room_name).toBe('Deluxe - Breakfast');
    expect(json.amount).toBe(6000);
    expect(sendBookingEmails).toHaveBeenCalledWith('b1');
  });

  it('ignores a user_id in the body and stores null for anonymous callers', async () => {
    await post(payload({ user_id: '99999999-9999-4999-8999-999999999999' }));
    expect(inserted[0].user_id).toBeNull();
  });

  it('stores the authenticated caller id, not the body user_id', async () => {
    getCaller.mockResolvedValue({ user: { id: 'caller-1' }, profile: {} });
    await post(payload({ user_id: '99999999-9999-4999-8999-999999999999' }));
    expect(inserted[0].user_id).toBe('caller-1');
  });

  it('downgrades online to offline when Stripe is not configured, and still sends emails', async () => {
    const res = await post(payload({ payment_method: 'online' }));
    const json = await res.json();
    expect(json.payment_method).toBe('offline');
    expect(inserted[0].payment_method).toBe('offline');
    expect(inserted[0].commission_status).toBe('pending');
    expect(sendBookingEmails).toHaveBeenCalledTimes(1);
  });

  it('keeps online when Stripe is configured and defers emails to the webhook', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_x');
    const json = await (await post(payload({ payment_method: 'online' }))).json();
    expect(json.payment_method).toBe('online');
    expect(sendBookingEmails).not.toHaveBeenCalled();
  });
});
