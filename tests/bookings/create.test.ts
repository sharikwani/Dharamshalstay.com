import { describe, expect, it } from 'vitest';
import { bookingSchema, dateProblem, roomLabel } from '@/lib/bookings/create';

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

describe('roomLabel', () => {
  it('adds the plan and extra beds', () => {
    expect(roomLabel({ room_name: 'Deluxe', plan_name: 'Breakfast', extra_beds: 1 })).toBe('Deluxe - Breakfast + 1 extra bed');
    expect(roomLabel({ room_name: 'Deluxe', extra_beds: 2 })).toBe('Deluxe - 2 extra beds');
    expect(roomLabel({ room_name: 'Deluxe', plan_name: 'Breakfast', extra_beds: 0 })).toBe('Deluxe - Breakfast');
    expect(roomLabel({ room_name: 'Deluxe' })).toBe('Deluxe');
    expect(roomLabel({ plan_name: 'Breakfast', extra_beds: 1 })).toBeNull();
  });
  it('bookingSchema defaults extra_beds to 0 and caps it at 3', () => {
    const base = { category: 'hotel', guest_name: 'Asha Rao', guest_phone: '9999999999' };
    expect(bookingSchema.parse(base).extra_beds).toBe(0);
    expect(bookingSchema.safeParse({ ...base, extra_beds: 4 }).success).toBe(false);
  });
});
