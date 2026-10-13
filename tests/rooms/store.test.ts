// tests/rooms/store.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadRoomsProperty, ownedRoomsProperties, saveRooms, upcomingBookingCount, type RoomsProperty } from '@/lib/rooms/store';
import type { RoomCategory, RoomDiff } from '@/lib/rooms/validate';

const PID = '11111111-1111-4111-8111-111111111111';
const OLD = '2099-10-01T00:00:00.000Z';
const TODAY = '2099-10-13';

type Call = { table: string; op: string; args: any[] };
/** Chainable stand-in for the Supabase client: records every call, returns the table's rows. */
function fakeSb(tables: Record<string, any[]>, opts: { updateRows?: Record<string, any[]> } = {}) {
  const calls: Call[] = [];
  const sb: any = {
    from(table: string) {
      const rows = tables[table] || [];
      let updating = false;
      const b: any = {
        maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
        then: (res: any, rej: any) =>
          Promise.resolve({ data: updating ? opts.updateRows?.[table] ?? rows : rows, error: null }).then(res, rej),
      };
      for (const op of ['select', 'eq', 'gte', 'in', 'order', 'delete']) {
        b[op] = (...args: any[]) => { calls.push({ table, op, args }); return b; };
      }
      b.update = (...args: any[]) => { updating = true; calls.push({ table, op: 'update', args }); return b; };
      return b;
    },
  };
  return { sb, calls };
}

const room = (over: Record<string, any> = {}): RoomCategory => ({
  id: 'r1', name: 'Deluxe', total_inventory: 2, max_adults: 2, max_children: 0, base_price: 2000,
  rate_plans: [], images: [], extra_beds_max: 0, extra_bed_price: 0, is_active: true, ...over,
} as any);
const prop = (over: Partial<RoomsProperty> = {}): RoomsProperty => ({
  id: PID, name: 'Cedar', owner_id: 'o1', status: 'published', total_rooms: 5, extra_bed_charge: null, rooms: [room()], updated_at: OLD, ...over,
});
const diff = (over: Partial<RoomDiff> = {}): RoomDiff => ({ added: [], removed: [], renamed: [], switchedOff: [], switchedOn: [], lines: [], ...over });

afterEach(() => vi.restoreAllMocks());

describe('loadRoomsProperty', () => {
  it('selects the columns and returns the property', async () => {
    const { sb, calls } = fakeSb({ properties: [{ ...prop() }] });
    const p = await loadRoomsProperty(PID, sb);
    expect(p?.id).toBe(PID);
    expect(calls).toContainEqual({ table: 'properties', op: 'select', args: ['id, name, owner_id, status, total_rooms, extra_bed_charge, rooms, updated_at'] });
    expect(calls.some((c) => c.op === 'update')).toBe(false);
  });
  it('returns null when not found', async () => {
    expect(await loadRoomsProperty(PID, fakeSb({}).sb)).toBeNull();
  });
  it('assigns and persists missing ids once, guarded by updated_at', async () => {
    const { sb, calls } = fakeSb(
      { properties: [prop({ rooms: [{ name: 'A', color: 'x' }, { id: 'keep', name: 'B' }] })] },
      { updateRows: { properties: [{ updated_at: 'NEW' }] } },
    );
    const p = await loadRoomsProperty(PID, sb);
    expect(p!.updated_at).toBe('NEW');
    expect(p!.rooms[0].id).toMatch(/.+/);
    expect(p!.rooms[0].color).toBe('x');
    expect(p!.rooms[1].id).toBe('keep');
    const upd = calls.find((c) => c.op === 'update')!;
    expect(upd.args[0].rooms).toEqual(p!.rooms);
    expect(calls).toContainEqual({ table: 'properties', op: 'eq', args: ['updated_at', OLD] });
  });
});

describe('ownedRoomsProperties', () => {
  it('lists the properties of an owner', async () => {
    const { sb, calls } = fakeSb({ properties: [{ id: PID, name: 'Cedar', status: 'published' }] });
    expect(await ownedRoomsProperties('o1', sb)).toEqual([{ id: PID, name: 'Cedar', status: 'published' }]);
    expect(calls).toContainEqual({ table: 'properties', op: 'eq', args: ['owner_id', 'o1'] });
  });
});

describe('upcomingBookingCount', () => {
  it('counts live future bookings of the named room, including legacy names', async () => {
    const { sb, calls } = fakeSb({ bookings: [
      { room_key: 'Deluxe', room_name: 'Deluxe' },
      { room_key: null, room_name: 'Deluxe' },
      { room_key: null, room_name: 'Deluxe - extra bed' },
      { room_key: null, room_name: 'Deluxe Plus' },
      { room_key: 'Suite', room_name: 'Deluxe' },
    ] });
    expect(await upcomingBookingCount(PID, 'Deluxe', null, TODAY, sb)).toBe(3);
    expect(calls).toContainEqual({ table: 'bookings', op: 'eq', args: ['property_id', PID] });
    expect(calls).toContainEqual({ table: 'bookings', op: 'in', args: ['status', ['pending', 'confirmed']] });
    expect(calls).toContainEqual({ table: 'bookings', op: 'gte', args: ['check_out', TODAY] });
  });
});

describe('saveRooms', () => {
  const next = { total_rooms: 6, rooms: [room({ name: 'Deluxe Two' })] };
  const won = { updateRows: { properties: [{ updated_at: 'N' }] } };

  it('writes guarded by updated_at and returns the new stamp', async () => {
    const { sb, calls } = fakeSb({}, won);
    expect(await saveRooms(prop(), next, diff(), TODAY, sb)).toEqual({ ok: true, updated_at: 'N' });
    const upd = calls.find((c) => c.table === 'properties' && c.op === 'update')!.args[0];
    expect(upd).toMatchObject({ rooms: next.rooms, total_rooms: 6, price_min: 2000, price_max: 2000 });
    expect(typeof upd.updated_at).toBe('string');
    expect(calls).toContainEqual({ table: 'properties', op: 'eq', args: ['id', PID] });
    expect(calls).toContainEqual({ table: 'properties', op: 'eq', args: ['updated_at', OLD] });
    expect(calls).toContainEqual({ table: 'properties', op: 'select', args: ['updated_at'] });
  });
  it('omits price fields when there is no price range', async () => {
    const { sb, calls } = fakeSb({}, won);
    await saveRooms(prop(), { total_rooms: 6, rooms: [room({ is_active: false })] }, diff(), TODAY, sb);
    const upd = calls.find((c) => c.op === 'update')!.args[0];
    expect('price_min' in upd).toBe(false);
  });
  it('returns 409 and does no follow-up writes on a lost race', async () => {
    const { sb, calls } = fakeSb({}, { updateRows: { properties: [] } });
    const d = diff({ renamed: [{ id: 'r1', from: 'Deluxe', to: 'Deluxe Two' }], removed: [{ id: 'x', name: 'Gone' }] });
    expect(await saveRooms(prop(), next, d, TODAY, sb)).toEqual({ ok: false, status: 409, error: 'Someone else changed these rooms. Reload to see the latest.' });
    expect(calls.filter((c) => c.op === 'update' || c.op === 'delete')).toHaveLength(1);
  });
  it('rewrites availability, bookings and offers on rename', async () => {
    const { sb, calls } = fakeSb({
      bookings: [
        { id: 'b1', room_key: 'Deluxe', room_name: 'Deluxe - extra bed' },
        { id: 'b2', room_key: 'Deluxe', room_name: 'Deluxe' },
        { id: 'b3', room_key: 'Suite', room_name: 'Suite' },
      ],
      offers: [
        { id: 'o1', plan_percents: { 'Deluxe|Room only': 10, 'Suite|Room only': 5 } },
        { id: 'o2', plan_percents: { 'Suite|Room only': 5 } },
      ],
    }, won);
    await saveRooms(prop(), next, diff({ renamed: [{ id: 'r1', from: 'Deluxe', to: 'Deluxe Two' }] }), TODAY, sb);
    const upd = (t: string) => calls.filter((c) => c.table === t && c.op === 'update').map((c) => c.args[0]);
    expect(upd('room_availability')).toEqual([{ room_key: 'Deluxe Two' }]);
    expect(calls).toContainEqual({ table: 'room_availability', op: 'eq', args: ['room_key', 'Deluxe'] });
    expect(upd('bookings')).toEqual([
      { room_key: 'Deluxe Two', room_name: 'Deluxe Two - extra bed' },
      { room_key: 'Deluxe Two', room_name: 'Deluxe Two' },
    ]);
    expect(calls).toContainEqual({ table: 'bookings', op: 'in', args: ['status', ['pending', 'confirmed']] });
    expect(calls).toContainEqual({ table: 'bookings', op: 'gte', args: ['check_out', TODAY] });
    expect(upd('offers')).toEqual([{ plan_percents: { 'Deluxe Two|Room only': 10, 'Suite|Room only': 5 } }]);
  });
  it('deletes future availability of removed categories', async () => {
    const { sb, calls } = fakeSb({}, won);
    await saveRooms(prop(), next, diff({ removed: [{ id: 'x', name: 'Gone' }] }), TODAY, sb);
    expect(calls).toContainEqual({ table: 'room_availability', op: 'delete', args: [] });
    expect(calls).toContainEqual({ table: 'room_availability', op: 'eq', args: ['room_key', 'Gone'] });
    expect(calls).toContainEqual({ table: 'room_availability', op: 'gte', args: ['date', TODAY] });
  });
  it('logs follow-up failures without failing the save', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { sb } = fakeSb({}, won);
    const orig = sb.from;
    sb.from = (t: string) => {
      if (t === 'room_availability') throw new Error('boom');
      return orig(t);
    };
    const d = diff({ renamed: [{ id: 'r1', from: 'Deluxe', to: 'Deluxe Two' }], removed: [{ id: 'x', name: 'Gone' }] });
    expect((await saveRooms(prop(), next, d, TODAY, sb)).ok).toBe(true);
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
