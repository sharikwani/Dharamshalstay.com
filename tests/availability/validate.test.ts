import { describe, expect, it } from 'vitest';
import { isMonth, isUuid, parseUnits, rangeProblem } from '@/lib/availability/validate';

const KEYS = ['Standard', 'Deluxe'];
const T = '2026-10-13';
const ok = { room_key: 'Standard', from: '2026-10-20', to: '2026-10-25', units: 0 };

describe('rangeProblem', () => {
  it('accepts a valid range, including today and a single day', () => {
    expect(rangeProblem(ok, KEYS, T)).toBeNull();
    expect(rangeProblem({ ...ok, from: T, to: T, units: 999 }, KEYS, T)).toBeNull();
  });
  it('requires one of the property\'s room types', () => {
    expect(rangeProblem({ ...ok, room_key: 'Penthouse' }, KEYS, T)).toBe("Choose one of this property's room types");
    expect(rangeProblem({ ...ok, room_key: undefined }, KEYS, T)).toBe("Choose one of this property's room types");
  });
  it('requires real YYYY-MM-DD dates in order, not in the past', () => {
    expect(rangeProblem({ ...ok, from: '2026-10-32' }, KEYS, T)).toBe('Dates must be YYYY-MM-DD');
    expect(rangeProblem({ ...ok, to: '25/10/2026' }, KEYS, T)).toBe('Dates must be YYYY-MM-DD');
    expect(rangeProblem({ ...ok, from: '2026-10-26' }, KEYS, T)).toBe('The start date must be on or before the end date');
    expect(rangeProblem({ ...ok, from: '2026-10-12' }, KEYS, T)).toBe('Dates cannot be in the past');
  });
  it('allows at most 366 days', () => {
    expect(rangeProblem({ ...ok, to: '2027-10-20' }, KEYS, T)).toBeNull();
    expect(rangeProblem({ ...ok, to: '2027-10-21' }, KEYS, T)).toBe('At most 366 days at a time');
  });
  it('requires whole-number units from 0 to 999', () => {
    for (const units of [1000, -1, 1.5, '3', null, undefined]) {
      expect(rangeProblem({ ...ok, units }, KEYS, T)).toBe('Rooms open must be a whole number from 0 to 999');
    }
  });
});

describe('parseUnits', () => {
  it('never turns an empty or bad box into 0', () => {
    expect(parseUnits('')).toBeNull();
    expect(parseUnits('   ')).toBeNull();
    expect(parseUnits('abc')).toBeNull();
    expect(parseUnits('1.5')).toBeNull();
    expect(parseUnits('-1')).toBeNull();
    expect(parseUnits('1000')).toBeNull();
  });
  it('reads whole numbers 0-999', () => {
    expect(parseUnits('0')).toBe(0);
    expect(parseUnits(' 5 ')).toBe(5);
    expect(parseUnits('999')).toBe(999);
  });
});

describe('isMonth / isUuid', () => {
  it('checks formats', () => {
    expect(isMonth('2026-10')).toBe(true);
    expect(isMonth('2026-13')).toBe(false);
    expect(isMonth('2026-1')).toBe(false);
    expect(isMonth(null)).toBe(false);
    expect(isUuid('11111111-1111-4111-8111-111111111111')).toBe(true);
    expect(isUuid('nope')).toBe(false);
    expect(isUuid(null)).toBe(false);
  });
});
