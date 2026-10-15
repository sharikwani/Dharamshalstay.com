/**
 * Tell a hotel that hasn't joined the partner portal yet that a traveller sent an
 * enquiry for it (website form or WhatsApp chat). The guest's contact details are
 * NOT shared: our team handles the enquiry, and the message invites the hotel to
 * claim its listing to get enquiries directly. Template: listing_enquiry_alert.
 */
import { serviceClient } from '@/lib/server-auth';
import { isWhatsAppConfigured, sendTemplate } from '@/lib/whatsapp-cloud';
import { normalizeIndianPhone } from '@/lib/whatsapp';
import { listingLinkSuffix } from './links';
import { adminIds, isUnclaimed } from './ownership';

export const ENQUIRY_ALERT_TEMPLATE = 'listing_enquiry_alert';
/** At most this many alerts per hotel per day, so a flood of form submits can't spam a hotel. */
const DAILY_CAP = 3;

const longDate = (d?: string | null) => {
  if (!d) return '';
  const t = new Date(String(d).slice(0, 10) + 'T00:00:00Z');
  return isNaN(t.getTime()) ? '' : t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

/** Template params: hotel, dates, guests, request (no guest name or contact). */
export function enquiryAlertParams(hotel: string, e: { check_in?: string | null; check_out?: string | null; guests?: number | null; message?: string | null }): string[] {
  const from = longDate(e.check_in), to = longDate(e.check_out);
  const dates = from && to ? `${from} to ${to}` : from || 'Not given yet';
  // Website messages start with "[Directory hotel: ...]"; WhatsApp ones with "Wants: ...". Keep only what the guest asked.
  const request = String(e.message || '').replace(/^\[[^\]]*\]\s*/, '').replace(/\s+/g, ' ').trim().slice(0, 200);
  return [hotel, dates, e.guests ? String(e.guests) : 'Not given yet', request || 'Room availability and rates'];
}

export type AlertOutcome = { sent: boolean; reason?: string };

/** Never throws: an enquiry is saved whether or not the hotel can be told. */
export async function alertHotelOfEnquiry(inquiryId: string): Promise<AlertOutcome> {
  try {
    if (!isWhatsAppConfigured()) return { sent: false, reason: 'WhatsApp not configured' };
    const sb = serviceClient();
    const { data: e } = await sb.from('inquiries').select('id, type, property_id, check_in, check_out, guests, message').eq('id', inquiryId).maybeSingle();
    if (!e || e.type !== 'hotel' || !e.property_id) return { sent: false, reason: 'Not a hotel enquiry' };
    const { data: p } = await sb.from('properties')
      .select('id, name, slug, status, contact_phone, owner_id, owner_email, outreach_skip').eq('id', e.property_id).maybeSingle();
    if (!p || p.status !== 'published') return { sent: false, reason: 'Listing not live' };
    // Partners see enquiries in their portal; this alert is for hotels that haven't joined.
    if (!isUnclaimed(p, await adminIds())) return { sent: false, reason: 'Hotel runs its own listing' };
    if (p.outreach_skip) return { sent: false, reason: 'Hotel is not to be messaged' };
    const to = normalizeIndianPhone(p.contact_phone);
    if (!to) return { sent: false, reason: p.contact_phone ? 'Landline: no WhatsApp' : 'No phone number' };

    const since = new Date(Date.now() - 24 * 3600e3).toISOString();
    const { count } = await sb.from('whatsapp_messages').select('id', { count: 'exact', head: true })
      .eq('property_id', p.id).eq('template', ENQUIRY_ALERT_TEMPLATE).gte('created_at', since);
    if ((count || 0) >= DAILY_CAP) return { sent: false, reason: 'Daily alert limit reached' };

    const { data: log, error: logErr } = await sb.from('whatsapp_messages')
      .insert({ booking_id: null, property_id: p.id, recipient_kind: 'hotel', to_phone: to, template: ENQUIRY_ALERT_TEMPLATE, status: 'queued' })
      .select('id').single();
    if (logErr) return { sent: false, reason: 'Could not log: ' + logErr.message };

    const suffix = listingLinkSuffix(p);
    const r = await sendTemplate({ to, template: ENQUIRY_ALERT_TEMPLATE, params: enquiryAlertParams(p.name, e), urlButtons: [suffix, suffix] });
    const update = r.ok ? { status: 'sent', wa_message_id: r.id }
      : r.unknown ? { status: 'sent', error: 'Delivery unknown: ' + (r.error || '') }
      : { status: 'failed', error: r.error || 'Not sent' };
    await sb.from('whatsapp_messages').update({ ...update, updated_at: new Date().toISOString() }).eq('id', log.id);
    return r.ok ? { sent: true } : { sent: false, reason: update.error };
  } catch (err) {
    console.error('Hotel enquiry alert failed:', err);
    return { sent: false, reason: 'Error' };
  }
}
