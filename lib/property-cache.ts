import { revalidateTag } from 'next/cache';

/**
 * The published-property list is read once and shared for 5 minutes (lib/db.ts). Anything that changes a property
 * (rooms, prices, photos, status, rating) calls refreshPublishedProperties() so public pages show it at once.
 * Kept in its own file so writers do not pull in the database client.
 */
export const PUBLISHED_PROPERTIES_TAG = 'published-properties';

/** Published treks, paragliding packages and taxi routes, cached the same way (lib/db.ts). */
export const PUBLISHED_CATALOGUE_TAG = 'published-catalogue';

/** Never throws (outside a request, e.g. scripts and tests, there is nothing to clear). */
export function refreshPublishedProperties(): void {
  try { revalidateTag(PUBLISHED_PROPERTIES_TAG); } catch { /* not in a request */ }
}

/** Call after any trek, paragliding or taxi route change. Never throws. */
export function refreshPublishedCatalogue(): void {
  try { revalidateTag(PUBLISHED_CATALOGUE_TAG); } catch { /* not in a request */ }
}
