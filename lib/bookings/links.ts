/** Public page of what a booking is for (the hotel, trek, paragliding or taxi route), for the admin. */
import { serviceClient } from '@/lib/server-auth';
import { taxiRouteSlug } from '@/lib/taxi-slug';

type Row = Record<string, any>;

/** Add item_href to each booking view, with one lookup per table for hotels and treks. */
export async function withItemLinks<T extends Row>(rows: T[]): Promise<(T & { item_href: string | null })[]> {
  const ids = (key: string) => Array.from(new Set(rows.map((r) => r[key]).filter(Boolean))) as string[];
  const slugs = async (table: string, key: string) => {
    const wanted = ids(key);
    if (!wanted.length) return new Map<string, string>();
    const { data, error } = await serviceClient().from(table).select('id, slug').in('id', wanted);
    if (error) { console.error(`Could not load ${table} slugs:`, error); return new Map<string, string>(); }
    return new Map((data || []).map((d: any) => [d.id, d.slug]));
  };
  const [hotels, treks] = await Promise.all([slugs('properties', 'property_id'), slugs('treks', 'trek_id')]);
  return rows.map((b) => ({ ...b, item_href: itemHref(b, hotels, treks) }));
}

export function itemHref(b: Row, hotels: Map<string, string>, treks: Map<string, string>): string | null {
  if (b.category === 'hotel' && hotels.get(b.property_id)) return '/hotels/' + hotels.get(b.property_id);
  if (b.category === 'trek' && treks.get(b.trek_id)) return '/treks/' + treks.get(b.trek_id);
  if (b.category === 'paragliding') return '/paragliding';
  if (b.category === 'taxi') {
    const m = /^(.+?) → (.+)$/.exec(String(b.item_name || ''));
    return m ? '/taxi/' + taxiRouteSlug(m[1].trim(), m[2].trim()) : '/taxi';
  }
  return null;
}
