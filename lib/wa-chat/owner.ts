/**
 * Owner mode: the owner runs the business by replying on WhatsApp from their own number (whatsapp_settings.owner_phone),
 * usually to an owner alert. An admin assistant reads bookings, enquiries and chats, and -- only after the owner
 * replies YES to the exact plan -- confirms bookings, assigns partners, updates bookings, and messages or emails customers.
 * The sender number is verified by Meta, so it identifies the owner; every action is also logged in admin.
 */
import { serviceClient } from '@/lib/server-auth';
import { siteConfig } from '@/lib/config';
import { escHtml, sendEmail } from '@/lib/email';
import { markReadTyping, downloadMedia, sendTemplate } from '@/lib/whatsapp-cloud';
import { confirmBooking } from '@/lib/bookings/confirm';
import { commissionRateFor, splitAmount } from '@/lib/manual-booking';
import { sendManualBookingEmails } from '@/lib/manual-booking-emails';
import { whatsappBookingUpdated, whatsappCommissionDue, whatsappMessagePartner, whatsappNewBooking, whatsappPaymentRequest, whatsappRefundProcessed, whatsappReviewRequest } from '@/lib/booking-whatsapp';
import { createCheckoutLink } from '@/lib/bookings/checkout';
import { transcribe } from './assistant';
import { history } from './store';
import { sendLogged } from './send';
import type { Conversation, Inbound } from './types';

const SITE = () => siteConfig.url.replace(/\/$/, '');
const MAX_TOOL_CALLS = 8;

/** The owner's WhatsApp number (digits), or null when not set. */
export async function ownerPhone(): Promise<string | null> {
  try {
    const { data } = await serviceClient().from('whatsapp_settings').select('*').eq('id', 1).maybeSingle();
    return (data as any)?.owner_phone || null;
  } catch { return null; }
}

/** A short, standalone yes: the only thing that lets a change go ahead. */
export function isAffirmative(text: string): boolean {
  return /^\s*(yes|y|yeah|yep|yup|ok|okay|okk|haan|han|ha|ji|ji haan|done|go|go ahead|do it|send|send it|sure|confirm|confirmed|proceed|👍)\s*[.!]*\s*$/i.test(text);
}

const WRITE_TOOLS = new Set(['confirm_booking', 'assign_booking', 'update_booking', 'message_customer', 'email_customer', 'message_partner', 'request_payment', 'record_refund', 'remind_commission', 'request_review']);

const SYSTEM = `You are the admin assistant of Dharamshala Stay (hotels, taxis, treks, paragliding, party tickets in Dharamshala and McLeod Ganj). You are talking on WhatsApp with the OWNER, who manages the business from their phone.
- Use the tools to look things up; never guess booking details, prices or phone numbers.
- Changes (confirm, assign, update, message or email a customer, message a partner or hotel, send a payment link, record a refund, remind a partner about commission, ask for a review) need the owner's explicit YES. First describe EXACTLY what you will do (booking ref, who gets what message, the full message text), then ask "Reply YES to do it." Only after the owner's next message is a plain yes, call the tool with confirmed=true.
- Messages you write to customers: polite, short, professional Indian English, signed as Dharamshala Stay; never promise refunds, discounts or prices the owner did not give.
- Keep replies to the owner short, with *bold* refs, and say what was done and anything that failed.
- If the owner refers to "this" or "it", use the most recent alert or booking in the context.`;

const TOOLS = [
  { type: 'function', function: { name: 'find_bookings', description: 'Search recent bookings by ref, guest name or phone, and/or status.', parameters: { type: 'object', properties: {
    query: { type: 'string', description: 'Booking ref, guest name or phone (optional)' },
    status: { type: 'string', enum: ['pending', 'confirmed', 'cancelled', 'completed', 'any'] },
    days: { type: 'number', description: 'Only bookings created in the last N days (default 14)' } } } } },
  { type: 'function', function: { name: 'get_booking', description: 'Full details of one booking by ref.', parameters: { type: 'object', properties: { ref: { type: 'string' } }, required: ['ref'] } } },
  { type: 'function', function: { name: 'list_enquiries', description: 'Recent enquiries from the website or WhatsApp.', parameters: { type: 'object', properties: { status: { type: 'string', enum: ['new', 'contacted', 'converted', 'closed', 'any'] } } } } },
  { type: 'function', function: { name: 'list_chats_needing_me', description: 'Customer WhatsApp chats waiting for a person.', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'list_partners', description: 'Taxi, trek and paragliding partners with their services.', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'confirm_booking', description: 'Confirm a pending booking; the customer gets the confirmation email and WhatsApp.', parameters: { type: 'object', properties: { ref: { type: 'string' }, confirmed: { type: 'boolean' } }, required: ['ref', 'confirmed'] } } },
  { type: 'function', function: { name: 'assign_booking', description: 'Assign a booking to a partner by name; the partner gets the booking WhatsApp and email.', parameters: { type: 'object', properties: { ref: { type: 'string' }, partner_name: { type: 'string' }, confirmed: { type: 'boolean' } }, required: ['ref', 'partner_name', 'confirmed'] } } },
  { type: 'function', function: { name: 'update_booking', description: 'Change date, people, total amount, pickup time or the note of a booking. Optionally re-send the partner alert.', parameters: { type: 'object', properties: {
    ref: { type: 'string' }, activity_date: { type: 'string', description: 'YYYY-MM-DD' }, num_guests: { type: 'number' }, amount: { type: 'number', description: 'New TOTAL in rupees' },
    pickup_time: { type: 'string' }, note: { type: 'string', description: 'Replaces the booking note the partner sees' },
    change_summary: { type: 'string', description: 'What changed, in a few words, for the WhatsApp updates, e.g. "Date moved to 2 Nov; now 3 people"' },
    notify_partner: { type: 'boolean', description: 'Send the partner/hotel the booking update' }, notify_customer: { type: 'boolean', description: 'Send the customer the booking update' },
    confirmed: { type: 'boolean' } }, required: ['ref', 'confirmed'] } } },
  { type: 'function', function: { name: 'message_partner', description: 'WhatsApp a message about a booking to whoever is assigned (hotel, partner, driver), even if they have no open chat.', parameters: { type: 'object', properties: {
    ref: { type: 'string' }, text: { type: 'string', description: 'The message, one paragraph, at most 300 characters' }, confirmed: { type: 'boolean' } }, required: ['ref', 'text', 'confirmed'] } } },
  { type: 'function', function: { name: 'request_payment', description: 'Create a secure online payment link for the unpaid booking amount and WhatsApp it to the customer.', parameters: { type: 'object', properties: {
    ref: { type: 'string' }, confirmed: { type: 'boolean' } }, required: ['ref', 'confirmed'] } } },
  { type: 'function', function: { name: 'record_refund', description: 'After the owner has refunded in Razorpay or by bank: record it and tell the customer the amount and refund reference.', parameters: { type: 'object', properties: {
    ref: { type: 'string' }, amount: { type: 'number', description: 'Refunded amount in rupees' }, reference: { type: 'string', description: 'Refund reference or UTR from Razorpay or the bank' }, confirmed: { type: 'boolean' } }, required: ['ref', 'amount', 'reference', 'confirmed'] } } },
  { type: 'function', function: { name: 'remind_commission', description: 'WhatsApp the partner or hotel that our commission on a booking is due.', parameters: { type: 'object', properties: {
    ref: { type: 'string' }, due_by: { type: 'string', description: 'Due date, e.g. "30 Oct 2026"' }, confirmed: { type: 'boolean' } }, required: ['ref', 'due_by', 'confirmed'] } } },
  { type: 'function', function: { name: 'request_review', description: 'WhatsApp the customer a review request after their trip. Only goes to guests who agreed to hear from us; otherwise it is refused.', parameters: { type: 'object', properties: {
    ref: { type: 'string' }, confirmed: { type: 'boolean' } }, required: ['ref', 'confirmed'] } } },
  { type: 'function', function: { name: 'message_customer', description: 'Send a WhatsApp message to a customer (by booking ref or phone). Uses the open chat if the customer wrote in the last 24h, otherwise the approved enquiry reply template.', parameters: { type: 'object', properties: {
    ref: { type: 'string' }, phone: { type: 'string' }, name: { type: 'string', description: 'Customer first name, if no ref' }, about: { type: 'string', description: 'Short subject, e.g. "your Kareri trek"' },
    text: { type: 'string', description: 'The message to send; at most 300 characters unless the customer wrote in the last 24h' }, confirmed: { type: 'boolean' } }, required: ['text', 'confirmed'] } } },
  { type: 'function', function: { name: 'email_customer', description: 'Email a customer (by booking ref or email address).', parameters: { type: 'object', properties: {
    ref: { type: 'string' }, email: { type: 'string' }, subject: { type: 'string' }, text: { type: 'string' }, confirmed: { type: 'boolean' } }, required: ['subject', 'text', 'confirmed'] } } },
];

// Template values are cut at 300 characters (cleanParam), so longer texts are refused rather than sent half-written.
const TEMPLATE_TEXT_MAX = 300;
const TOO_LONG = (s: string) => `Message is ${s.length} characters; WhatsApp template text must be ${TEMPLATE_TEXT_MAX} or fewer. Shorten it, or split it into two messages, and ask the owner again.`;
const CHANGE_LABEL: Record<string, string> = { activity_date: 'Date', num_guests: 'Number of people', amount: 'Total price', commission_amount: 'Total price', partner_share_amount: 'Total price', price_overridden: 'Total price', pickup_time: 'Pickup time', special_requests: 'Booking note' };
const digits = (s: unknown) => String(s ?? '').replace(/\D/g, '');
const phone91 = (s: unknown) => { const d = digits(s); return d.length === 10 ? '91' + d : d; };

async function bookingByRef(ref: string) {
  const { data } = await serviceClient().from('bookings').select('*').ilike('booking_ref', ref.trim()).maybeSingle();
  return data as any;
}

function bookingSummary(b: any, partners: Map<string, string>) {
  return {
    ref: b.booking_ref, category: b.category, item: b.room_name || null, status: b.status,
    guest: b.guest_name, phone: b.guest_phone, email: b.guest_email || null,
    date: b.check_in ? `${b.check_in} to ${b.check_out}` : b.activity_date, time: b.pickup_time || null, guests: b.num_guests,
    amount: b.amount, payment: `${b.payment_status} (${b.payment_method})`, partner: b.partner_id ? partners.get(b.partner_id) || b.partner_id : null,
    note: b.special_requests || null, created: b.created_at?.slice(0, 16),
  };
}

async function partnerNames(): Promise<Map<string, string>> {
  const { data } = await serviceClient().from('profiles').select('id, full_name, business_name').eq('role', 'partner');
  return new Map((data || []).map((p: any) => [p.id, p.business_name || p.full_name || 'Partner']));
}

/** Exported for tests. Changes run only when the model says confirmed AND the owner's latest message is a plain yes. */
export async function runOwnerTool(name: string, args: any, ctx: { lastText: string }): Promise<string> {
  if (WRITE_TOOLS.has(name) && !(args.confirmed === true && isAffirmative(ctx.lastText))) {
    return JSON.stringify({ needs_confirmation: true, instruction: 'Do not act yet. Tell the owner exactly what will happen and ask them to reply YES.' });
  }
  const sb = serviceClient();
  switch (name) {
    case 'find_bookings': {
      const since = new Date(Date.now() - (Number(args.days) || 14) * 86400e3).toISOString();
      let q = sb.from('bookings').select('*').gte('created_at', since).order('created_at', { ascending: false }).limit(10);
      if (args.status && args.status !== 'any') q = q.eq('status', args.status);
      const s = String(args.query || '').trim();
      if (s) q = /\d{6,}/.test(s.replace(/\D/g, '')) && !/[a-z]{3}-/i.test(s) ? q.ilike('guest_phone', `%${digits(s).slice(-10)}%`)
        : /^[a-z]{3}-/i.test(s) ? q.ilike('booking_ref', `%${s}%`) : q.ilike('guest_name', `%${s}%`);
      const { data } = await q;
      const names = await partnerNames();
      return JSON.stringify((data || []).map((b) => bookingSummary(b, names)));
    }
    case 'get_booking': {
      const b = await bookingByRef(args.ref);
      return b ? JSON.stringify(bookingSummary(b, await partnerNames())) : JSON.stringify({ error: 'No booking with that ref' });
    }
    case 'list_enquiries': {
      let q = sb.from('inquiries').select('created_at, name, phone, email, check_in, check_out, guests, message, status').order('created_at', { ascending: false }).limit(10);
      if (args.status && args.status !== 'any') q = q.eq('status', args.status);
      const { data } = await q;
      return JSON.stringify((data || []).map((e: any) => ({ ...e, message: String(e.message || '').slice(0, 300) })));
    }
    case 'list_chats_needing_me': {
      const { data } = await sb.from('whatsapp_conversations').select('id, phone, profile_name, status, handover_reason, last_customer_at').in('status', ['needs_human', 'human']).order('last_customer_at', { ascending: false }).limit(10);
      return JSON.stringify(data || []);
    }
    case 'list_partners': {
      const { data } = await sb.from('profiles').select('full_name, business_name, phone, partner_services, partner_status').eq('role', 'partner');
      return JSON.stringify(data || []);
    }
    case 'confirm_booking': {
      const b = await bookingByRef(args.ref);
      if (!b) return JSON.stringify({ error: 'No booking with that ref' });
      const r = await confirmBooking(b.id, 'admin');
      return JSON.stringify(r.ok ? { ok: true, already_confirmed: r.already, customer_notified: !r.already } : { error: r.error });
    }
    case 'assign_booking': {
      const b = await bookingByRef(args.ref);
      if (!b) return JSON.stringify({ error: 'No booking with that ref' });
      const { data: ps } = await sb.from('profiles').select('id, full_name, business_name, commission_pct, partner_status').eq('role', 'partner');
      const wanted = String(args.partner_name || '').toLowerCase().trim();
      const matches = (ps || []).filter((p: any) => [p.full_name, p.business_name].some((n) => String(n || '').toLowerCase().includes(wanted)));
      if (matches.length !== 1) return JSON.stringify({ error: matches.length ? 'More than one partner matches; ask which one' : 'No partner with that name', candidates: matches.map((p: any) => p.business_name || p.full_name) });
      const p: any = matches[0];
      const pct = b.category === 'event' ? 0 : Math.min(99.99, commissionRateFor(b.category, { partnerPct: p.commission_pct != null ? Number(p.commission_pct) : null, propertyPct: null }));
      const split = splitAmount(Number(b.amount) || 0, pct);
      const { error } = await sb.from('bookings').update({ partner_id: p.id, commission_pct: pct, commission_amount: split.commission_amount, partner_share_amount: split.partner_share_amount, updated_at: new Date().toISOString() }).eq('id', b.id);
      if (error) return JSON.stringify({ error: 'Could not save the assignment' });
      await sendManualBookingEmails(b.id, { customer: false, partner: true }).catch(() => {});
      await whatsappNewBooking(b.id, { customer: false, partners: true }).catch(() => {});
      return JSON.stringify({ ok: true, partner: p.business_name || p.full_name, commission_pct: pct, partner_notified: true });
    }
    case 'update_booking': {
      const b = await bookingByRef(args.ref);
      if (!b) return JSON.stringify({ error: 'No booking with that ref' });
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (args.activity_date && /^\d{4}-\d{2}-\d{2}$/.test(args.activity_date) && !b.check_in) patch.activity_date = args.activity_date;
      if (Number(args.num_guests) > 0) patch.num_guests = Math.round(Number(args.num_guests));
      if (Number(args.amount) > 0) {
        patch.amount = Math.round(Number(args.amount));
        const split = splitAmount(patch.amount as number, Number(b.commission_pct) || 0);
        Object.assign(patch, split, { price_overridden: true });
      }
      if (typeof args.pickup_time === 'string') patch.pickup_time = args.pickup_time.slice(0, 20);
      if (typeof args.note === 'string') patch.special_requests = args.note.slice(0, 2000);
      const { error } = await sb.from('bookings').update(patch).eq('id', b.id);
      if (error) return JSON.stringify({ error: 'Could not update the booking' });
      const changed = Object.keys(patch).filter((k) => k !== 'updated_at');
      const summary = String(args.change_summary || '').trim() || Array.from(new Set(changed.map((k) => CHANGE_LABEL[k] || k))).join(', ') + ' updated';
      const sent = (args.notify_partner || args.notify_customer)
        ? await whatsappBookingUpdated(b.id, summary.slice(0, 300), { customer: !!args.notify_customer, partners: !!args.notify_partner })
        : { customer: false, partners: 0 };
      return JSON.stringify({ ok: true, changed, customer_notified: sent.customer, partners_notified: sent.partners });
    }
    case 'message_partner': {
      const b = await bookingByRef(args.ref);
      if (!b) return JSON.stringify({ error: 'No booking with that ref' });
      const text = String(args.text || '').trim();
      if (text.length > TEMPLATE_TEXT_MAX) return JSON.stringify({ error: TOO_LONG(text) });
      const n = await whatsappMessagePartner(b.id, text);
      return JSON.stringify(n ? { ok: true, sent_to: n } : { error: 'Nobody with WhatsApp alerts is assigned to this booking, or the send failed' });
    }
    case 'request_payment': {
      const b = await bookingByRef(args.ref);
      if (!b) return JSON.stringify({ error: 'No booking with that ref' });
      const link = await createCheckoutLink(b.id);
      if (!link.ok) return JSON.stringify({ error: link.error });
      const ok = await whatsappPaymentRequest(b.id, link.url);
      return JSON.stringify(ok ? { ok: true, link: link.url } : { error: 'Link created but the WhatsApp failed', link: link.url });
    }
    case 'record_refund': {
      const b = await bookingByRef(args.ref);
      if (!b) return JSON.stringify({ error: 'No booking with that ref' });
      const amount = Math.round(Number(args.amount) || 0);
      const reference = String(args.reference || '').trim().slice(0, 80);
      if (amount <= 0 || !reference) return JSON.stringify({ error: 'Need the refunded amount and the refund reference' });
      const full = amount >= (Number(b.paid_amount) || Number(b.amount) || 0);
      if (full) {
        const { error } = await sb.from('bookings').update({ payment_status: 'refunded', updated_at: new Date().toISOString() }).eq('id', b.id);
        if (error) return JSON.stringify({ error: 'Could not mark the booking refunded' });
      }
      const ok = await whatsappRefundProcessed(b.id, amount, reference);
      return JSON.stringify({ ok: true, marked_refunded: full, customer_notified: ok });
    }
    case 'remind_commission': {
      const b = await bookingByRef(args.ref);
      if (!b) return JSON.stringify({ error: 'No booking with that ref' });
      if (!(Number(b.commission_amount) > 0) || ['paid', 'waived', 'not_applicable'].includes(b.commission_status)) return JSON.stringify({ error: `No commission is owed (status ${b.commission_status || 'none'})` });
      const n = await whatsappCommissionDue(b.id, String(args.due_by || '').slice(0, 40));
      return JSON.stringify(n ? { ok: true, sent_to: n, amount: b.commission_amount } : { error: 'No partner number with WhatsApp alerts, or the send failed' });
    }
    case 'request_review': {
      const b = await bookingByRef(args.ref);
      if (!b) return JSON.stringify({ error: 'No booking with that ref' });
      const r = await whatsappReviewRequest(b.id);
      return JSON.stringify(r.ok ? { ok: true } : { error: r.reason });
    }
    case 'message_customer': {
      const b = args.ref ? await bookingByRef(args.ref) : null;
      const to = phone91(b?.guest_phone || args.phone);
      if (to.length < 11) return JSON.stringify({ error: 'No valid phone number' });
      const text = String(args.text || '').trim().slice(0, 900);
      const { data: c } = await sb.from('whatsapp_conversations').select('id, phone, last_customer_at').eq('phone', to).maybeSingle();
      if (c?.last_customer_at && Date.now() - Date.parse(c.last_customer_at) < 23.5 * 3600e3) {
        const r = await sendLogged(c as any, text);
        return JSON.stringify(r.ok ? { ok: true, via: 'chat' } : { error: r.error || 'Send failed' });
      }
      const first = String(b?.guest_name || args.name || 'there').split(/\s+/)[0];
      const about = String(args.about || b?.room_name || 'your enquiry').slice(0, 120);
      if (text.length > TEMPLATE_TEXT_MAX) return JSON.stringify({ error: TOO_LONG(text) + ' The chat is closed, so it goes as a template.' });
      const r = await sendTemplate({ to, template: 'enquiry_reply', params: [first, about, text.replace(/\s*\n+\s*/g, ' ')] });
      await sb.from('whatsapp_messages').insert({ booking_id: b?.id ?? null, recipient_kind: 'customer', to_phone: to, template: 'enquiry_reply', wa_message_id: r.ok ? r.id : null, status: r.ok ? 'sent' : 'failed', error: r.ok ? null : r.error || null });
      return JSON.stringify(r.ok ? { ok: true, via: 'template enquiry_reply' } : { error: r.error || 'Send failed' });
    }
    case 'email_customer': {
      const b = args.ref ? await bookingByRef(args.ref) : null;
      const to = String(b?.guest_email || args.email || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return JSON.stringify({ error: 'No valid email address' });
      const html = `<h2>${escHtml(args.subject)}</h2>` + String(args.text).split(/\n{2,}/).map((p) => `<p>${escHtml(p).replace(/\n/g, '<br>')}</p>`).join('');
      await sendEmail({ to, subject: String(args.subject).slice(0, 150), html, template: 'owner_message' });
      return JSON.stringify({ ok: true, to });
    }
  }
  return JSON.stringify({ error: 'Unknown tool' });
}

/** The latest owner alerts sent to this phone, so "confirm it" has something to refer to. */
async function recentAlerts(phone: string): Promise<string> {
  const { data } = await serviceClient().from('whatsapp_template_sends').select('params, created_at').eq('to_phone', phone).eq('template', 'owner_alert').order('created_at', { ascending: false }).limit(5);
  if (!data?.length) return '';
  return '\n\nRecent alerts sent to the owner (newest first):\n' + data.map((a: any) => `- ${a.created_at.slice(0, 16)}: ${(a.params || []).join(' | ')}`).join('\n');
}

async function complete(messages: any[]) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST', signal: AbortSignal.timeout(30000),
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: process.env.OPENAI_CHAT_MODEL || 'gpt-4.1', temperature: 0.2, max_tokens: 700, messages, tools: TOOLS }),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${data?.error?.message || 'error'}`);
  return data?.choices?.[0]?.message;
}

/** Answer one owner message. Never throws; tells the owner when something failed. */
export async function handleOwnerMessage(m: Inbound, c: Conversation, body: string, messageId: string): Promise<void> {
  try {
    await markReadTyping(m.waId).catch(() => {});
    let text = body;
    if (m.kind === 'voice' && m.mediaId) {
      const media = await downloadMedia(m.mediaId);
      const heard = media ? await transcribe(media.data, media.mimeType) : null;
      if (!heard) { await sendLogged(c, 'I could not understand that voice note. Please type it or try again.'); return; }
      text = heard;
      await serviceClient().from('whatsapp_chat_messages').update({ body: `🎤 ${heard}` }).eq('id', messageId);
    }
    if (m.kind === 'media') { await sendLogged(c, 'I can read text and voice notes. Please describe what you need.'); return; }
    const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
    const past = (await history(c.id, 16)).filter((x) => x.kind !== 'system' && x.body);
    const messages: any[] = [
      { role: 'system', content: `${SYSTEM}\n\nToday is ${today} (India time). Admin panel: ${SITE()}/admin${await recentAlerts(c.phone)}` },
      ...past.map((x) => x.author === 'customer' ? { role: 'user', content: x.id === messageId ? text : x.body } : { role: 'assistant', content: x.body }),
    ];
    let calls = 0;
    for (;;) {
      const msg = await complete(messages);
      const toolCalls: any[] = msg?.tool_calls || [];
      if (!toolCalls.length) {
        const answer = String(msg?.content || '').trim() || 'Done.';
        await sendLogged(c, answer.slice(0, 3500));
        return;
      }
      messages.push({ role: 'assistant', content: msg.content ?? null, tool_calls: toolCalls });
      calls += toolCalls.length;
      if (calls > MAX_TOOL_CALLS) { await sendLogged(c, 'That needed too many steps. Please ask one thing at a time.'); return; }
      for (const call of toolCalls) {
        let args: any = {};
        try { args = JSON.parse(call.function?.arguments || '{}'); } catch { /* {} */ }
        const result = await runOwnerTool(call.function?.name, args, { lastText: text }).catch((e) => JSON.stringify({ error: String(e?.message || e) }));
        messages.push({ role: 'tool', tool_call_id: call.id, content: result });
      }
    }
  } catch (e: any) {
    console.error('Owner WhatsApp turn failed:', e);
    await sendLogged(c, 'Sorry, something went wrong on my side. Please try again, or use the admin panel: ' + SITE() + '/admin').catch(() => {});
  }
}

