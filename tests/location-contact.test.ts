import { describe, it, expect } from 'vitest';
import { formatAddress, hasCoordinates, mapLinks, propertyMapUrl } from '@/lib/location';
import { bookingKey, bookingPagePath, hotelPhoneVisible, toStayContact, verifyBookingKey } from '@/lib/bookings/stay-details';
import { listingKey, listingLinkSuffix, verifyListingKey } from '@/lib/listings/links';
import { hotelContactLine, customerParams } from '@/lib/booking-whatsapp';
import { hotelSchemaFull } from '@/lib/seo';

describe('formatAddress', () => {
  it('joins address parts, drops repeats and adds state + pincode', () => {
    expect(formatAddress({ address_line1: 'Jogiwara Road, McLeod Ganj', city: 'McLeod Ganj', pincode: '176219' }))
      .toBe('Jogiwara Road, McLeod Ganj, Himachal Pradesh 176219');
    expect(formatAddress({ address_line1: 'Temple Road', city: 'McLeod Ganj' })).toBe('Temple Road, McLeod Ganj, Himachal Pradesh');
  });
});

describe('map links', () => {
  it('needs real coordinates', () => {
    expect(hasCoordinates({ latitude: 32.2387, longitude: 76.3242 })).toBe(true);
    expect(hasCoordinates({ latitude: '32.2387', longitude: '76.3242' })).toBe(true);
    expect(hasCoordinates({ latitude: null, longitude: 76.3 })).toBe(false);
    expect(hasCoordinates({ latitude: 0, longitude: 0 })).toBe(false);
  });
  it('builds pin, directions and embed URLs', () => {
    const m = mapLinks(32.238668, 76.324162);
    expect(m.view).toContain('query=32.238668,76.324162');
    expect(m.directions).toContain('destination=32.238668,76.324162');
    expect(m.embed).toContain('marker=32.238668%2C76.324162');
  });
  it('falls back to a name + address search without a pin', () => {
    expect(propertyMapUrl({ name: 'Hotel Tibet', address_line1: 'Bhagsu Road', city: 'McLeod Ganj' }))
      .toContain(encodeURIComponent('Hotel Tibet, Bhagsu Road'));
  });
});

describe('hotel phone after booking', () => {
  it('is shown once confirmed or paid, never when cancelled', () => {
    expect(hotelPhoneVisible({ status: 'pending', payment_status: 'pending' })).toBe(false);
    expect(hotelPhoneVisible({ status: 'confirmed', payment_status: 'pending' })).toBe(true);
    expect(hotelPhoneVisible({ status: 'pending', payment_status: 'paid' })).toBe(true);
    expect(hotelPhoneVisible({ status: 'completed' })).toBe(true);
    expect(hotelPhoneVisible({ status: 'cancelled', payment_status: 'paid' })).toBe(false);
    expect(hotelPhoneVisible({ status: 'failed', payment_status: 'paid' })).toBe(false);
  });
  it('toStayContact hides the phone until then', () => {
    const p = { name: 'H', slug: 'h', address_line1: 'Road', city: 'McLeod Ganj', contact_phone: '+919816000001' };
    expect(toStayContact(p, { status: 'pending' }).phone).toBeNull();
    expect(toStayContact(p, { status: 'confirmed' }).phone).toBe('+919816000001');
  });
  it('the guest WhatsApp gives the hotel phone and itinerary link for confirmed hotel bookings', () => {
    const v: any = { id: 'b-1', booking_ref: 'HTL-261015-ABCDE', category: 'hotel', status: 'confirmed', item_name: 'H', num_guests: 2, amount: 100, payment_text: 'x', assignee_text: null, partner_contact: { name: 'H', email: null, phone: '+919816000001' } };
    const line = hotelContactLine(v)!;
    expect(line).toContain('Hotel reception +919816000001.');
    expect(line).toContain('/booking/HTL-261015-ABCDE?k=');
    expect(customerParams(v)[5]).toBe(line);
    expect(hotelContactLine({ ...v, status: 'pending' })).not.toContain('+919816000001');
    expect(hotelContactLine({ ...v, category: 'taxi' })).toBeNull();
  });
});

describe('private links', () => {
  it('booking keys verify only for their own booking', () => {
    const k = bookingKey('b-1');
    expect(verifyBookingKey('b-1', k)).toBe(true);
    expect(verifyBookingKey('b-2', k)).toBe(false);
    expect(verifyBookingKey('b-1', k.slice(0, -1) + (k.endsWith('A') ? 'B' : 'A'))).toBe(false);
    expect(verifyBookingKey('b-1', null)).toBe(false);
    expect(bookingPagePath({ id: 'b-1', booking_ref: 'HTL-261015-ABCDE' })).toBe('/booking/HTL-261015-ABCDE?k=' + k);
  });
  it('listing keys verify only for their own property', () => {
    const p = { id: 'p-1', slug: 'hotel-tibet' };
    expect(verifyListingKey('p-1', listingKey('p-1'))).toBe(true);
    expect(verifyListingKey('p-2', listingKey('p-1'))).toBe(false);
    expect(listingLinkSuffix(p)).toBe('hotel-tibet?t=' + listingKey('p-1'));
  });
});

describe('public hotel schema', () => {
  it('never publishes the phone or email, but does publish the map pin', () => {
    const ld: any = hotelSchemaFull({ name: 'H', slug: 'h', latitude: 32.2, longitude: 76.3, contact_phone: '+919816000001', contact_email: 'a@b.c' } as any);
    expect(JSON.stringify(ld)).not.toContain('9816000001');
    expect(JSON.stringify(ld)).not.toContain('a@b.c');
    expect(ld.geo).toEqual({ '@type': 'GeoCoordinates', latitude: 32.2, longitude: 76.3 });
    expect(ld.hasMap).toContain('32.200000,76.300000');
  });
});

describe('public property rows', async () => {
  const { toPublicProperty } = await import('@/lib/public-property');
  it('strip the phone, email and admin fields but keep the location', () => {
    const p: any = toPublicProperty({ id: '1', name: 'H', address_line1: 'Road', latitude: 32.2, longitude: 76.3, contact_phone: '+919816000001', contact_whatsapp: 'x', contact_email: 'a@b.c', contact_name: 'n', owner_email: 'o@b.c', admin_notes: 'secret', compliance: {}, whatsapp_alerts: true } as any);
    for (const k of ['contact_phone', 'contact_whatsapp', 'contact_email', 'contact_name', 'owner_email', 'admin_notes', 'compliance', 'whatsapp_alerts']) expect(p).not.toHaveProperty(k);
    expect(p).toMatchObject({ address_line1: 'Road', latitude: 32.2, longitude: 76.3 });
  });
});

describe('isUnclaimed', async () => {
  const { isUnclaimed } = await import('@/lib/listings/ownership');
  const admins = new Set(['admin-1']);
  it('covers listings we own (directory or partner) until the owner claims them', () => {
    expect(isUnclaimed({ owner_id: 'admin-1', owner_email: null }, admins)).toBe(true);
    expect(isUnclaimed({ owner_id: null, owner_email: null }, admins)).toBe(true);
    expect(isUnclaimed({ owner_id: 'admin-1', owner_email: 'owner@hotel.in' }, admins)).toBe(false);
    expect(isUnclaimed({ owner_id: 'partner-9', owner_email: null }, admins)).toBe(false);
  });
});

describe('enquiry alert to the hotel', async () => {
  const { enquiryAlertParams } = await import('@/lib/listings/enquiry-alert');
  it('gives dates, guests and the request, never the guest contact', () => {
    expect(enquiryAlertParams('Panchvati Cottages', { check_in: '2026-12-10', check_out: '2026-12-13', guests: 4, message: '[Directory hotel: Panchvati Cottages, Kharota] 2 rooms please' }))
      .toEqual(['Panchvati Cottages', '10 Dec 2026 to 13 Dec 2026', '4', '2 rooms please']);
    expect(enquiryAlertParams('H', {})).toEqual(['H', 'Not given yet', 'Not given yet', 'Room availability and rates']);
  });
});
