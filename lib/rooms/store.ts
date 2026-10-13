// lib/rooms/store.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { serviceClient } from '@/lib/server-auth';
import { matchesRoom } from '@/lib/availability/calc';
import { priceRange, withIds, type RoomCategory, type RoomDiff } from './validate';

export type RoomsProperty = {
  id: string; name: string; owner_id: string | null; status: string;
  total_rooms: number | null; extra_bed_charge: number | null; rooms: any[]; updated_at: string;
};

const COLS = 'id, name, owner_id, status, total_rooms, extra_bed_charge, rooms, updated_at';
const LIVE = ['pending', 'confirmed'];
const CONFLICT = 'Someone else changed these rooms. Reload to see the latest.';

async function fetchProperty(id: string, sb: SupabaseClient): Promise<RoomsProperty | null> {
  const { data, error } = await sb.from('properties').select(COLS).eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as any;
  return { ...row, rooms: Array.isArray(row.rooms) ? row.rooms : [] };
}

/** Loads a property's rooms; rooms without an id get a permanent one, persisted once. */
export async function loadRoomsProperty(id: string, sb: SupabaseClient = serviceClient()): Promise<RoomsProperty | null> {
  const p = await fetchProperty(id, sb);
  if (!p) return null;
  const { rooms, changed } = withIds(p.rooms, () => crypto.randomUUID());
  if (!changed) return p;
  const { data, error } = await sb.from('properties').update({ rooms, updated_at: new Date().toISOString() })
    .eq('id', id).eq('updated_at', p.updated_at).select('updated_at');
  if (error) throw error;
  const row = (data as any[] | null)?.[0];
  // Lost a race with another writer: the winner's write stands, so reload it.
  if (!row) return fetchProperty(id, sb);
  return { ...p, rooms, updated_at: row.updated_at };
}

export async function ownedRoomsProperties(ownerId: string, sb: SupabaseClient = serviceClient()): Promise<{ id: string; name: string; status: string }[]> {
  const { data, error } = await sb.from('properties').select('id, name, status').eq('owner_id', ownerId).order('name');
  if (error) throw error;
  return ((data || []) as any[]).map((r) => ({ id: r.id, name: r.name || '', status: r.status }));
}

/** Pending/confirmed bookings not yet checked out for one room, matched by name (room_key or legacy room_name). roomId is reserved. */
export async function upcomingBookingCount(propertyId: string, roomName: string, _roomId: string | null, today: string, sb: SupabaseClient = serviceClient()): Promise<number> {
  const { data, error } = await sb.from('bookings').select('room_key, room_name')
    .eq('property_id', propertyId).in('status', LIVE).gte('check_out', today);
  if (error) throw error;
  return ((data || []) as any[]).filter((b) => matchesRoom(b, roomName)).length;
}

const rewriteName = (name: string | null, from: string, to: string) =>
  name === from ? to : name && name.startsWith(`${from} - `) ? `${to}${name.slice(from.length)}` : name;

async function renameFollowUps(sb: SupabaseClient, propertyId: string, from: string, to: string, today: string) {
  const av = await sb.from('room_availability').update({ room_key: to }).eq('property_id', propertyId).eq('room_key', from);
  if (av.error) throw av.error;

  const bk = await sb.from('bookings').select('id, room_key, room_name')
    .eq('property_id', propertyId).in('status', LIVE).gte('check_out', today);
  if (bk.error) throw bk.error;
  for (const b of ((bk.data || []) as any[]).filter((x) => matchesRoom(x, from))) {
    const u = await sb.from('bookings').update({ room_key: to, room_name: rewriteName(b.room_name, from, to) }).eq('id', b.id);
    if (u.error) throw u.error;
  }

  const of = await sb.from('offers').select('id, plan_percents').eq('property_id', propertyId);
  if (of.error) throw of.error;
  for (const o of (of.data || []) as any[]) {
    const pp = o.plan_percents && typeof o.plan_percents === 'object' ? o.plan_percents : {};
    let changed = false;
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(pp)) {
      if (k.startsWith(`${from}|`)) { out[`${to}${k.slice(from.length)}`] = v as number; changed = true; }
      else out[k] = v as number;
    }
    if (!changed) continue;
    const u = await sb.from('offers').update({ plan_percents: out }).eq('id', o.id);
    if (u.error) throw u.error;
  }
}

async function removeFollowUps(sb: SupabaseClient, propertyId: string, name: string, today: string) {
  const { error } = await sb.from('room_availability').delete().eq('property_id', propertyId).eq('room_key', name).gte('date', today);
  if (error) throw error;
}

/** Optimistic save: only writes if the property is unchanged since `p` was loaded. */
export async function saveRooms(
  p: RoomsProperty,
  next: { total_rooms: number; rooms: RoomCategory[] },
  diff: RoomDiff,
  today: string,
  sb: SupabaseClient = serviceClient(),
): Promise<{ ok: true; updated_at: string } | { ok: false; status: 409; error: string }> {
  const range = priceRange(next.rooms);
  const patch = { rooms: next.rooms, total_rooms: next.total_rooms, ...(range || {}), updated_at: new Date().toISOString() };
  const { data, error } = await sb.from('properties').update(patch)
    .eq('id', p.id).eq('updated_at', p.updated_at).select('updated_at');
  if (error) throw error;
  const row = (data as any[] | null)?.[0];
  if (!row) return { ok: false, status: 409, error: CONFLICT };

  for (const r of diff.renamed) {
    try { await renameFollowUps(sb, p.id, r.from, r.to, today); }
    catch (e) { console.error(`rooms: rename follow-up failed for "${r.from}" -> "${r.to}"`, e); }
  }
  for (const r of diff.removed) {
    try { await removeFollowUps(sb, p.id, r.name, today); }
    catch (e) { console.error(`rooms: removal follow-up failed for "${r.name}"`, e); }
  }
  return { ok: true, updated_at: row.updated_at };
}
