import { getPublishedProperties, getPropertyBySlug } from '@/lib/db';

const lc = (s: unknown) => String(s ?? '').toLowerCase();

/** A published hotel by page slug or part of its name. */
export async function findHotel(name: string) {
  const direct = await getPropertyBySlug(lc(name).trim().replace(/\s+/g, '-'));
  if (direct) return direct;
  const all = await getPublishedProperties();
  const hit = all.find((p: any) => lc(p.name).includes(lc(name).trim()) || p.slug === lc(name).trim());
  return hit ? getPropertyBySlug(hit.slug) : null;
}
