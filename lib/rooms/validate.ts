import type { MealPlan, RoomType } from '@/types';

export type RatePlan = { name: string; meal_plan: MealPlan; price: number; cancellation: string };
export type RoomCategory = RoomType & {
  id: string;
  total_inventory: number;
  rate_plans: RatePlan[];
  images: string[];
  extra_beds_max: number;
  extra_bed_price: number;
  is_active: boolean;
};

export const LIMITS = {
  totalRooms: [1, 500],
  rooms: [1, 500],
  adults: [1, 20],
  children: [0, 20],
  price: [100, 1_000_000],
  plans: 6,
  images: 8,
  extraBeds: [0, 3],
  extraBedPrice: [0, 50_000],
} as const;

const MEAL_PLANS = ['ep', 'cp', 'map', 'ap'];
const MAX_CATEGORIES = 30;

const inRange = (n: number, [lo, hi]: readonly [number, number] | readonly number[]) => Number.isFinite(n) && n >= lo && n <= hi;
const int = (x: unknown) => Math.floor(Number(x));
const str = (x: unknown) => (typeof x === 'string' ? x.trim() : '');
const inr = (n: number) => `Rs.${n.toLocaleString('en-IN')}`;

export function normaliseRooms(
  input: unknown,
  opts: { newId: () => string; defaultExtraBedPrice: number },
): { rooms: RoomCategory[] } | { error: string } {
  if (!Array.isArray(input)) return { error: 'Rooms must be a list.' };
  if (input.length > MAX_CATEGORIES) return { error: `At most ${MAX_CATEGORIES} room types.` };

  const rooms: RoomCategory[] = [];
  const seen = new Set<string>();
  const seenIds = new Set<string>();

  for (const raw of input) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { error: 'Each room must be an object.' };
    const r = raw as Record<string, any>;

    const name = str(r.name);
    if (name.length < 2 || name.length > 60) return { error: 'Room name must be 2-60 characters.' };
    const key = name.toLowerCase();
    if (seen.has(key)) return { error: `Two rooms are called "${key}". Each room type needs its own name.` };
    seen.add(key);

    const total_inventory = int(r.total_inventory);
    if (r.total_inventory == null || !inRange(total_inventory, LIMITS.rooms)) return { error: `${name}: number of rooms must be 1-500.` };
    const max_adults = int(r.max_adults);
    if (!inRange(max_adults, LIMITS.adults)) return { error: `${name}: adults must be 1-20.` };
    const max_children = int(r.max_children ?? 0);
    if (!inRange(max_children, LIMITS.children)) return { error: `${name}: children must be 0-20.` };
    const base_price = int(r.base_price);
    if (!inRange(base_price, LIMITS.price)) return { error: `${name}: price per night must be Rs.100 - Rs.10,00,000.` };
    const extra_beds_max = int(r.extra_beds_max ?? 0);
    if (!inRange(extra_beds_max, LIMITS.extraBeds)) return { error: `${name}: extra beds must be 0-3.` };
    const extra_bed_price = int(r.extra_bed_price == null ? opts.defaultExtraBedPrice : r.extra_bed_price);
    if (!inRange(extra_bed_price, LIMITS.extraBedPrice)) return { error: `${name}: extra bed price must be Rs.0 - Rs.50,000.` };

    const rawPlans = r.rate_plans == null ? [] : r.rate_plans;
    if (!Array.isArray(rawPlans)) return { error: `${name}: rate plans must be a list.` };
    if (rawPlans.length > LIMITS.plans) return { error: `${name}: at most ${LIMITS.plans} rate plans.` };
    const rate_plans: RatePlan[] = [];
    for (const p of rawPlans) {
      const pname = str(p?.name);
      if (pname.length < 1 || pname.length > 60) return { error: `${name}: rate plan name must be 1-60 characters.` };
      if (!MEAL_PLANS.includes(p?.meal_plan)) return { error: `${name}: rate plan "${pname}" has an unknown meal plan.` };
      const price = int(p?.price);
      if (!inRange(price, LIMITS.price)) return { error: `${name}: rate plan "${pname}" price must be Rs.100 - Rs.10,00,000.` };
      const cancellation = str(p?.cancellation);
      if (cancellation.length > 300) return { error: `${name}: rate plan "${pname}" cancellation text is too long (300 characters max).` };
      rate_plans.push({ name: pname, meal_plan: p.meal_plan, price, cancellation });
    }

    const rawImages = r.images == null ? [] : r.images;
    if (!Array.isArray(rawImages)) return { error: `${name}: photos must be a list.` };
    if (rawImages.length > LIMITS.images) return { error: `${name}: at most ${LIMITS.images} photos.` };
    const images: string[] = [];
    for (const i of rawImages) {
      const url = typeof i === 'string' ? i : i?.url;
      if (typeof url !== 'string' || !url.startsWith('https://') || url.length > 500) return { error: `${name}: photos must be https links.` };
      images.push(url);
    }

    const description = str(r.description);
    if (description.length > 500) return { error: `${name}: description is too long (500 characters max).` };
    const bed_type = str(r.bed_type);
    if (bed_type.length > 40) return { error: `${name}: bed type is too long (40 characters max).` };

    const id = typeof r.id === 'string' && r.id.trim() && r.id.length <= 64 ? r.id : opts.newId();
    if (seenIds.has(id)) return { error: 'Two rooms share the same id. Reload the page and try again.' };
    seenIds.add(id);

    rooms.push({
      ...r,
      id,
      name,
      description,
      bed_type,
      max_adults,
      max_children,
      max_occupancy: max_adults + max_children,
      base_price,
      total_inventory,
      is_active: r.is_active !== false,
      extra_beds_max,
      extra_bed_price,
      rate_plans,
      images,
    } as RoomCategory);
  }
  return { rooms };
}

export function assignedTotal(rooms: RoomCategory[]): number {
  return rooms.filter((r) => r.is_active).reduce((sum, r) => sum + r.total_inventory, 0);
}

export function capProblem(totalRooms: number, rooms: RoomCategory[]): string | null {
  const assigned = assignedTotal(rooms);
  return assigned > totalRooms ? `Rooms assigned (${assigned}) exceed the hotel total (${totalRooms})` : null;
}

export type RoomDiff = {
  added: string[];
  removed: { id: string | null; name: string }[];
  renamed: { id: string; from: string; to: string }[];
  switchedOff: string[];
  switchedOn: string[];
  lines: string[];
};

function samePlans(before: any, after: RatePlan[]): boolean {
  const b: any[] = Array.isArray(before) ? before : [];
  return (
    b.length === after.length &&
    b.every((p, i) => p?.name === after[i].name && p?.meal_plan === after[i].meal_plan && Number(p?.price) === after[i].price && (p?.cancellation ?? '') === after[i].cancellation)
  );
}

export function diffRooms(before: any[], after: RoomCategory[]): RoomDiff | { error: string } {
  const nm = (r: any) => (typeof r?.name === 'string' ? r.name.trim() : '');
  const hasId = (r: any) => typeof r?.id === 'string' && r.id !== '';

  const afterById = new Map(after.map((a) => [a.id, a]));
  const matchedAfter = new Set<string>();
  const pairs: { b: any; a: RoomCategory }[] = [];
  const unmatchedBefore: any[] = [];
  const pending: any[] = [];

  for (const b of before) {
    const a = hasId(b) ? afterById.get(b.id) : undefined;
    if (a) { pairs.push({ b, a }); matchedAfter.add(a.id); }
    else if (hasId(b)) unmatchedBefore.push(b);
    else pending.push(b);
  }
  for (const b of pending) {
    const a = after.find((x) => !matchedAfter.has(x.id) && x.name === nm(b));
    if (a) { pairs.push({ b, a }); matchedAfter.add(a.id); }
    else unmatchedBefore.push(b);
  }

  const renamed = pairs
    .filter(({ b, a }) => hasId(b) && nm(b) !== a.name)
    .map(({ b, a }) => ({ id: a.id, from: nm(b), to: a.name }));
  const unmatchedNames = new Set(unmatchedBefore.map(nm));
  for (const rn of renamed) {
    if (renamed.some((o) => o !== rn && o.from === rn.to) || unmatchedNames.has(rn.to)) {
      return { error: 'Rename one room at a time.' };
    }
  }

  const removed = unmatchedBefore.map((b) => ({ id: hasId(b) ? (b.id as string) : null, name: nm(b) }));
  const added = after.filter((a) => !matchedAfter.has(a.id)).map((a) => a.name);
  const switchedOff: string[] = [];
  const switchedOn: string[] = [];
  const lines: string[] = [];

  for (const { b, a } of pairs) {
    const rn = renamed.find((x) => x.id === a.id);
    if (rn) lines.push(`Renamed "${rn.from}" to "${rn.to}"`);
    if (b.total_inventory != null && Number(b.total_inventory) !== a.total_inventory) lines.push(`${a.name}: rooms ${Number(b.total_inventory)} → ${a.total_inventory}`);
    if (b.base_price != null && Number(b.base_price) !== a.base_price) lines.push(`${a.name}: price ${inr(Number(b.base_price))} → ${inr(a.base_price)}`);
    if (!samePlans(b.rate_plans, a.rate_plans)) lines.push(`${a.name}: rate plans changed`);
    if (Number(b.extra_beds_max ?? 0) !== a.extra_beds_max) lines.push(`${a.name}: extra beds ${Number(b.extra_beds_max ?? 0)} → ${a.extra_beds_max}`);
    const wasActive = b.is_active !== false;
    if (wasActive && !a.is_active) { switchedOff.push(a.name); lines.push(`Switched off "${a.name}"`); }
    if (!wasActive && a.is_active) { switchedOn.push(a.name); lines.push(`Switched on "${a.name}"`); }
  }
  for (const r of removed) lines.push(`Removed "${r.name}"`);
  for (const n of added) lines.push(`Added "${n}"`);

  return { added, removed, renamed, switchedOff, switchedOn, lines };
}

export function withIds(rooms: any[], newId: () => string): { rooms: any[]; changed: boolean } {
  let changed = false;
  const out = rooms.map((r) => {
    if (typeof r?.id === 'string' && r.id) return r;
    changed = true;
    return { ...r, id: newId() };
  });
  return { rooms: out, changed };
}

export function priceRange(rooms: RoomCategory[]): { price_min: number; price_max: number } | null {
  const prices: number[] = [];
  for (const r of rooms) {
    if (!r.is_active) continue;
    for (const p of [r.base_price, ...r.rate_plans.map((x) => x.price)]) if (p > 0) prices.push(p);
  }
  return prices.length ? { price_min: Math.min(...prices), price_max: Math.max(...prices) } : null;
}
