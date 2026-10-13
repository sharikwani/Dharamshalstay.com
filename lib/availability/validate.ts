import { todayIST } from '@/lib/bookings/timing';
import { dayCount, isDate, MAX_DAYS } from './calc';

export const MAX_UNITS = 999;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isMonth = (s: unknown): s is string => typeof s === 'string' && MONTH.test(s);
export const isUuid = (s: unknown): s is string => typeof s === 'string' && UUID.test(s);

/** The calendar's "Rooms open" box. Null for empty or invalid text, so an empty box never saves 0 (sold out). */
export function parseUnits(s: string): number | null {
  const t = s.trim();
  return /^\d{1,3}$/.test(t) ? Number(t) : null;
}

export type RangeInput = { room_key?: unknown; from?: unknown; to?: unknown; units?: unknown };

/** Null when the range can be saved, else a message for the person editing (spec section 5, Validation). */
export function rangeProblem(input: RangeInput, roomKeys: string[], today = todayIST()): string | null {
  const { room_key, from, to, units } = input;
  if (typeof room_key !== 'string' || !roomKeys.includes(room_key)) return "Choose one of this property's room types";
  if (!isDate(from) || !isDate(to)) return 'Dates must be YYYY-MM-DD';
  if (from > to) return 'The start date must be on or before the end date';
  if (from < today) return 'Dates cannot be in the past';
  if (dayCount(from, to) > MAX_DAYS) return `At most ${MAX_DAYS} days at a time`;
  if (typeof units !== 'number' || !Number.isInteger(units) || units < 0 || units > MAX_UNITS) {
    return `Rooms open must be a whole number from 0 to ${MAX_UNITS}`;
  }
  return null;
}
