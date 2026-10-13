// tests/availability/store.test.ts
import { describe, expect, it } from 'vitest';
import { availabilityFor, loadProperty, monthGrid, ownedProperties, setUnits } from '@/lib/availability/store';

const PID = '11111111-1111-4111-8111-111111111111';
const NOW = new Date('2099-10-13T12:00:00Z');
const HOTEL = { id: PID, name: 'Cedar Lodge', owner_id: 'owner-1', rooms: [{ name: 'Standard', total_inventory: 2 }, { name: 'Dorm' }] };
const booking = (over: Record<string, any> = {}) => ({
  id: 'x1', room_key: 'Standard', room_name: 'Standard', check_in: '2099-10-20', check_out: '2099-10-22',
  status: 'confirmed', payment_method: 'pay_at_hotel', payment_status: 'pending', created_at: '2099-10-01T00:00:00.000Z', ...over,
});

type Call = { table: string; op: string; args: any[] };
/** Chainable stand-in for the Supabase client: records every call, returns the table's rows. */
function fakeSb(tables: Record<string, any[]>) {
  const calls: Call[] = [];
  const sb: any = {
    from(table: string) {
      const rows = tables[table] || [];
      const b: any = {
        maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
        upsert: async (...args: any[]) => { calls.push({ table, op: 'upsert', args }); return { error: null }; },
        then: (res: any, rej: any) => Promise.resolve({ data: rows, error: null }).then(res, rej),
      };
      for (const op of ['select', 'eq', 'gte', 'lt', 'gt', 'not', 'order']) {
        b[op] = (...args: any[]) => { calls.push({ table, op, args }); return b; };
      }
      return b;
    },
  };
  return { sb, calls };
}

describe('loadProperty / ownedProperties', () => {
  it('summarises room types', async () => {
    const { sb, calls } = fakeSb({ properties: [HOTEL] });
    expect(await loadProperty(PID, sb)).toEqual({
      id: PID, name: 'Cedar Lodge', owner_id: 'owner-1',
      rooms: [{ key: 'Standard', tracked: true, total: 2 }, { key: 'Dorm', tracked: false, total: 0 }],
    });
    expect(calls).toContainEqual({ table: 'properties', op: 'eq', args: ['id', PID] });
  });
  it('returns null for a missing property', async () => {
    expect(await loadProperty(PID, fakeSb({}).sb)).toBeNull();
  });
  it("lists an owner's properties", async () => {
    const { sb, calls } = fakeSb({ properties: [HOTEL] });
    expect((await ownedProperties('owner-1', sb)).map((p) => p.id)).toEqual([PID]);
    expect(calls).toContainEqual({ table: 'properties', op: 'eq', args: ['owner_id', 'owner-1'] });
  });
});

describe('availabilityFor', () => {
  it('publishedOnly filters on status = published and answers nothing for an unpublished property', async () => {
    const pub = fakeSb({ properties: [HOTEL] });
    await availabilityFor(PID, '2099-10-20', '2099-10-22', { sb: pub.sb, now: NOW, publishedOnly: true });
    expect(pub.calls).toContainEqual({ table: 'properties', op: 'eq', args: ['status', 'published'] });
    const any = fakeSb({ properties: [HOTEL] });
    await availabilityFor(PID, '2099-10-20', '2099-10-22', { sb: any.sb, now: NOW });
    expect(any.calls).not.toContainEqual({ table: 'properties', op: 'eq', args: ['status', 'published'] });
    // The status filter matches no row for a draft property.
    expect(await availabilityFor(PID, '2099-10-20', '2099-10-22', { sb: fakeSb({}).sb, now: NOW, publishedOnly: true })).toEqual({});
  });
  it('counts overrides and holding bookings for tracked rooms; untracked rooms are open', async () => {
    const { sb, calls } = fakeSb({
      properties: [HOTEL],
      room_availability: [{ room_key: 'Standard', date: '2099-10-21', units: 1 }],
      bookings: [booking()],
    });
    const r = await availabilityFor(PID, '2099-10-20', '2099-10-22', { sb, now: NOW });
    expect(r).toEqual({ Standard: { tracked: true, left: 0 }, Dorm: { tracked: false, left: null } });
    expect(calls).toContainEqual({ table: 'bookings', op: 'eq', args: ['property_id', PID] });
    expect(calls).toContainEqual({ table: 'bookings', op: 'lt', args: ['check_in', '2099-10-22'] });
    expect(calls).toContainEqual({ table: 'bookings', op: 'gt', args: ['check_out', '2099-10-20'] });
    expect(calls).toContainEqual({ table: 'bookings', op: 'not', args: ['status', 'in', '(cancelled,failed,no_show)'] });
    expect(calls).toContainEqual({ table: 'room_availability', op: 'gte', args: ['date', '2099-10-20'] });
    expect(calls).toContainEqual({ table: 'room_availability', op: 'lt', args: ['date', '2099-10-22'] });
  });
  it('matches old bookings by room name and its plan suffix', async () => {
    const { sb } = fakeSb({
      properties: [HOTEL],
      bookings: [booking({ room_key: null, room_name: 'Standard - Breakfast' }), booking({ id: 'x2', room_key: null, room_name: 'Dorm' })],
    });
    expect((await availabilityFor(PID, '2099-10-20', '2099-10-21', { sb, now: NOW })).Standard).toEqual({ tracked: true, left: 1 });
  });
  it('makes no booking query when no room is tracked', async () => {
    const { sb, calls } = fakeSb({ properties: [{ ...HOTEL, rooms: [{ name: 'Dorm' }] }] });
    expect(await availabilityFor(PID, '2099-10-20', '2099-10-21', { sb })).toEqual({ Dorm: { tracked: false, left: null } });
    expect(calls.some((c) => c.table === 'bookings' || c.table === 'room_availability')).toBe(false);
  });
  it('returns {} for an unknown property', async () => {
    expect(await availabilityFor(PID, '2099-10-20', '2099-10-21', { sb: fakeSb({}).sb })).toEqual({});
  });
  it('excludeAfter leaves out later bookings, so only the later of two racing bookings fails', async () => {
    const first = booking({ id: 'b1', created_at: '2099-10-13T11:00:00.000Z' });
    const second = booking({ id: 'b2', created_at: '2099-10-13T11:00:00.500Z' });
    const { sb } = fakeSb({ properties: [{ ...HOTEL, rooms: [{ name: 'Standard', total_inventory: 1 }] }], bookings: [first, second] });
    expect((await availabilityFor(PID, '2099-10-20', '2099-10-22', { sb, now: NOW, excludeAfter: first })).Standard).toEqual({ tracked: true, left: 0 });
    expect((await availabilityFor(PID, '2099-10-20', '2099-10-22', { sb, now: NOW, excludeAfter: second })).Standard).toEqual({ tracked: true, left: -1 });
  });
});

describe('monthGrid', () => {
  it('builds a day grid for a tracked room', async () => {
    const { sb } = fakeSb({ properties: [HOTEL], room_availability: [{ room_key: 'Standard', date: '2099-10-21', units: 0 }], bookings: [booking()] });
    const g = await monthGrid(PID, 'Standard', '2099-10', { sb, now: NOW });
    expect(g?.days).toHaveLength(31);
    expect(g?.days[19]).toEqual({ date: '2099-10-20', open: 2, booked: 1, left: 1, override: false });
    expect(g?.days[20]).toEqual({ date: '2099-10-21', open: 0, booked: 1, left: -1, override: true });
  });
  it('returns no days for an untracked room and null for an unknown one', async () => {
    const { sb } = fakeSb({ properties: [HOTEL] });
    expect(await monthGrid(PID, 'Dorm', '2099-10', { sb })).toEqual({ room_key: 'Dorm', tracked: false, total: 0, days: [] });
    expect(await monthGrid(PID, 'Nope', '2099-10', { sb })).toBeNull();
  });
});

describe('setUnits', () => {
  it('upserts one row per day', async () => {
    const { sb, calls } = fakeSb({});
    expect(await setUnits(PID, 'Standard', '2099-10-30', '2099-11-01', 0, 'user-1', sb)).toBe(3);
    const up = calls.find((c) => c.op === 'upsert')!;
    expect(up.table).toBe('room_availability');
    expect(up.args[0].map((r: any) => r.date)).toEqual(['2099-10-30', '2099-10-31', '2099-11-01']);
    expect(up.args[0][0]).toMatchObject({ property_id: PID, room_key: 'Standard', units: 0, updated_by: 'user-1' });
    expect(up.args[1]).toEqual({ onConflict: 'property_id,room_key,date' });
  });
  it('refuses more than 366 days or reversed dates', async () => {
    const { sb, calls } = fakeSb({});
    await expect(setUnits(PID, 'Standard', '2099-01-01', '2100-01-02', 1, 'u', sb)).rejects.toThrow(/366/);
    await expect(setUnits(PID, 'Standard', '2099-01-02', '2099-01-01', 1, 'u', sb)).rejects.toThrow(/366/);
    expect(calls.some((c) => c.op === 'upsert')).toBe(false);
  });
});
