import { describe, expect, it } from 'vitest';
import { dayCells, monthDates, nightsOf, roomBadge, roomSummaries, roomsLeft, shiftMonth, weekdayOffset } from '@/lib/availability/calc';

const NOW = new Date('2099-10-13T12:00:00Z');
const stay = (check_in: string, check_out: string, over: Record<string, any> = {}) => ({
  status: 'confirmed', payment_method: 'pay_at_hotel', payment_status: 'pending', created_at: '2099-10-01T00:00:00Z', check_in, check_out, ...over,
});

describe('roomSummaries', () => {
  it('keeps unique named room types; only a positive room count is tracked', () => {
    expect(roomSummaries([
      { name: 'Standard', total_inventory: 3 }, { name: 'Dorm', total_inventory: 0 }, { name: 'Suite' },
      { name: 'Standard', total_inventory: 9 }, { name: '  ' }, null, { name: 'Loft', total_inventory: '2' },
    ])).toEqual([
      { key: 'Standard', tracked: true, total: 3 }, { key: 'Dorm', tracked: false, total: 0 },
      { key: 'Suite', tracked: false, total: 0 }, { key: 'Loft', tracked: true, total: 2 },
    ]);
    expect(roomSummaries(null)).toEqual([]);
  });
});

describe('roomsLeft', () => {
  it('uses the room count when no override is set', () => {
    const r = roomsLeft({ total: 3, overrides: {}, bookings: [stay('2099-10-20', '2099-10-22')], nights: nightsOf('2099-10-20', '2099-10-23'), now: NOW });
    expect(r.byNight).toEqual({ '2099-10-20': 2, '2099-10-21': 2, '2099-10-22': 3 });
    expect(r.left).toBe(2);
  });
  it('an override replaces the count for that night and the stay takes the lowest night', () => {
    const r = roomsLeft({ total: 3, overrides: { '2099-10-21': 0 }, bookings: [], nights: ['2099-10-20', '2099-10-21'], now: NOW });
    expect(r.byNight).toEqual({ '2099-10-20': 3, '2099-10-21': 0 });
    expect(r.left).toBe(0);
  });
  it('a check-out day is free for the next guest', () => {
    const r = roomsLeft({ total: 1, overrides: {}, bookings: [stay('2099-10-18', '2099-10-20')], nights: ['2099-10-20', '2099-10-21'], now: NOW });
    expect(r.left).toBe(1);
  });
  it('ignores bookings that do not hold a room and goes negative when oversold', () => {
    const r = roomsLeft({
      total: 1, overrides: {}, now: NOW, nights: ['2099-10-20'],
      bookings: [
        stay('2099-10-20', '2099-10-21'), stay('2099-10-19', '2099-10-22'),
        stay('2099-10-20', '2099-10-21', { status: 'cancelled' }),
        stay('2099-10-20', '2099-10-21', { payment_method: 'online', created_at: '2099-10-13T10:00:00Z' }),
      ],
    });
    expect(r.left).toBe(-1);
  });
  it('with no nights returns the room count', () => {
    expect(roomsLeft({ total: 2, overrides: {}, bookings: [], nights: [], now: NOW }).left).toBe(2);
  });
});

describe('dayCells', () => {
  it('shows open, booked and left per day and marks overrides', () => {
    expect(dayCells({
      total: 2, overrides: { '2099-10-21': 1 }, bookings: [stay('2099-10-20', '2099-10-22')],
      nights: ['2099-10-20', '2099-10-21', '2099-10-22'], now: NOW,
    })).toEqual([
      { date: '2099-10-20', open: 2, booked: 1, left: 1, override: false },
      { date: '2099-10-21', open: 1, booked: 1, left: 0, override: true },
      { date: '2099-10-22', open: 2, booked: 0, left: 2, override: false },
    ]);
  });
});

describe('month helpers', () => {
  it('monthDates lists every day of the month', () => {
    expect(monthDates('2099-10')).toHaveLength(31);
    expect(monthDates('2028-02')).toHaveLength(29);
    expect(monthDates('2026-02')[27]).toBe('2026-02-28');
    expect(monthDates('2026-02')).toHaveLength(28);
    expect(monthDates('2026-13')).toEqual([]);
  });
  it('shiftMonth crosses years', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-10', 14)).toBe('2027-12');
  });
  it('weekdayOffset is Monday-first', () => {
    expect(weekdayOffset('2026-06')).toBe(0); // 1 June 2026 is a Monday
    expect(weekdayOffset('2026-10')).toBe(3); // Thursday
    expect(weekdayOffset('2026-11')).toBe(6); // Sunday
  });
});

describe('roomBadge', () => {
  it('sold out at 0 or less, "few left" up to 3, nothing otherwise', () => {
    expect(roomBadge(undefined)).toBeNull();
    expect(roomBadge({ tracked: false, left: null })).toBeNull();
    expect(roomBadge({ tracked: true, left: 0 })).toEqual({ kind: 'sold_out' });
    expect(roomBadge({ tracked: true, left: -2 })).toEqual({ kind: 'sold_out' });
    expect(roomBadge({ tracked: true, left: 3 })).toEqual({ kind: 'few', left: 3 });
    expect(roomBadge({ tracked: true, left: 1 })).toEqual({ kind: 'few', left: 1 });
    expect(roomBadge({ tracked: true, left: 4 })).toBeNull();
  });
});
