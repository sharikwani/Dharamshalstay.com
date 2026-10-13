// tests/reviews/ui-support.test.ts
import { describe, expect, it } from 'vitest';
import { en } from '@/lib/i18n/en';
import { hi } from '@/lib/i18n/hi';
import { CATEGORIES, TRIP_TYPES } from '@/lib/reviews/types';
import { MAX_EDGE, photosTooBig, scaledSize } from '@/lib/reviews/resize';

describe('review strings', () => {
  it('uses the approved thank-you message', () => {
    expect(en.reviews.form.thanks).toBe('Thanks – your review will appear after a quick check.');
  });
  it('labels every trip type and category in English and Hindi', () => {
    for (const d of [en, hi]) {
      for (const k of TRIP_TYPES) expect(d.reviews.trips[k]).toBeTruthy();
      for (const c of CATEGORIES) expect(d.reviews.categories[c]).toBeTruthy();
    }
  });
  it('really translates the Hindi page', () => {
    expect(hi.reviews.write).not.toBe(en.reviews.write);
    expect(hi.reviews.form.thanks).not.toBe(en.reviews.form.thanks);
  });
});

describe('photo shrinking', () => {
  it('scales the long side down to 1600 px and keeps the aspect ratio', () => {
    expect(MAX_EDGE).toBe(1600);
    expect(scaledSize(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(scaledSize(3000, 4000)).toEqual({ width: 1200, height: 1600 });
    expect(scaledSize(1200, 800)).toEqual({ width: 1200, height: 800 });
  });
  it('refuses three phone photos that would not fit one request (Vercel caps bodies at 4.5 MB)', () => {
    expect(photosTooBig([3_500_000, 4_200_000, 4_900_000])).toBe(true);
    expect(photosTooBig([400_000, 380_000, 520_000])).toBe(false);
    expect(photosTooBig([])).toBe(false);
  });
});
