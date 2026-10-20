import { describe, expect, it, vi } from 'vitest';

const s = vi.hoisted(() => ({ left: {} as Record<string, any> }));
vi.mock('@/lib/server-auth', () => ({ serviceClient: () => { throw new Error('no db'); } }));
vi.mock('@/lib/listings/ownership', () => ({ adminIds: async () => new Set(['admin1']), isUnclaimed: (p: any, a: Set<string>) => !p.owner_email && (!p.owner_id || a.has(p.owner_id)) }));
vi.mock('@/lib/availability/store', () => ({ availabilityFor: async () => s.left }));

import { bookablePrices, cheapestStay, hotelListXml, isFeedHotel, parseQuery, posXml, priceTransaction, sellableRooms } from '@/lib/google-hotels/feed';

const room = (o: Record<string, unknown> = {}) => ({ name: 'Super Deluxe', base_price: 2498, rate_plans: [{ price: 2500 }, { price: 3000 }], max_adults: 2, max_occupancy: 3, total_inventory: 10, is_active: true, ...o });
const prop = (o: Record<string, unknown> = {}) => ({ status: 'published', listing_type: 'partner', owner_id: 'owner9', owner_email: 'o@x.in', latitude: 32.2, longitude: 76.37, address_line1: 'Rakkar Rd', rooms: [room()], ...o });
const hotel = { id: 'h1', slug: 'panchvati', name: 'Panchvati & Co', address: 'Rakkar Rd', city: 'Dharamshala', state: 'Himachal Pradesh', pincode: '176215', latitude: 32.2, longitude: 76.37, phone: '+917902000035', rooms: [room(), room({ name: 'Family Room', base_price: 4000, rate_plans: [{ price: 3998 }] })] };
const future = (d: number) => new Date(Date.now() + d * 86400e3).toISOString().slice(0, 10);

describe('Google Hotels feed', () => {
  it('prices a room the way our booking page sells it: its rate plans, else its base price', () => {
    expect(bookablePrices(room())).toEqual([2500, 3000]);
    expect(bookablePrices(room({ rate_plans: [] }))).toEqual([2498]);
    expect(bookablePrices(room({ rate_plans: [], base_price: 0 }))).toEqual([]);
  });
  it('offers only active, priced rooms that sleep two', () => {
    expect(sellableRooms([room(), room({ name: 'Off', is_active: false }), room({ name: 'Solo', max_adults: 1, max_occupancy: 1 }), room({ name: 'Free', rate_plans: [], base_price: 0 })]).map((r) => r.name)).toEqual(['Super Deluxe']);
  });
  it('lists only claimed, located, sellable hotels, never directory listings', () => {
    const admins = new Set(['admin1']);
    expect(isFeedHotel(prop(), admins)).toBe(true);
    expect(isFeedHotel(prop({ listing_type: 'directory' }), admins)).toBe(false);
    expect(isFeedHotel(prop({ owner_id: 'admin1', owner_email: null }), admins)).toBe(false);
    expect(isFeedHotel(prop({ latitude: null }), admins)).toBe(false);
    expect(isFeedHotel(prop({ rooms: [room({ is_active: false })] }), admins)).toBe(false);
    expect(isFeedHotel(prop({ status: 'draft' }), admins)).toBe(false);
  });
  it('quotes the cheapest free room for the whole stay and skips sold-out rooms', () => {
    expect(cheapestStay(hotel, 3, {})).toEqual({ room: 'Super Deluxe', total: 7500 });
    expect(cheapestStay(hotel, 3, { 'Super Deluxe': { tracked: true, left: 0 } })).toEqual({ room: 'Family Room', total: 11994 });
    expect(cheapestStay(hotel, 3, { 'Super Deluxe': { tracked: true, left: 0 }, 'Family Room': { tracked: true, left: 0 } })).toBeNull();
    expect(cheapestStay(hotel, 31, {})).toBeNull();
  });
  it('reads a Google query', () => {
    expect(parseQuery('<Query><Checkin>2026-12-10</Checkin><Nights>3</Nights><PropertyList><Property>h1</Property><Property>h2</Property></PropertyList></Query>'))
      .toEqual({ checkIn: '2026-12-10', nights: 3, ids: ['h1', 'h2'] });
    expect(parseQuery('<Query><Nights>3</Nights></Query>')).toBeNull();
    expect(parseQuery('<Query><Checkin>10-12-2026</Checkin><Nights>3</Nights></Query>')).toBeNull();
  });
  it('answers with what the guest pays, only for hotels asked about and free', async () => {
    s.left = {};
    const out = await priceTransaction({ checkIn: future(30), nights: 2, ids: ['h1'] }, [hotel, { ...hotel, id: 'h2' }]);
    expect(out).toMatch(/<Property>h1<\/Property>/);
    expect(out).not.toMatch(/<Property>h2<\/Property>/);
    expect(out).toMatch(/<Baserate currency="INR">5000.00<\/Baserate>/);
    expect(out).toMatch(/<Tax currency="INR">0.00<\/Tax>/);
    s.left = { 'Super Deluxe': { tracked: true, left: 0 }, 'Family Room': { tracked: true, left: 0 } };
    expect(await priceTransaction({ checkIn: future(30), nights: 2, ids: [] }, [hotel])).not.toMatch(/<Result>/);
    s.left = {};
    expect(await priceTransaction({ checkIn: '2020-01-01', nights: 2, ids: [] }, [hotel])).not.toMatch(/<Result>/);
  });
  it('writes valid, escaped hotel list and point-of-sale files', () => {
    const list = hotelListXml([hotel]);
    expect(list).toMatch(/<name>Panchvati &amp; Co<\/name>/);
    expect(list).toMatch(/<component name="postal_code">176215<\/component>/);
    expect(list).toMatch(/<country>IN<\/country>/);
    const pos = posXml('https://x.in');
    expect(pos).toMatch(/land\?id=\(PARTNER-HOTEL-ID\)&amp;check_in=\(CHECKINYEAR\)-\(CHECKINMONTH\)-\(CHECKINDAY\)/);
    expect(pos).toMatch(/<Match status="yes" country="IN"\/>/);
  });
});
