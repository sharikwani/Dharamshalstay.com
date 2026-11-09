import { describe, it, expect, beforeAll } from 'vitest';

beforeAll(() => { process.env.BOOKING_LINK_SECRET = 'test-secret'; });

describe('partner review links', () => {
  it('round-trips a booking id and rejects tampering', async () => {
    const { reviewToken, bookingIdFromToken, partnerReviewUrl } = await import('@/lib/partner-reviews');
    const id = 'b9e0f205-fc53-4a2c-a6e6-8de63288c8d0';
    const t = reviewToken(id);
    expect(bookingIdFromToken(t)).toBe(id);
    expect(partnerReviewUrl(id)).toMatch(/\/rate\/[0-9a-f]{32}\.[A-Za-z0-9_-]{22}$/);
    const other = 'b9e0f205-fc53-4a2c-a6e6-8de63288c8d1';
    expect(bookingIdFromToken(other.replace(/-/g, '') + '.' + t.split('.')[1])).toBeNull();
    expect(bookingIdFromToken(t.slice(0, -1) + (t.endsWith('A') ? 'B' : 'A'))).toBeNull();
    expect(bookingIdFromToken('nonsense')).toBeNull();
  });
});
