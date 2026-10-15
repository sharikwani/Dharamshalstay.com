/**
 * Claim and removal links for a listing. The plain links (/claim/<slug>) work for
 * anyone and go to the admin queue. The links we WhatsApp to the hotel's own
 * phone carry a key (?t=...), which marks the request as coming from the hotel:
 * a keyed removal takes the listing down straight away.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { siteConfig } from '@/lib/config';

function secret(): string {
  const s = process.env.BOOKING_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error('No secret for listing links');
  return s;
}

export function listingKey(propertyId: string): string {
  return createHmac('sha256', secret()).update('listing-owner:' + propertyId).digest('base64url').slice(0, 20);
}

export function verifyListingKey(propertyId: string, key: string | null | undefined): boolean {
  if (!key) return false;
  const want = Buffer.from(listingKey(propertyId));
  const got = Buffer.from(key);
  return want.length === got.length && timingSafeEqual(want, got);
}

/** The part after the site URL, e.g. "claim/hotel-tibet?t=..." (WhatsApp URL buttons append this to a fixed base). */
export function listingLinkSuffix(p: { id: string; slug: string }): string {
  return p.slug + '?t=' + listingKey(p.id);
}

export function claimUrl(p: { id: string; slug: string }): string {
  return siteConfig.url + '/claim/' + listingLinkSuffix(p);
}
export function removalUrl(p: { id: string; slug: string }): string {
  return siteConfig.url + '/remove-listing/' + listingLinkSuffix(p);
}
