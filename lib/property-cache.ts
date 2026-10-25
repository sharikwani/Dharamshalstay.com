import { revalidateTag } from 'next/cache';

/**
 * The published-property list is read once and shared for 5 minutes (lib/db.ts). Anything that changes a property
 * (rooms, prices, photos, status, rating) calls refreshPublishedProperties() so public pages show it at once.
 * Kept in its own file so writers do not pull in the database client.
 */
export const PUBLISHED_PROPERTIES_TAG = 'published-properties';

/** Never throws (outside a request, e.g. scripts and tests, there is nothing to clear). */
export function refreshPublishedProperties(): void {
  try { revalidateTag(PUBLISHED_PROPERTIES_TAG); } catch { /* not in a request */ }
}
