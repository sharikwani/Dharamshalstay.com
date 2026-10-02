/** Seed-data shapes for the directory listings (see scripts/generate-directory-sql.ts). */
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
  /** Where the property was verified to exist; copied into admin notes. */
  sources: string[];
}

/** The property's own photos and listing facts. */
export interface DirectoryMedia {
  images: { url: string; alt: string; category: string }[];
  photo_source: string;
  check_in_time?: string;
  check_out_time?: string;
  room_types?: { name: string; description?: string; bed_type?: string; max_occupancy?: number }[];
  amenities?: string[];
  pet_policy?: string;
  smoking_policy?: string;
  couple_friendly?: boolean;
}
