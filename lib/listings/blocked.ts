/**
 * Properties that asked to leave Dharamshala Stay and must never be listed again, in any way: partner sign-up,
 * claim links, directory imports or an admin "restore". The database enforces the same list with a trigger
 * (supabase/migration-v56-blocked-properties.sql), which also covers the admin and partner pages that write
 * straight to Supabase; keep both lists in step.
 */
export type BlockedProperty = { label: string; nameKey: string; phones: string[]; slugs: string[]; since: string };

export const BLOCKED_PROPERTIES: BlockedProperty[] = [
  {
    // Owner instruction 19 Nov 2026, agreed with the property by phone: no longer takes bookings through us.
    label: 'White Rabbit Guest House, Upper Bhagsu',
    nameKey: 'whiterabbit',
    phones: ['8350950090'],
    slugs: ['white-rabbit-guest-house-bhagsu'],
    since: '2026-11-19',
  },
];

export const BLOCKED_MESSAGE = 'This property cannot be listed on Dharamshala Stay. Please contact us if you think this is a mistake.';

const nameKey = (s: unknown) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const phoneKey = (s: unknown) => String(s ?? '').replace(/\D/g, '').slice(-10);

type Candidate = { name?: unknown; slug?: unknown; contact_phone?: unknown; contact_whatsapp?: unknown };

/** The blocked property this row looks like (by name, slug or phone), or null. */
export function blockedPropertyMatch(p: Candidate): BlockedProperty | null {
  const name = nameKey(p.name);
  const slug = String(p.slug ?? '').toLowerCase();
  const phones = [phoneKey(p.contact_phone), phoneKey(p.contact_whatsapp)].filter((x) => x.length === 10);
  return BLOCKED_PROPERTIES.find((b) =>
    (name && name.includes(b.nameKey))
    || b.slugs.some((s) => slug === s || slug.startsWith(s + '-'))
    || phones.some((ph) => b.phones.includes(ph)),
  ) || null;
}
