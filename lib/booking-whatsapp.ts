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
const TBC = 'To be confirmed';

/** "2026-10-12" -> "Mon, 12 Oct 2026"; '' when missing or invalid. */
function longDate(d?: string | null): string {
  if (!d) return '';
  const t = new Date(String(d).slice(0, 10) + 'T00:00:00Z');
  if (isNaN(t.getTime())) return '';
  return t.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** "09:00" / "14:30:00" -> "9:00 AM" / "2:30 PM"; anything else is returned as typed. */
function clock(t?: string | null): string {
  const s = String(t ?? '').trim();
  const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m || Number(m[1]) > 23) return s;
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`;
}

/** Date and time lines for the templates, worded for each booking type. */
export function bookingWhen(v: BookingView): { date: string; time: string } {
  if (v.category === 'hotel') {
    const from = longDate(v.check_in), to = longDate(v.check_out);
    const nights = from && to ? Math.round((Date.parse(v.check_out.slice(0, 10)) - Date.parse(v.check_in.slice(0, 10))) / 86400000) : 0;
    const date = from && to ? `${from} to ${to}` + (nights > 0 ? ` (${nights} night${nights === 1 ? '' : 's'})` : '') : from || TBC;
    const times = [v.property_check_in_time && `Check-in ${clock(v.property_check_in_time)}`, v.property_check_out_time && `Check-out ${clock(v.property_check_out_time)}`].filter(Boolean);
    return { date, time: times.length ? times.join(' · ') : 'As per hotel check-in and check-out times' };
  }
  let date = longDate(v.activity_date) || TBC;
  if (v.category === 'guide' && v.guide_days && date !== TBC) date += ` (${v.guide_days} day${v.guide_days === 1 ? '' : 's'})`;
  return { date, time: clock(v.pickup_time) || TBC };
}

/** Params for booking_new_partner_v2 (9, in template order). */
export function newBookingParams(v: BookingView): string[] {
  const { date, time } = bookingWhen(v);
  return [v.booking_ref, v.item_name, date, time, v.num_guests, v.guest_name, v.guest_phone, rupees(v.amount), v.payment_text].map(cleanParam);
}

/** Params for booking_cancelled_partner_v2 (5, in template order). */
export function cancelledParams(v: BookingView, reason: string): string[] {
  const { date, time } = bookingWhen(v);
  return [v.booking_ref, v.item_name, date, time, reason].map(cleanParam);
}

/** Params for booking_confirmed_customer_v2 (8, in template order). */
export function customerParams(v: BookingView): string[] {
  const who = v.category === 'taxi' ? 'Driver' : v.category === 'paragliding' ? 'Pilot' : v.category === 'guide' || v.category === 'trek' ? 'Guide' : null;
  // Template line reads "Your contact: {{6}}".
  const assignee = v.assignee_text ? (who ? `${who} ${v.assignee_text}` : v.assignee_text) : 'Our team will share the details soon';
  const { date, time } = bookingWhen(v);
  return [v.booking_ref, v.item_name, date, time, v.num_guests, assignee, rupees(v.amount), v.payment_text].map(cleanParam);
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

/**
 * New-booking alert to partner/staff/hotel/guide (unless `partners` is false), optionally a
 * confirmation to the customer. Never throws.
 */
export async function whatsappNewBooking(bookingId: string, opts: { customer: boolean; partners?: boolean }): Promise<void> {
  try {
    if (!isWhatsAppConfigured()) return;
    const v = await loadBookingView(bookingId);
    if (!v) return;
    const params = newBookingParams(v);
    const customerTo = opts.customer ? normalizeIndianPhone(v.guest_phone) : null;
    await Promise.allSettled([
      opts.partners === false ? null : sendAll(bookingId, await loadRecipients(v), 'booking_new_partner_v2', params),
      customerTo ? sendAndLog(bookingId, 'customer', customerTo, 'booking_confirmed_customer_v2', customerParams(v)) : null,
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
    await sendAll(bookingId, await loadRecipients(v), 'booking_cancelled_partner_v2', params);
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
    await sendAll(bookingId, recipientsFor(v, { partner }), 'booking_cancelled_partner_v2', params);
  } catch (e) { console.error('WhatsApp reassignment alert failed:', e); }
}
