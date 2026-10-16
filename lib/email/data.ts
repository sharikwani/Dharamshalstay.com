/** Loads a live booking or enquiry into the shape the email templates need. Never throws. */
import { serviceClient } from '@/lib/server-auth';
import { loadBookingView } from '@/lib/manual-booking-emails';
import { bookingPageUrlOrNull, loadStayContact } from '@/lib/bookings/stay-details';
import { razorpay, razorpayEnabled } from '@/lib/razorpay';
import { confirmedPaymentText } from '@/lib/email';
import type { BookingData, EnquiryData } from './templates';

export type LoadedBooking = BookingData & {
  status: string; payment_status: string; guest_email: string | null; guest_phone: string | null; property_id: string | null;
};

export async function loadBookingData(bookingId: string): Promise<LoadedBooking | null> {
  try {
    const sb = serviceClient();
    const { data: b } = await sb.from('bookings').select('*').eq('id', bookingId).maybeSingle();
    if (!b) return null;
    const property = b.property_id
      ? (await sb.from('properties').select('name,slug,images,check_in_time').eq('id', b.property_id).maybeSingle()).data
      : null;
    const view = b.category !== 'hotel' ? await loadBookingView(b.id).catch(() => null) : null;
    return {
      id: b.id, booking_ref: b.booking_ref, guest_name: b.guest_name, category: b.category, amount: Number(b.amount || 0),
      paid_amount: b.paid_amount, check_in: b.check_in, check_out: b.check_out, activity_date: b.activity_date, room_name: b.room_name,
      property_name: property?.name || view?.item_name || null, property: property || null,
      payment_text: confirmedPaymentText(b), details_url: bookingPageUrlOrNull(b),
      stay: b.property_id ? await loadStayContact(b.id) : null,
      status: b.status, payment_status: b.payment_status, guest_email: b.guest_email || null, guest_phone: b.guest_phone || null, property_id: b.property_id || null,
      razorpay_link_id: b.razorpay_link_id || null,
    } as LoadedBooking & { razorpay_link_id: string | null };
  } catch (e) {
    console.error('loadBookingData failed:', bookingId, e);
    return null;
  }
}

/** The guest-facing Razorpay link for a booking, while it can still be paid. */
export async function livePaymentLink(linkId?: string | null): Promise<string | null> {
  if (!linkId || !razorpayEnabled()) return null;
  try {
    const l = await razorpay<any>('GET', `/payment_links/${encodeURIComponent(linkId)}`);
    return ['created', 'partially_paid'].includes(l?.status) && l?.short_url ? l.short_url : null;
  } catch { return null; }
}

export type LoadedEnquiry = EnquiryData & { email: string | null; phone: string | null; status: string | null; created_at: string };

export async function loadEnquiryData(inquiryId: string): Promise<LoadedEnquiry | null> {
  try {
    const sb = serviceClient();
    const { data: e } = await sb.from('inquiries').select('*').eq('id', inquiryId).maybeSingle();
    if (!e) return null;
    const property = e.property_id ? (await sb.from('properties').select('name,slug,images').eq('id', e.property_id).maybeSingle()).data : null;
    let item_name: string | null = null;
    if (e.trek_id) item_name = (await sb.from('treks').select('name').eq('id', e.trek_id).maybeSingle()).data?.name || null;
    if (e.paragliding_id) item_name = (await sb.from('paragliding_packages').select('name').eq('id', e.paragliding_id).maybeSingle()).data?.name || null;
    return {
      id: e.id, name: e.name, type: e.type, check_in: e.check_in, check_out: e.check_out, guests: e.guests, message: e.message,
      property, item_name, pickup_location: e.pickup_location, drop_location: e.drop_location, source: e.source,
      email: e.email || null, phone: e.phone || null, status: e.status, created_at: e.created_at,
    };
  } catch (e) {
    console.error('loadEnquiryData failed:', inquiryId, e);
    return null;
  }
}
