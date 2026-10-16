/**
 * Email entry points used across the site. Everything goes through lib/email/send.ts (one design,
 * suppression checks, delivery log). Booking/enquiry content lives in lib/email/templates.ts.
 */
import { deliver, ADMIN_TO } from '@/lib/email/send';
import type { Block } from '@/lib/email/layout';
import { bookingConfirmed, bookingRequested, type BookingData } from '@/lib/email/templates';

export const adminEmail = () => ADMIN_TO();
export const escHtml = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/**
 * Send server-built HTML (alerts to the admin and partners). The first <h2> becomes the email heading;
 * the rest goes inside the branded layout. Never throws.
 */
export async function sendEmail(msg: { to: string | string[]; subject: string; html: string; attachments?: { filename: string; content: Buffer }[]; template?: string }): Promise<void> {
  const m = /^\s*<h2[^>]*>([\s\S]*?)<\/h2>/i.exec(msg.html);
  const heading = m ? m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'") : msg.subject;
  const body = m ? msg.html.slice(m[0].length) : msg.html;
  for (const to of Array.isArray(msg.to) ? msg.to : [msg.to]) {
    const toAdmin = to.trim().toLowerCase() === ADMIN_TO().toLowerCase();
    await deliver({
      to, subject: msg.subject, kind: toAdmin ? 'admin' : 'transactional', template: msg.template || (toAdmin ? 'admin_alert' : 'notice'),
      attachments: msg.attachments,
      doc: { heading, blocks: [{ type: 'raw', html: body } as Block], footer: { kind: toAdmin ? 'admin' : 'transactional' }, signoff: !toAdmin },
    });
  }
}

export type BookingEmailInput = {
  id?: string;
  guest_name: string; guest_email: string; booking_ref: string;
  check_in?: string; check_out?: string; activity_date?: string;
  amount: number; category: string; room_name?: string;
  property_name?: string; paid_amount?: number;
  payment_method?: string | null; payment_status?: string | null;
  /** Hotel address/map, and its phone once the booking is confirmed (lib/bookings/stay-details.ts). */
  stay?: { address: string; landmark: string | null; mapUrl: string; phone: string | null } | null;
  /** The guest's private booking page. */
  details_url?: string;
  property?: BookingData['property'];
};

/** The confirmation's payment row: an unpaid online booking (e.g. confirmed by the admin before payment) must not say "Pay at property". */
export function confirmedPaymentText(b: { amount: number; paid_amount?: number | null; payment_method?: string | null; payment_status?: string | null }): string {
  if (b.paid_amount) return 'Paid Rs.' + b.paid_amount.toLocaleString('en-IN');
  if (b.payment_method === 'online') return b.payment_status === 'paid' ? 'Paid Rs.' + b.amount.toLocaleString('en-IN') : 'Online payment pending';
  return 'Pay at property';
}

const toData = (b: BookingEmailInput, payment_text: string): BookingData => ({
  id: b.id || '', booking_ref: b.booking_ref, guest_name: b.guest_name, category: b.category, amount: b.amount, paid_amount: b.paid_amount,
  check_in: b.check_in, check_out: b.check_out, activity_date: b.activity_date, room_name: b.room_name, property_name: b.property_name,
  payment_text, details_url: b.details_url, stay: b.stay, property: b.property || null,
});

export async function sendBookingConfirmation(b: BookingEmailInput) {
  if (!b.guest_email) return null;
  const { subject, doc } = bookingConfirmed(toData(b, confirmedPaymentText(b)));
  return deliver({ to: b.guest_email, subject, doc, kind: 'transactional', template: 'booking_confirmed', bookingId: b.id });
}

/** Pay-later bookings: the hotel has not confirmed yet, so say so honestly. Never throws. */
export async function sendBookingRequestReceived(b: BookingEmailInput) {
  if (!b.guest_email) return null;
  const { subject, doc } = bookingRequested(toData(b, 'Pay at property'));
  return deliver({ to: b.guest_email, subject, doc, kind: 'transactional', template: 'booking_requested', bookingId: b.id });
}

export async function sendAdminNotification(booking: {
  id?: string;
  guest_name: string; guest_phone: string; guest_email?: string;
  booking_ref: string; category: string; amount: number;
  check_in?: string; check_out?: string; property_name?: string;
}) {
  const rows: [string, string][] = [['Ref', booking.booking_ref], ['Guest', `${booking.guest_name} (${booking.guest_phone})`]];
  if (booking.guest_email) rows.push(['Email', booking.guest_email]);
  if (booking.property_name) rows.push(['Property', booking.property_name]);
  rows.push(['Amount', 'Rs.' + Number(booking.amount || 0).toLocaleString('en-IN')]);
  if (booking.check_in) rows.push(['Dates', booking.check_in + ' to ' + (booking.check_out || '')]);
  return deliver({
    to: ADMIN_TO(), subject: 'New Booking: ' + booking.booking_ref + ' - ' + booking.guest_name, kind: 'admin', template: 'admin_new_booking', bookingId: booking.id,
    doc: { heading: `New ${booking.category} booking`, blocks: [{ type: 'details', rows }, { type: 'button', label: 'View in admin panel', href: '/admin/bookings' }], footer: { kind: 'admin' }, signoff: false },
  });
}

/** Tells the admin a partner has submitted (or resubmitted) a listing for approval. */
export async function sendPropertySubmittedNotification(p: {
  id: string; name: string; type?: string; destination_slug?: string; city?: string;
  contact_name?: string; contact_phone?: string; contact_email?: string; resubmitted?: boolean;
}) {
  return deliver({
    to: ADMIN_TO(), subject: (p.resubmitted ? 'Listing resubmitted: ' : 'New listing to approve: ') + p.name, kind: 'admin', template: 'admin_listing_submitted',
    doc: {
      heading: p.resubmitted ? 'A partner resubmitted a listing' : 'A partner submitted a new listing',
      blocks: [
        { type: 'details', rows: [['Property', `${p.name} (${p.type || 'hotel'})`], ['Area', p.destination_slug || p.city || '-'], ['Contact', `${p.contact_name || '-'} · ${p.contact_phone || '-'} · ${p.contact_email || '-'}`]] },
        { type: 'button', label: 'Review it in the admin panel', href: '/admin/approvals/' + encodeURIComponent(p.id) },
      ],
      footer: { kind: 'admin' }, signoff: false,
    },
  });
}

