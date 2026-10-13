import { serviceClient } from '@/lib/server-auth';
import { sendBookingEmails } from '@/lib/booking-emails';

/** The pay-later method for a category: hotels are paid at the property, everything else offline. */
export const laterMethod = (category: string) => (category === 'hotel' ? 'pay_at_hotel' : 'offline');

/**
 * An online booking whose payment link could not be created becomes pay later, so the usual booking emails go out.
 * createBooking marks online bookings commission 'not_applicable'; pay-later ones with commission owe it.
 * The switch is conditional (still online and unpaid), so of two concurrent callers only the one that changed the
 * row sends the emails. Returns the pay-later method when the booking is now pay later, or null when it was left
 * alone (paid or changed meanwhile, or the update failed).
 */
export async function fallbackToPayLater(bookingId: string, category: string): Promise<string | null> {
  const later = laterMethod(category);
  const sb = serviceClient();
  const { data: row } = await sb.from('bookings').select('commission_amount').eq('id', bookingId).single();
  const patch: Record<string, unknown> = { payment_method: later };
  if (Number((row as any)?.commission_amount) > 0) patch.commission_status = 'pending';
  const { data: changed, error } = await sb.from('bookings').update(patch).eq('id', bookingId).eq('payment_method', 'online')
    .or('payment_status.is.null,payment_status.not.in.(paid,partially_paid)').select('id');
  if (error) { console.error('Pay-later fallback failed', bookingId, error); return null; }
  if (changed?.length) {
    await sendBookingEmails(bookingId);
    return later;
  }
  // Nothing changed: another caller switched it already (it sent the emails), or it was paid meanwhile.
  const { data: now } = await sb.from('bookings').select('payment_method').eq('id', bookingId).maybeSingle();
  return (now as any)?.payment_method === later ? later : null;
}

/** How long after booking the website form may still switch a booking to pay later. */
const FRESH_MS = 15 * 60e3;

/**
 * The website form's fallback: only a fresh, unpaid, still-open online website booking without a WhatsApp offer
 * (offers are never pay later) is switched. Returns the new payment method, or null when nothing was switched.
 */
export async function websitePayLaterFallback(bookingId: string, now = Date.now()): Promise<string | null> {
  const { data: b } = await serviceClient().from('bookings')
    .select('id, category, status, payment_method, payment_status, booking_source, offer_code, created_at').eq('id', bookingId).single();
  if (!b) return null;
  const fresh = now - new Date(b.created_at).getTime() < FRESH_MS;
  if (!fresh || b.booking_source !== 'website' || b.offer_code || b.payment_method !== 'online'
    || b.status !== 'pending' || (b.payment_status && b.payment_status !== 'pending')) return null;
  return fallbackToPayLater(b.id, b.category);
}
