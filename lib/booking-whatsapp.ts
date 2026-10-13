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

/** Every number currently assigned to the booking, alerts on or off: replies are only accepted from these. */
export function assigneePhones(rows: RecipientRows): string[] {
  const { partner, staff, property, guide } = rows;
  const raw = [partner?.whatsapp_number, partner?.phone, staff?.phone, property?.contact_phone, guide?.phone];
  return Array.from(new Set(raw.map((r) => normalizeIndianPhone(r)).filter((p): p is string => !!p)));
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

/** Params for booking_cancelled_customer (4, in template order). */
export function cancelledCustomerParams(v: BookingView, reason: string): string[] {
  return [v.booking_ref, v.item_name, bookingWhen(v).date, reason].map(cleanParam);
}

/** Params for booking_confirmed_customer_v2 (8, in template order). */
export function customerParams(v: BookingView): string[] {
  const who = v.category === 'taxi' ? 'Driver' : v.category === 'paragliding' ? 'Pilot' : v.category === 'guide' || v.category === 'trek' ? 'Guide' : null;
  // Template line reads "Your contact: {{6}}".
  const assignee = v.assignee_text ? (who ? `${who} ${v.assignee_text}` : v.assignee_text) : 'Our team will share the details soon';
  const { date, time } = bookingWhen(v);
  return [v.booking_ref, v.item_name, date, time, v.num_guests, assignee, rupees(v.amount), v.payment_text].map(cleanParam);
}

/** A template plus, where one exists, the approved v1 template to fall back on while v2 is under review at Meta. */
type Msg = { template: string; params: string[]; fallback?: { template: string; params: string[] } };

// v1 layouts (one-line date_text). Remove once the _v2 templates are approved.
const v1 = (v: BookingView, ...rest: unknown[]) => [v.booking_ref, v.item_name, v.date_text, ...rest].map(cleanParam);
function v1Assignee(v: BookingView): string {
  const who = v.category === 'taxi' ? 'Driver' : v.category === 'paragliding' ? 'Pilot' : v.category === 'guide' || v.category === 'trek' ? 'Guide' : null;
  return v.assignee_text ? (who ? `${who} ${v.assignee_text}` : v.assignee_text) : 'our team, we will share details soon';
}
const newBookingMsg = (v: BookingView): Msg => ({
  template: 'booking_new_partner_v2', params: newBookingParams(v),
  fallback: { template: 'booking_new_partner', params: v1(v, v.num_guests, v.guest_name, v.guest_phone, rupees(v.amount), v.payment_text) },
});
const cancelledMsg = (v: BookingView, reason: string): Msg => ({
  template: 'booking_cancelled_partner_v2', params: cancelledParams(v, reason),
  fallback: { template: 'booking_cancelled_partner', params: v1(v, reason) },
});
const customerMsg = (v: BookingView): Msg => ({
  template: 'booking_confirmed_customer_v2', params: customerParams(v),
  fallback: { template: 'booking_confirmed_customer', params: v1(v, v.num_guests, v1Assignee(v), rupees(v.amount), v.payment_text) },
});
const cancelledCustomerMsg = (v: BookingView, reason: string): Msg => ({ template: 'booking_cancelled_customer', params: cancelledCustomerParams(v, reason) });
/** Meta's "template does not exist (yet) in this language" error. */
const NOT_APPROVED = /\(#132001\)/;

async function row(table: string, id: string | null | undefined, cols: string): Promise<any | null> {
  if (!id) return null;
  const { data, error } = await serviceClient().from(table).select(cols).eq('id', id).maybeSingle();
  if (error) { console.error(`WhatsApp: could not load ${table}:`, error); return null; }
  return data ?? null;
}

type Assignment = Record<string, any> & { partner_id?: string | null; staff_id?: string | null; property_id?: string | null; guide_id?: string | null };

async function loadRows(a: Assignment): Promise<RecipientRows> {
  const [partner, staff, property, guide] = await Promise.all([
    row('profiles', a.partner_id, 'whatsapp_number, whatsapp_alerts, phone'),
    row('partner_staff', a.staff_id, 'phone, whatsapp_alerts'),
    row('properties', a.property_id, 'contact_phone, whatsapp_alerts'),
    row('guides', a.guide_id, 'phone, whatsapp_alerts'),
  ]);
  return { partner, staff, property, guide };
}

async function loadRecipients(v: BookingView): Promise<Recipient[]> {
  return recipientsFor(v, await loadRows(v));
}

/** Numbers of whoever is assigned to the booking right now. */
export async function currentAssigneePhones(a: Assignment): Promise<string[]> {
  return assigneePhones(await loadRows(a));
}

/**
 * Send one template and log the attempt. A 'queued' row is written before the send so the
 * attempt is recorded even if the send never returns; it is then updated to 'sent' or 'failed'.
 * Nothing is logged when WhatsApp is not configured. Never throws.
 */
async function sendAndLog(bookingId: string, kind: RecipientKind | 'customer', to: string, msg: Msg) {
  try {
    if (!isWhatsAppConfigured()) return;
    const sb = serviceClient();
    let template = msg.template;
    const base = { booking_id: bookingId, recipient_kind: kind, to_phone: to, template };
    const { data: queued, error: qErr } = await sb.from('whatsapp_messages').insert({ ...base, status: 'queued' }).select('id').single();
    if (qErr) console.error('WhatsApp: could not log queued message:', qErr);
    let r = await sendTemplate({ to, template, params: msg.params });
    if (!r.ok && !r.skipped && msg.fallback && NOT_APPROVED.test(r.error || '')) {
      template = msg.fallback.template;
      r = await sendTemplate({ to, template, params: msg.fallback.params });
    }
    if (!r.ok && r.skipped) {
      if (queued?.id) {
        const { error } = await sb.from('whatsapp_messages').delete().eq('id', queued.id);
        if (error) console.error('WhatsApp: could not remove skipped message:', error);
      }
      return;
    }
    const result = {
      template, wa_message_id: r.ok ? r.id : null, status: r.ok ? 'sent' : 'failed', error: r.ok ? null : r.error || 'Unknown error',
    };
    const { error } = queued?.id
      ? await sb.from('whatsapp_messages').update({ ...result, updated_at: new Date().toISOString() }).eq('id', queued.id)
      : await sb.from('whatsapp_messages').insert({ ...base, ...result });
    if (error) console.error('WhatsApp: could not log message:', error);
  } catch (e) { console.error('WhatsApp send failed:', e); }
}

/** Send to every recipient at once so one slow number does not hold up the others. */
async function sendAll(bookingId: string, recipients: Recipient[], msg: Msg) {
  await Promise.allSettled(recipients.map((r) => sendAndLog(bookingId, r.kind, r.phone, msg)));
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
    const customerTo = opts.customer ? normalizeIndianPhone(v.guest_phone) : null;
    await Promise.allSettled([
      opts.partners === false ? null : sendAll(bookingId, await loadRecipients(v), newBookingMsg(v)),
      customerTo ? sendAndLog(bookingId, 'customer', customerTo, customerMsg(v)) : null,
    ]);
  } catch (e) { console.error('WhatsApp new booking alert failed:', e); }
}

/** Cancellation notice to the same recipients as a new booking. Never throws. */
export async function whatsappCancelled(bookingId: string, reason: string): Promise<void> {
  try {
    if (!isWhatsAppConfigured()) return;
    const v = await loadBookingView(bookingId);
    if (!v) return;
    await sendAll(bookingId, await loadRecipients(v), cancelledMsg(v, reason));
  } catch (e) { console.error('WhatsApp cancellation alert failed:', e); }
}

/** Cancellation notice to the customer. Never throws. */
export async function whatsappCancelledCustomer(bookingId: string, reason: string): Promise<void> {
  try {
    if (!isWhatsAppConfigured()) return;
    const v = await loadBookingView(bookingId);
    if (!v) return;
    const to = normalizeIndianPhone(v.guest_phone);
    if (to) await sendAndLog(bookingId, 'customer', to, cancelledCustomerMsg(v, reason));
  } catch (e) { console.error('WhatsApp customer cancellation notice failed:', e); }
}

/**
 * Tell whoever the booking was taken from: the previous partner (and their driver/pilot) when the
 * partner changed, or just the previous driver/pilot when only they changed. Never throws.
 */
export async function whatsappReassignedAway(bookingId: string, prev: { partner_id?: string | null; staff_id?: string | null }): Promise<void> {
  try {
    if (!isWhatsAppConfigured()) return;
    const v = await loadBookingView(bookingId);
    if (!v) return;
    const partnerChanged = !!prev.partner_id && prev.partner_id !== v.partner_id;
    const staffChanged = !!prev.staff_id && prev.staff_id !== v.staff_id;
    if (!partnerChanged && !staffChanged) return;
    const [current, partner, staff] = await Promise.all([
      loadRows(v),
      row('profiles', partnerChanged ? prev.partner_id : v.partner_id, 'whatsapp_number, whatsapp_alerts, phone'),
      staffChanged ? row('partner_staff', prev.staff_id, 'phone, whatsapp_alerts') : null,
    ]);
    const keep = new Set(assigneePhones(current));
    const to = recipientsFor(v, { partner, staff })
      .filter((r) => (partnerChanged || r.kind === 'staff') && !keep.has(r.phone));
    const reason = partnerChanged ? 'Reassigned to another partner - you no longer need to take it' : 'Reassigned to someone else - you no longer need to take it';
    await sendAll(bookingId, to, cancelledMsg(v, reason));
  } catch (e) { console.error('WhatsApp reassignment alert failed:', e); }
}
