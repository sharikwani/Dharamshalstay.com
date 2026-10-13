import type { SupabaseClient } from '@supabase/supabase-js';
import { serviceClient } from '@/lib/server-auth';
import { sendBookingConfirmation } from '@/lib/email';
import { whatsappNewBooking } from '@/lib/booking-whatsapp';

export type ConfirmBy = 'admin' | 'partner';
export type ConfirmResult = { ok: true; already: boolean } | { ok: false; status: 404 | 409 | 500; error: string };

/**
 * Move a pending booking to confirmed and tell the customer (email + WhatsApp template).
 * The update only matches a booking that is still pending, so when the admin and the hotel confirm
 * at the same moment only one of them changes the row, and the customer is told exactly once.
 */
export async function confirmBooking(id: string, by: ConfirmBy, sb?: SupabaseClient): Promise<ConfirmResult> {
  const db = sb ?? serviceClient();
  const { data: changed, error } = await db.from('bookings')
    .update({ status: 'confirmed', updated_at: new Date().toISOString() })
    .eq('id', id).eq('status', 'pending').select('id');
  if (error) {
    console.error(`Booking confirm (${by}) failed:`, error);
    return { ok: false, status: 500, error: 'Could not confirm the booking. Please try again.' };
  }
  if (changed?.length) {
    await sendConfirmedNotices(id);
    return { ok: true, already: false };
  }
  // Nothing changed: the booking is gone, already confirmed (maybe by the other side a moment ago), or closed.
  const { data: now, error: loadError } = await db.from('bookings').select('status').eq('id', id).maybeSingle();
  if (loadError) {
    console.error(`Booking confirm (${by}) lookup failed:`, loadError);
    return { ok: false, status: 500, error: 'Could not confirm the booking. Please try again.' };
  }
  if (!now) return { ok: false, status: 404, error: 'Booking not found.' };
  if (now.status === 'confirmed') return { ok: true, already: true };
  if (now.status === 'pending') return { ok: false, status: 500, error: 'Could not confirm the booking. Please try again.' };
  return { ok: false, status: 409, error: `This booking is ${now.status}.` };
}

/** Customer confirmation email (when they gave an address) and WhatsApp confirmation template. Never throws. */
export async function sendConfirmedNotices(id: string): Promise<void> {
  try {
    const sb = serviceClient();
    const { data: booking } = await sb.from('bookings').select('*').eq('id', id).single();
    if (!booking) return;
    if (booking.guest_email) {
      try {
        let propertyName = '';
        if (booking.property_id) {
          const { data: prop } = await sb.from('properties').select('name').eq('id', booking.property_id).single();
          propertyName = prop?.name || '';
        }
        await sendBookingConfirmation({
          guest_name: booking.guest_name, guest_email: booking.guest_email, booking_ref: booking.booking_ref,
          check_in: booking.check_in, check_out: booking.check_out, activity_date: booking.activity_date,
          amount: booking.amount, category: booking.category, room_name: booking.room_name,
          property_name: propertyName, paid_amount: booking.paid_amount,
          payment_method: booking.payment_method, payment_status: booking.payment_status,
        });
      } catch (e) { console.error('Confirmation email failed (non-fatal):', e); }
    }
    await whatsappNewBooking(id, { customer: true, partners: false });
  } catch (e) { console.error('Confirmation notices failed (non-fatal):', e); }
}
