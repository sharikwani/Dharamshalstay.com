/**
 * Two days after an enquiry, the WhatsApp half of the follow-up (the email half is in lib/email/jobs.ts):
 * the approved enquiry_follow_up template, skipped when the guest is already talking to us on WhatsApp.
 */
import { serviceClient } from '@/lib/server-auth';
import { cleanParam, isWhatsAppConfigured, sendTemplate } from '@/lib/whatsapp-cloud';
import { normalizeIndianPhone } from '@/lib/whatsapp';
import type { LoadedEnquiry } from '@/lib/email/data';

const RECENT_CHAT_MS = 72 * 3600e3;
export const FOLLOW_UP_TEXT = 'Did you find what you were looking for? Share your dates and the number of guests, and we will check availability and prices for you.';

/** What the enquiry was about, in a few words for "your enquiry about {{2}}". */
export function enquiryAbout(e: Pick<LoadedEnquiry, 'type' | 'property' | 'item_name' | 'pickup_location' | 'drop_location'>): string {
  if (e.property?.name) return e.property.name;
  if (e.item_name) return e.item_name;
  if (e.type === 'taxi' && e.pickup_location && e.drop_location) return `a taxi from ${e.pickup_location} to ${e.drop_location}`;
  return e.type === 'taxi' ? 'a taxi' : e.type === 'trek' ? 'a trek' : e.type === 'hotel' ? 'a stay in Dharamshala' : 'your trip to Dharamshala';
}

/** Returns whether a message went out. Never throws. */
export async function whatsappEnquiryFollowUp(e: LoadedEnquiry): Promise<boolean> {
  try {
    const to = normalizeIndianPhone(e.phone);
    if (!to || !isWhatsAppConfigured()) return false;
    const sb = serviceClient();
    const { data: c } = await sb.from('whatsapp_conversations').select('status, last_customer_at').eq('phone', to).maybeSingle();
    if (c && (['human', 'needs_human'].includes(c.status) || (c.last_customer_at && Date.now() - Date.parse(c.last_customer_at) < RECENT_CHAT_MS))) return false;
    const first = String(e.name || '').trim().split(/\s+/)[0] || 'there';
    const params = [first, enquiryAbout(e), FOLLOW_UP_TEXT].map(cleanParam);
    const r = await sendTemplate({ to, template: 'enquiry_follow_up', params });
    if (!r.ok && r.skipped) return false;
    await sb.from('whatsapp_messages').insert({ booking_id: null, recipient_kind: 'customer', to_phone: to, template: 'enquiry_follow_up', wa_message_id: r.ok ? r.id : null, status: r.ok ? 'sent' : 'failed', error: r.ok ? null : r.error || null });
    return r.ok;
  } catch (err) { console.error('WhatsApp enquiry follow-up failed:', err); return false; }
}
