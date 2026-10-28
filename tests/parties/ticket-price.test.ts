import { describe, expect, it } from 'vitest';
import { PARTIES, ticketPrice } from '@/data/parties';

describe('party ticket discount', () => {
  it('takes the percent off and rounds to whole rupees', () => {
    expect(ticketPrice(3999, 5)).toBe(3799);
    expect(ticketPrice(2499, 5)).toBe(2374);
    expect(ticketPrice(999, 0)).toBe(999);
    expect(ticketPrice(999)).toBe(999);
  });
  it('Panchvati NYE has 5% off every ticket', () => {
    const p = PARTIES.find((x) => x.slug === 'panchvati-new-year-eve-2026')!;
    expect(p.discountPct).toBe(5);
    expect(p.ticketTypes.map((t) => ticketPrice(t.price, p.discountPct))).toEqual([3799, 2374, 1424, 949]);
    // Tickets plus a room: one 5% off the whole order, not stacked.
    const room = p.rooms!.find((r) => r.id === 'super-deluxe')!;
    expect(ticketPrice(3999 + room.price, p.discountPct)).toBe(8548);
    expect(ticketPrice(2 * 3999 + 6999, p.discountPct)).toBe(Math.round(14997 * 0.95));
  });
});

describe('party deposit and balance', () => {
  it('charges only the deposit online when the customer chose to pay part now', async () => {
    const { onlineCharge, ticketMoney } = await import('@/data/parties');
    const ev = { category: 'event', event_slug: 'panchvati-new-year-eve-2026', amount: 8548 };
    expect(onlineCharge({ ...ev, payment_method: 'partial_online' })).toBe(500);
    expect(onlineCharge({ ...ev, payment_method: 'online' })).toBe(8548);
    expect(onlineCharge({ ...ev, amount: 400, payment_method: 'partial_online' })).toBe(400);
    expect(onlineCharge({ category: 'hotel', payment_method: 'partial_online', amount: 3000 })).toBe(3000);
    expect(ticketMoney({ amount: 8548, paid_amount: 500 })).toEqual({ total: 8548, paid: 500, balance: 8048 });
    expect(ticketMoney({ amount: 8548, paid_amount: 8548 }).balance).toBe(0);
  });
});
