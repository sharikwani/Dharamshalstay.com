import { describe, expect, it, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({ rows: [] as any[], filters: [] as any[], claimRows: [{ id: 'q1' }] as any[] }));
vi.mock('@/lib/server-auth', () => ({
  serviceClient: () => ({
    from: (t: string) => {
      const b: any = {
        select: () => b, order: () => b, limit: () => b,
        eq: (...a: any[]) => { h.filters.push(['eq', ...a]); return b; },
        ilike: (...a: any[]) => { h.filters.push(['ilike', ...a]); return b; },
        is: () => b,
        update: () => b,
        then: (res: any) => res(t === 'whatsapp_quotes' ? { data: h.claimRows, error: null } : { data: h.rows, error: null }),
      };
      return b;
    },
  }),
}));

import { claimQuote, findOwnBooking, ownBookings, samePhone } from '@/lib/wa-chat/booking-store';

beforeEach(() => { h.rows = []; h.filters = []; h.claimRows = [{ id: 'q1' }]; });

describe('booking-store', () => {
  it('samePhone compares the last 10 digits', () => {
    expect(samePhone('919805700665', '+91 98057-00665')).toBe(true);
    expect(samePhone('9805700665', '919805700665')).toBe(true);
    expect(samePhone('919805700665', '919811100665')).toBe(false);
    expect(samePhone('00665', '919805700665')).toBe(false);
  });
  it('ownBookings narrows by last 4 digits then keeps exact 10-digit matches', async () => {
    h.rows = [
      { id: 'a', booking_ref: 'TRK-1', guest_phone: '+91 98057 00665' },
      { id: 'b', booking_ref: 'TRK-2', guest_phone: '9811100665' },
      { id: 'c', booking_ref: 'TRK-3', guest_phone: '9805700665' },
    ];
    const r = await ownBookings('919805700665');
    expect(r.map((x) => x.id)).toEqual(['a', 'c']);
    expect(h.filters).toContainEqual(['ilike', 'guest_phone', '%0665']);
  });
  it('findOwnBooking matches the ref case-insensitively among own bookings only', async () => {
    h.rows = [{ id: 'a', booking_ref: 'TRK-1', guest_phone: '9811100665' }];
    expect(await findOwnBooking('919805700665', 'trk-1')).toBeNull();
    h.rows = [{ id: 'a', booking_ref: 'TRK-1', guest_phone: '9805700665' }];
    expect((await findOwnBooking('919805700665', ' trk-1 '))?.id).toBe('a');
  });
  it('claimQuote is true only when a row was claimed', async () => {
    expect(await claimQuote('q1')).toBe(true);
    h.claimRows = [];
    expect(await claimQuote('q1')).toBe(false);
  });
});
