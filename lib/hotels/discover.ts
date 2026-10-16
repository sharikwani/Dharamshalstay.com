/**
 * The stay finder (/hotels): what each listing is like, worked out from the data we already hold, plus the
 * "let us pick" scoring. Pure functions, no I/O.
 */
import { normalizeImages } from '@/lib/images';

export type Mood = 'view' | 'quiet' | 'cafes' | 'triund' | 'social' | 'family' | 'work';
export const MOODS: Mood[] = ['view', 'quiet', 'cafes', 'triund', 'social', 'family', 'work'];
export const BANDS = ['budget', 'mid-range', 'upscale'] as const;

/** Landmarks for the map and the distance facts (OpenStreetMap, October 2026). */
export const LANDMARKS = {
  square: { lat: 32.23862, lng: 76.32361 }, // McLeod Ganj Main Square
  temple: { lat: 32.2324, lng: 76.3244 }, // Tsuglagkhang / Dalai Lama Temple
  trailhead: { lat: 32.24926, lng: 76.32095 }, // Gallu Devi temple, start of the Triund trail
  triund: { lat: 32.26144, lng: 76.35455 },
  bhagsu: { lat: 32.24548, lng: 76.33405 }, // Bhagsunag waterfall path
  dalLake: { lat: 32.24713, lng: 76.31053 },
  bazaar: { lat: 32.21917, lng: 76.3183 }, // Kotwali Bazaar, lower Dharamshala
  stadium: { lat: 32.19759, lng: 76.32592 }, // HPCA cricket stadium
};

type Pt = { lat: number; lng: number };

/** Straight-line distance in km. Hill paths are longer, so the page says "straight line". */
export function km(a: Pt, b: Pt): number {
  const R = 6371, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const text = (h: any, ...fields: string[]) => fields.map((f) => {
  const v = h[f];
  return Array.isArray(v) ? v.join(' | ') : v || '';
}).join(' | ');

export type StayFacts = {
  moods: Mood[];
  view: boolean;
  parking: boolean;
  live: boolean;
  /** Straight-line km to McLeod Ganj Main Square and to the Triund trailhead, when the listing has a map pin. */
  kmSquare: number | null;
  kmTrail: number | null;
  pin: Pt | null;
};

export function stayFacts(h: any): StayFacts {
  const pin = Number(h.latitude) && Number(h.longitude) ? { lat: Number(h.latitude), lng: Number(h.longitude) } : null;
  const kmSquare = pin ? km(pin, LANDMARKS.square) : null;
  const kmTrail = pin ? km(pin, LANDMARKS.trailhead) : null;
  const all = text(h, 'amenities', 'highlights', 'good_for', 'locality', 'short_description');
  const view = /mountain view|valley view|dhauladhar|views? (of|over|across)|panoram/i.test(text(h, 'amenities', 'highlights', 'short_description'));
  const parking = /parking/i.test(text(h, 'amenities'));
  const moods: Mood[] = [];
  if (view) moods.push('view');
  if (/quiet|peaceful|calm|secluded|forest|away from the (crowds|bustle)/i.test(text(h, 'highlights', 'locality', 'good_for')) || ['naddi', 'dharamkot'].includes(h.destination_slug)) moods.push('quiet');
  if (kmSquare !== null ? kmSquare <= 0.6 : h.destination_slug === 'mcleod-ganj' && /main square|temple road|jogiwara/i.test(all)) moods.push('cafes');
  if (kmTrail !== null ? kmTrail <= 1.0 : ['dharamkot', 'bhagsu'].includes(h.destination_slug)) moods.push('triund');
  if (h.type === 'hostel' || /backpack|common room|social|dorm/i.test(all)) moods.push('social');
  if (/famil/i.test(text(h, 'good_for'))) moods.push('family');
  if (/remote|nomad|work|long(er)? stay|business/i.test(text(h, 'good_for', 'highlights'))) moods.push('work');
  return { moods, view, parking, live: h.listing_type !== 'directory' && Number(h.price_min) > 0, kmSquare, kmTrail, pin };
}

export type Who = 'couple' | 'family' | 'solo' | 'friends';
export type Answers = { who: Who | null; budget: (typeof BANDS)[number] | 'any' | null; matters: Mood | null };

const BAND_I: Record<string, number> = { budget: 0, 'mid-range': 1, upscale: 2 };

/** How well a stay fits the three answers; higher is better. */
export function matchScore(h: any, f: StayFacts, a: Answers): number {
  let s = 0;
  const good = text(h, 'good_for');
  if (a.who === 'couple') s += (/couple|honeymoon/i.test(good) ? 2 : 0) + (f.moods.includes('quiet') ? 1 : 0);
  if (a.who === 'family') s += (f.moods.includes('family') ? 3 : 0) + (f.parking ? 1 : 0) - (h.type === 'hostel' ? 3 : 0);
  if (a.who === 'solo') s += (f.moods.includes('social') ? 2 : 0) + (/solo/i.test(good) ? 2 : 0);
  if (a.who === 'friends') s += (/group|friends/i.test(good) ? 2 : 0) + (f.moods.includes('social') ? 1 : 0);
  if (a.budget && a.budget !== 'any' && h.price_band) {
    const d = Math.abs(BAND_I[a.budget] - (BAND_I[h.price_band] ?? 1));
    s += d === 0 ? 3 : d === 1 ? 0 : -3;
  }
  if (a.matters && f.moods.includes(a.matters)) s += 3;
  if ((h.images || []).length) s += 1;
  return s;
}

/** Photos a finder card shows. */
export const CARD_PHOTOS = 6;

/**
 * Only what the finder needs from a listing, with its facts worked out on the server. Sending whole
 * listings (descriptions, rooms, every photo) made /hotels over 1 MB of HTML.
 */
export function slimStay(h: any) {
  const highlights: string[] = (h.highlights || []).slice(0, 2);
  return {
    id: h.id as string, slug: h.slug as string, name: h.name as string, type: h.type as string,
    destination_slug: h.destination_slug as string, price_band: (h.price_band || null) as string | null,
    price_min: Number(h.price_min) || 0, locality: h.locality || '', address_line1: h.address_line1 || '',
    highlights, short_description: highlights.length ? '' : (h.short_description || ''),
    good_for: h.good_for || [],
    images: normalizeImages(h.images).slice(0, CARD_PHOTOS).map((i) => ({ url: i.url, alt: i.alt })),
    facts: stayFacts(h),
  };
}
export type SlimStay = ReturnType<typeof slimStay>;
