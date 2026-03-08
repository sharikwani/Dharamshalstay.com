/**
 * lib/images.ts — Image normalization helpers
 *
 * Handles the mixed image data shapes that exist in the system:
 * - Seed data room images: plain string URLs
 * - Property images: {url, alt, category, is_primary, sort_order}
 * - Partner uploads: {url, alt, category, is_primary, sort_order}
 * - Legacy/broken: null, undefined, empty strings, objects without url
 */

export interface NormalizedImage {
  url: string;
  alt: string;
  category: string;
  is_primary: boolean;
  sort_order: number;
}

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80';

/**
 * Normalize a single image entry to a consistent shape.
 * Handles: string URL, object with .url, null, undefined
 */
export function normalizeImage(img: any, index = 0): NormalizedImage | null {
  if (!img) return null;

  // Plain string URL
  if (typeof img === 'string') {
    if (!img.trim()) return null;
    return { url: img, alt: '', category: 'other', is_primary: index === 0, sort_order: index };
  }

  // Object with .url
  if (typeof img === 'object' && img.url && typeof img.url === 'string' && img.url.trim()) {
    return {
      url: img.url,
      alt: img.alt || '',
      category: img.category || 'other',
      is_primary: img.is_primary ?? (index === 0),
      sort_order: img.sort_order ?? index,
    };
  }

  return null;
}

/**
 * Normalize an array of mixed image data into consistent objects.
 * Filters out null/broken entries.
 */
export function normalizeImages(images: any): NormalizedImage[] {
  if (!images || !Array.isArray(images)) return [];
  return images
    .map((img: any, i: number) => normalizeImage(img, i))
    .filter((img): img is NormalizedImage => img !== null);
}

/**
 * Get the primary image URL from an image array, with fallback.
 */
export function getPrimaryImageUrl(images: any): string {
  const normalized = normalizeImages(images);
  const primary = normalized.find(img => img.is_primary);
  return primary?.url || normalized[0]?.url || FALLBACK_IMG;
}

/**
 * Get a single image URL from a room's image array.
 * Room images can be plain strings or objects.
 */
export function getRoomImageUrl(roomImages: any, fallbackImages?: any): string {
  if (roomImages && Array.isArray(roomImages) && roomImages.length > 0) {
    const first = roomImages[0];
    if (typeof first === 'string' && first.trim()) return first;
    if (typeof first === 'object' && first?.url) return first.url;
  }
  // Fallback to property gallery
  if (fallbackImages) {
    return getPrimaryImageUrl(fallbackImages);
  }
  return FALLBACK_IMG;
}

/**
 * Count displayable images in a room
 */
export function countRoomImages(roomImages: any): number {
  if (!roomImages || !Array.isArray(roomImages)) return 0;
  return roomImages.filter((img: any) => {
    if (typeof img === 'string') return img.trim().length > 0;
    if (typeof img === 'object') return img?.url?.trim?.()?.length > 0;
    return false;
  }).length;
}

export { FALLBACK_IMG };
