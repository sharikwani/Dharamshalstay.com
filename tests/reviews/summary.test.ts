// tests/reviews/summary.test.ts
import { describe, expect, it } from 'vitest';
import { initialName, isVerifiedStay, monthLabel, shortQuote, summarize } from '@/lib/reviews/summary';
import { emptySummary, type RatingRow } from '@/lib/reviews/types';

const row = (rating: number, c: Partial<RatingRow> = {}): RatingRow => ({
  rating, rating_cleanliness: null, rating_location: null, rating_staff: null, rating_value: null, ...c,
});

describe('summarize', () => {
  it('returns the empty summary for no reviews', () => {
    expect(summarize([])).toEqual(emptySummary());
  });
  it('counts, averages to 1 decimal and builds the star distribution', () => {
    const s = summarize([row(5, { rating_cleanliness: 5, rating_staff: 4 }), row(4, { rating_cleanliness: 4 }), row(4)]);
    expect(s.count).toBe(3);
    expect(s.average).toBe(4.3);
    expect(s.distribution).toEqual([0, 0, 0, 2, 1]);
    expect(s.categories).toEqual({ cleanliness: 4.5, location: null, staff: 4, value: null });
  });
  it('ignores out-of-range values', () => {
    expect(summarize([row(0), row(5), row(7)]).count).toBe(1);
  });
});

describe('isVerifiedStay', () => {
  const today = '2026-10-13';
  it('matches the last 10 digits whatever the format, once checked out', () => {
    expect(isVerifiedStay('9805700665', [{ guest_phone: '+91 98057-00665', status: 'completed', check_out: '2026-10-12' }], today)).toBe(true);
    expect(isVerifiedStay('9805700665', [{ guest_phone: '09805700665', status: 'confirmed', check_out: '2026-10-13' }], today)).toBe(true);
  });
  it('needs a check-out today or earlier', () => {
    expect(isVerifiedStay('9805700665', [{ guest_phone: '9805700665', status: 'confirmed', check_out: '2026-10-14' }], today)).toBe(false);
    expect(isVerifiedStay('9805700665', [{ guest_phone: '9805700665', status: 'confirmed', check_out: null }], today)).toBe(false);
  });
  it('counts only confirmed and completed bookings', () => {
    for (const status of ['cancelled', 'failed', 'no_show', 'pending', 'awaiting_payment', '']) {
      expect(isVerifiedStay('9805700665', [{ guest_phone: '9805700665', status, check_out: '2026-10-01' }], today)).toBe(false);
    }
  });
  it('does not match a different number with the same last 4 digits, or a short number', () => {
    expect(isVerifiedStay('9805700665', [{ guest_phone: '9811100665', status: 'completed', check_out: '2026-10-01' }], today)).toBe(false);
    expect(isVerifiedStay('9805700665', [{ guest_phone: '00665', status: 'completed', check_out: '2026-10-01' }], today)).toBe(false);
  });
});

describe('labels', () => {
  it('monthLabel in English and Hindi, unknown input unchanged', () => {
    expect(monthLabel('2026-09')).toBe('Sep 2026');
    expect(monthLabel('2026-09', 'hi')).toBe('सितंबर 2026');
    expect(monthLabel('soon')).toBe('soon');
  });
  it('initialName gives the first initial', () => {
    expect(initialName('ravi kumar')).toBe('R.');
    expect(initialName('   ')).toBe('Guest');
  });
  it('shortQuote cuts long text at a word with an ellipsis', () => {
    expect(shortQuote('Short and sweet.')).toBe('Short and sweet.');
    const q = shortQuote('word '.repeat(100), 50);
    expect(q.length).toBeLessThanOrEqual(50);
    expect(q.endsWith('word…')).toBe(true);
  });
});
