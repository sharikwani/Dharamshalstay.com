import { getPublishedProperties, getPublishedTreks, getParaglidingPackages } from '@/lib/db';
import { findHotel } from './find';
import { getTaxiRouteGroups } from '@/lib/taxi';
import { siteConfig } from '@/lib/config';
import { sendEmail, adminEmail } from '@/lib/email';
import { serviceClient } from '@/lib/server-auth';
import { history, setStatusIf } from './store';
import { BOOKING_TOOL_DEFS, runBookingTool } from './booking-tools';
import { CANCEL_TOOL_DEF, requestCancellation } from './cancellations';
import { getOfferCode, OFFER_TOOL_DEF, offerNotes } from './offer-tools';
import { markSideEffect } from './types';

/**
 * sideEffects: tools that changed state this turn (create_booking, request_cancellation, get_offer_code, payment_link,
 * handover, create_enquiry). actions: the same in words for the owner (refs, links, enquiry ids).
 */
export type ToolCtx = { conversationId: string; phone: string; profileName: string | null; handedOver: boolean; sideEffects?: string[]; actions?: string[] };

const fn = (name: string, description: string, properties: Record<string, any>, required: string[] = []) =>
  ({ type: 'function', function: { name, description, parameters: { type: 'object', properties, required, additionalProperties: false } } });
const str = (description: string) => ({ type: 'string', description });
const num = (description: string) => ({ type: 'number', description });

export const TOOL_DEFS = [
  fn('search_hotels', 'Find published hotels/homestays. Use before naming or pricing any hotel.', {
    area: str('Area such as McLeod Ganj, Dharamshala, Bhagsu, Dharamkot, Naddi'), budget_max: num('Max price per night in rupees'),
    guests: num('Number of guests'), query: str('Words to match in name or description, e.g. "cottage", "view"'),
  }),
  fn('get_hotel', 'Rooms, rates, check-in/out times and policies for one hotel.', { name: str('Hotel name or page slug') }, ['name']),
  fn('list_taxi_routes', 'Taxi routes with vehicles and fixed fares.', { from: str('Pickup place'), to: str('Drop place') }),
  fn('list_treks', 'Published treks.', { query: str('Words to match, e.g. "Triund"') }),
  fn('get_trek', 'Details for one trek.', { name: str('Trek name or slug') }, ['name']),
  fn('list_paragliding', 'Paragliding packages and prices.', {}),
  fn('create_enquiry', 'Save a request for the team when it cannot be booked with quote_booking (no fixed price, item not listed, special requests). Only after the customer gave the details and agreed.', {
    type: { type: 'string', enum: ['hotel', 'taxi', 'trek', 'paragliding', 'general'] }, name: str('Customer name'),
    item: str('Hotel, room, route, trek or package wanted'), check_in: str('YYYY-MM-DD (hotel) or activity/pickup date'),
    check_out: str('YYYY-MM-DD (hotel only)'), guests: num('Number of people'), pickup: str('Pickup place/time (taxi)'),
    drop: str('Drop place (taxi)'), email: str('Email if given'), notes: str('Anything else: room type, meal plan, special requests'),
  }, ['type', 'name']),
  fn('handover', 'Hand the chat to a team member. Use for complaints, refunds, changes to existing bookings, angry customers, requests for a person, or when unsure.', {
    reason: str('Short reason for the team'),
  }, ['reason']),
  ...BOOKING_TOOL_DEFS, CANCEL_TOOL_DEF, OFFER_TOOL_DEF,
];

const SITE = siteConfig.url;
const lc = (s: unknown) => String(s ?? '').toLowerCase();
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const AREAS: Record<string, string> = { mcleod: 'mcleod-ganj', dharamshala: 'dharamshala', bhagsu: 'bhagsu', dharamkot: 'dharamkot', naddi: 'naddi' };

async function searchHotels(a: any) {
  const area = Object.entries(AREAS).find(([k]) => lc(a.area).includes(k))?.[1];
  let rows: any[] = await getPublishedProperties();
  if (area) rows = rows.filter((p) => p.destination_slug === area);
  if (a.budget_max > 0) rows = rows.filter((p) => !(p.price_min > 0) || p.price_min <= a.budget_max);
  if (a.query) rows = rows.filter((p) => lc([p.name, p.type, p.short_description, p.locality].join(' ')).includes(lc(a.query)));
  const top = rows.slice(0, 6);
  const offers = await offerNotes(top.map((p) => p.id));
  return {
    hotels: top.map((p) => ({
      name: p.name, type: p.type, area: p.locality || p.destination_slug, stars: p.star_rating || null,
      price_from: p.price_min || null, price_to: p.price_max || null, about: String(p.short_description || '').slice(0, 160),
      link: `${SITE}/hotels/${p.slug}`,
      offer: offers[p.id],
    })),
    note: rows.length > 6 ? `${rows.length - 6} more on ${SITE}/hotels` : undefined,
  };
}

async function getHotel(a: any) {
  const p: any = await findHotel(String(a.name || ''));
  if (!p) return { error: 'Hotel not found. Try search_hotels.' };
  const offers = await offerNotes([p.id]);
  return {
    name: p.name, link: `${SITE}/hotels/${p.slug}`, check_in_time: p.check_in_time || null, check_out_time: p.check_out_time || null,
    amenities: (p.amenities || []).slice(0, 15), cancellation_policy: p.cancellation_policy || null,
    offer: offers[p.id],
    rooms: (p.rooms || []).filter((r: any) => r.is_active !== false).map((r: any) => ({
      name: r.name, base_price: r.base_price || null, max_adults: r.max_adults || null, max_children: r.max_children || null,
      rates: (r.rate_plans || []).map((rp: any) => ({ name: rp.name, price: rp.price })),
    })),
    prices_note: 'Prices are per room per night in rupees. Availability is not known here; the team confirms it.',
  };
}

async function taxiRoutes(a: any) {
  const groups = await getTaxiRouteGroups();
  const m = groups.filter((g) => (!a.from || lc(g.from).includes(lc(a.from)) || lc(g.to).includes(lc(a.from)))
    && (!a.to || lc(g.to).includes(lc(a.to)) || lc(g.from).includes(lc(a.to))));
  return {
    routes: m.slice(0, 8).map((g) => ({
      from: g.from, to: g.to, distance_km: g.distanceKm || null, duration: g.duration || null, link: `${SITE}/taxi/${g.slug}`,
      vehicles: g.vehicles.map((v) => ({ name: v.name, seats: v.maxPassengers, price: v.price })),
    })),
    note: m.length ? undefined : `No fixed fare for that route. Offer to take an enquiry; all routes: ${SITE}/taxi`,
  };
}

async function treks(a: any, one = false) {
  const all: any[] = await getPublishedTreks();
  const q = lc(a.query || a.name);
  const rows = q ? all.filter((t) => lc(t.name).includes(q) || t.slug === q) : all;
  const view = (t: any, full: boolean) => ({
    name: t.name, duration: t.duration, difficulty: t.difficulty, price_per_person: t.price_per_person || null,
    about: String(t.short_description || '').slice(0, 200), link: `${SITE}/treks/${t.slug}`,
    ...(full ? { max_altitude: t.max_altitude, best_season: t.best_season, includes: t.includes, excludes: t.excludes } : {}),
  });
  if (one) return rows[0] ? view(rows[0], true) : { error: 'Trek not found. Try list_treks.' };
  return { treks: rows.slice(0, 8).map((t) => view(t, false)) };
}

async function paragliding() {
  const rows = await getParaglidingPackages();
  return { packages: rows.map((p) => ({ name: p.name, where: p.destination, duration: p.duration, price_per_person: p.price_per_person, includes: p.includes, link: `${SITE}/paragliding` })) };
}

const ENQUIRY_WINDOW = 30 * 60e3;

async function createEnquiry(a: any, ctx: ToolCtx) {
  for (const k of ['check_in', 'check_out']) if (a[k] && !DATE.test(a[k])) return { error: `${k} must be YYYY-MM-DD` };
  if (a.check_in && a.check_out && a.check_out <= a.check_in) return { error: 'check_out must be after check_in' };
  const message = [a.item && `Wants: ${a.item}`, a.notes].filter(Boolean).join('\n') || null;
  const row = {
    type: a.type, name: String(a.name || ctx.profileName || 'WhatsApp customer').slice(0, 200), phone: ctx.phone,
    email: a.email ? String(a.email).slice(0, 200) : null, message, check_in: a.check_in || null,
    check_out: a.type === 'hotel' ? a.check_out || null : null, guests: Number(a.guests) > 0 ? Math.round(a.guests) : null,
    pickup_location: a.pickup ? String(a.pickup).slice(0, 200) : null, drop_location: a.drop ? String(a.drop).slice(0, 200) : null,
    status: 'new', source: 'whatsapp', whatsapp_conversation_id: ctx.conversationId,
  };
  // A turn whose reply never arrived may have saved this enquiry already: same chat, type, name and date.
  let dupQ = serviceClient().from('inquiries').select('id').eq('whatsapp_conversation_id', ctx.conversationId)
    .eq('type', row.type).eq('name', row.name);
  dupQ = row.check_in ? dupQ.eq('check_in', row.check_in) : dupQ.is('check_in', null);
  const { data: dup } = await dupQ.gte('created_at', new Date(Date.now() - ENQUIRY_WINDOW).toISOString())
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (dup) {
    markSideEffect(ctx, 'create_enquiry', `Enquiry ${dup.id} (saved earlier)`);
    return { ok: true, enquiry_id: dup.id, duplicate: true };
  }
  const { data, error } = await serviceClient().from('inquiries').insert(row).select('id').single();
  if (error) { console.error('WhatsApp enquiry insert failed:', error); return { error: 'Could not save the enquiry' }; }
  markSideEffect(ctx, 'create_enquiry', `Enquiry ${data.id} saved`);
  await sendEmail({
    to: adminEmail(), subject: `New WhatsApp enquiry: ${row.type} from ${row.name}`,
    html: `<p><strong>${esc(row.name)}</strong> (+${esc(ctx.phone)}) asked on WhatsApp.</p><ul>${
      [['Type', row.type], ['Wants', a.item], ['Dates', [row.check_in, row.check_out].filter(Boolean).join(' to ')], ['Guests', row.guests],
        ['Pickup', row.pickup_location], ['Drop', row.drop_location], ['Notes', a.notes]]
        .filter(([, v]) => v).map(([k, v]) => `<li>${k}: ${esc(v)}</li>`).join('')}</ul><p><a href="${SITE}/admin/whatsapp?c=${ctx.conversationId}">Open the chat</a></p>`,
  }).catch((e) => console.error('Enquiry email failed:', e));
  return { ok: true, enquiry_id: data.id };
}

async function handover(a: any, ctx: ToolCtx) {
  ctx.handedOver = true;
  const reason = String(a.reason || 'Needs a team member').slice(0, 300);
  markSideEffect(ctx, 'handover', `Handed to the team: ${reason}`);
  // Only a chat the AI has is flagged; an owner who took over keeps it (the owner is still emailed).
  await setStatusIf(ctx.conversationId, 'ai', 'needs_human', reason);
  const recent = await history(ctx.conversationId, 6).catch(() => []);
  await sendEmail({
    to: adminEmail(), subject: `WhatsApp chat needs you: ${ctx.profileName || '+' + ctx.phone}`,
    html: `<p>Reason: <strong>${esc(reason)}</strong></p>${recent.map((m: any) => `<p><b>${esc(m.author)}:</b> ${esc(m.body)}</p>`).join('')}<p><a href="${SITE}/admin/whatsapp?c=${ctx.conversationId}">Open the chat</a></p>`,
  }).catch((e) => console.error('Handover email failed:', e));
  return { ok: true };
}

/** Run one tool for the assistant. Always returns JSON text; errors come back as {"error": ...}. */
export async function runTool(name: string, args: any, ctx: ToolCtx): Promise<string> {
  try {
    const a = args && typeof args === 'object' ? args : {};
    const booking = await runBookingTool(name, a, ctx, handover);
    if (booking) return JSON.stringify(booking);
    if (name === 'request_cancellation') return JSON.stringify(await requestCancellation(a, ctx, handover));
    if (name === 'get_offer_code') return JSON.stringify(await getOfferCode(a, ctx));
    const out = name === 'search_hotels' ? await searchHotels(a)
      : name === 'get_hotel' ? await getHotel(a)
      : name === 'list_taxi_routes' ? await taxiRoutes(a)
      : name === 'list_treks' ? await treks(a)
      : name === 'get_trek' ? await treks(a, true)
      : name === 'list_paragliding' ? await paragliding()
      : name === 'create_enquiry' ? await createEnquiry(a, ctx)
      : name === 'handover' ? await handover(a, ctx)
      : { error: 'Unknown tool' };
    return JSON.stringify(out);
  } catch (e: any) {
    console.error(`WhatsApp tool ${name} failed:`, e);
    return JSON.stringify({ error: 'Lookup failed' });
  }
}
