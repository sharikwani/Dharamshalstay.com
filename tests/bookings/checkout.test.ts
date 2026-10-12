import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const h = vi.hoisted(() => ({ booking: null as any, updates: [] as any[], created: [] as any[] }));
vi.mock('@/lib/server-auth', () => ({
  serviceClient: () => ({
    from: (t: string) => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: t === 'bookings' ? h.booking : { name: 'Pine View' } }) }) }),
      update: (row: any) => ({ eq: async () => { h.updates.push(row); return { error: null }; } }),
    }),
  }),
}));
vi.mock('@/lib/stripe', () => ({ getStripe: () => ({ checkout: { sessions: { create: async (p: any) => { h.created.push(p); return { id: 'cs_1', url: 'https://pay/cs_1' }; } } } }) }));

import { createCheckoutLink } from '@/lib/bookings/checkout';

beforeEach(() => {
  h.booking = { id: 'b1', booking_ref: 'TRK-1', amount: 3000, category: 'trek', activity_date: '2026-10-24', payment_status: 'pending' };
  h.updates = []; h.created = [];
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test'); vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.dharamshalastay.com');
});
afterEach(() => vi.unstubAllEnvs());

describe('createCheckoutLink', () => {
  it('creates a session and stores it on the booking', async () => {
    expect(await createCheckoutLink('b1')).toEqual({ ok: true, url: 'https://pay/cs_1', sessionId: 'cs_1' });
    expect(h.created[0].line_items[0].price_data.unit_amount).toBe(300000);
    expect(h.updates[0]).toEqual({ stripe_session_id: 'cs_1', payment_method: 'online' });
  });
  it('refuses paid, missing and unpriced bookings', async () => {
    h.booking.payment_status = 'paid';
    expect(await createCheckoutLink('b1')).toMatchObject({ ok: false, status: 409 });
    h.booking = { ...h.booking, payment_status: 'pending', amount: 0 };
    expect(await createCheckoutLink('b1')).toMatchObject({ ok: false, status: 400 });
    h.booking = null;
    expect(await createCheckoutLink('b1')).toMatchObject({ ok: false, status: 404 });
  });
  it('is unavailable without Stripe', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    expect(await createCheckoutLink('b1')).toMatchObject({ ok: false, status: 503 });
  });
});
