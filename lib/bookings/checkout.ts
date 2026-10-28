import { getStripe } from '@/lib/stripe';
import { onlinePaymentEnabled, razorpay, razorpayEnabled } from '@/lib/razorpay';
import { bookingKey } from './stay-details';
import { serviceClient } from '@/lib/server-auth';
import { holdsRoom, matchesRoom } from '@/lib/availability/calc';
import { availabilityFor } from '@/lib/availability/store';
import { onlineCharge } from '@/data/parties';

const RETURN_PATH: Record<string, string> = { hotel: '/hotels', taxi: '/taxi', trek: '/treks', paragliding: '/paragliding', event: '/new-year-parties' };

const DEAD = ['failed', 'cancelled', 'no_show'];
/**
 * Stripe's minimum session life (30 min) plus a minute so request latency never trips the minimum (Razorpay's minimum
 * link life is 15 min; links get the same life). ONLINE_HOLD_MS (lib/availability/calc) is longer, so a link opened
 * with the booking ends inside its hold.
 */
const SESSION_MS = 31 * 60e3;
export const NO_LONGER_PAYABLE = 'This booking can no longer be paid';
export const SOLD_OUT = 'Sold out for these dates';

/** A hotel booking whose online hold has lapsed may only be paid if its room type still has a room left for the stay. */
async function soldOutSinceHoldLapsed(b: any, now: Date): Promise<boolean> {
  if (b.category !== 'hotel' || !b.property_id || !b.check_in || !b.check_out) return false;
  if (holdsRoom(b, now)) return false;
  const avail = await availabilityFor(b.property_id, b.check_in, b.check_out, { now });
  const key = b.room_key && avail[b.room_key] ? b.room_key : Object.keys(avail).find((k) => matchesRoom(b, k));
  const room = key ? avail[key] : undefined;
  return !!room?.tracked && room.left < 1;
}

export type CheckoutResult = { ok: true; url: string; sessionId: string } | { ok: false; error: string; status: number };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A Razorpay Payment Link for the booking; any older link of the booking is cancelled first. */
async function razorpayLink(b: any, title: string, description: string, now: Date): Promise<CheckoutResult> {
  // Only one open link per booking: a customer holding an older link can no longer pay a second time.
  // It may already be paid, expired or cancelled; that is fine (a paid one is caught by the webhook).
  if (b.razorpay_link_id) {
    try { await razorpay('POST', `/payment_links/${b.razorpay_link_id}/cancel`); } catch { /* not open any more */ }
  }
  const phone = String(b.guest_phone || '').replace(/[\s-]/g, '');
  const customer: Record<string, string> = {};
  if (b.guest_name) customer.name = String(b.guest_name).slice(0, 100);
  if (b.guest_email && EMAIL.test(b.guest_email)) customer.email = b.guest_email;
  if (/^\+?\d{10,15}$/.test(phone)) customer.contact = phone;
  const link = await razorpay<{ id: string; short_url: string }>('POST', '/payment_links', {
    amount: Math.round(onlineCharge(b) * 100),
    currency: 'INR',
    accept_partial: false,
    expire_by: Math.floor((now.getTime() + SESSION_MS) / 1000),
    // Unique per link (Razorpay refuses a repeat), and at most 40 characters.
    reference_id: `${b.booking_ref || b.id.slice(0, 8)}-${now.getTime().toString(36)}`.slice(0, 40),
    description: [title, description].filter(Boolean).join(' · ').slice(0, 2048),
    ...(Object.keys(customer).length ? { customer } : {}),
    // Our own email and WhatsApp messages carry the link; Razorpay sends nothing.
    notify: { sms: false, email: false },
    reminder_enable: false,
    notes: { booking_id: b.id, booking_ref: b.booking_ref || '' },
    callback_url: process.env.NEXT_PUBLIC_SITE_URL + '/booking/success?ref=' + encodeURIComponent(b.booking_ref || '') + '&k=' + bookingKey(b.id),
    callback_method: 'get',
  });
  await serviceClient().from('bookings').update({ razorpay_link_id: link.id }).eq('id', b.id);
  return { ok: true, url: link.short_url, sessionId: link.id };
}

/** A payment link for the full booking amount: Razorpay when it is set up, otherwise Stripe Checkout. */
export async function createCheckoutLink(bookingId: string): Promise<CheckoutResult> {
  if (!onlinePaymentEnabled()) return { ok: false, error: 'Online payment is not available yet', status: 503 };
  const sb = serviceClient();
  const { data: b } = await sb.from('bookings').select('*').eq('id', bookingId).single();
  if (!b) return { ok: false, error: 'Booking not found', status: 404 };
  if (b.payment_status === 'paid') return { ok: false, error: 'This booking is already paid', status: 409 };
  if (DEAD.includes(b.status)) return { ok: false, error: NO_LONGER_PAYABLE, status: 409 };
  if (!b.amount || b.amount < 100) return { ok: false, error: 'This booking has no online price', status: 400 };
  const now = new Date();
  if (await soldOutSinceHoldLapsed(b, now)) return { ok: false, error: SOLD_OUT, status: 409 };

  let title = 'Dharamshala Stay booking';
  if (b.property_id) {
    const { data: p } = await sb.from('properties').select('name').eq('id', b.property_id).single();
    if (p?.name) title = p.name;
  }
  const dates = b.check_in ? `${b.check_in} to ${b.check_out || ''}` : b.activity_date || '';
  const description = [b.room_name, dates, b.booking_ref].filter(Boolean).join(' · ');

  if (razorpayEnabled()) return razorpayLink(b, title, description, now);

  const stripe = getStripe();
  // Only one open link per booking: a customer holding an older link can no longer pay a second time.
  // It may already be complete or expired; that is fine (a paid one is caught by the webhook).
  if (b.stripe_session_id) {
    try { await stripe.checkout.sessions.expire(b.stripe_session_id); } catch { /* not open any more */ }
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    expires_at: Math.floor((now.getTime() + SESSION_MS) / 1000),
    currency: 'inr',
    line_items: [{ quantity: 1, price_data: { currency: 'inr', unit_amount: Math.round(onlineCharge(b) * 100), product_data: { name: title, description: description.slice(0, 500) || undefined } } }],
    customer_email: b.guest_email || undefined,
    metadata: { booking_id: b.id, booking_ref: b.booking_ref || '' },
    success_url: process.env.NEXT_PUBLIC_SITE_URL + '/booking/success?session_id={CHECKOUT_SESSION_ID}&ref=' + encodeURIComponent(b.booking_ref || '') + '&k=' + bookingKey(b.id),
    cancel_url: process.env.NEXT_PUBLIC_SITE_URL + (RETURN_PATH[b.category] || '/') + '?payment=cancelled',
  });
  await sb.from('bookings').update({ stripe_session_id: session.id }).eq('id', b.id);
  return { ok: true, url: session.url!, sessionId: session.id };
}
