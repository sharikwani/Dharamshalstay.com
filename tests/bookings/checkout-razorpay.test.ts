import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const h = vi.hoisted(() => ({ booking: null as any, updates: [] as any[], calls: [] as { method: string; path: string; body: any }[], cancelFails: false, stripe: 0 }));
vi.mock('@/lib/availability/store', () => ({ availabilityFor: async () => ({}) }));
vi.mock('@/lib/server-auth', () => ({
  serviceClient: () => ({
    from: (t: string) => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: t === 'bookings' ? h.booking : { name: 'Pine View' } }) }) }),
      update: (row: any) => ({ eq: async () => { h.updates.push(row); return { error: null }; } }),
    }),
  }),
}));
vi.mock('@/lib/stripe', () => ({ getStripe: () => { h.stripe++; return {}; } }));
vi.mock('@/lib/razorpay', async (orig) => ({
  ...(await orig<typeof import('@/lib/razorpay')>()),
  razorpay: async (method: string, path: string, body?: any) => {
    h.calls.push({ method, path, body });
    if (path.endsWith('/cancel') && h.cancelFails) throw new Error('already paid');
    return { id: 'plink_1', short_url: 'https://rzp.io/i/abc' };
  },
}));

import { createCheckoutLink } from '@/lib/bookings/checkout';

beforeEach(() => {
  h.booking = { id: 'b1-uuid-long', booking_ref: 'HTL-1', amount: 4500, category: 'trek', activity_date: '2026-10-24', payment_status: 'pending',
    guest_name: 'Asha Rao', guest_email: 'asha@example.com', guest_phone: '+91 98160 70150' };
  h.updates = []; h.calls = []; h.cancelFails = false; h.stripe = 0;
  vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_live_x'); vi.stubEnv('RAZORPAY_KEY_SECRET', 'secret');
  vi.stubEnv('STRIPE_SECRET_KEY', ''); vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.dharamshalastay.com');
});
afterEach(() => vi.unstubAllEnvs());

describe('createCheckoutLink with Razorpay', () => {
  it('creates a payment link in paise and stores it on the booking', async () => {
    expect(await createCheckoutLink('b1')).toEqual({ ok: true, url: 'https://rzp.io/i/abc', sessionId: 'plink_1' });
    const c = h.calls[0];
    expect(c).toMatchObject({ method: 'POST', path: '/payment_links' });
    expect(c.body).toMatchObject({
      amount: 450000, currency: 'INR', accept_partial: false, notify: { sms: false, email: false },
      notes: { booking_id: 'b1-uuid-long', booking_ref: 'HTL-1' },
      customer: { name: 'Asha Rao', email: 'asha@example.com', contact: '+919816070150' }, callback_method: 'get',
    });
    expect(c.body.callback_url).toMatch(/^https:\/\/www\.dharamshalastay\.com\/booking\/success\?ref=HTL-1&k=/);
    expect(c.body.reference_id).toMatch(/^HTL-1-/);
    expect(c.body.reference_id.length).toBeLessThanOrEqual(40);
    expect(h.updates[0]).toEqual({ razorpay_link_id: 'plink_1' });
    expect(h.stripe).toBe(0);
  });
  it('gives each link its own reference id', async () => {
    await createCheckoutLink('b1');
    await new Promise((r) => setTimeout(r, 2));
    await createCheckoutLink('b1');
    expect(h.calls[0].body.reference_id).not.toBe(h.calls[1].body.reference_id);
  });
  it('expires the link 31 minutes out, inside the room hold', async () => {
    const before = Math.floor(Date.now() / 1000);
    await createCheckoutLink('b1');
    expect(h.calls[0].body.expire_by).toBeGreaterThanOrEqual(before + 31 * 60);
  });
  it('cancels the previous link first, and still makes a new one when it cannot be cancelled', async () => {
    h.booking.razorpay_link_id = 'plink_old';
    h.cancelFails = true;
    expect(await createCheckoutLink('b1')).toMatchObject({ ok: true, sessionId: 'plink_1' });
    expect(h.calls.map((c) => c.path)).toEqual(['/payment_links/plink_old/cancel', '/payment_links']);
  });
  it('leaves out customer details Razorpay would reject', async () => {
    h.booking = { ...h.booking, guest_name: null, guest_email: 'not-an-email', guest_phone: '12345' };
    await createCheckoutLink('b1');
    expect(h.calls[0].body).not.toHaveProperty('customer');
  });
  it('still refuses a paid booking without calling Razorpay', async () => {
    h.booking.payment_status = 'paid';
    expect(await createCheckoutLink('b1')).toMatchObject({ ok: false, status: 409 });
    expect(h.calls).toHaveLength(0);
  });
  it('is unavailable with neither Razorpay nor Stripe', async () => {
    vi.stubEnv('RAZORPAY_KEY_SECRET', '');
    expect(await createCheckoutLink('b1')).toMatchObject({ ok: false, status: 503 });
  });
});
