import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const h = vi.hoisted(() => ({ booking: null as any, updates: [] as any[], created: [] as any[], avail: {} as any, availCalls: [] as any[] }));
vi.mock('@/lib/availability/store', () => ({ availabilityFor: async (...a: any[]) => { h.availCalls.push(a); return h.avail; } }));
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
import { ONLINE_HOLD_MS } from '@/lib/availability/calc';

beforeEach(() => {
  h.booking = { id: 'b1', booking_ref: 'TRK-1', amount: 3000, category: 'trek', activity_date: '2026-10-24', payment_status: 'pending' };
  h.updates = []; h.created = []; h.avail = {}; h.availCalls = [];
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test'); vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.dharamshalastay.com');
});
afterEach(() => vi.unstubAllEnvs());

describe('createCheckoutLink', () => {
  it('creates a session and stores it on the booking', async () => {
    expect(await createCheckoutLink('b1')).toEqual({ ok: true, url: 'https://pay/cs_1', sessionId: 'cs_1' });
    expect(h.created[0].line_items[0].price_data.unit_amount).toBe(300000);
    expect(h.updates[0]).toEqual({ stripe_session_id: 'cs_1' });
  });
  it('refuses paid, missing and unpriced bookings', async () => {
    h.booking.payment_status = 'paid';
    expect(await createCheckoutLink('b1')).toMatchObject({ ok: false, status: 409 });
    h.booking = { ...h.booking, payment_status: 'pending', amount: 0 };
    expect(await createCheckoutLink('b1')).toMatchObject({ ok: false, status: 400 });
    h.booking = null;
    expect(await createCheckoutLink('b1')).toMatchObject({ ok: false, status: 404 });
  });
  it('refuses failed, cancelled and no-show bookings', async () => {
    for (const status of ['failed', 'cancelled', 'no_show']) {
      h.booking.status = status;
      expect(await createCheckoutLink('b1')).toEqual({ ok: false, error: 'This booking can no longer be paid', status: 409 });
    }
    expect(h.created).toHaveLength(0);
  });
  it('passes a Stripe expiry 31 minutes out, inside the 35-minute room hold', async () => {
    const before = Math.floor(Date.now() / 1000);
    await createCheckoutLink('b1');
    const exp = h.created[0].expires_at;
    expect(exp).toBeGreaterThanOrEqual(before + 31 * 60);
    expect(exp).toBeLessThanOrEqual(Math.floor(Date.now() / 1000) + 31 * 60);
    expect(exp - before).toBeLessThan(ONLINE_HOLD_MS / 1000);
  });

  describe('hotel booking whose online hold has lapsed', () => {
    const hotel = (over: any = {}) => ({
      id: 'b1', booking_ref: 'HTL-1', amount: 5000, category: 'hotel', property_id: 'p1', check_in: '2099-10-20', check_out: '2099-10-22',
      room_key: 'Deluxe', room_name: 'Deluxe - Breakfast', status: 'pending', payment_method: 'online', payment_status: 'pending',
      created_at: new Date(Date.now() - 40 * 60e3).toISOString(), ...over,
    });
    it('refuses when the room type is now sold out for the stay', async () => {
      h.booking = hotel();
      h.avail = { Deluxe: { tracked: true, left: 0 }, Suite: { tracked: true, left: 2 } };
      expect(await createCheckoutLink('b1')).toEqual({ ok: false, error: 'Sold out for these dates', status: 409 });
      expect(h.availCalls[0].slice(0, 3)).toEqual(['p1', '2099-10-20', '2099-10-22']);
      expect(h.created).toHaveLength(0);
    });
    it('matches old bookings by room name when room_key is missing', async () => {
      h.booking = hotel({ room_key: null });
      h.avail = { Deluxe: { tracked: true, left: 0 } };
      expect(await createCheckoutLink('b1')).toMatchObject({ ok: false, status: 409, error: 'Sold out for these dates' });
    });
    it('allows payment when a room is still left or the room is not tracked', async () => {
      h.booking = hotel();
      h.avail = { Deluxe: { tracked: true, left: 1 } };
      expect(await createCheckoutLink('b1')).toMatchObject({ ok: true });
      h.avail = { Deluxe: { tracked: false, left: null } };
      expect(await createCheckoutLink('b1')).toMatchObject({ ok: true });
    });
    it('does not re-check while the hold is live, or for pay-later and non-hotel bookings', async () => {
      h.avail = { Deluxe: { tracked: true, left: 0 } };
      for (const b of [hotel({ created_at: new Date().toISOString() }), hotel({ payment_method: 'pay_at_hotel' }), { ...hotel(), category: 'trek', property_id: null }]) {
        h.booking = b;
        expect(await createCheckoutLink('b1')).toMatchObject({ ok: true });
      }
      expect(h.availCalls).toHaveLength(0);
    });
  });

  it('is unavailable without Stripe', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    expect(await createCheckoutLink('b1')).toMatchObject({ ok: false, status: 503 });
  });
});
