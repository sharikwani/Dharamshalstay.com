import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  commission: 0, changed: [[{ id: 'b1' }]] as any[][], current: { payment_method: 'online' } as any,
  updates: [] as any[], filters: [] as any[], emails: [] as string[],
}));
vi.mock('@/lib/booking-emails', () => ({ sendBookingEmails: async (id: string) => { h.emails.push(id); } }));
vi.mock('@/lib/server-auth', () => ({
  serviceClient: () => ({
    from: () => ({
      select: (cols: string) => {
        const r = { data: cols === 'commission_amount' ? { commission_amount: h.commission } : h.current, error: null };
        return { eq: () => ({ single: async () => r, maybeSingle: async () => r }) };
      },
      update: (row: any) => {
        h.updates.push(row);
        const u: any = {
          eq: (c: string, v: unknown) => { h.filters.push(['eq', c, v]); return u; },
          or: (f: string) => { h.filters.push(['or', f]); return u; },
          select: () => u,
          then: (res: any) => res({ data: h.changed.shift() ?? [], error: null }),
        };
        return u;
      },
    }),
  }),
}));

import { fallbackToPayLater } from '@/lib/bookings/pay-later';

beforeEach(() => {
  Object.assign(h, { commission: 0, changed: [[{ id: 'b1' }]], current: { payment_method: 'online' }, updates: [], filters: [], emails: [] });
});

describe('fallbackToPayLater', () => {
  it('switches only a still-online, unpaid booking and sends the booking emails', async () => {
    expect(await fallbackToPayLater('b1', 'hotel')).toBe('pay_at_hotel');
    expect(h.filters).toEqual([['eq', 'id', 'b1'], ['eq', 'payment_method', 'online'], ['or', 'payment_status.is.null,payment_status.not.in.(paid,partially_paid)']]);
    expect(h.emails).toEqual(['b1']);
  });

  it('two concurrent callers: only the one that changed the row sends the emails', async () => {
    h.changed = [[{ id: 'b1' }], []];
    const [a, b] = await Promise.all([fallbackToPayLater('b1', 'trek'), (h.current = { payment_method: 'offline' }, fallbackToPayLater('b1', 'trek'))]);
    expect([a, b]).toEqual(['offline', 'offline']);
    expect(h.emails).toEqual(['b1']);
  });

  it('a booking paid or switched to something else meanwhile is left alone and gets no emails', async () => {
    h.changed = [[]];
    h.current = { payment_method: 'online' };
    expect(await fallbackToPayLater('b1', 'hotel')).toBeNull();
    expect(h.emails).toEqual([]);
  });
});
