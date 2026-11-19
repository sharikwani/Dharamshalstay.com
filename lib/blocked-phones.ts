import { BLOCKED_PROPERTIES } from '@/lib/listings/blocked';

/**
 * Phone numbers the portal never talks to again (owner instruction): nothing they send on WhatsApp is stored,
 * answered or alerted, and nothing is sent to them (templates or free text). Last 10 digits, so any country-code
 * format matches. The numbers of blocked properties are always included.
 */
const EXTRA_BLOCKED_PHONES: string[] = [];

const key = (s: unknown) => String(s ?? '').replace(/\D/g, '').slice(-10);

const BLOCKED = new Set<string>([...BLOCKED_PROPERTIES.flatMap((b) => b.phones), ...EXTRA_BLOCKED_PHONES].map(key));

export function isBlockedPhone(phone: unknown): boolean {
  const k = key(phone);
  return k.length === 10 && BLOCKED.has(k);
}
