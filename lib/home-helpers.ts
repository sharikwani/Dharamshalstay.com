import type { Property } from '@/types';
import { isStockImage } from './place-images';

/** Hour of the day in India (UTC+5:30) as a decimal, e.g. 17.5 = 5:30 PM. */
export function istHour(now: Date): number {
  return (now.getUTCHours() + now.getUTCMinutes() / 60 + 5.5) % 24;
}

export type SkyPhase = 'dawn' | 'day' | 'golden' | 'night';

/** Which light the homepage hero shows at a given hour in Dharamshala. */
export function skyPhase(hour: number): SkyPhase {
  if (hour >= 5 && hour < 7.5) return 'dawn';
  if (hour >= 7.5 && hour < 16.5) return 'day';
  if (hour >= 16.5 && hour < 18.5) return 'golden';
  return 'night';
}

export type StayPhoto = { url: string; alt: string };

/**
 * A property's own photos. Stock photos and our sightseeing place photos are
 * left out: the homepage slideshows must only show the property itself.
 */
export function ownPhotos(p: Pick<Property, 'name'> & { images?: unknown[] }): StayPhoto[] {
  return (p.images || [])
    .map((img: any) => (typeof img === 'string' ? { url: img, alt: p.name } : { url: img?.url || '', alt: img?.alt || p.name }))
    .filter((img) => img.url && !isStockImage(img.url) && !img.url.startsWith('/images/places/'));
}

/** Stays to feature on the homepage: listing order, only those with their own photos. */
export function pickFeaturedStays<T extends Pick<Property, 'name'> & { images?: unknown[] }>(stays: T[], limit: number) {
  return stays
    .map((p) => ({ ...p, photos: ownPhotos(p).slice(0, 5) }))
    .filter((p) => p.photos.length > 0)
    .slice(0, limit);
}
