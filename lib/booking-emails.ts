import { serviceClient } from '@/lib/server-auth';
import { sendBookingConfirmation, sendAdminNotification } from '@/lib/email';
import { whatsappNewBooking } from '@/lib/booking-whatsapp';

/** Guest confirmation + admin alert for one booking. Never throws. */
export async function sendBookingEmails(bookingId: string): Promise<void> {
  try {
    const sb = serviceClient();
    const { data: booking } = await sb.from('bookings').select('*').eq('id', bookingId).single();
    if (!booking) return;
    let propertyName = '';
    if (booking.property_id) {
      const { data: prop } = await sb.from('properties').select('name').eq('id', booking.property_id).single();
      propertyName = prop?.name || '';
    }
    if (booking.guest_email) {
      await sendBookingConfirmation({
        guest_name: booking.guest_name, guest_email: booking.guest_email, booking_ref: booking.booking_ref,
        check_in: booking.check_in, check_out: booking.check_out, activity_date: booking.activity_date,
        amount: booking.amount, category: booking.category, room_name: booking.room_name,
        property_name: propertyName, paid_amount: booking.paid_amount,
      });
    }
    await sendAdminNotification({
      guest_name: booking.guest_name, guest_phone: booking.guest_phone, guest_email: booking.guest_email,
      booking_ref: booking.booking_ref, category: booking.category, amount: booking.amount,
      check_in: booking.check_in, check_out: booking.check_out, property_name: propertyName,
    });
    await whatsappNewBooking(bookingId, { customer: false });
  } catch (err) {
    console.error('Booking emails failed (non-fatal):', err);
  }
}
