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
  });
});
