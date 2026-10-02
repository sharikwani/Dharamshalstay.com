/**
 * Directory listings are real properties we describe but don't partner with
 * (yet). They live in the Supabase `properties` table with
 * listing_type = 'directory' and are managed in /admin/properties like any
 * other listing. Their pages show no prices or ratings.
 */
import type { Property } from '@/types';
import { placeImage, DESTINATION_IMAGE } from './place-images';
import { normalizeImages } from './images';

export type PriceBand = 'budget' | 'mid-range' | 'upscale';

export type DirectoryProperty = Property & {
  listing_type: 'directory';
  locality?: string;
  price_band?: PriceBand;
  highlights?: string[];
  good_for?: string[];
  nearby?: string[];
  website?: string;
  photo_source?: string;
};

export function isDirectoryListing(p: unknown): p is DirectoryProperty {
  return !!p && (p as DirectoryProperty).listing_type === 'directory';
}

const AREA_NAMES: Record<string, string> = {
  dharamshala: 'Dharamshala', 'mcleod-ganj': 'McLeod Ganj', bhagsu: 'Bhagsu', dharamkot: 'Dharamkot', naddi: 'Naddi',
};

export function areaName(slug?: string): string {
  return (slug && AREA_NAMES[slug]) || 'Dharamshala';
}

/** Everything the directory page needs, with safe defaults for missing fields. */
export function directoryView(p: DirectoryProperty) {
  const area = areaName(p.destination_slug);
  const own = normalizeImages(p.images);
  const fallback = {
    url: placeImage(DESTINATION_IMAGE[p.destination_slug] || 'dharamshala-town'),
    alt: area + ' area, where ' + p.name + ' is located',
    category: 'view', is_primary: true, sort_order: 0,
  };
  return {
    area,
    locality: p.locality || p.address_line1 || area,
    images: own.length ? own : [fallback],
    hasOwnPhotos: own.length > 0,
    roomTypes: (p.rooms || []).filter((r: any) => r?.name),
    highlights: p.highlights || [],
    goodFor: p.good_for || [],
    nearby: p.nearby || [],
  };
}
