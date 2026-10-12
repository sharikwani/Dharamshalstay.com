import { describe, expect, it } from 'vitest';
import { hoursUntilStart, startsAt, todayIST } from '@/lib/bookings/timing';

describe('timing', () => {
  it('todayIST rolls over at IST midnight', () => {
    expect(todayIST(new Date('2026-10-12T18:29:00Z'))).toBe('2026-10-12');
    expect(todayIST(new Date('2026-10-12T18:31:00Z'))).toBe('2026-10-13');
  });
  it('hotel starts at check-in date 00:00 IST', () => {
    expect(startsAt({ category: 'hotel', check_in: '2026-10-20' })?.toISOString()).toBe('2026-10-19T18:30:00.000Z');
  });
  it('activity uses pickup time when set', () => {
    expect(startsAt({ category: 'taxi', activity_date: '2026-10-20', pickup_time: '9:30' })?.toISOString()).toBe('2026-10-20T04:00:00.000Z');
    expect(startsAt({ category: 'trek', activity_date: '2026-10-20', pickup_time: '06:15:00' })?.toISOString()).toBe('2026-10-20T00:45:00.000Z');
  });
  it('hotel ignores pickup_time', () => {
    expect(startsAt({ category: 'hotel', check_in: '2026-10-20', pickup_time: '10:00' })?.toISOString()).toBe('2026-10-19T18:30:00.000Z');
  });
  it('returns null without a usable date', () => {
    expect(startsAt({ category: 'trek', activity_date: null })).toBeNull();
    expect(startsAt({ category: 'hotel', check_in: 'tomorrow' })).toBeNull();
    expect(hoursUntilStart({ category: 'trek' })).toBeNull();
  });
  it('hoursUntilStart counts from now', () => {
    expect(hoursUntilStart({ category: 'trek', activity_date: '2026-10-20' }, new Date('2026-10-18T18:30:00Z'))).toBe(24);
  });
});
