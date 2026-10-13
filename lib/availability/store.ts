// lib/availability/store.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { serviceClient } from '@/lib/server-auth';
import {
  addDays, createdAfter, dayCells, dayCount, matchesRoom, MAX_DAYS, monthDates, nightsOf, roomSummaries, roomsLeft,
  type DayCell, type RoomSummary, type StayBooking,
} from './calc';

export type PropertySummary = { id: string; name: string; owner_id: string | null; rooms: RoomSummary[] };
export type RoomAvailability = { tracked: false; left: null } | { tracked: true; left: number };
export type MonthGrid = { room_key: string; tracked: boolean; total: number; days: DayCell[] };
export type StoreOpts = { sb?: SupabaseClient; now?: Date; excludeAfter?: { id: string; created_at: string } };

const PROPERTY_COLS = 'id, name, owner_id, rooms';
const BOOKING_COLS = 'id, room_key, room_name, check_in, check_out, status, payment_method, payment_status, created_at';

const toSummary = (row: any): PropertySummary => ({ id: row.id, name: row.name || '', owner_id: row.owner_id ?? null, rooms: roomSummaries(row.rooms) });

export async function loadProperty(id: string, sb: SupabaseClient = serviceClient()): Promise<PropertySummary | null> {
  const { data, error } = await sb.from('properties').select(PROPERTY_COLS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? toSummary(data) : null;
}

export async function ownedProperties(ownerId: string, sb: SupabaseClient = serviceClient()): Promise<PropertySummary[]> {
  const { data, error } = await sb.from('properties').select(PROPERTY_COLS).eq('owner_id', ownerId).order('name');
  if (error) throw error;
  return ((data || []) as any[]).map(toSummary);
}

/** Overrides per room type and the live bookings touching any night in [from, to). */
async function loadStayData(sb: SupabaseClient, propertyId: string, from: string, to: string) {
  const [ov, bk] = await Promise.all([
    sb.from('room_availability').select('room_key, date, units').eq('property_id', propertyId).gte('date', from).lt('date', to),
    sb.from('bookings').select(BOOKING_COLS).eq('property_id', propertyId).lt('check_in', to).gt('check_out', from)
      .not('status', 'in', '(cancelled,failed,no_show)'),
  ]);
  if (ov.error) throw ov.error;
  if (bk.error) throw bk.error;
  const overrides: Record<string, Record<string, number>> = {};
  for (const r of (ov.data || []) as any[]) {
    const room = (overrides[r.room_key] = overrides[r.room_key] || {});
    room[String(r.date).slice(0, 10)] = Number(r.units);
  }
  return { overrides, bookings: (bk.data || []) as StayBooking[] };
}

/** Rooms left for a stay, per room type. Untracked room types: { tracked: false, left: null }. */
export async function availabilityFor(propertyId: string, checkIn: string, checkOut: string, opts: StoreOpts = {}): Promise<Record<string, RoomAvailability>> {
  const sb = opts.sb ?? serviceClient();
  const out: Record<string, RoomAvailability> = {};
  const prop = await loadProperty(propertyId, sb);
  if (!prop) return out;
  const tracked = prop.rooms.filter((r) => r.tracked);
  for (const r of prop.rooms) if (!r.tracked) out[r.key] = { tracked: false, left: null };
  const nights = nightsOf(checkIn, checkOut);
  if (!tracked.length || !nights.length) {
    for (const r of tracked) out[r.key] = { tracked: true, left: r.total };
    return out;
  }
  const { overrides, bookings } = await loadStayData(sb, propertyId, nights[0], addDays(nights[nights.length - 1], 1));
  const ref = opts.excludeAfter;
  const counted = ref ? bookings.filter((b) => !createdAfter(b, ref)) : bookings;
  for (const r of tracked) {
    const { left } = roomsLeft({ total: r.total, overrides: overrides[r.key] || {}, bookings: counted.filter((b) => matchesRoom(b, r.key)), nights, now: opts.now });
    out[r.key] = { tracked: true, left };
  }
  return out;
}

/** Open / booked / left for each day of a month, for the partner and admin calendars. */
export async function monthGrid(propertyId: string, roomKey: string, month: string, opts: StoreOpts = {}): Promise<MonthGrid | null> {
  const sb = opts.sb ?? serviceClient();
  const prop = await loadProperty(propertyId, sb);
  const room = prop?.rooms.find((r) => r.key === roomKey);
  if (!room) return null;
  const dates = monthDates(month);
  if (!room.tracked || !dates.length) return { room_key: roomKey, tracked: room.tracked, total: room.total, days: [] };
  const { overrides, bookings } = await loadStayData(sb, propertyId, dates[0], addDays(dates[dates.length - 1], 1));
  return {
    room_key: roomKey, tracked: true, total: room.total,
    days: dayCells({ total: room.total, overrides: overrides[roomKey] || {}, bookings: bookings.filter((b) => matchesRoom(b, roomKey)), nights: dates, now: opts.now }),
  };
}

/** Set rooms open for every day from..to (inclusive). Callers validate first (rangeProblem); this only guards the size. */
export async function setUnits(propertyId: string, roomKey: string, from: string, to: string, units: number, userId: string, sb: SupabaseClient = serviceClient()): Promise<number> {
  const n = dayCount(from, to);
  if (!(n >= 1 && n <= MAX_DAYS)) throw new Error(`setUnits: range must be 1-${MAX_DAYS} days`);
  const updated_at = new Date().toISOString();
  const rows = Array.from({ length: n }, (_, i) => ({ property_id: propertyId, room_key: roomKey, date: addDays(from, i), units, updated_by: userId, updated_at }));
  const { error } = await sb.from('room_availability').upsert(rows, { onConflict: 'property_id,room_key,date' });
  if (error) throw error;
  return n;
}
