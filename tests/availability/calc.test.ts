import { describe, expect, it } from 'vitest';
import { addDays, createdAfter, dayCount, holdsRoom, isDate, matchesRoom, nightsOf, ONLINE_HOLD_MS, roomCount } from '@/lib/availability/calc';

const NOW = new Date('2026-10-13T12:00:00Z');
const bk = (over: Record<string, any> = {}) => ({
  status: 'pending', payment_method: 'online', payment_status: 'pending', created_at: '2026-10-13T11:50:00Z', ...over,
});

describe('dates', () => {
  it('isDate accepts only real calendar dates', () => {
    expect(isDate('2026-10-13')).toBe(true);
    expect(isDate('2028-02-29')).toBe(true);
    expect(isDate('2026-02-29')).toBe(false);
    expect(isDate('2026-13-01')).toBe(false);
    expect(isDate('13-10-2026')).toBe(false);
    expect(isDate(null)).toBe(false);
  });
  it('addDays and dayCount cross month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(dayCount('2026-10-20', '2026-10-25')).toBe(6);
    expect(dayCount('2026-10-20', '2026-10-20')).toBe(1);
  });
  it('nightsOf lists each night, not the check-out day', () => {
    expect(nightsOf('2026-12-30', '2027-01-02')).toEqual(['2026-12-30', '2026-12-31', '2027-01-01']);
    expect(nightsOf('2026-10-21', '2026-10-21')).toEqual([]);
    expect(nightsOf('2026-10-22', '2026-10-21')).toEqual([]);
    expect(nightsOf('2026-02-30', '2026-03-02')).toEqual([]);
  });
});

describe('holdsRoom', () => {
  it('pay-later bookings hold in every live status, whatever their age', () => {
    for (const m of ['offline', 'pay_at_hotel']) for (const s of ['pending', 'confirmed', 'completed'])
      expect(holdsRoom(bk({ payment_method: m, status: s, created_at: '2026-01-01T00:00:00Z' }), NOW)).toBe(true);
  });
  it('cancelled, failed and no-show bookings never hold', () => {
    for (const s of ['cancelled', 'failed', 'no_show']) {
      expect(holdsRoom(bk({ status: s, payment_method: 'pay_at_hotel' }), NOW)).toBe(false);
      expect(holdsRoom(bk({ status: s, payment_status: 'paid' }), NOW)).toBe(false);
    }
  });
  it('paid online bookings hold at any age', () => {
    expect(holdsRoom(bk({ payment_status: 'paid', created_at: '2026-01-01T00:00:00Z' }), NOW)).toBe(true);
    expect(holdsRoom(bk({ payment_method: 'partial_online', payment_status: 'partially_paid', created_at: '2026-01-01T00:00:00Z' }), NOW)).toBe(true);
  });
  it('unpaid online bookings hold for 35 minutes only (a 30-minute Stripe session always ends inside it)', () => {
    expect(ONLINE_HOLD_MS).toBe(35 * 60e3);
    expect(holdsRoom(bk({ created_at: '2026-10-13T11:25:01Z' }), NOW)).toBe(true);
    expect(holdsRoom(bk({ created_at: '2026-10-13T11:25:00Z' }), NOW)).toBe(false);
    expect(holdsRoom(bk({ created_at: '2026-10-13T09:00:00Z', payment_status: 'failed' }), NOW)).toBe(false);
    expect(holdsRoom(bk({ payment_method: 'partial_online', created_at: '2026-10-13T09:00:00Z' }), NOW)).toBe(false);
  });
  it('treats a missing status as pending and a missing method as pay later', () => {
    expect(holdsRoom(bk({ status: null, payment_method: null, created_at: '2026-01-01T00:00:00Z' }), NOW)).toBe(true);
  });
});

describe('matchesRoom', () => {
  it('uses room_key when it is set', () => {
    expect(matchesRoom({ room_key: 'Standard', room_name: 'Deluxe - Breakfast' }, 'Standard')).toBe(true);
    expect(matchesRoom({ room_key: 'Standard Plus', room_name: 'Standard - Breakfast' }, 'Standard')).toBe(false);
  });
  it('falls back to the room name and its plan suffix for old bookings', () => {
    expect(matchesRoom({ room_key: null, room_name: 'Standard' }, 'Standard')).toBe(true);
    expect(matchesRoom({ room_key: null, room_name: 'Standard - Breakfast' }, 'Standard')).toBe(true);
    expect(matchesRoom({ room_key: null, room_name: 'Standard Plus - Breakfast' }, 'Standard')).toBe(false);
    expect(matchesRoom({ room_key: null, room_name: 'Standard Plus' }, 'Standard')).toBe(false);
    expect(matchesRoom({ room_key: null, room_name: null }, 'Standard')).toBe(false);
  });
});

describe('createdAfter', () => {
  const ref = { id: 'b', created_at: '2026-10-13T10:00:00.000Z' };
  it('orders by time, then by id for the same instant', () => {
    expect(createdAfter({ id: 'a', created_at: '2026-10-13T10:00:01Z' }, ref)).toBe(true);
    expect(createdAfter({ id: 'z', created_at: '2026-10-13T09:59:59Z' }, ref)).toBe(false);
    expect(createdAfter({ id: 'c', created_at: '2026-10-13T10:00:00Z' }, ref)).toBe(true);
    expect(createdAfter({ id: 'a', created_at: '2026-10-13T10:00:00Z' }, ref)).toBe(false);
    expect(createdAfter(ref, ref)).toBe(false);
  });
});

describe('roomCount', () => {
  it('keeps only positive whole numbers; anything else means not tracked (no default of 1)', () => {
    expect(roomCount(4)).toBe(4);
    expect(roomCount('3')).toBe(3);
    expect(roomCount(1)).toBe(1);
    for (const v of [undefined, null, '', '  ', 0, '0', -2, 2.5, '2.5', 'abc', NaN, true, [3], {}]) expect(roomCount(v)).toBeNull();
  });
});
