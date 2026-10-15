/**
 * The guest's private booking page (/booking/<ref>?k=<key>): itinerary, hotel
 * address and map, and -- once the booking is confirmed or paid -- the hotel's
 * phone number. Public pages never carry the phone (lib/db.ts).
 *
 * Booking refs are short and guessable, so the page needs a key: an HMAC of the
 * booking id. The key is only ever handed to the guest (booking screen, email,
 * WhatsApp, their account page).
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { serviceClient } from '@/lib/server-auth';
import { siteConfig } from '@/lib/config';
import { formatAddress, propertyMapUrl } from '@/lib/location';

function secret(): string {
  const s = process.env.BOOKING_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error('No secret for booking links');
  return s;
}

export function bookingKey(bookingId: string): string {
  return createHmac('sha256', secret()).update('booking-page:' + bookingId).digest('base64url').slice(0, 24);
}

export function verifyBookingKey(bookingId: string, key: string | null | undefined): boolean {
  if (!key) return false;
  const want = Buffer.from(bookingKey(bookingId));
  const got = Buffer.from(key);
  return want.length === got.length && timingSafeEqual(want, got);
}

/** Path (and absolute URL) of the guest's booking page. */
type BookingRef = { id?: string | null; booking_ref?: string | null } | Record<string, any>;

export function bookingPagePath(b: BookingRef): string {
  if (!b.id || !b.booking_ref) throw new Error('Booking has no id or ref');
  return '/booking/' + encodeURIComponent(b.booking_ref) + '?k=' + bookingKey(b.id);
}
export function bookingPageUrl(b: BookingRef): string {
  return siteConfig.url + bookingPagePath(b);
}
/** For messages: a missing link must never stop the message going out. */
export function bookingPageUrlOrNull(b: BookingRef): string | null {
  try { return bookingPageUrl(b); } catch { return null; }
}

/** The hotel's phone is shared once the booking is confirmed (or paid), and never after it is cancelled. */
export function hotelPhoneVisible(b: { status?: string | null; payment_status?: string | null } | Record<string, any>): boolean {
  if (['cancelled', 'failed', 'no_show'].includes(b.status || '')) return false;
  return b.status === 'confirmed' || b.status === 'completed' || b.payment_status === 'paid' || b.payment_status === 'partially_paid';
}

const PROPERTY_COLUMNS = 'name, slug, address_line1, address_line2, landmark, city, state, pincode, latitude, longitude, check_in_time, check_out_time, contact_phone, contact_whatsapp';

export type StayContact = {
  name: string;
  slug: string | null;
  address: string;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  mapUrl: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  /** Null until hotelPhoneVisible(booking). */
  phone: string | null;
  whatsapp: string | null;
};

export function toStayContact(p: any, booking: { status?: string | null; payment_status?: string | null }): StayContact {
  const show = hotelPhoneVisible(booking);
  return {
    name: p.name,
    slug: p.slug ?? null,
    address: formatAddress(p),
    landmark: p.landmark || null,
    latitude: p.latitude != null ? Number(p.latitude) : null,
    longitude: p.longitude != null ? Number(p.longitude) : null,
    mapUrl: propertyMapUrl(p),
    checkInTime: p.check_in_time || null,
    checkOutTime: p.check_out_time || null,
    phone: show ? p.contact_phone || null : null,
    whatsapp: show ? p.contact_whatsapp || p.contact_phone || null : null,
  };
}

/** The hotel's contact for one booking, for emails and WhatsApp. Null for non-hotel bookings. */
export async function loadStayContact(bookingId: string): Promise<StayContact | null> {
  try {
    const { data, error } = await serviceClient().from('bookings')
      .select('status, payment_status, properties(' + PROPERTY_COLUMNS + ')')
      .eq('id', bookingId).maybeSingle();
    if (error) throw error;
    const p = (data as any)?.properties;
    return p ? toStayContact(p, data as any) : null;
  } catch (e) {
    // Extra detail for a message; never worth failing the message over.
    console.error('Could not load hotel contact for booking', bookingId, e);
    return null;
  }
}

/** Everything the booking page shows, or null when the ref/key pair is wrong. */
export async function loadBookingPage(ref: string, key: string | null | undefined) {
  if (!/^[A-Z]{3}-\d{6}-[A-Z0-9]{5}$/.test(ref) || !key) return null;
  const sb = serviceClient();
  const { data: b } = await sb.from('bookings')
    .select('id, booking_ref, category, status, payment_status, payment_method, guest_name, num_guests, check_in, check_out, room_name, amount, special_requests, properties(' + PROPERTY_COLUMNS + ')')
    .eq('booking_ref', ref).maybeSingle();
  if (!b || !verifyBookingKey((b as any).id, key)) return null;
  const booking = b as any;
  return { booking, stay: booking.properties ? toStayContact(booking.properties, booking) : null };
}
