/**
 * lib/db.ts — Server-side data access layer
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

/** Get all published properties, sorted by sponsored > priority > rating */
export async function getPublishedProperties(options?: {
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
    if (error) {
      console.error('DB getPublishedProperties error:', error.message);
      return seedHotels.filter(h => h.status === 'published');
    }
    return (data as Property[]) || [];
  } catch (err) {
    console.error('DB getPublishedProperties exception:', err);
    return seedHotels.filter(h => h.status === 'published');
  }
}

/** Get a single published property by slug */
export async function getPropertyBySlug(slug: string): Promise<Property | null> {
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

    if (error || !data) {
      // Fallback: try static data
      return seedGetBySlug(slug) || null;
    }
    return data as Property;
  } catch {
    return seedGetBySlug(slug) || null;
  }
}

/** Get all published property slugs (for sitemap, etc) */
export async function getAllPublishedSlugs(): Promise<string[]> {
  if (!isSupabaseConfigured()) {
    return seedHotels.filter(h => h.status === 'published').map(h => h.slug);
  }

  try {
    const sb = createServerClient();
    const { data, error } = await sb
      .from('properties')
      .select('slug')
      .eq('status', 'published');

    if (error || !data) {
      return seedHotels.filter(h => h.status === 'published').map(h => h.slug);
    }
    return data.map((d: { slug: string }) => d.slug);
  } catch {
    return seedHotels.map(h => h.slug);
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

export async function getDestinations() {
  if (!isSupabaseConfigured()) return seedDestinations;

  try {
    const sb = createServerClient();
    const { data, error } = await sb.from('destinations').select('*').order('name');
    if (error || !data || data.length === 0) return seedDestinations;
    return data;
  } catch {
    return seedDestinations;
  }
}

export async function getDestinationBySlug(slug: string) {
  if (!isSupabaseConfigured()) return seedDestBySlug(slug);

  try {
    const sb = createServerClient();
    const { data, error } = await sb.from('destinations').select('*').eq('slug', slug).single();
    if (error || !data) return seedDestBySlug(slug);
    return data;
  } catch {
    return seedDestBySlug(slug);
  }
}

// ===========================
// TREKS
// ===========================

export async function getPublishedTreks() {
  if (!isSupabaseConfigured()) return seedTreks.filter(t => t.status === 'published');

  try {
    const sb = createServerClient();
    const { data, error } = await sb
      .from('treks')
      .select('*')
      .eq('status', 'published')
      .order('is_sponsored', { ascending: false })
      .order('priority_score', { ascending: false })
      .order('featured', { ascending: false });
    if (error || !data || data.length === 0) return seedTreks.filter(t => t.status === 'published');
    return data;
  } catch {
    return seedTreks.filter(t => t.status === 'published');
  }
}

export async function getTrekBySlug(slug: string) {
  if (!isSupabaseConfigured()) return seedTrekBySlug(slug) || null;

  try {
    const sb = createServerClient();
    const { data, error } = await sb.from('treks').select('*').eq('slug', slug).eq('status', 'published').single();
    if (error || !data) return seedTrekBySlug(slug) || null;
    return data;
  } catch {
    return seedTrekBySlug(slug) || null;
  }
}

export async function getFeaturedTreks() {
  if (!isSupabaseConfigured()) return seedFeaturedTreks();

  try {
    const sb = createServerClient();
    const { data, error } = await sb.from('treks').select('*').eq('status', 'published').eq('featured', true).limit(6);
    if (error || !data || data.length === 0) return seedFeaturedTreks();
    return data;
  } catch {
    return seedFeaturedTreks();
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

