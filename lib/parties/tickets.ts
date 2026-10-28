/**
 * Party tickets (migration v51). A purchase is a booking with category 'event' at the party's price, paid
 * through the usual online checkout (Razorpay). When the payment webhook confirms it (lib/payments/record.ts),
 * issuePartyTicket gives it a ticket code and sends the ticket card by email and WhatsApp.
 */
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { serviceClient } from '@/lib/server-auth';
import { siteConfig } from '@/lib/config';
import { escHtml, sendEmail } from '@/lib/email';
import { isWhatsAppConfigured, sendTemplate } from '@/lib/whatsapp-cloud';
import { normalizeIndianPhone } from '@/lib/whatsapp';
import { partyBySlug, partyDateLabel, partyOnSale, ticketPrice, type Party, type TicketType } from '@/data/parties';

const SITE = () => siteConfig.url.replace(/\/$/, '');

export const ticketSchema = z.object({
  party: z.string().min(1).max(80),
  ticketType: z.string().min(1).max(40),
  qty: z.number().int().min(1).max(10),
  /** Optional room for the party night (PartyRoom id). */
  room: z.string().max(40).optional(),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  phone: z.string().trim().min(10).max(20),
});
export type TicketInput = z.infer<typeof ticketSchema>;

/** Ticket codes are short, unambiguous (no 0/O/1/I) and printed on the card: NYE-7KQ4-PX2M. */
export function newTicketCode(prefix = 'NYE'): string {
  const ABC = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const b = randomBytes(8);
  const s = Array.from(b, (x) => ABC[x % ABC.length]).join('');
  return `${prefix}-${s.slice(0, 4)}-${s.slice(4)}`;
}

export const ticketPageUrl = (code: string) => `${SITE()}/tickets/${encodeURIComponent(code)}`;
export const ticketCardUrl = (code: string) => `${SITE()}/tickets/card/${encodeURIComponent(code)}`;

const nextDay = (d: string) => new Date(Date.parse(d + 'T00:00:00Z') + 86400e3).toISOString().slice(0, 10);

export function ticketLine(t: TicketType, qty: number): string {
  return `${t.name} × ${qty} (admits ${t.admits * qty})`;
}

/** Create the pending ticket booking at the party's own price. The caller then opens checkout for it. */
export async function createTicketBooking(input: TicketInput): Promise<{ ok: true; bookingId: string; bookingRef: string; amount: number } | { ok: false; error: string; status: number }> {
  const party = partyBySlug(input.party);
  if (!party) return { ok: false, error: 'This party was not found', status: 404 };
  if (!partyOnSale(party)) return { ok: false, error: 'Tickets for this party are not on sale yet', status: 409 };
  const type = party.ticketTypes.find((t) => t.id === input.ticketType);
  if (!type) return { ok: false, error: 'Choose a ticket type', status: 400 };
  const phone = normalizeIndianPhone(input.phone);
  if (!phone) return { ok: false, error: 'Please enter a valid Indian mobile number', status: 400 };
  const room = input.room ? party.rooms?.find((r) => r.id === input.room) : undefined;
  if (input.room && !room) return { ok: false, error: 'Choose a room from the list', status: 400 };
  // One discount on the whole order: tickets and room together get the party discount once.
  const amount = ticketPrice(type.price * input.qty + (room?.price || 0), party.discountPct);
  const sb = serviceClient();
  let propertyId: string | null = null;
  if (party.propertySlug) {
    const { data } = await sb.from('properties').select('id').eq('slug', party.propertySlug).maybeSingle();
    propertyId = data?.id || null;
  }
  const { data: b, error } = await sb.from('bookings').insert({
    category: 'event',
    guest_name: input.name, guest_email: input.email.toLowerCase(), guest_phone: phone,
    num_guests: type.admits * input.qty,
    activity_date: party.date,
    property_id: propertyId,
    room_name: `${party.name}: ${ticketLine(type, input.qty)}${room ? ` + ${room.name}, night of 31 Dec` : ''}`.slice(0, 200),
    ...(room ? { check_in: party.date, check_out: nextDay(party.date) } : {}),
    amount, payment_method: 'online', payment_status: 'pending', status: 'pending', booking_source: 'website',
    commission_pct: 0, commission_amount: 0, commission_status: 'not_applicable',
    event_slug: party.slug, ticket_type: type.id, ticket_qty: input.qty,
  }).select('id, booking_ref').single();
  if (error || !b) {
    console.error('Ticket booking insert failed:', error);
    return { ok: false, error: 'Could not start your booking. Please try again.', status: 500 };
  }
  return { ok: true, bookingId: b.id, bookingRef: b.booking_ref, amount };
}

/**
 * After payment: give the booking a ticket code (once) and send the card by email and WhatsApp (once each run;
 * ticket_sent_at stops repeats). Never throws.
 */
export async function issuePartyTicket(bookingId: string): Promise<void> {
  try {
    const sb = serviceClient();
    const { data: b } = await sb.from('bookings').select('*').eq('id', bookingId).single();
    if (!b || b.category !== 'event' || b.payment_status !== 'paid' || b.ticket_sent_at) return;
    const party = partyBySlug(b.event_slug);
    if (!party) return;
    let code: string = b.ticket_code;
    for (let i = 0; !code && i < 5; i++) {
      const c = newTicketCode(party.kind === 'christmas' ? 'XMS' : 'NYE');
      const { error } = await sb.from('bookings').update({ ticket_code: c }).eq('id', b.id).is('ticket_code', null);
      if (!error) code = c;
    }
    if (!code) return;
    const type = party.ticketTypes.find((t) => t.id === b.ticket_type);
    const roomPart = String(b.room_name || '').split(' + ')[1];
    const line = type ? ticketLine(type, b.ticket_qty || 1) + (roomPart ? ' + ' + roomPart : '') : String(b.room_name || '');
    await sendTicketEmail(b, party, line, code);
    await sendTicketWhatsApp(b, party, line, code);
    await sb.from('bookings').update({ ticket_sent_at: new Date().toISOString() }).eq('id', b.id);
  } catch (e) { console.error('Party ticket issue failed:', e); }
}

async function sendTicketEmail(b: any, party: Party, line: string, code: string) {
  if (!b.guest_email) return;
  const first = String(b.guest_name || '').split(/\s+/)[0] || 'there';
  await sendEmail({
    to: b.guest_email, template: 'party_ticket',
    subject: `Your ticket: ${party.name} (${code})`,
    html: `<h2>Your ticket is confirmed 🎉</h2>
<p>Hi ${escHtml(first)}, thank you for booking with Dharamshala Stay. Here is your ticket for <strong>${escHtml(party.name)}</strong>.</p>
<p><a href="${ticketPageUrl(code)}"><img src="${ticketCardUrl(code)}" alt="Your party ticket ${escHtml(code)}" width="540" style="max-width:100%;border-radius:16px" /></a></p>
<ul>
<li><strong>Ticket code:</strong> ${escHtml(code)}</li>
<li><strong>Tickets:</strong> ${escHtml(line)}</li>
<li><strong>When:</strong> ${escHtml(partyDateLabel(party))}</li>
<li><strong>Where:</strong> ${escHtml(party.venue)}, ${escHtml(party.area)}</li>
<li><strong>Booking ref:</strong> ${escHtml(b.booking_ref)}</li>
</ul>
<p>Show this card or your ticket code at the entry. You can open, save or share your ticket here: <a href="${ticketPageUrl(code)}">${ticketPageUrl(code)}</a></p>`,
  });
}

async function sendTicketWhatsApp(b: any, party: Party, line: string, code: string) {
  if (!b.guest_phone || !isWhatsAppConfigured()) return;
  const first = String(b.guest_name || '').split(/\s+/)[0] || 'there';
  // The card template (image header) is used once Meta approves one named party_ticket; until then the approved
  // booking confirmation carries the ticket code and the link to the card (the email always has the card itself).
  let template = 'party_ticket';
  let r = await sendTemplate({
    to: b.guest_phone, template, headerImage: ticketCardUrl(code),
    params: [first, party.name, partyDateLabel(party), line, code, ticketPageUrl(code)],
  });
  if (!r.ok && !r.skipped) {
    template = 'booking_confirmed_customer_v2';
    const date = new Date(party.date + 'T00:00:00Z').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
    r = await sendTemplate({
      to: b.guest_phone, template,
      params: [code, party.name + ' (party ticket)', date, [party.startTime, party.endTime].filter(Boolean).join(' to ') || 'As on your ticket', line,
        'Your ticket card: ' + ticketPageUrl(code), '₹' + Number(b.amount || 0).toLocaleString('en-IN'), 'Paid online'],
    });
  }
  if (!r.ok && r.skipped) return;
  await serviceClient().from('whatsapp_messages').insert({
    booking_id: b.id, recipient_kind: 'customer', to_phone: b.guest_phone, template,
    wa_message_id: r.ok ? r.id : null, status: r.ok ? 'sent' : 'failed', error: r.ok ? null : r.error || 'Unknown error',
  });
}

/** What the ticket card and page show, by code (null when unknown or unpaid). */
export async function ticketByCode(code: string) {
  const { data: b } = await serviceClient().from('bookings')
    .select('booking_ref, guest_name, num_guests, event_slug, ticket_type, ticket_qty, ticket_code, payment_status, status')
    .eq('ticket_code', code).maybeSingle();
  if (!b || b.payment_status !== 'paid' || b.status === 'cancelled') return null;
  const party = partyBySlug(b.event_slug);
  if (!party) return null;
  const type = party.ticketTypes.find((t) => t.id === b.ticket_type);
  return { booking: b, party, line: type ? ticketLine(type, b.ticket_qty || 1) : '' };
}
