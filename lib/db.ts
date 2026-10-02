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
import { directoryProperties, getDirectoryPropertyBySlug } from '@/data/directory-hotels';

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

type PropertyQuery = { destination?: string; type?: string; limit?: number; featured?: boolean };

/**
 * Partner properties (Supabase) first, then directory listings for real
 * properties we don't partner with yet. A DB row always wins over a directory
 * entry with the same slug (e.g. once an owner claims their listing).
 */
export async function getPublishedProperties(options?: PropertyQuery): Promise<Property[]> {
  const partners = await getPartnerProperties({ ...options, limit: undefined });
  if (options?.featured) return options.limit ? partners.slice(0, options.limit) : partners;

  const taken = new Set(partners.map((p) => p.slug));
  const directory = directoryProperties.filter((d) =>
    !taken.has(d.slug) &&
    (!options?.destination || d.destination_slug === options.destination) &&
    (!options?.type || d.type === options.type));

  const all = [...partners, ...directory];
  return options?.limit ? all.slice(0, options.limit) : all;
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

    if (options?.destination) query = query.eq('destination_slug', options.destination);
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
    return (data as Property[]) || [];
  } catch (err) {
    console.error('DB getPublishedProperties exception:', err);
    return [];
  }
}

/** Get a single published property by slug (partner first, then directory) */
export async function getPropertyBySlug(slug: string): Promise<Property | null> {
  return (await getPartnerPropertyBySlug(slug)) || getDirectoryPropertyBySlug(slug) || null;
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
    return data as Property;
  } catch {
    return null;
  }
}

/** Get all published property slugs, partner + directory (for sitemap, etc) */
export async function getAllPublishedSlugs(): Promise<string[]> {
  const partner = await getPartnerSlugs();
  return Array.from(new Set([...partner, ...directoryProperties.map((d) => d.slug)]));
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
