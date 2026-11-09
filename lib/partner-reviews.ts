/**
 * Customer star ratings for travel partners (taxi, trek, paragliding). A review can only be written through a
 * signed link for one completed booking (/rate/<token>), so every rating comes from a real customer and each
 * booking rates once. Reviews publish at once; the owner can hide one (status = 'hidden').
 * Table: partner_reviews (migration v55). Server only.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { HttpError, serviceClient } from '@/lib/server-auth';
import { siteConfig } from '@/lib/config';

export type PartnerReview = { id: string; name: string; rating: number; body: string | null; item: string | null; vehicle: string | null; category: string; created_at: string };
export type PartnerRating = { average: number; count: number; reviews: PartnerReview[] };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CATEGORIES = ['taxi', 'trek', 'paragliding'];

function secret(): string {
  const s = process.env.BOOKING_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error('No secret for review links');
  return s;
}
const sign = (bookingId: string) => createHmac('sha256', secret()).update('partner-review:' + bookingId).digest('base64url').slice(0, 22);

/** The private "rate your trip" token for one booking. */
export function reviewToken(bookingId: string): string {
  return bookingId.replace(/-/g, '') + '.' + sign(bookingId);
}
export function partnerReviewUrl(bookingId: string): string {
  return siteConfig.url.replace(/\/$/, '') + '/rate/' + reviewToken(bookingId);
}

/** The booking id a token stands for, or null when it is malformed or not ours. */
export function bookingIdFromToken(token: string): string | null {
  const m = /^([0-9a-f]{32})\.([A-Za-z0-9_-]{22})$/i.exec(String(token || ''));
  if (!m) return null;
  const h = m[1].toLowerCase();
  const id = `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  if (!UUID.test(id)) return null;
  const want = Buffer.from(sign(id));
  const got = Buffer.from(m[2]);
  return want.length === got.length && timingSafeEqual(want, got) ? id : null;
}

export type RateContext = {
  bookingId: string; partnerId: string; partnerName: string; category: string; item: string; vehicle: string | null;
  date: string | null; firstName: string; alreadyRated: boolean;
};

const ITEM_TABLE: Record<string, [string, string, string]> = {
  taxi: ['taxi_routes', 'taxi_route_id', 'from_location, to_location'],
  trek: ['treks', 'trek_id', 'name'],
  paragliding: ['paragliding_packages', 'paragliding_id', 'name'],
};

/** What the rating page needs, or null when the link is wrong or the booking cannot be rated (not done, no partner). */
export async function rateContext(token: string): Promise<RateContext | null> {
  const id = bookingIdFromToken(token);
  if (!id) return null;
  const sb = serviceClient();
  const { data: b } = await sb.from('bookings').select('id, category, status, partner_id, vehicle_id, vehicle_type, guest_name, activity_date, pickup_location, drop_location, taxi_route_id, trek_id, paragliding_id').eq('id', id).maybeSingle();
  if (!b || !b.partner_id || !CATEGORIES.includes(b.category) || b.status !== 'completed') return null;
  const [{ data: p }, { data: v }, { data: done }] = await Promise.all([
    sb.from('profiles').select('business_name, full_name').eq('id', b.partner_id).maybeSingle(),
    b.vehicle_id ? sb.from('vehicles').select('make_model').eq('id', b.vehicle_id).maybeSingle() : Promise.resolve({ data: null } as any),
    sb.from('partner_reviews').select('id').eq('booking_id', id).maybeSingle(),
  ]);
  let item = '';
  const [table, col, cols] = ITEM_TABLE[b.category];
  if ((b as any)[col]) {
    const { data: it } = await sb.from(table).select(cols).eq('id', (b as any)[col]).maybeSingle();
    const x = it as any;
    item = x ? (x.from_location && x.to_location ? `${x.from_location} → ${x.to_location}` : x.name || '') : '';
  }
  if (!item && b.pickup_location && b.drop_location) item = `${b.pickup_location} → ${b.drop_location}`;
  return {
    bookingId: id, partnerId: b.partner_id,
    partnerName: String(p?.business_name || p?.full_name || 'your partner').trim(),
    category: b.category, item: item || (b.category === 'taxi' ? 'Taxi' : b.category === 'trek' ? 'Trek' : 'Paragliding'),
    vehicle: (v as any)?.make_model || b.vehicle_type || null, date: b.activity_date || null,
    firstName: String(b.guest_name || '').trim().split(/\s+/)[0] || '', alreadyRated: !!done,
  };
}

/** Save one rating for the booking behind the token. */
export async function submitPartnerReview(input: { token: string; rating: number; name: string; body?: string | null }): Promise<{ partnerId: string }> {
  const ctx = await rateContext(input.token);
  if (!ctx) throw new HttpError(404, 'This rating link is not valid.');
  if (ctx.alreadyRated) throw new HttpError(409, 'Thank you, this trip has already been rated.');
  const rating = Math.round(Number(input.rating));
  if (!(rating >= 1 && rating <= 5)) throw new HttpError(400, 'Please choose 1 to 5 stars.');
  const name = String(input.name || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  if (!name) throw new HttpError(400, 'Please add your name.');
  const body = String(input.body || '').trim().slice(0, 1500) || null;
  const { error } = await serviceClient().from('partner_reviews').insert({
    partner_id: ctx.partnerId, booking_id: ctx.bookingId, category: ctx.category, item: ctx.item, vehicle: ctx.vehicle,
    name, rating, body,
  });
  if (error?.code === '23505') throw new HttpError(409, 'Thank you, this trip has already been rated.');
  if (error) { console.error('Partner review insert failed:', error); throw new HttpError(500, 'Could not save your rating. Please try again.'); }
  return { partnerId: ctx.partnerId };
}

/** Published ratings for one partner. Never throws: a review problem must not break the profile page. */
export async function loadPartnerRating(partnerId: string | undefined): Promise<PartnerRating> {
  const empty = { average: 0, count: 0, reviews: [] };
  if (!partnerId || !process.env.SUPABASE_SERVICE_ROLE_KEY) return empty;
  try {
    const { data, error } = await serviceClient().from('partner_reviews')
      .select('id, name, rating, body, item, vehicle, category, created_at')
      .eq('partner_id', partnerId).eq('status', 'approved').order('created_at', { ascending: false }).limit(200);
    if (error) { console.error('Partner reviews load failed:', error.message); return empty; }
    const reviews = (data || []) as PartnerReview[];
    const count = reviews.length;
    const average = count ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
    return { average, count, reviews };
  } catch (e) { console.error('Partner reviews load failed:', e); return empty; }
}
