// tests/reviews/validate.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkPhotoCount, checkReviewPhoto, currentMonthIST, hashIp, normalizeReviewPhone, parseReview } from '@/lib/reviews/validate';

const PID = '11111111-1111-4111-8111-111111111111';
const NOW = new Date('2026-10-13T06:00:00Z');
const base = {
  property_id: PID, name: 'Ravi Kumar', phone: '+91 98057-00665', rating: '5',
  rating_cleanliness: '4', rating_location: '', rating_staff: '5', rating_value: '',
  title: 'Lovely quiet stay', body: 'Clean rooms, warm staff and a great view of the Dhauladhar range.',
  stay_month: '2026-09', trip_type: 'couple',
};
const err = (over: Record<string, unknown>, now = NOW) => {
  const r = parseReview({ ...base, ...over }, now);
  return r.ok ? null : r.error;
};

describe('normalizeReviewPhone', () => {
  it('keeps the last 10 digits whatever the format', () => {
    expect(normalizeReviewPhone('+91 98057-00665')).toBe('9805700665');
    expect(normalizeReviewPhone('09805700665')).toBe('9805700665');
    expect(normalizeReviewPhone('919805700665')).toBe('9805700665');
    expect(normalizeReviewPhone('9805700665')).toBe('9805700665');
  });
  it('rejects too short or too long numbers', () => {
    expect(normalizeReviewPhone('98057')).toBeNull();
    expect(normalizeReviewPhone('1234567890123456')).toBeNull();
    expect(normalizeReviewPhone(undefined)).toBeNull();
  });
});

describe('missing fields', () => {
  it('give the same friendly message as too-short values', () => {
    expect(err({ name: undefined })).toBe(err({ name: 'a' }));
    expect(err({ phone: undefined })).toBe('Please enter a valid mobile number.');
    expect(err({ title: undefined })).toBe(err({ title: 'abc' }));
    expect(err({ body: undefined })).toBe(err({ body: 'short' }));
  });
});

describe('parseReview', () => {
  it('accepts a full review and normalises it', () => {
    expect(parseReview(base, NOW)).toEqual({
      ok: true,
      data: {
        property_id: PID, name: 'Ravi Kumar', phone: '9805700665', rating: 5,
        rating_cleanliness: 4, rating_location: null, rating_staff: 5, rating_value: null,
        title: 'Lovely quiet stay', body: base.body, stay_month: '2026-09', trip_type: 'couple',
      },
    });
  });
  it('rejects bad overall ratings', () => {
    for (const rating of ['', '0', '6', '4.5', 'x']) expect(err({ rating })).toBe('Please choose an overall rating from 1 to 5.');
  });
  it('rejects a bad optional category rating', () => {
    expect(err({ rating_staff: '9' })).toBe('Ratings must be from 1 to 5.');
  });
  it('enforces title and text lengths after trimming', () => {
    expect(err({ title: 'Nice' })).toBe('The title needs at least 5 characters.');
    expect(err({ title: 'x'.repeat(101) })).toBe('Please keep the title under 100 characters.');
    expect(err({ body: 'x'.repeat(29) })).toBe('Please write at least 30 characters.');
    expect(err({ body: 'x'.repeat(2001) })).toBe('Please keep your review under 2000 characters.');
    expect(err({ body: '   ' + 'x'.repeat(30) + '   ' })).toBeNull();
  });
  it('rejects an invalid phone, name, trip type and property', () => {
    expect(err({ phone: '12345' })).toBe('Please enter a valid mobile number.');
    expect(err({ name: 'R' })).toBe('Please enter your name.');
    expect(err({ name: 'x'.repeat(61) })).toBe('Please keep your name under 60 characters.');
    expect(err({ trip_type: 'pilgrimage' })).toBe('Please choose a trip type.');
    expect(err({ property_id: 'abc' })).toBe('Unknown property.');
  });
  it('accepts this month in India and rejects next month, across the IST month boundary', () => {
    const lateOct31Utc = new Date('2026-10-31T19:00:00Z'); // already 1 Nov 00:30 in India
    expect(currentMonthIST(lateOct31Utc)).toBe('2026-11');
    expect(err({ stay_month: '2026-11' }, lateOct31Utc)).toBeNull();
    expect(err({ stay_month: '2026-12' }, lateOct31Utc)).toBe('The month of your stay cannot be in the future.');
    expect(err({ stay_month: '2026-11' })).toBe('The month of your stay cannot be in the future.');
    expect(err({ stay_month: '2026-13' })).toBe('Please choose the month you stayed.');
    expect(err({ stay_month: 'Sept 2026' })).toBe('Please choose the month you stayed.');
  });
});

describe('photos', () => {
  const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
  it('accepts real JPEG, PNG and WebP up to 5 MB', () => {
    expect(checkReviewPhoto({ type: 'image/jpeg', size: 100, head: jpg })).toBeNull();
    expect(checkReviewPhoto({ type: 'image/png', size: 100, head: png })).toBeNull();
    expect(checkReviewPhoto({ type: 'image/webp', size: 100, head: webp })).toBeNull();
    expect(checkReviewPhoto({ type: 'image/jpeg', size: 5 * 1024 * 1024, head: jpg })).toBeNull();
  });
  it('rejects other types, empty, oversized and disguised files', () => {
    expect(checkReviewPhoto({ type: 'image/gif', size: 100, head: jpg })).toBe('Photos must be JPG, PNG or WebP.');
    expect(checkReviewPhoto({ type: 'image/jpeg', size: 0, head: jpg })).toBe('One of the photos is empty.');
    expect(checkReviewPhoto({ type: 'image/jpeg', size: 5 * 1024 * 1024 + 1, head: jpg })).toBe('Each photo must be 5 MB or smaller.');
    expect(checkReviewPhoto({ type: 'image/png', size: 100, head: jpg })).toMatch(/does not look like a real image/);
  });
  it('refuses inherited property names as a type', () => {
    for (const type of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
      expect(checkReviewPhoto({ type, size: 100, head: jpg })).toBe('Photos must be JPG, PNG or WebP.');
    }
  });
  it('allows at most 3 photos', () => {
    expect(checkPhotoCount(3)).toBeNull();
    expect(checkPhotoCount(4)).toBe('You can add up to 3 photos.');
  });
});

describe('hashIp', () => {
  it('is stable, differs per IP and does not contain the IP', () => {
    expect(hashIp('1.2.3.4')).toBe(hashIp('1.2.3.4'));
    expect(hashIp('1.2.3.4')).not.toBe(hashIp('1.2.3.5'));
    expect(hashIp('1.2.3.4')).toMatch(/^[a-f0-9]{64}$/);
  });
  describe('salt', () => {
    afterEach(() => vi.unstubAllEnvs());
    it('falls back to the service role key, and the output never contains the IP', () => {
      vi.stubEnv('REVIEW_IP_SALT', '');
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
      const unsalted = hashIp('1.2.3.4');
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
      const fallback = hashIp('1.2.3.4');
      expect(fallback).not.toBe(unsalted);
      expect(fallback).not.toContain('1.2.3.4');
      vi.stubEnv('REVIEW_IP_SALT', 'own-salt');
      const own = hashIp('1.2.3.4');
      expect(own).not.toBe(fallback);
      expect(own).not.toContain('1.2.3.4');
    });
  });
});
