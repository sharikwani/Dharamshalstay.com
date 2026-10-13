import { describe, expect, it, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({ rows: [] as any[], filters: [] as any[], claimRows: [{ id: 'q1' }] as any[], single: null as any }));
vi.mock('@/lib/server-auth', () => ({
  serviceClient: () => ({
    from: (t: string) => {
      const b: any = {
        select: () => b, order: () => b, limit: () => b,
        eq: (...a: any[]) => { h.filters.push(['eq', ...a]); return b; },
        ilike: (...a: any[]) => { h.filters.push(['ilike', ...a]); return b; },
        is: (...a: any[]) => { h.filters.push(['is', ...a]); return b; },
        gt: (...a: any[]) => { h.filters.push(['gt', ...a]); return b; },
        maybeSingle: async () => ({ data: h.single, error: null }),
        update: () => b,
        then: (res: any) => res((t === 'whatsapp_quotes' || t === 'whatsapp_cancellations') ? { data: h.claimRows, error: null } : { data: h.rows, error: null }),
      };
      return b;
    },
  }),
}));

import { claimCancellation, claimQuote, confirmedAfter, confirmedInOrder, findOwnBooking, latestQuote, ownBookings, samePhone } from '@/lib/wa-chat/booking-store';

beforeEach(() => { h.rows = []; h.filters = []; h.claimRows = [{ id: 'q1' }]; h.single = null; });

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
  it('ownBookings hides failed bookings (race losers)', async () => {
    h.rows = [
      { id: 'a', booking_ref: 'HTL-1', guest_phone: '9805700665', status: 'failed' },
      { id: 'b', booking_ref: 'HTL-2', guest_phone: '9805700665', status: 'pending' },
      { id: 'c', booking_ref: 'HTL-3', guest_phone: '9805700665', status: 'cancelled' },
    ];
    expect((await ownBookings('919805700665')).map((x) => x.id)).toEqual(['b', 'c']);
    expect(await findOwnBooking('919805700665', 'HTL-1')).toBeNull();
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
  it('claimCancellation is true only when a row was claimed', async () => {
    expect(await claimCancellation('x1')).toBe(true);
    h.claimRows = [];
    expect(await claimCancellation('x1')).toBe(false);
  });
  it('latestQuote asks for the newest quote of the conversation, used or expired included', async () => {
    h.single = { id: 'q9' };
    expect((await latestQuote('c1'))?.id).toBe('q9');
    expect(h.filters).toEqual([['eq', 'conversation_id', 'c1']]);
    h.single = null;
    expect(await latestQuote('c1')).toBeNull();
  });
  describe('confirmedInOrder', () => {
    const Q = '2026-10-13T10:00:00Z';
    const at = (s: number) => new Date(Date.parse(Q) + s * 1000).toISOString();
    it('needs an AI message after the quote and a customer reply after that', () => {
      expect(confirmedInOrder([{ author: 'ai', status: 'sent', created_at: at(1) }, { author: 'customer', created_at: at(5) }], Q)).toBe(true);
    });
    it('is false when the customer spoke but the AI never sent the summary (same-turn yes)', () => {
      expect(confirmedInOrder([{ author: 'customer', created_at: at(1) }], Q)).toBe(false);
    });
    it('is false when the customer message came before the summary was sent', () => {
      expect(confirmedInOrder([{ author: 'customer', created_at: at(1) }, { author: 'ai', status: 'sent', created_at: at(2) }], Q)).toBe(false);
    });
    it('ignores messages before the quote and failed AI sends', () => {
      expect(confirmedInOrder([{ author: 'ai', status: 'sent', created_at: at(-5) }, { author: 'customer', created_at: at(3) }], Q)).toBe(false);
      expect(confirmedInOrder([{ author: 'ai', status: 'failed', created_at: at(1) }, { author: 'customer', created_at: at(3) }], Q)).toBe(false);
    });
    it('ignores system notes (they never reached the customer)', () => {
      expect(confirmedInOrder([{ author: 'ai', kind: 'system', status: 'sent', created_at: at(1) }, { author: 'customer', created_at: at(5) }], Q)).toBe(false);
    });
    it('sorts rows itself and ignores admin messages', () => {
      expect(confirmedInOrder([{ author: 'customer', created_at: at(9) }, { author: 'admin', created_at: at(1) }, { author: 'ai', created_at: at(4) }], Q)).toBe(true);
    });
    it('confirmedAfter reads the conversation messages after the quote', async () => {
      h.rows = [{ author: 'ai', status: 'sent', created_at: at(1) }, { author: 'customer', status: 'received', created_at: at(2) }];
      expect(await confirmedAfter('c1', Q)).toBe(true);
      expect(h.filters).toContainEqual(['eq', 'conversation_id', 'c1']);
      expect(h.filters).toContainEqual(['gt', 'created_at', Q]);
    });
  });
});
