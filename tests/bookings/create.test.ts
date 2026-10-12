import { describe, expect, it } from 'vitest';
import { dateProblem } from '@/lib/bookings/create';

describe('dateProblem', () => {
  const today = '2026-10-13';
  it('accepts a valid hotel stay', () => {
    expect(dateProblem({ category: 'hotel', check_in: '2026-10-14', check_out: '2026-10-15' }, today)).toBeNull();
  });
  it('rejects past dates and reversed stays', () => {
    expect(dateProblem({ category: 'hotel', check_in: '2026-10-12', check_out: '2026-10-15' }, today)).toBe('Check-in date cannot be in the past');
    expect(dateProblem({ category: 'hotel', check_in: '2026-10-15', check_out: '2026-10-15' }, today)).toBe('Check-out must be after check-in');
    expect(dateProblem({ category: 'trek', activity_date: '2026-10-01' }, today)).toBe('Activity date cannot be in the past');
  });
  it('requires both hotel dates', () => {
    expect(dateProblem({ category: 'hotel', check_in: '2026-10-14' }, today)).toBe('Check-in and check-out dates are required for hotel bookings');
  });
});
