/**
 * lib/date-helpers.ts — Date validation helpers
 * 
 * Centralized date logic used by ALL date inputs across the site.
 * Handles the mobile date picker bug where min attribute is ignored.
 */

/** Returns today's date as YYYY-MM-DD in IST */
export function getTodayIST(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  return ist.toISOString().split('T')[0];
}

/** Enforce: if selected date is before min, reset to min */
export function clampDateToMin(value: string, min: string): string {
  if (!value) return value;
  if (value < min) return min;
  return value;
}

/** For check-in: enforce today or later */
export function enforceCheckIn(value: string): string {
  return clampDateToMin(value, getTodayIST());
}

/** For check-out: enforce day after check-in (or today+1 if no check-in) */
export function enforceCheckOut(value: string, checkIn: string): string {
  const minCheckout = getMinCheckoutDate(checkIn);
  return clampDateToMin(value, minCheckout);
}

/** Min date for all date inputs = today IST */
export function getMinDate(): string {
  return getTodayIST();
}

/** Min checkout = day after check-in */
export function getMinCheckoutDate(checkIn: string): string {
  if (!checkIn) return getMinDate();
  const d = new Date(checkIn + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

/** Validate hotel booking dates */
export function validateBookingDates(checkIn: string, checkOut: string): { valid: boolean; error?: string } {
  const today = getTodayIST();
  if (!checkIn) return { valid: false, error: 'Check-in date is required' };
  if (!checkOut) return { valid: false, error: 'Check-out date is required' };
  if (checkIn < today) return { valid: false, error: 'Check-in cannot be in the past' };
  if (checkOut <= checkIn) return { valid: false, error: 'Check-out must be after check-in' };
  return { valid: true };
}

/** Validate activity/pickup date */
export function validateActivityDate(date: string): { valid: boolean; error?: string } {
  if (!date) return { valid: false, error: 'Date is required' };
  if (date < getTodayIST()) return { valid: false, error: 'Date cannot be in the past' };
  return { valid: true };
}

/** Enforce activity date: clamp to today or later */
export function enforceActivityDate(value: string): string {
  return clampDateToMin(value, getTodayIST());
}
