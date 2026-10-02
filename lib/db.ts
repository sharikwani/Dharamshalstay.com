/**
 * lib/db.ts -- Server-side data access layer
 * 
 * THIS IS THE CRITICAL ARCHITECTURAL FIX.
 * 
 * All public pages must use these functions instead of importing from data/*.ts.
 * Each function queries Supabase first, falling back to static seed data
 * only when Supabase is not configured (local dev without DB).
 * 
 * Uses createServerClient (service role) to bypass RLS.
 * Each function adds its own WHERE filters for safety.
 */
import { createServerClient } from './supabase';
import { Property } from '@/types';
import { placeImage, placeImageAlt, isStockImage, DESTINATION_IMAGE, TREK_IMAGES } from './place-images';

// Static fallback imports (only used when Supabase is unavailable)
import { hotels as seedHotels, getHotelBySlug as seedGetBySlug, getHotelsByDestination as seedGetByDest, getFeaturedHotels as seedFeatured } from '@/data/hotels';
import { destinations as seedDestinations, getDestinationBySlug as seedDestBySlug } from '@/data/destinations';
import { treks as seedTreks, getTrekBySlug as seedTrekBySlug, getFeaturedTreks as seedFeaturedTreks } from '@/data/treks';
import { taxiRoutes as seedTaxiRoutes } from '@/data/taxi';

/** Check if Supabase is configured */
function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// ===========================
// PROPERTIES (Hotels)
// ===========================

const DESTINATION_SLUGS = ['dharamshala', 'mcleod-ganj', 'bhagsu', 'dharamkot', 'naddi'];

/**
 * Imported properties sometimes carry a locality as their destination
 * (e.g. 'kharota'), which has no destination page -- the breadcrumb 404s and
 * the hotel never appears under an area. Map those to a real destination.
 */
function normaliseDestination<T extends Property | null>(p: T): T {
  if (!p || DESTINATION_SLUGS.includes(p.destination_slug)) return p;
  const text = [p.destination_slug, p.address_line1, p.city].join(' ').toLowerCase();
  const slug = /mcleod|mcleo/.test(text) ? 'mcleod-ganj'
    : /bhagsu/.test(text) ? 'bhagsu'
    : /dharamkot/.test(text) ? 'dharamkot'
    : /naddi/.test(text) ? 'naddi'
    : 'dharamshala';
  return { ...p, destination_slug: slug };
}

type PropertyQuery = { destination?: string; type?: string; limit?: number; featured?: boolean };

/**
 * All published properties (partner and directory listings both live in
 * Supabase and are managed in /admin/properties). Partners rank first.
 */
export async function getPublishedProperties(options?: PropertyQuery): Promise<Property[]> {
  const rows = await getPartnerProperties(options);
  const rank = (p: Property) => ((p as any).listing_type === 'directory' ? 1 : 0);
  return [...rows].sort((x, y) => rank(x) - rank(y));
}

/** Get all published partner properties, sorted by sponsored > priority > rating */
async function getPartnerProperties(options?: {
  destination?: string;
  type?: string;
  limit?: number;
  featured?: boolean;
}): Promise<Property[]> {
  if (!isSupabaseConfigured()) {
    let results = seedHotels.filter(h => h.status === 'published');
    if (options?.destination) results = results.filter(h => h.destination_slug === options.destination);
    if (options?.type) results = results.filter(h => h.type === options.type);
    if (options?.featured) results = results.filter(h => h.featured);
    if (options?.limit) results = results.slice(0, options.limit);
    return results;
  }

  try {
    const sb = createServerClient();
    let query = sb
      .from('properties')
      .select('*')
      .eq('status', 'published')
      .order('is_sponsored', { ascending: false })
      .order('priority_score', { ascending: false })
      .order('rating', { ascending: false, nullsFirst: false })
      .order('published_at', { ascending: false });

    if (options?.type) query = query.eq('type', options.type);
    if (options?.featured) query = query.eq('featured', true);
    if (options?.limit) query = query.limit(options.limit);

    const { data, error } = await query;
    // Never fall back to the fictional seed hotels in production: a DB hiccup
    // would otherwise publish fake listings that Google can index.
    if (error) {
      console.error('DB getPublishedProperties error:', error.message);
      return [];
    }
    const rows = ((data as Property[]) || []).map(normaliseDestination);
    return options?.destination ? rows.filter((p) => p.destination_slug === options.destination) : rows;
  } catch (err) {
    console.error('DB getPublishedProperties exception:', err);
    return [];
  }
}

/** Get a single published property by slug */
export async function getPropertyBySlug(slug: string): Promise<Property | null> {
  return getPartnerPropertyBySlug(slug);
}

async function getPartnerPropertyBySlug(slug: string): Promise<Property | null> {
  if (!isSupabaseConfigured()) {
    return seedGetBySlug(slug) || null;
  }

  try {
    const sb = createServerClient();
    const { data, error } = await sb
      .from('properties')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (error || !data) return null;
    return normaliseDestination(data as Property);
  } catch {
    return null;
  }
}

/** Get all published property slugs (for sitemap, etc) */
export async function getAllPublishedSlugs(): Promise<string[]> {
  return getPartnerSlugs();
}

async function getPartnerSlugs(): Promise<string[]> {
  if (!isSupabaseConfigured()) {
    return seedHotels.filter(h => h.status === 'published').map(h => h.slug);
  }

  try {
    const sb = createServerClient();
    const { data, error } = await sb
      .from('properties')
      .select('slug')
      .eq('status', 'published');

    if (error || !data) return [];
    return data.map((d: { slug: string }) => d.slug);
  } catch {
    return [];
  }
}

/** Get published properties for a destination */
export async function getPropertiesByDestination(destinationSlug: string): Promise<Property[]> {
  return getPublishedProperties({ destination: destinationSlug });
}

/** Get featured published properties */
export async function getFeaturedProperties(limit = 6): Promise<Property[]> {
  return getPublishedProperties({ featured: true, limit });
}

// ===========================
// DESTINATIONS
// ===========================

/**
 * Destinations have no admin editor, so data/destinations.ts is the source of
 * truth for the five core areas (it carries fact-checked altitudes, distances
 * and FAQs that the older DB rows don't). We also swap stored stock-photo URLs
 * for the real photo of that destination.
 */
function withDestinationImage<T extends { slug: string; image?: string; image_alt?: string } | null | undefined>(d: T): T {
  if (!d) return d;
  const seed = seedDestBySlug(d.slug);
  const merged = seed ? { ...d, ...seed, id: (d as any).id ?? seed.id } : d;
  const key = DESTINATION_IMAGE[d.slug];
  if (!key) return merged;
  return { ...merged, image: placeImage(key), image_alt: placeImageAlt(key) };
}

export async function getDestinations() {
  if (!isSupabaseConfigured()) return seedDestinations.map(withDestinationImage);

  try {
    const sb = createServerClient();
    const { data, error } = await sb.from('destinations').select('*').order('name');
    if (error || !data || data.length === 0) return seedDestinations.map(withDestinationImage);
    return data.map(withDestinationImage);
  } catch {
    return seedDestinations.map(withDestinationImage);
  }
}

export async function getDestinationBySlug(slug: string) {
  if (!isSupabaseConfigured()) return withDestinationImage(seedDestBySlug(slug));

  try {
    const sb = createServerClient();
    const { data, error } = await sb.from('destinations').select('*').eq('slug', slug).single();
    if (error || !data) return withDestinationImage(seedDestBySlug(slug));
    return withDestinationImage(data);
  } catch {
    return withDestinationImage(seedDestBySlug(slug));
  }
}

// ===========================
// TREKS
// ===========================

/** Real trail photos for known treks; keep any non-stock photos stored in the DB. */
function withTrekImages<T extends { slug: string; images?: string[] } | null | undefined>(t: T): T {
  if (!t) return t;
  const own = (t.images || []).filter((u) => !isStockImage(u));
  const real = (TREK_IMAGES[t.slug] || []).map(placeImage);
  const images = Array.from(new Set([...real, ...own]));
  return { ...t, images: images.length ? images : [placeImage('dhauladhar-hero')] };
}

export async function getPublishedTreks() {
  if (!isSupabaseConfigured()) return seedTreks.filter(t => t.status === 'published').map(withTrekImages);

  try {
    const sb = createServerClient();
    const { data, error } = await sb
      .from('treks')
      .select('*')
      .eq('status', 'published')
      .order('is_sponsored', { ascending: false })
      .order('priority_score', { ascending: false })
      .order('featured', { ascending: false });
    if (error || !data || data.length === 0) return seedTreks.filter(t => t.status === 'published').map(withTrekImages);
    return data.map(withTrekImages);
  } catch {
    return seedTreks.filter(t => t.status === 'published').map(withTrekImages);
  }
}

export async function getTrekBySlug(slug: string) {
  if (!isSupabaseConfigured()) return withTrekImages(seedTrekBySlug(slug)) || null;

  try {
    const sb = createServerClient();
    const { data, error } = await sb.from('treks').select('*').eq('slug', slug).eq('status', 'published').single();
    if (error || !data) return withTrekImages(seedTrekBySlug(slug)) || null;
    return withTrekImages(data);
  } catch {
    return withTrekImages(seedTrekBySlug(slug)) || null;
  }
}

export async function getFeaturedTreks() {
  if (!isSupabaseConfigured()) return seedFeaturedTreks().map(withTrekImages);

  try {
    const sb = createServerClient();
    const { data, error } = await sb.from('treks').select('*').eq('status', 'published').eq('featured', true).limit(6);
    if (error || !data || data.length === 0) return seedFeaturedTreks().map(withTrekImages);
    return data.map(withTrekImages);
  } catch {
    return seedFeaturedTreks().map(withTrekImages);
  }
}

// ===========================
// TAXI ROUTES
// ===========================

export async function getActiveTaxiRoutes() {
  if (!isSupabaseConfigured()) return seedTaxiRoutes;

  try {
    const sb = createServerClient();
    const { data, error } = await sb
      .from('taxi_routes')
      .select('*')
      .eq('status', 'active')
      .order('is_sponsored', { ascending: false })
      .order('route_type')
      .order('from_location');
    if (error || !data || data.length === 0) return seedTaxiRoutes;
    return data;
  } catch {
    return seedTaxiRoutes;
  }
}

// ===========================
// PARAGLIDING PACKAGES
// ===========================

export interface ParaglidingPackage {
  slug: string; name: string; destination: string; duration: string; altitude: string;
  price_per_person: number; description: string; includes: string[]; featured: boolean; image: string;
}

/** Published packages from /admin/paragliding (empty list if none are published yet). */
export async function getParaglidingPackages(): Promise<ParaglidingPackage[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const sb = createServerClient();
    const { data, error } = await sb
      .from('paragliding_packages')
      .select('*')
      .eq('status', 'published')
      .order('is_sponsored', { ascending: false })
      .order('priority_score', { ascending: false })
      .order('price_per_person', { ascending: true });
    if (error || !data) return [];
    return data.map((p: any) => {
      const img = Array.isArray(p.images) ? (typeof p.images[0] === 'string' ? p.images[0] : p.images[0]?.url) : undefined;
      return {
        slug: p.slug, name: p.name, destination: p.destination, duration: p.duration || '', altitude: p.altitude || '',
        price_per_person: p.price_per_person, description: p.short_description || p.description || '',
        includes: Array.isArray(p.includes) ? p.includes : [], featured: !!p.featured,
        image: img || (/bir/i.test(p.destination) ? placeImage('bir-paragliding') : placeImage('dhauladhar-hero')),
      };
    });
  } catch {
    return [];
  }
}
