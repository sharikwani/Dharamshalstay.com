import { describe, it, expect } from 'vitest';
import { normaliseRooms, capProblem, assignedTotal, diffRooms, withIds, priceRange } from '@/lib/rooms/validate';

let n = 0; const newId = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`;
const room = (o: any = {}) => ({ name: 'Deluxe', bed_type: 'Double', max_adults: 2, max_children: 1, base_price: 3000, total_inventory: 5, is_active: true, ...o });
const ok = (input: unknown) => { const r = normaliseRooms(input, { newId, defaultExtraBedPrice: 700 }); if ('error' in r) throw new Error(r.error); return r.rooms; };

describe('normaliseRooms', () => {
  it('keeps unknown fields, trims, assigns ids, defaults extra bed price from the hotel', () => {
    const [r] = ok([room({ name: '  Deluxe ', room_size: '200 sq ft', amenities: ['TV'], extra_beds_max: 1 })]);
    expect(r).toMatchObject({ name: 'Deluxe', room_size: '200 sq ft', amenities: ['TV'], extra_beds_max: 1, extra_bed_price: 700, rate_plans: [], images: [], max_occupancy: 3 });
    expect(r.id).toMatch(/^[0-9a-f-]{36}$/);
  });
  it('keeps an existing id', () => { expect(ok([room({ id: '11111111-1111-4111-8111-111111111111' })])[0].id).toBe('11111111-1111-4111-8111-111111111111'); });
  it('turns image objects into urls and refuses non-https', () => {
    expect(ok([room({ images: [{ url: 'https://x/a.jpg' }, 'https://x/b.jpg'] })])[0].images).toEqual(['https://x/a.jpg', 'https://x/b.jpg']);
    expect(normaliseRooms([room({ images: ['http://x/a.jpg'] })], { newId, defaultExtraBedPrice: 0 })).toEqual({ error: 'Deluxe: photos must be https links.' });
  });
  it.each([
    [{ name: 'D' }, 'Room name must be 2-60 characters.'],
    [{ total_inventory: 0 }, 'Deluxe: number of rooms must be 1-500.'],
    [{ total_inventory: null }, 'Deluxe: number of rooms must be 1-500.'],
    [{ max_adults: 0 }, 'Deluxe: adults must be 1-20.'],
    [{ max_children: 21 }, 'Deluxe: children must be 0-20.'],
    [{ base_price: 99 }, 'Deluxe: price per night must be Rs.100 - Rs.10,00,000.'],
    [{ extra_beds_max: 4 }, 'Deluxe: extra beds must be 0-3.'],
    [{ extra_beds_max: 1, extra_bed_price: 50001 }, 'Deluxe: extra bed price must be Rs.0 - Rs.50,000.'],
    [{ rate_plans: Array(7).fill({ name: 'EP', meal_plan: 'ep', price: 3000, cancellation: '' }) }, 'Deluxe: at most 6 rate plans.'],
    [{ rate_plans: [{ name: 'EP', meal_plan: 'xx', price: 3000, cancellation: '' }] }, 'Deluxe: rate plan "EP" has an unknown meal plan.'],
    [{ images: Array(9).fill('https://x/a.jpg') }, 'Deluxe: at most 8 photos.'],
    [{ description: 'x'.repeat(501) }, 'Deluxe: description is too long (500 characters max).'],
  ])('refuses %o', (o, msg) => { expect(normaliseRooms([room(o)], { newId, defaultExtraBedPrice: 0 })).toEqual({ error: msg }); });
  it('refuses duplicate names case-insensitively', () => {
    expect(normaliseRooms([room(), room({ name: 'deluxe ' })], { newId, defaultExtraBedPrice: 0 })).toEqual({ error: 'Two rooms are called "deluxe". Each room type needs its own name.' });
  });
  it('refuses duplicate ids and replaces unusable ids', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    expect(normaliseRooms([room({ id }), room({ name: 'Suite', id })], { newId, defaultExtraBedPrice: 0 })).toEqual({ error: 'Two rooms share the same id. Reload the page and try again.' });
    const rooms = ok([room({ id: 'x'.repeat(65) }), room({ name: 'Suite', id: 42 }), room({ name: 'Family', id: '' })]);
    expect(rooms.every((r) => /^0{8}-0000-4000-8000-\d{12}$/.test(r.id))).toBe(true);
  });
  it('refuses a non-array and more than 30 categories', () => {
    expect(normaliseRooms({}, { newId, defaultExtraBedPrice: 0 })).toEqual({ error: 'Rooms must be a list.' });
    expect(normaliseRooms(Array.from({ length: 31 }, (_, i) => room({ name: `Room ${i}` })), { newId, defaultExtraBedPrice: 0 })).toEqual({ error: 'At most 30 room types.' });
  });
});

describe('cap', () => {
  it('counts active rooms only and reports the exact message', () => {
    const rooms = ok([room({ total_inventory: 10 }), room({ name: 'Suite', total_inventory: 12 }), room({ name: 'Old', total_inventory: 50, is_active: false })]);
    expect(assignedTotal(rooms)).toBe(22);
    expect(capProblem(21, rooms)).toBe('Rooms assigned (22) exceed the hotel total (21)');
    expect(capProblem(22, rooms)).toBeNull();
  });
});

describe('diffRooms', () => {
  const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222';
  it('detects rename by id, removal, add, switch off/on, and describes counts and prices', () => {
    const before = [room({ id: A, name: 'Deluxe' }), room({ id: B, name: 'Suite' }), { name: 'Legacy', base_price: 2000 }, room({ name: 'Dorm', is_active: false })];
    const after = ok([room({ id: A, name: 'Deluxe Valley', total_inventory: 6, base_price: 3500, is_active: false }), room({ name: 'Dorm', is_active: true }), room({ name: 'Family' })]);
    const d = diffRooms(before, after);
    if ('error' in d) throw new Error(d.error);
    expect(d.renamed).toEqual([{ id: A, from: 'Deluxe', to: 'Deluxe Valley' }]);
    expect(d.removed).toEqual([{ id: B, name: 'Suite' }, { id: null, name: 'Legacy' }]);
    expect(d.added).toEqual(['Family']);
    expect(d.switchedOff).toEqual(['Deluxe Valley']);
    expect(d.switchedOn).toEqual(['Dorm']);
    expect(d.lines).toEqual(expect.arrayContaining(['Renamed "Deluxe" to "Deluxe Valley"', 'Deluxe Valley: rooms 5 → 6', 'Deluxe Valley: price Rs.3,000 → Rs.3,500', 'Switched off "Deluxe Valley"', 'Removed "Suite"', 'Added "Family"']));
  });
  it('matches id-less old rooms by name (no rename, no removal)', () => {
    const d = diffRooms([{ name: 'Deluxe', base_price: 3000, total_inventory: 5 }], ok([room()]));
    expect(d).toMatchObject({ renamed: [], removed: [], added: [] });
  });
  it('ignores rate plan key order and string numbers, but reports real plan, price and extra bed changes', () => {
    const plan = { name: 'CP', meal_plan: 'cp', price: 3600, cancellation: 'Free' };
    const reordered = { cancellation: 'Free', price: 3600, meal_plan: 'cp', name: 'CP' };
    const same = diffRooms([room({ id: A, base_price: '3000', total_inventory: '5', rate_plans: [reordered] })], ok([room({ id: A, rate_plans: [plan] })]));
    if ('error' in same) throw new Error(same.error);
    expect(same.lines).toEqual([]);
    const changed = diffRooms([room({ id: A, rate_plans: [reordered] })], ok([room({ id: A, extra_beds_max: 2, rate_plans: [{ ...plan, price: 3900 }] })]));
    if ('error' in changed) throw new Error(changed.error);
    expect(changed.lines).toEqual(['Deluxe: rate plans changed', 'Deluxe: extra beds 0 → 2']);
  });
  it('refuses a swap', () => {
    expect(diffRooms([room({ id: A, name: 'X1' }), room({ id: B, name: 'X2' })], ok([room({ id: A, name: 'X2' }), room({ id: B, name: 'X1' })]))).toEqual({ error: 'Rename one room at a time.' });
  });
});

describe('withIds / priceRange', () => {
  it('adds ids only where missing', () => {
    const r = withIds([{ name: 'A' }, { id: 'keep', name: 'B' }], newId);
    expect(r.changed).toBe(true); expect(r.rooms[1].id).toBe('keep'); expect(r.rooms[0].id).toBeTruthy();
    expect(withIds([{ id: 'x' }], newId).changed).toBe(false);
  });
  it('spans active rooms and their plans', () => {
    expect(priceRange(ok([room({ base_price: 3000, rate_plans: [{ name: 'CP', meal_plan: 'cp', price: 3600, cancellation: '' }] }), room({ name: 'Off', base_price: 100, is_active: false })]))).toEqual({ price_min: 3000, price_max: 3600 });
    expect(priceRange([])).toBeNull();
  });
});
