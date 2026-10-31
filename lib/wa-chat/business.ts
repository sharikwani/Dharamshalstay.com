import { serviceClient } from '@/lib/server-auth';

/**
 * Hotels, partners and guides use WhatsApp Business, which answers our own messages (claim invites, booking
 * alerts) with an automatic greeting: "Thank you for contacting Hotel X! How can we help you?". The assistant
 * must never treat that as a guest. A number counts as a business when we have sent it a business message
 * (any whatsapp_messages row that is not for a customer) or it is a listed hotel's contact or WhatsApp number.
 */
export type BusinessContact = { name: string | null; lastSentAt: string | null };

/** Greetings arriving this soon after our own message to the number are the business's auto-reply. */
export const AUTO_REPLY_MS = 3 * 60e3;

const last10 = (p: unknown) => String(p ?? '').replace(/\D/g, '').slice(-10);

export async function businessContact(phone: string): Promise<BusinessContact | null> {
  const tail = last10(phone);
  if (tail.length < 10) return null;
  const sb = serviceClient();
  const [sent, props] = await Promise.all([
    sb.from('whatsapp_messages').select('created_at, property_id, properties(name)')
      // Only messages about a real hotel or booking: a one-off test send to the owner's own phone has neither.
      .eq('to_phone', phone).neq('recipient_kind', 'customer').or('property_id.not.is.null,booking_id.not.is.null')
      .order('created_at', { ascending: false }).limit(1),
    sb.from('properties').select('name, contact_phone, contact_whatsapp').or('contact_phone.not.is.null,contact_whatsapp.not.is.null').limit(5000),
  ]);
  if (sent.error) throw sent.error;
  if (props.error) throw props.error;
  const row = (sent.data || [])[0] as any;
  const prop = ((props.data || []) as any[]).find((p) => last10(p.contact_phone) === tail || last10(p.contact_whatsapp) === tail);
  if (!row && !prop) return null;
  return { name: row?.properties?.name ?? prop?.name ?? null, lastSentAt: row?.created_at ?? null };
}

/** True when a message at `at` came within AUTO_REPLY_MS of our last message to this business. */
export function isAutoReply(b: BusinessContact, at: number): boolean {
  if (!b.lastSentAt) return false;
  const gap = at - Date.parse(b.lastSentAt);
  return gap >= -60e3 && gap <= AUTO_REPLY_MS;
}

export const businessReason = (b: BusinessContact) => `Hotel or business number${b.name ? ` (${b.name})` : ''}: the AI does not reply`;
