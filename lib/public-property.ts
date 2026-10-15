import type { Property } from '@/types';

/**
 * Columns that must never reach a public page. Public pages pass rows to
 * client components and JSON-LD, so anything left on the row is published.
 * The hotel's phone is shared with guests only after they book (lib/bookings/stay-details.ts).
 */
const PRIVATE_PROPERTY_FIELDS = [
  'contact_name', 'contact_phone', 'contact_email', 'contact_whatsapp',
  'owner_email', 'admin_notes', 'compliance', 'whatsapp_alerts',
] as const;

export function toPublicProperty<T extends Property | null>(p: T): T {
  if (!p) return p;
  const copy: any = { ...p };
  for (const f of PRIVATE_PROPERTY_FIELDS) delete copy[f];
  return copy;
}
