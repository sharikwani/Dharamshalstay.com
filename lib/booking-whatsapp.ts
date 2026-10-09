import { serviceClient } from '@/lib/server-auth';
import { loadBookingView, type BookingView } from '@/lib/manual-booking-emails';
import { cleanParam, isWhatsAppConfigured, sendTemplate } from '@/lib/whatsapp-cloud';
import { normalizeIndianPhone } from '@/lib/whatsapp';

export type RecipientKind = 'partner' | 'staff' | 'hotel' | 'guide';
export type Recipient = { kind: RecipientKind; phone: string };
export type RecipientRows = {
  partner?: { whatsapp_number?: string | null; whatsapp_alerts?: boolean | null; phone?: string | null } | null;
  staff?: { phone?: string | null; whatsapp_alerts?: boolean | null } | null;
  property?: { contact_phone?: string | null; whatsapp_alerts?: boolean | null } | null;
  guide?: { phone?: string | null; whatsapp_alerts?: boolean | null } | null;
};

/** Who should get a WhatsApp alert for this booking. Pure: consent, valid number, no duplicates. */
export function recipientsFor(_view: BookingView, rows: RecipientRows): Recipient[] {
  const out: Recipient[] = [];
  const add = (kind: RecipientKind, raw: string | null | undefined) => {
    const phone = normalizeIndianPhone(raw);
    if (phone && !out.some((r) => r.phone === phone)) out.push({ kind, phone });
  };
  const { partner, staff, property, guide } = rows;
  if (partner?.whatsapp_alerts) {
    add('partner', partner.whatsapp_number || partner.phone);
    if (staff?.whatsapp_alerts) add('staff', staff.phone);
  }
  if (property?.whatsapp_alerts) add('hotel', property.contact_phone);
  if (guide?.whatsapp_alerts) add('guide', guide.phone);
  return out;
}

const rupees = (n: unknown) => `Rs.${Number(n || 0).toLocaleString('en-IN')}`;

export const newBookingParams = (v: BookingView): string[] => [
  v.booking_ref, v.item_name, v.date_text, v.num_guests, v.guest_name, v.guest_phone, rupees(v.amount), v.payment_text,
].map(cleanParam);

export const cancelledParams = (v: BookingView, reason: string): string[] =>
  [v.booking_ref, v.item_name, v.date_text, reason].map(cleanParam);

export function customerParams(v: BookingView): string[] {
  const who = v.category === 'taxi' ? 'Your driver' : v.category === 'paragliding' ? 'Your pilot' : v.category === 'guide' ? 'Your guide' : null;
  const assignee = v.assignee_text && who ? `${who}: ${v.assignee_text}` : '-';
  return [v.booking_ref, v.item_name, v.date_text, v.num_guests, assignee, rupees(v.amount), v.payment_text].map(cleanParam);
}

async function row(table: string, id: string | null | undefined, cols: string): Promise<any | null> {
  if (!id) return null;
  const { data, error } = await serviceClient().from(table).select(cols).eq('id', id).maybeSingle();
  if (error) { console.error(`WhatsApp: could not load ${table}:`, error); return null; }
  return data ?? null;
}

async function loadRecipients(v: BookingView): Promise<Recipient[]> {
  const [partner, staff, property, guide] = await Promise.all([
    row('profiles', v.partner_id, 'whatsapp_number, whatsapp_alerts, phone'),
    row('partner_staff', v.staff_id, 'phone, whatsapp_alerts'),
    row('properties', v.property_id, 'contact_phone, whatsapp_alerts'),
    row('guides', v.guide_id, 'phone, whatsapp_alerts'),
  ]);
  return recipientsFor(v, { partner, staff, property, guide });
}

/**
 * Send one template and log the attempt. A 'queued' row is written before the send so the
 * attempt is recorded even if the send never returns; it is then updated to 'sent' or 'failed'.
 * Nothing is logged when WhatsApp is not configured. Never throws.
 */
async function sendAndLog(bookingId: string, kind: RecipientKind | 'customer', to: string, template: string, params: string[]) {
  try {
    if (!isWhatsAppConfigured()) return;
    const sb = serviceClient();
    const base = { booking_id: bookingId, recipient_kind: kind, to_phone: to, template };
    const { data: queued, error: qErr } = await sb.from('whatsapp_messages').insert({ ...base, status: 'queued' }).select('id').single();
    if (qErr) console.error('WhatsApp: could not log queued message:', qErr);
    const r = await sendTemplate({ to, template, params });
    if (!r.ok && r.skipped) {
      if (queued?.id) {
        const { error } = await sb.from('whatsapp_messages').delete().eq('id', queued.id);
        if (error) console.error('WhatsApp: could not remove skipped message:', error);
      }
      return;
    }
    const result = {
      wa_message_id: r.ok ? r.id : null, status: r.ok ? 'sent' : 'failed', error: r.ok ? null : r.error || 'Unknown error',
    };
    const { error } = queued?.id
      ? await sb.from('whatsapp_messages').update({ ...result, updated_at: new Date().toISOString() }).eq('id', queued.id)
      : await sb.from('whatsapp_messages').insert({ ...base, ...result });
    if (error) console.error('WhatsApp: could not log message:', error);
  } catch (e) { console.error('WhatsApp send failed:', e); }
}

/** Send to every recipient at once so one slow number does not hold up the others. */
async function sendAll(bookingId: string, recipients: Recipient[], template: string, params: string[]) {
  await Promise.allSettled(recipients.map((r) => sendAndLog(bookingId, r.kind, r.phone, template, params)));
}

/** New-booking alert to partner/staff/hotel/guide, optionally a confirmation to the customer. Never throws. */
export async function whatsappNewBooking(bookingId: string, opts: { customer: boolean }): Promise<void> {
  try {
    if (!isWhatsAppConfigured()) return;
    const v = await loadBookingView(bookingId);
    if (!v) return;
    const params = newBookingParams(v);
    const customerTo = opts.customer ? normalizeIndianPhone(v.guest_phone) : null;
    await Promise.allSettled([
      sendAll(bookingId, await loadRecipients(v), 'booking_new_partner', params),
      customerTo ? sendAndLog(bookingId, 'customer', customerTo, 'booking_confirmed_customer', customerParams(v)) : null,
    ]);
  } catch (e) { console.error('WhatsApp new booking alert failed:', e); }
}

/** Cancellation notice to the same recipients as a new booking. Never throws. */
export async function whatsappCancelled(bookingId: string, reason: string): Promise<void> {
  try {
    if (!isWhatsAppConfigured()) return;
    const v = await loadBookingView(bookingId);
    if (!v) return;
    const params = cancelledParams(v, reason);
    await sendAll(bookingId, await loadRecipients(v), 'booking_cancelled_partner', params);
  } catch (e) { console.error('WhatsApp cancellation alert failed:', e); }
}

/** Tell the previous partner a booking moved to someone else. Never throws. */
export async function whatsappReassignedAway(bookingId: string, previousPartnerId: string): Promise<void> {
  try {
    if (!isWhatsAppConfigured()) return;
    const v = await loadBookingView(bookingId);
    if (!v) return;
    const partner = await row('profiles', previousPartnerId, 'whatsapp_number, whatsapp_alerts, phone');
    const params = cancelledParams(v, 'Reassigned to another partner - you no longer need to take it');
    await sendAll(bookingId, recipientsFor(v, { partner }), 'booking_cancelled_partner', params);
  } catch (e) { console.error('WhatsApp reassignment alert failed:', e); }
}
