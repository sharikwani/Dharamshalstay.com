/**
 * Google Hotels (Hotel Center) feeds: the hotel list, the point-of-sale file and live prices.
 *
 * Only hotels we can actually sell go in: published, run by their real owner (claimed partner listings, not
 * directory listings), with an address, map position and at least one active room with a price. Prices are
 * computed exactly as our booking page and checkout compute them (a room's rate plans, or its base price when it
 * has none; see HotelBooking and quoteBooking), and a room is only offered when it has a room free on every night.
 * Google drops partners whose prices do not match the landing page, so never add discounts or estimates here.
 */
import { serviceClient } from '@/lib/server-auth';
import { siteConfig } from '@/lib/config';
import { adminIds, isUnclaimed } from '@/lib/listings/ownership';
import { availabilityFor } from '@/lib/availability/store';
import { addDays } from '@/lib/availability/calc';

export const PARTNER_KEY = 'dharamshalastay';
/** Google asks for at most this many nights per itinerary; longer stays are not priced. */
export const MAX_NIGHTS = 30;
/** How far ahead we price (Google may ask up to a year out). */
export const MAX_ADVANCE_DAYS = 365;

export type FeedHotel = {
  id: string; slug: string; name: string; address: string; city: string; state: string; pincode: string | null;
  latitude: number; longitude: number; phone: string | null; rooms: any[];
};

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]!));

/** The prices a guest can book for a room on our site: its rate plans, or its base price when it has none. */
export function bookablePrices(room: any): number[] {
  const plans = Array.isArray(room?.rate_plans) && room.rate_plans.length > 0 ? room.rate_plans : null;
  const prices = plans ? plans.map((p: any) => Number(p?.price)) : [Number(room?.base_price)];
  return prices.filter((n: number) => Number.isFinite(n) && n > 0);
}

/** Rooms we can offer to the default Google party of 2 adults. */
export function sellableRooms(rooms: unknown): any[] {
  return (Array.isArray(rooms) ? rooms : []).filter((r: any) =>
    r && typeof r.name === 'string' && r.name.trim() && r.is_active !== false
    && Math.max(Number(r.max_adults) || 0, Number(r.max_occupancy) || 0) >= 2 && bookablePrices(r).length > 0);
}

export function isFeedHotel(p: any, admins: Set<string>): boolean {
  return p?.status === 'published' && p.listing_type !== 'directory' && !isUnclaimed(p, admins)
    && Number.isFinite(Number(p.latitude)) && Number(p.latitude) !== 0 && Number.isFinite(Number(p.longitude)) && Number(p.longitude) !== 0
    && !!String(p.address_line1 || '').trim() && sellableRooms(p.rooms).length > 0;
}

export async function feedHotels(): Promise<FeedHotel[]> {
  const sb = serviceClient();
  const { data, error } = await sb.from('properties')
    .select('id, slug, name, status, listing_type, owner_id, owner_email, address_line1, address_line2, city, state, pincode, latitude, longitude, contact_phone, rooms')
    .eq('status', 'published').order('name');
  if (error) throw new Error(error.message);
  const admins = await adminIds();
  return ((data || []) as any[]).filter((p) => isFeedHotel(p, admins)).map((p) => ({
    id: p.id, slug: p.slug, name: p.name, city: p.city || 'Dharamshala', state: p.state || 'Himachal Pradesh', pincode: p.pincode || null,
    address: [p.address_line1, p.address_line2].filter((x: string) => x && x.trim()).join(', '),
    latitude: Number(p.latitude), longitude: Number(p.longitude), phone: p.contact_phone || null, rooms: p.rooms || [],
  }));
}

/** Hotel list feed (Google "listings" format). Partner hotel ID = our property id. */
export function hotelListXml(hotels: FeedHotel[]): string {
  const items = hotels.map((h) => `  <listing>
    <id>${esc(h.id)}</id>
    <name>${esc(h.name)}</name>
    <address format="simple">
      <component name="addr1">${esc(h.address)}</component>
      <component name="city">${esc(h.city)}</component>
      <component name="province">${esc(h.state)}</component>${h.pincode ? `\n      <component name="postal_code">${esc(h.pincode)}</component>` : ''}
    </address>
    <country>IN</country>
    <latitude>${h.latitude}</latitude>
    <longitude>${h.longitude}</longitude>${h.phone ? `\n    <phone type="main">${esc(h.phone)}</phone>` : ''}
    <category>hotel</category>
  </listing>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<listings xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.gstatic.com/localfeed/local_feed.xsd">
  <language>en</language>
${items}
</listings>
`;
}

/** Point of sale: where Google sends a guest who picks our price (our landing redirect fills in the hotel page). */
export function posXml(site = siteConfig.url): string {
  const url = `${site}/api/google-hotels/land?id=(PARTNER-HOTEL-ID)&amp;check_in=(CHECKINYEAR)-(CHECKINMONTH)-(CHECKINDAY)&amp;check_out=(CHECKOUTYEAR)-(CHECKOUTMONTH)-(CHECKOUTDAY)`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<PointsOfSale>
  <PointOfSale id="${PARTNER_KEY}">
    <DisplayNames display_text="Dharamshala Stay" display_language="en"/>
    <Match status="yes" country="IN"/>
    <URL>${url}</URL>
  </PointOfSale>
</PointsOfSale>
`;
}

export type PriceQuery = { checkIn: string; nights: number; ids: string[] };

const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}>\\s*([^<]*?)\\s*</${name}>`))?.[1] ?? null;

/** A Google live-pricing <Query> (one check-in and length of stay, a list of hotels). Null when unusable. */
export function parseQuery(xml: string): PriceQuery | null {
  const checkIn = tag(xml, 'Checkin');
  const nights = Number(tag(xml, 'Nights'));
  if (!checkIn || !/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !Number.isInteger(nights) || nights < 1) return null;
  const ids = Array.from(xml.matchAll(/<Property>\s*([^<]+?)\s*<\/Property>/g)).map((m) => m[1]).slice(0, 200);
  return { checkIn, nights, ids };
}

export type RoomPrice = { room: string; total: number };

/** Cheapest bookable total for the stay, or null when nothing is free (or the stay is outside what we price). */
export function cheapestStay(hotel: Pick<FeedHotel, 'rooms'>, nights: number, left: Record<string, { tracked: boolean; left: number | null }>): RoomPrice | null {
  if (!(nights >= 1 && nights <= MAX_NIGHTS)) return null;
  let best: RoomPrice | null = null;
  for (const r of sellableRooms(hotel.rooms)) {
    const a = left[r.name];
    if (a && a.tracked && !(Number(a.left) > 0)) continue;
    const total = Math.round(Math.min(...bookablePrices(r)) * nights);
    if (!best || total < best.total) best = { room: r.name, total };
  }
  return best;
}

export function inWindow(checkIn: string, today = new Date().toISOString().slice(0, 10)): boolean {
  return checkIn >= today && checkIn <= addDays(today, MAX_ADVANCE_DAYS);
}

/**
 * Answer a live-pricing query: one <Result> per hotel we can sell for that stay. Prices are what the guest pays:
 * partner rates are tax-inclusive (owner, 20 Oct 2026) and checkout adds nothing, so Tax and OtherFees are 0.
 */
export async function priceTransaction(q: PriceQuery, hotels?: FeedHotel[]): Promise<string> {
  const all = hotels ?? (await feedHotels());
  const wanted = all.filter((h) => q.ids.length === 0 || q.ids.includes(h.id));
  const checkOut = addDays(q.checkIn, q.nights);
  const results: string[] = [];
  if (inWindow(q.checkIn) && q.nights <= MAX_NIGHTS) {
    for (const h of wanted) {
      const left = await availabilityFor(h.id, q.checkIn, checkOut, { publishedOnly: true }).catch(() => null);
      if (!left) continue;
      const best = cheapestStay(h, q.nights, left);
      if (!best) continue;
      results.push(`  <Result>
    <Property>${esc(h.id)}</Property>
    <Checkin>${q.checkIn}</Checkin>
    <Nights>${q.nights}</Nights>
    <Baserate currency="INR">${best.total.toFixed(2)}</Baserate>
    <Tax currency="INR">0.00</Tax>
    <OtherFees currency="INR">0.00</OtherFees>
  </Result>`);
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<Transaction timestamp="${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}" id="${Date.now().toString(36)}">
${results.join('\n')}
</Transaction>
`;
}
