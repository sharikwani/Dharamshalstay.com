/**
 * lib/place-images.ts -- Real photographs of the actual places we write about.
 *
 * Every image is a freely licensed photo from Wikimedia Commons, self-hosted
 * under /public/images/places so it never breaks because a third-party URL
 * disappears. Author/licence attribution lives in data/photo-credits.ts and
 * is shown on /photo-credits (required by CC BY / CC BY-SA).
 */
import { photoCredits } from '@/data/photo-credits';

export const PLACE_IMAGE_KEYS = [
  'dhauladhar-hero', 'dharamshala-town', 'mcleod-ganj', 'tsuglagkhang',
  'bhagsu-waterfall', 'bhagsunag-temple', 'dharamkot', 'naddi', 'triund',
  'kareri-lake', 'dal-lake', 'st-john-church', 'hpca-stadium', 'kangra-fort',
  'norbulingka', 'palampur-tea', 'bir-paragliding', 'bir-monastery',
  'baijnath-temple', 'masroor-temple', 'chamunda-devi', 'brajeshwari-temple',
  'jwalamukhi-temple', 'gyuto-monastery', 'kangra-toy-train', 'kangra-airport',
  'dharamshala-snow', 'tibetan-momos', 'mcleod-cafe', 'war-memorial',
  'tibet-museum', 'andretta', 'indrahar-pass', 'mountain-road', 'kangra-valley',
  'prayer-flags',
] as const;

export type PlaceImageKey = (typeof PLACE_IMAGE_KEYS)[number];

/**
 * If a key has no sourced photo yet, fall back to the closest real photo we do
 * have, so a page never renders a broken or unrelated image.
 */
const FALLBACKS: Partial<Record<PlaceImageKey, PlaceImageKey>> = {
  'bhagsunag-temple': 'bhagsu-waterfall',
  'dharamkot': 'triund',
  'naddi': 'dhauladhar-hero',
  'dal-lake': 'naddi',
  'indrahar-pass': 'triund',
  'bir-monastery': 'bir-paragliding',
  'tibet-museum': 'tsuglagkhang',
  'prayer-flags': 'mcleod-ganj',
  'mcleod-cafe': 'mcleod-ganj',
  'tibetan-momos': 'mcleod-ganj',
  'gyuto-monastery': 'norbulingka',
  'brajeshwari-temple': 'kangra-fort',
  'jwalamukhi-temple': 'chamunda-devi',
  'andretta': 'palampur-tea',
  'kangra-toy-train': 'kangra-valley',
  'kangra-airport': 'kangra-valley',
  'mountain-road': 'kangra-valley',
  'dharamshala-snow': 'dhauladhar-hero',
  'war-memorial': 'dharamshala-town',
  'hpca-stadium': 'dharamshala-town',
  'dharamshala-town': 'dhauladhar-hero',
  'kangra-valley': 'dhauladhar-hero',
};

function resolveKey(key: PlaceImageKey, depth = 0): PlaceImageKey {
  if (photoCredits[key] || depth > 4) return key;
  const next = FALLBACKS[key];
  return next ? resolveKey(next, depth + 1) : key;
}

/** Public path of the real photo for a place, e.g. '/images/places/triund.jpg'. */
export function placeImage(key: PlaceImageKey): string {
  return '/images/places/' + resolveKey(key) + '.jpg';
}

/** Descriptive alt text for a place photo. */
export function placeImageAlt(key: PlaceImageKey): string {
  return photoCredits[resolveKey(key)]?.alt || key.replace(/-/g, ' ');
}

/** Absolute URL, for Open Graph and JSON-LD. */
export function absoluteImageUrl(src: string, origin: string): string {
  return src.startsWith('http') ? src : origin + src;
}

/**
 * Destination and trek rows come from Supabase and still carry old stock-photo
 * URLs (several of which now 404). Map each slug to its real photo so the page
 * always shows the actual place, regardless of what is stored in the DB.
 */
export const DESTINATION_IMAGE: Record<string, PlaceImageKey> = {
  dharamshala: 'dharamshala-town',
  'mcleod-ganj': 'mcleod-ganj',
  bhagsu: 'bhagsu-waterfall',
  dharamkot: 'dharamkot',
  naddi: 'naddi',
};

export const TREK_IMAGES: Record<string, PlaceImageKey[]> = {
  'triund-trek': ['triund', 'indrahar-pass', 'dhauladhar-hero'],
  'kareri-lake-trek': ['kareri-lake', 'dhauladhar-hero'],
};

/** Old hosts whose images are generic stock, not the actual place. */
export function isStockImage(url?: string | null): boolean {
  return !url || /images\.unsplash\.com|source\.unsplash\.com|pexels\.com|pixabay\.com/i.test(url);
}
