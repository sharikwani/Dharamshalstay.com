// lib/wa-chat/booking-tools.ts
import { getActiveTaxiRoutes, getParaglidingPackages, getPublishedTreks } from '@/lib/db';
import { quoteBooking } from '@/lib/pricing';
import { bookingSchema, createBooking, dateProblem } from '@/lib/bookings/create';
import { createCheckoutLink } from '@/lib/bookings/checkout';
import { sendBookingEmails } from '@/lib/booking-emails';
import { adminEmail, sendEmail } from '@/lib/email';
import { serviceClient } from '@/lib/server-auth';
import { roomSummaries } from '@/lib/availability/calc';
import { availabilityFor } from '@/lib/availability/store';
import { claimCode, linkCodeBooking, releaseCode } from '@/lib/offers/store';
import { discounted, formatIST, OFFER_NEEDS_ONLINE, offerNeedsOnline } from '@/lib/offers/rules';
import { offerForBooking, type OfferOk } from './offer-tools';
import { claimQuote, confirmedAfter, findOwnBooking, latestOpenQuote, linkQuoteBooking, ownBookings, releaseQuote, saveQuote, type Quote } from './booking-store';
import { findHotel } from './find';
import type { ToolCtx } from './tools';
import { markSideEffect } from './types';

type Handover = (a: any, ctx: ToolCtx) => Promise<unknown>;
type Category = Quote['category'];

const fn = (name: string, description: string, properties: Record<string, any>, required: string[] = []) =>
  ({ type: 'function', function: { name, description, parameters: { type: 'object', properties, required, additionalProperties: false } } });
const str = (description: string) => ({ type: 'string', description });
const lc = (s: unknown) => String(s ?? '').toLowerCase().trim();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAILY_LIMIT = 3;
const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const laterMethod = (c: string) => (c === 'hotel' ? 'pay_at_hotel' : 'offline');

export const BOOKING_TOOL_DEFS = [
  fn('quote_booking', 'Price a booking from live data and save a quote. Use once you know the item, dates and number of people. Show the returned summary to the customer and ask them to reply YES and choose pay online or pay later.', {
    category: { type: 'string', enum: ['hotel', 'taxi', 'trek', 'paragliding'] },
    name: str('Hotel, trek or paragliding package name (not for taxi)'),
    room_name: str('Hotel room name from get_hotel'), plan_name: str('Hotel rate plan name from get_hotel, if any'),
    check_in: str('Hotel check-in YYYY-MM-DD'), check_out: str('Hotel check-out YYYY-MM-DD'),
    date: str('Trek, paragliding or taxi date YYYY-MM-DD'), guests: { type: 'number', description: 'Number of people' },
    from: str('Taxi pickup place'), to: str('Taxi drop place'), vehicle: str('Taxi vehicle name, e.g. Sedan, SUV'),
    pickup_time: str('Taxi pickup time HH:MM (24h)'), pickup_location: str('Exact pickup address (taxi)'), drop_location: str('Exact drop address (taxi)'),
    offer_code: str('WhatsApp offer code from get_offer_code, only if the customer wants to use it (hotels only)'),
  }, ['category', 'guests']),
  fn('create_booking', 'Book the most recent quote you showed the customer. Only after the customer replied YES to that quote\'s summary in a later message.', {
    payment: { type: 'string', enum: ['online', 'later'] },
    guest_name: str('Full name for the booking'), guest_email: str('Email, if the customer gave one'),
  }, ['payment', 'guest_name']),
  fn('payment_link', 'A fresh online payment link for one of this customer\'s unpaid bookings.', { booking_ref: str('Booking reference, e.g. TRK-1234') }, ['booking_ref']),
  fn('my_bookings', 'This customer\'s recent bookings (made with this WhatsApp number).', {}),
];

type Resolved = { error: string; [k: string]: unknown } | { entity: Record<string, any>; input: Record<string, any>; label: string; when: string };

async function resolve(category: Category, a: any): Promise<Resolved> {
  const guests = Math.max(1, Math.floor(Number(a.guests) || 1));
  if (category === 'hotel') {
    const p: any = await findHotel(String(a.name || ''));
    if (!p) return { error: 'Hotel not found. Use search_hotels first.' };
    const rooms = (p.rooms || []).filter((r: any) => r?.is_active !== false);
    const room = rooms.find((r: any) => lc(r.name) === lc(a.room_name)) || rooms.find((r: any) => a.room_name && lc(r.name).includes(lc(a.room_name)));
    if (rooms.length && !room) return { error: 'Which room? Ask the customer to pick one.', rooms: rooms.map((r: any) => r.name) };
    const plans: any[] = Array.isArray(room?.rate_plans) ? room.rate_plans : [];
    const planIndex = a.plan_name ? plans.findIndex((rp) => lc(rp.name) === lc(a.plan_name)) : -1;
    if (a.plan_name && planIndex < 0) return { error: 'That rate plan was not found for this room.', plans: plans.map((rp) => rp.name) };
    const plan = planIndex >= 0 ? plans[planIndex] : null;
    return {
      entity: p, label: `${p.name}${room ? ` – ${room.name}` : ''}${plan ? ` (${plan.name})` : ''}`, when: `${a.check_in} to ${a.check_out}`,
      input: { category, property_id: p.id, check_in: a.check_in, check_out: a.check_out, num_guests: guests,
        room_name: room?.name, plan_name: plan?.name, plan_index: planIndex >= 0 ? planIndex : null },
    };
  }
  if (category === 'trek' || category === 'paragliding') {
    const rows: any[] = category === 'trek' ? await getPublishedTreks() : await getParaglidingPackages();
    const t = rows.find((r) => lc(r.name) === lc(a.name)) || rows.find((r) => a.name && (lc(r.name).includes(lc(a.name)) || r.slug === lc(a.name)));
    if (!t) return { error: `${category === 'trek' ? 'Trek' : 'Package'} not found. Use ${category === 'trek' ? 'list_treks' : 'list_paragliding'} first.` };
    return {
      entity: t, label: t.name, when: a.date,
      input: { category, [category === 'trek' ? 'trek_id' : 'paragliding_id']: t.id, activity_date: a.date, num_guests: guests },
    };
  }
  const routes = ((await getActiveTaxiRoutes()) as any[]).filter((r) =>
    lc(r.from_location).includes(lc(a.from)) && lc(r.to_location).includes(lc(a.to)) && r.price_type !== 'per_km' && Number(r.price) > 0);
  if (!a.from || !a.to || !routes.length) return { error: 'No fixed fare for that route. Offer create_enquiry instead.' };
  const vName = (r: any) => r.vehicle_name || r.vehicle_category;
  const matches = a.vehicle ? routes.filter((r) => lc(vName(r)).includes(lc(a.vehicle)) || lc(r.vehicle_category) === lc(a.vehicle)) : routes;
  if (matches.length !== 1) return { error: 'Which vehicle? Ask the customer to pick one.', vehicles: routes.map(vName) };
  const r = matches[0];
  return {
    entity: r, label: `Taxi ${r.from_location} → ${r.to_location} (${vName(r)})`, when: [a.date, a.pickup_time].filter(Boolean).join(' '),
    input: { category, taxi_route_id: r.id, activity_date: a.date, pickup_time: a.pickup_time || undefined, num_guests: guests, vehicle_type: vName(r),
      pickup_location: String(a.pickup_location || r.from_location).slice(0, 200), drop_location: String(a.drop_location || r.to_location).slice(0, 200) },
  };
}

/** Tracked hotel room with nothing left: an error naming the room types that still have space (null = go ahead). */
async function soldOutCheck(hotel: Record<string, any>, input: Record<string, any>) {
  const room = roomSummaries(hotel.rooms).find((x) => x.key === input.room_name);
  if (!room?.tracked) return null;
  const avail = await availabilityFor(hotel.id, input.check_in, input.check_out);
  const mine = avail[room.key];
  if (!mine?.tracked || mine.left >= 1) return null;
  const active = ((hotel.rooms || []) as any[]).filter((x) => x?.is_active !== false).map((x) => x.name);
  const open = Object.keys(avail).filter((k) => {
    const v = avail[k];
    return k !== room.key && active.includes(k) && (!v.tracked || v.left >= 1);
  });
  const when = `${input.check_in} to ${input.check_out}`;
  return open.length
    ? { error: `${room.key} is sold out for ${when}. Offer one of the rooms that still have space.`, rooms_available: open }
    : { error: `${hotel.name} is fully booked for ${when}. Ask the customer for other dates.`, rooms_available: [] as string[] };
}

async function quoteTool(a: any, ctx: ToolCtx) {
  const category = a.category as Category;
  if (!['hotel', 'taxi', 'trek', 'paragliding'].includes(category)) return { error: 'Unknown category' };
  for (const k of ['check_in', 'check_out', 'date']) if (a[k] && !DATE.test(a[k])) return { error: `${k} must be YYYY-MM-DD` };
  if (category !== 'hotel' && !a.date) return { error: 'Ask for the date first.' };
  const problem = dateProblem({ category, check_in: a.check_in, check_out: a.check_out, activity_date: category === 'hotel' ? undefined : a.date });
  if (problem) return { error: problem };
  const r = await resolve(category, a);
  if ('error' in r) return r;
  if (!UUID.test(String(r.entity.id || ''))) return { error: 'This item cannot be booked in chat. Offer create_enquiry instead.' };
  if (category === 'hotel' && r.input.room_name) {
    const sold = await soldOutCheck(r.entity, r.input);
    if (sold) return sold;
  }
  const { amount: listAmount } = quoteBooking(category, r.entity, {
    num_guests: r.input.num_guests, check_in: r.input.check_in, check_out: r.input.check_out, room_name: r.input.room_name, plan_index: r.input.plan_index,
  });
  let amount = listAmount;
  let offer: { code: string; percent: number; full_price: number } | null = null;
  if (a.offer_code) {
    if (category !== 'hotel') return { error: 'Offer codes are only for hotels.' };
    // The phone is always this chat's own number (WhatsApp-only codes).
    const o = await offerForBooking({ code: a.offer_code, phone: ctx.phone, propertyId: r.input.property_id, room: r.input.room_name, plan: r.input.plan_name });
    if ('error' in o) return o;
    amount = discounted(listAmount, o.percent);
    if (amount < 100 || !process.env.STRIPE_SECRET_KEY) return { error: offerNeedsOnline(o.expiresAt) };
    offer = { code: o.code, percent: o.percent, full_price: listAmount };
  }
  const online = amount >= 100 && !!process.env.STRIPE_SECRET_KEY;
  const total = amount <= 0 ? 'Price confirmed by our team'
    : offer ? `Total ${rupees(amount)} (${offer.percent}% WhatsApp offer off ${rupees(offer.full_price)}, code ${offer.code}) · Pay online only`
    : `Total ${rupees(amount)}`;
  const summary = [r.label, r.when, `${r.input.num_guests} ${r.input.num_guests === 1 ? 'person' : 'people'}`, total]
    .filter(Boolean).join(' · ') + ' · Cannot be cancelled within 24 hours of the start';
  const input = offer ? { ...r.input, offer_code: offer.code, offer_percent: offer.percent } : r.input;
  const q = await saveQuote({ conversation_id: ctx.conversationId, category, input, amount, summary });
  return { quote_id: q.id, summary, amount, online_payment_available: online, expires_in_minutes: 30, ...(offer ? { offer, payment: 'online only' } : {}) };
}

async function createTool(a: any, ctx: ToolCtx, handover: Handover) {
  const q = await latestOpenQuote(ctx.conversationId);
  if (!q || q.conversation_id !== ctx.conversationId) return { error: 'No open quote. Make a quote with quote_booking, show it, and wait for YES.' };
  if (q.used_at || q.used_booking_id) return { error: 'This quote was already booked.' };
  if (Date.parse(q.expires_at) < Date.now()) return { error: 'This quote expired. Make a new quote and ask the customer to confirm again.' };
  if (!(await confirmedAfter(ctx.conversationId, q.created_at))) return { error: 'Show the summary and wait for the customer to reply YES before booking.' };
  const name = String(a.guest_name || '').trim().slice(0, 200);
  if (name.length < 2) return { error: 'Ask for the guest\'s full name.' };
  const email = String(a.guest_email || '').trim();

  const since = Date.now() - 24 * 3600e3;
  const recent = (await ownBookings(ctx.phone)).filter((b) => b.booking_source === 'whatsapp' && Date.parse(b.created_at) >= since);
  if (recent.length >= DAILY_LIMIT) {
    await handover({ reason: `More than ${DAILY_LIMIT} WhatsApp bookings in 24 hours` }, ctx);
    return { handed_over: true, reason: 'Daily WhatsApp booking limit reached; a team member will help.' };
  }

  const offerCode = typeof q.input.offer_code === 'string' ? q.input.offer_code : null;
  if (offerCode && a.payment !== 'online') {
    return { error: 'This quote uses an offer code, which needs online payment in full. Ask the customer to pay online, or make a new quote without the code (pay later, no offer).' };
  }
  const payment_method = a.payment === 'online' ? 'online' : laterMethod(q.category);
  // offer_code / offer_percent are not booking form fields; the offer reaches createBooking only through opts.offer.
  const { offer_code: _code, offer_percent: _pct, ...quoteInput } = q.input as Record<string, unknown>;
  const parsed = bookingSchema.safeParse({ ...quoteInput, category: q.category, guest_name: name, guest_email: email, guest_phone: ctx.phone, payment_method, booking_source: 'whatsapp' });
  if (!parsed.success) return { error: parsed.error.issues.some((i) => i.path[0] === 'guest_email') ? 'That email looks wrong; ask again or leave it out.' : 'Some details are missing; make a new quote.' };
  let offer: OfferOk | null = null;
  if (offerCode) {
    const o = await offerForBooking({ code: offerCode, phone: ctx.phone, propertyId: q.input.property_id, room: q.input.room_name, plan: q.input.plan_name });
    if ('error' in o) return { error: `${o.error} Make a new quote.` };
    // Keep the percent the customer said YES to in the quote.
    offer = { ...o, percent: Number(q.input.offer_percent) || o.percent };
  }
  if (!(await claimQuote(q.id))) return { error: 'This quote was already booked.' };
  if (offer && !(await claimCode(offer.codeId, offer.percent))) {
    await releaseQuote(q.id);
    return { error: 'This offer code was just used or has expired. Make a new quote.' };
  }

  const r = await createBooking(parsed.data, { userId: null, callerRole: null, ...(offer ? { offer: { code: offer.code, percent: offer.percent } } : {}) });
  if (!r.ok) {
    // Any failure (sold out, lost race, 503, no online payment) frees the quote and the code for another try.
    await releaseQuote(q.id);
    if (offer) await releaseCode(offer.codeId);
    return { error: offer && r.error === OFFER_NEEDS_ONLINE ? offerNeedsOnline(offer.expiresAt) : r.error };
  }
  await linkQuoteBooking(q.id, r.booking.id);
  if (offer && !(await linkCodeBooking(offer.codeId, r.booking.id))) {
    const text = `Offer code ${offer.code} could not be linked to booking ${r.booking.booking_ref}`;
    try { await sendEmail({ to: adminEmail(), subject: text, html: `<p>${text}. Check the code in Admin → Offers.</p>` }); }
    catch (e) { console.error('WhatsApp offer booking: owner email failed', e); }
  }
  markSideEffect(ctx, 'create_booking');
  const base = { booking_ref: r.booking.booking_ref, status: 'requested', amount: r.amount, ...(offer ? { offer_code: offer.code, offer_percent: offer.percent } : {}) };
  if (r.payment_method !== 'online') return { ...base, payment: 'later' };

  let link: Awaited<ReturnType<typeof createCheckoutLink>> | null = null;
  try { link = await createCheckoutLink(r.booking.id); } catch (e) { console.error('WhatsApp booking: checkout link failed', e); }
  if (link?.ok) return { ...base, payment: 'online', payment_url: link.url };
  if (offer) {
    // Offer bookings never become pay later (pay later is never discounted): drop this booking and free the code.
    // Its payment_method stays online, so commission_status stays 'not_applicable' (never 'pending').
    const { error } = await serviceClient().from('bookings').update({ status: 'failed', cancelled_reason: 'Offer booking: payment link failed' }).eq('id', r.booking.id);
    if (error) console.error('WhatsApp offer booking: could not mark failed', error);
    await releaseCode(offer.codeId);
    return { error: `The payment link could not be created. Your code is free again – make a new quote with the same code in a minute, or show code ${offer.code} at reception before ${formatIST(offer.expiresAt)}.` };
  }
  // No link: keep the booking as pay later so the usual booking emails still go out.
  const later = laterMethod(q.category);
  const sb = serviceClient();
  // createBooking marks online bookings commission 'not_applicable'; pay-later ones with commission owe it.
  const { data: row } = await sb.from('bookings').select('commission_amount').eq('id', r.booking.id).single();
  const patch: Record<string, unknown> = { payment_method: later };
  if (Number((row as any)?.commission_amount) > 0) patch.commission_status = 'pending';
  const { error } = await sb.from('bookings').update(patch).eq('id', r.booking.id);
  if (error) console.error('WhatsApp booking: pay-later fallback failed', error);
  await sendBookingEmails(r.booking.id);
  return { ...base, payment: 'later', payment_link_failed: true };
}

async function paymentLinkTool(a: any, ctx: ToolCtx) {
  const b = await findOwnBooking(ctx.phone, a.booking_ref);
  if (!b) return { error: 'Booking not found for this WhatsApp number.' };
  if (b.status === 'cancelled') return { error: 'This booking is cancelled.' };
  if (b.status === 'failed' || b.status === 'no_show') return { error: 'This booking can no longer be paid.' };
  if (b.payment_status === 'paid') return { error: 'This booking is already paid.' };
  let link: Awaited<ReturnType<typeof createCheckoutLink>>;
  try { link = await createCheckoutLink(b.id); } catch (e) {
    console.error('WhatsApp payment_link failed', e);
    return { error: 'Could not create a payment link right now.' };
  }
  if (!link.ok) return { error: link.error };
  markSideEffect(ctx, 'payment_link');
  return { booking_ref: b.booking_ref, payment_url: link.url };
}

const STATUS_WORDS: Record<string, string> = {
  pending: 'requested, waiting for confirmation', confirmed: 'confirmed by the property/operator',
  completed: 'completed', cancelled: 'cancelled',
};

async function myBookingsTool(ctx: ToolCtx) {
  const rows = (await ownBookings(ctx.phone)).slice(0, 5);
  return {
    bookings: rows.map((b) => ({
      ref: b.booking_ref, type: b.category, room: b.room_name || undefined,
      dates: b.check_in ? `${b.check_in} to ${b.check_out || ''}` : [b.activity_date, b.pickup_time].filter(Boolean).join(' '),
      guests: b.num_guests, amount: b.amount, paid: b.payment_status === 'paid', status: STATUS_WORDS[b.status] || b.status,
    })),
  };
}

/** Run a booking tool; null when `name` is not one of them. */
export async function runBookingTool(name: string, a: any, ctx: ToolCtx, handover: Handover): Promise<object | null> {
  if (name === 'quote_booking') return quoteTool(a, ctx);
  if (name === 'create_booking') return createTool(a, ctx, handover);
  if (name === 'payment_link') return paymentLinkTool(a, ctx);
  if (name === 'my_bookings') return myBookingsTool(ctx);
  return null;
}
