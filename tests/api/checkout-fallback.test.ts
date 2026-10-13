import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const h = vi.hoisted(() => ({
  link: { ok: true, url: 'https://pay/cs_1', sessionId: 'cs_1' } as any, booking: null as any, commission: 0,
  updates: [] as any[], emails: [] as string[],
}));
vi.mock('@/lib/bookings/checkout', () => ({ createCheckoutLink: async () => { if (h.link === 'throw') throw new Error('stripe down'); return h.link; } }));
vi.mock('@/lib/booking-emails', () => ({ sendBookingEmails: async (id: string) => { h.emails.push(id); } }));
vi.mock('@/lib/server-auth', () => ({
  serviceClient: () => ({
    from: () => ({
      select: (cols: string) => ({ eq: () => ({ single: async () => ({ data: cols === 'commission_amount' ? { commission_amount: h.commission } : h.booking }) }) }),
      update: (row: any) => { h.updates.push(row); const u: any = { eq: () => u, or: () => u, select: () => u, then: (res: any) => res({ data: [{ id: 'b1' }], error: null }) }; return u; },
    }),
  }),
}));

import { POST } from '@/app/api/checkout/route';

const fresh = (over: any = {}) => ({
  id: 'b1', category: 'hotel', status: 'pending', payment_method: 'online', payment_status: 'pending', booking_source: 'website',
  offer_code: null, created_at: new Date(Date.now() - 60e3).toISOString(), ...over,
});
const post = (body: any) => POST(new Request('http://x/api/checkout', { method: 'POST', body: JSON.stringify(body) }) as any);

beforeEach(() => {
  Object.assign(h, { link: { ok: true, url: 'https://pay/cs_1', sessionId: 'cs_1' }, booking: fresh(), commission: 0, updates: [], emails: [] });
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('POST /api/checkout pay-later fallback', () => {
  it('returns the link when Stripe works', async () => {
    const res = await post({ bookingId: 'b1', payLaterIfUnavailable: true });
    expect(await res.json()).toEqual({ url: 'https://pay/cs_1', sessionId: 'cs_1' });
    expect(h.updates).toEqual([]);
  });

  it('switches a fresh website booking to pay at the hotel and sends the booking emails when Stripe throws', async () => {
    h.link = 'throw';
    h.commission = 600;
    const res = await post({ bookingId: 'b1', payLaterIfUnavailable: true });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ pay_later: true, payment_method: 'pay_at_hotel' });
    expect(h.updates).toEqual([{ payment_method: 'pay_at_hotel', commission_status: 'pending' }]);
    expect(h.emails).toEqual(['b1']);
  });

  it('uses offline for non-hotel bookings and leaves commission alone when there is none', async () => {
    h.booking = fresh({ category: 'trek' });
    h.link = { ok: false, error: 'Stripe error', status: 500 };
    expect(await (await post({ bookingId: 'b1', payLaterIfUnavailable: true })).json()).toEqual({ pay_later: true, payment_method: 'offline' });
    expect(h.updates).toEqual([{ payment_method: 'offline' }]);
  });

  it('never switches without the form flag, for old, paid, offer or non-online bookings, or for a refusal', async () => {
    h.link = 'throw';
    expect((await post({ bookingId: 'b1' })).status).toBe(500);
    for (const b of [fresh({ created_at: new Date(Date.now() - 60 * 60e3).toISOString() }), fresh({ payment_status: 'paid' }),
      fresh({ offer_code: 'PINE-1' }), fresh({ payment_method: 'pay_at_hotel' }), fresh({ status: 'cancelled' }), fresh({ booking_source: 'whatsapp' })]) {
      h.booking = b;
      expect((await post({ bookingId: 'b1', payLaterIfUnavailable: true })).status).toBe(500);
    }
    h.booking = fresh();
    h.link = { ok: false, error: 'This booking is already paid', status: 409 };
    expect((await post({ bookingId: 'b1', payLaterIfUnavailable: true })).status).toBe(409);
    expect(h.updates).toEqual([]);
    expect(h.emails).toEqual([]);
  });
});
