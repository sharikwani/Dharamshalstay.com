/**
 * Directory listings: real, verified properties that are NOT (yet) partners.
 *
 * We describe them in our own words so travellers can compare areas and send
 * an enquiry, but we never show prices, ratings or photos we don't own, and we
 * never claim they are verified partners. Owners can claim a listing; once a
 * property with the same slug is published in Supabase, the DB row wins.
 */
import type { Property } from '@/types';
import { placeImage, DESTINATION_IMAGE } from '@/lib/place-images';
import { directoryHotels1 } from './directory-hotels-1';
import { directoryHotels2 } from './directory-hotels-2';

export interface DirectoryHotel {
  slug: string;
  name: string;
  type: 'hotel' | 'homestay' | 'hostel' | 'guesthouse' | 'resort' | 'cottage';
  destination_slug: 'dharamshala' | 'mcleod-ganj' | 'bhagsu' | 'dharamkot' | 'naddi';
  locality: string;
  price_band: 'budget' | 'mid-range' | 'upscale';
  short_description: string;
  description: string;
  highlights: string[];
  good_for: string[];
  nearby: string[];
  amenities: string[];
  website?: string;
  /** Where we verified the property exists. Not shown publicly. */
  sources: string[];
}

export type DirectoryProperty = Property & {
  listing_type: 'directory';
  locality: string;
  price_band: DirectoryHotel['price_band'];
  highlights: string[];
  good_for: string[];
  nearby: string[];
  website?: string;
};

const AREA_NAMES: Record<DirectoryHotel['destination_slug'], string> = {
  dharamshala: 'Dharamshala',
  'mcleod-ganj': 'McLeod Ganj',
  bhagsu: 'Bhagsu',
  dharamkot: 'Dharamkot',
  naddi: 'Naddi',
};

const LISTED_AT = '2026-10-02T00:00:00.000Z';

function toProperty(h: DirectoryHotel): DirectoryProperty {
  const area = AREA_NAMES[h.destination_slug];
  return {
    // Only the fields the public pages read; everything else stays empty.
    ...({} as Property),
    id: 'dir-' + h.slug,
    owner_id: '',
    status: 'published',
    slug: h.slug,
    featured: false,
    name: h.name,
    type: (h.type === 'cottage' ? 'homestay' : h.type) as Property['type'],
    description: h.description,
    short_description: h.short_description,
    destination_slug: h.destination_slug,
    city: area,
    state: 'Himachal Pradesh',
    address_line1: h.locality,
    amenities: h.amenities,
    images: [{
      url: placeImage(DESTINATION_IMAGE[h.destination_slug]),
      alt: area + ' area, where ' + h.name + ' is located',
      category: 'view',
      is_primary: true,
      sort_order: 0,
    }],
    rooms: [],
    faqs: [],
    price_min: 0,
    price_max: 0,
    rating: 0,
    review_count: 0,
    created_at: LISTED_AT,
    updated_at: LISTED_AT,
    listing_type: 'directory',
    locality: h.locality,
    price_band: h.price_band,
    highlights: h.highlights,
    good_for: h.good_for,
    nearby: h.nearby,
    website: h.website,
  } as DirectoryProperty;
}

export const directoryProperties: DirectoryProperty[] = [...directoryHotels1, ...directoryHotels2]
  .map(toProperty)
  .sort((a, b) => a.name.localeCompare(b.name));

export function isDirectoryListing(p: unknown): p is DirectoryProperty {
  return !!p && (p as DirectoryProperty).listing_type === 'directory';
}

export function getDirectoryPropertyBySlug(slug: string): DirectoryProperty | undefined {
  return directoryProperties.find((p) => p.slug === slug);
}
