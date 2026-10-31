import { serviceClient } from '@/lib/server-auth';
import { loadBookingView, type BookingView } from '@/lib/manual-booking-emails';
import { cleanParam, isWhatsAppConfigured, sendTemplate } from '@/lib/whatsapp-cloud';
import { normalizeIndianPhone } from '@/lib/whatsapp';
import { bookingPageUrlOrNull, hotelPhoneVisible } from '@/lib/bookings/stay-details';
import { siteConfig } from '@/lib/config';

export type RecipientKind = 'partner' | 'staff' | 'hotel' | 'guide';
export type Recipient = { kind: RecipientKind; phone: string };
export type RecipientRows = {
  partner?: { whatsapp_number?: string | null; whatsapp_alerts?: boolean | null; phone?: string | null } | null;
  staff?: { phone?: string | null; whatsapp_alerts?: boolean | null } | null;
  /** contact_whatsapp: a second hotel number (e.g. the manager's) that also gets the hotel alerts. */
  property?: { contact_phone?: string | null; contact_whatsapp?: string | null; whatsapp_alerts?: boolean | null } | null;
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
  if (property?.whatsapp_alerts) { add('hotel', property.contact_phone); add('hotel', property.contact_whatsapp); }
  if (guide?.whatsapp_alerts) add('guide', guide.phone);
  return out;
}

/** Every number currently assigned to the booking, alerts on or off: replies are only accepted from these. */
export function assigneePhones(rows: RecipientRows): string[] {
  const { partner, staff, property, guide } = rows;
  const raw = [partner?.whatsapp_number, partner?.phone, staff?.phone, property?.contact_phone, property?.contact_whatsapp, guide?.phone];
  return Array.from(new Set(raw.map((r) => normalizeIndianPhone(r)).filter((p): p is string => !!p)));
}

const TBC = 'To be confirmed';
// A booking not priced yet (e.g. a group waiting for the hotel's quote) says so instead of Rs.0.
const rupees = (n: unknown) => (Number(n) > 0 ? `Rs.${Number(n).toLocaleString('en-IN')}` : TBC);

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

const same = (a?: string | null, b?: string | null) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * The "Service" line partners see: what was booked plus everything they need to do the job, i.e. the exact
 * pickup and drop the guest typed (when it is more than the route name), the car type asked for, who is assigned
 * and the guest's own notes (luggage, flight number...). One line: template values cannot hold line breaks.
 */
export function partnerServiceLine(v: BookingView): string {
  const parts = [v.item_name];
  if (v.category === 'taxi') {
    const [from, to] = String(v.item_name || '').split(' → ');
    if (v.pickup_location && !same(v.pickup_location, from)) parts.push(`Pickup: ${v.pickup_location}`);
    if (v.drop_location && !same(v.drop_location, to)) parts.push(`Drop: ${v.drop_location}`);
    if (v.vehicle_type) parts.push(`Car asked for: ${v.vehicle_type}`);
  }
  if (v.assignee_text) parts.push(`Assigned: ${v.assignee_text}`);
  const note = String(v.special_requests || '').replace(/\s+/g, ' ').trim();
  if (note) parts.push(`Guest note: ${note.slice(0, 300)}`);
  return parts.filter(Boolean).join(' · ').slice(0, 900);
}

/** Params for booking_new_partner_v2 (9, in template order). */
export function newBookingParams(v: BookingView): string[] {
  const { date, time } = bookingWhen(v);
  return [v.booking_ref, partnerServiceLine(v), date, time, v.num_guests, v.guest_name, v.guest_phone, rupees(v.amount), v.payment_text].map(cleanParam);
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

/** Hotel bookings: the hotel's phone (once confirmed) and the guest's itinerary page with the address and map. */
export function hotelContactLine(v: BookingView): string | null {
  if (v.category !== 'hotel') return null;
  const phone = hotelPhoneVisible(v) ? v.partner_contact?.phone : null;
  const url = bookingPageUrlOrNull(v);
  if (!phone && !url) return null;
  return [phone && `Hotel reception ${phone}.`, url && `Address, map & itinerary: ${url}`].filter(Boolean).join(' ');
}

/** Params for booking_confirmed_customer_v2 (8, in template order). */
export function customerParams(v: BookingView): string[] {
  const who = v.category === 'taxi' ? 'Driver' : v.category === 'paragliding' ? 'Pilot' : v.category === 'guide' || v.category === 'trek' ? 'Guide' : null;
  // Template line reads "Your contact: {{6}}".
  const assignee = v.assignee_text ? (who ? `${who} ${v.assignee_text}` : v.assignee_text) : hotelContactLine(v) || 'Our team will share the details soon';
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
    row('properties', a.property_id, 'contact_phone, contact_whatsapp, whatsapp_alerts'),
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
async function sendAndLog(bookingId: string, kind: RecipientKind | 'customer', to: string, msg: Msg): Promise<boolean> {
  try {
    if (!isWhatsAppConfigured()) return false;
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
      return false;
    }
    const result = {
      template, wa_message_id: r.ok ? r.id : null, status: r.ok ? 'sent' : 'failed', error: r.ok ? null : r.error || 'Unknown error',
    };
    const { error } = queued?.id
      ? await sb.from('whatsapp_messages').update({ ...result, updated_at: new Date().toISOString() }).eq('id', queued.id)
      : await sb.from('whatsapp_messages').insert({ ...base, ...result });
    if (error) console.error('WhatsApp: could not log message:', error);
    return r.ok;
  } catch (e) { console.error('WhatsApp send failed:', e); return false; }
}

/** Send to every recipient at once so one slow number does not hold up the others. */
async function sendAll(bookingId: string, recipients: Recipient[], msg: Msg): Promise<number> {
  const res = await Promise.allSettled(recipients.map((r) => sendAndLog(bookingId, r.kind, r.phone, msg)));
  return res.filter((x) => x.status === 'fulfilled' && x.value).length;
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

// ===== Templates approved 26 Oct 2026 (all utility except review_request, which is marketing) =====

const firstName = (v: BookingView) => String(v.guest_name || '').trim().split(/\s+/)[0] || 'there';
const roleOf = (v: BookingView) => (v.category === 'taxi' ? 'Driver' : v.category === 'paragliding' ? 'Pilot' : 'Guide');

/** The booking as it stands now, on one line: item, date, time, people, total. */
export function detailsLine(v: BookingView): string {
  const { date, time } = bookingWhen(v);
  const n = Number(v.num_guests) || 0;
  return [v.item_name, date, time !== TBC ? time : '', n ? `${n} ${n === 1 ? 'person' : 'people'}` : '', `Total ${rupees(v.amount)}`].filter(Boolean).join(' · ');
}

/** Who to call on the day: the driver/guide, else the hotel, else the partner, else us. */
export function dayContact(v: BookingView): string {
  if (v.staff_text) return `${roleOf(v)} ${v.staff_text}`;
  if (v.category === 'hotel') return hotelContactLine(v) || `Dharamshala Stay ${siteConfig.phone}`;
  if (v.partner_contact?.phone) return `${v.partner_contact.name} ${v.partner_contact.phone}`;
  return `Dharamshala Stay ${siteConfig.phone}`;
}

export const requestReceivedParams = (v: BookingView) => [firstName(v), v.booking_ref, v.item_name, bookingWhen(v).date].map(cleanParam);
export const updatedCustomerParams = (v: BookingView, changed: string) => [firstName(v), v.booking_ref, changed, detailsLine(v)].map(cleanParam);
export const updatedPartnerParams = (v: BookingView, changed: string) => [v.booking_ref, partnerServiceLine(v), changed, detailsLine(v)].map(cleanParam);
export const messagePartnerParams = (v: BookingView, text: string) => [v.booking_ref, v.item_name, text].map(cleanParam);
export const paymentRequestParams = (v: BookingView, due: number, url: string) => [firstName(v), v.booking_ref, v.item_name, rupees(due), url].map(cleanParam);
export const paymentReceivedParams = (v: BookingView, amount: number, reference: string) => [firstName(v), rupees(amount), v.booking_ref, reference || 'Recorded by our team'].map(cleanParam);
export const refundParams = (v: BookingView, amount: number, reference: string) => [firstName(v), rupees(amount), v.booking_ref, reference].map(cleanParam);
export function tripReminderParams(v: BookingView): string[] {
  const { date, time } = bookingWhen(v);
  return [firstName(v), v.booking_ref, v.item_name, time !== TBC ? `${date}, ${time}` : date, dayContact(v)].map(cleanParam);
}
export function assignedParams(v: BookingView): string[] {
  const pickup = [clock(v.pickup_time), v.pickup_location].filter(Boolean).join(', ');
  return [firstName(v), v.booking_ref, `${roleOf(v)} ${v.staff_text}`, v.vehicle_text || 'Shared on the day', pickup || TBC].map(cleanParam);
}
export const commissionParams = (v: BookingView, dueBy: string) => [v.partner_contact?.name || 'Partner', v.booking_ref, rupees(v.commission_amount), dueBy].map(cleanParam);

/** Where a guest leaves a review: the hotel page's review form, else a WhatsApp message to us. */
export function reviewUrl(v: BookingView): string {
  const site = siteConfig.url.replace(/\/$/, '');
  if (v.category === 'hotel' && v.property_slug) return `${site}/hotels/${v.property_slug}?review=1#reviews`;
  return `https://wa.me/${siteConfig.whatsapp}?text=` + encodeURIComponent(`Feedback for booking ${v.booking_ref}: `);
}

/** One template to the booking's customer. Returns whether it was sent. Never throws. */
async function toCustomer(bookingId: string, template: string, build: (v: BookingView) => string[] | null): Promise<boolean> {
  try {
    if (!isWhatsAppConfigured()) return false;
    const v = await loadBookingView(bookingId);
    const to = v ? normalizeIndianPhone(v.guest_phone) : null;
    const params = v && to ? build(v) : null;
    if (!v || !to || !params) return false;
    return await sendAndLog(bookingId, 'customer', to, { template, params });
  } catch (e) { console.error(`WhatsApp ${template} failed:`, e); return false; }
}

/** "We have your request" for a booking awaiting confirmation (pay later, pay at hotel). */
export const whatsappRequestReceived = (bookingId: string) => toCustomer(bookingId, 'booking_request_received', requestReceivedParams);

/** A changed booking: the customer and/or whoever is assigned get what changed and the new details. Never throws. */
export async function whatsappBookingUpdated(bookingId: string, changed: string, opts: { customer: boolean; partners: boolean }): Promise<{ customer: boolean; partners: number }> {
  const out = { customer: false, partners: 0 };
  try {
    if (!isWhatsAppConfigured()) return out;
    const v = await loadBookingView(bookingId);
    if (!v) return out;
    const to = opts.customer ? normalizeIndianPhone(v.guest_phone) : null;
    const [c, p] = await Promise.all([
      to ? sendAndLog(bookingId, 'customer', to, { template: 'booking_updated_customer', params: updatedCustomerParams(v, changed) }) : false,
      opts.partners ? loadRecipients(v).then((r) => sendAll(bookingId, r, { template: 'booking_updated_partner', params: updatedPartnerParams(v, changed) })) : 0,
    ]);
    return { customer: c, partners: p };
  } catch (e) { console.error('WhatsApp booking update failed:', e); return out; }
}

/** A message from us to whoever is assigned to the booking (hotel, partner, driver), even with no open chat. */
export async function whatsappMessagePartner(bookingId: string, text: string): Promise<number> {
  try {
    if (!isWhatsAppConfigured()) return 0;
    const v = await loadBookingView(bookingId);
    if (!v) return 0;
    return await sendAll(bookingId, await loadRecipients(v), { template: 'booking_message_partner', params: messagePartnerParams(v, text) });
  } catch (e) { console.error('WhatsApp partner message failed:', e); return 0; }
}

export const whatsappPaymentRequest = (bookingId: string, url: string, due?: number) =>
  toCustomer(bookingId, 'payment_request', (v) => paymentRequestParams(v, due ?? Math.max(0, Number(v.amount) - Number(v.paid_amount || 0)), url));
export const whatsappPaymentReceived = (bookingId: string, amount: number, reference: string) =>
  toCustomer(bookingId, 'payment_received', (v) => paymentReceivedParams(v, amount, reference));
export const whatsappRefundProcessed = (bookingId: string, amount: number, reference: string) =>
  toCustomer(bookingId, 'refund_processed', (v) => refundParams(v, amount, reference));
/** The driver, pilot or guide and vehicle, once one is assigned. */
export const whatsappAssigned = (bookingId: string) => toCustomer(bookingId, 'driver_guide_assigned', (v) => (v.staff_text ? assignedParams(v) : null));
export const whatsappTripReminder = (bookingId: string) => toCustomer(bookingId, 'trip_reminder', tripReminderParams);

/** Commission reminder to the partner or hotel that collected the money. Never throws. */
export async function whatsappCommissionDue(bookingId: string, dueBy: string): Promise<number> {
  try {
    if (!isWhatsAppConfigured()) return 0;
    const v = await loadBookingView(bookingId);
    if (!v || !(Number(v.commission_amount) > 0)) return 0;
    const to = (await loadRecipients(v)).filter((r) => r.kind === 'partner' || r.kind === 'hotel');
    return await sendAll(bookingId, to, { template: 'commission_due_partner', params: commissionParams(v, dueBy) });
  } catch (e) { console.error('WhatsApp commission reminder failed:', e); return 0; }
}

async function hasMarketingConsent(email?: string | null, phone?: string | null): Promise<boolean> {
  const p = normalizeIndianPhone(phone);
  const or = [email ? `email.ilike.${String(email).trim()}` : '', p ? `phone.eq.${p}` : ''].filter(Boolean).join(',');
  if (!or) return false;
  const { data } = await serviceClient().from('contacts').select('marketing_consent, unsubscribed_at').or(or).limit(5);
  return (data || []).some((c: any) => c.marketing_consent && !c.unsubscribed_at);
}

/** Marketing template: only for guests who agreed to hear from us (contacts.marketing_consent, not unsubscribed). */
export async function whatsappReviewRequest(bookingId: string): Promise<{ ok: boolean; reason?: string }> {
  try {
    if (!isWhatsAppConfigured()) return { ok: false, reason: 'WhatsApp not configured' };
    const v = await loadBookingView(bookingId);
    if (!v) return { ok: false, reason: 'booking not found' };
    if (!(await hasMarketingConsent(v.guest_email, v.guest_phone))) return { ok: false, reason: 'no marketing consent' };
    const ok = await toCustomer(bookingId, 'review_request', (x) => [firstName(x), x.item_name, reviewUrl(x)].map(cleanParam));
    return ok ? { ok } : { ok, reason: 'send failed' };
  } catch (e) { console.error('WhatsApp review request failed:', e); return { ok: false, reason: 'error' }; }
}

/**
 * Evening before the trip (5-9 pm IST): one reminder per confirmed booking starting tomorrow, with who to call.
 * Called by the cron heartbeat; the whatsapp_messages log stops a second send.
 */
export async function runTripReminders(now = new Date()): Promise<number> {
  try {
    if (!isWhatsAppConfigured()) return 0;
    const ist = new Date(now.getTime() + 5.5 * 3600e3);
    if (ist.getUTCHours() < 17 || ist.getUTCHours() >= 21) return 0;
    const tomorrow = new Date(ist.getTime() + 86400e3).toISOString().slice(0, 10);
    const sb = serviceClient();
    const { data } = await sb.from('bookings').select('id, category').eq('status', 'confirmed').or(`check_in.eq.${tomorrow},activity_date.eq.${tomorrow}`).limit(50);
    const due = (data || []).filter((b: any) => b.category !== 'event');
    if (!due.length) return 0;
    const { data: sent } = await sb.from('whatsapp_messages').select('booking_id').eq('template', 'trip_reminder').in('booking_id', due.map((b: any) => b.id));
    const done = new Set((sent || []).map((s: any) => s.booking_id));
    let n = 0;
    for (const b of due) if (!done.has(b.id) && (await whatsappTripReminder(b.id))) n++;
    return n;
  } catch (e) { console.error('Trip reminders failed:', e); return 0; }
}
