import { serviceClient } from '@/lib/server-auth';
import { sendBookingConfirmation, sendBookingRequestReceived, sendAdminNotification } from '@/lib/email';
import { whatsappNewBooking, whatsappRequestReceived } from '@/lib/booking-whatsapp';
import { bookingPageUrlOrNull, loadStayContact } from '@/lib/bookings/stay-details';
import { upsertContact } from '@/lib/email/contacts';
import { scheduleBookingJourney } from '@/lib/email/jobs';

/**
 * Guest email + admin alert + partner WhatsApp for one booking. Never throws.
 * 'requested' (default): the booking is awaiting confirmation, so the guest gets no WhatsApp.
 * 'confirmed': the booking is confirmed, so the guest also gets the WhatsApp confirmation.
 */
export async function sendBookingEmails(bookingId: string, stage: 'requested' | 'confirmed' = 'requested', opts: { customerWhatsApp?: boolean } = {}): Promise<void> {
  try {
    const sb = serviceClient();
    const { data: booking } = await sb.from('bookings').select('*').eq('id', bookingId).single();
    if (!booking) return;
    let propertyName = '';
    let property: any = null;
    if (booking.property_id) {
      const { data: prop } = await sb.from('properties').select('name,slug,images,check_in_time').eq('id', booking.property_id).single();
      propertyName = prop?.name || '';
      property = prop || null;
    }
    await upsertContact({ email: booking.guest_email, phone: booking.guest_phone, name: booking.guest_name, source: booking.booking_source === 'whatsapp' ? 'whatsapp' : 'booking', interests: [booking.category], event: 'booking' }, sb);
    // Party tickets get their own ticket email and WhatsApp card (lib/parties/tickets.ts), and no stay reminders.
    const ticket = booking.category === 'event';
    if (booking.guest_email && !ticket) {
      // A pay-later request is not confirmed yet: only the confirmed stage says "Booking Confirmed".
      await (stage === 'confirmed' ? sendBookingConfirmation : sendBookingRequestReceived)({
        id: booking.id, property,
        guest_name: booking.guest_name, guest_email: booking.guest_email, booking_ref: booking.booking_ref,
        check_in: booking.check_in, check_out: booking.check_out, activity_date: booking.activity_date,
        amount: booking.amount, category: booking.category, room_name: booking.room_name,
        property_name: propertyName, paid_amount: booking.paid_amount,
        payment_method: booking.payment_method, payment_status: booking.payment_status,
        stay: booking.property_id ? await loadStayContact(booking.id) : null,
        details_url: bookingPageUrlOrNull(booking) || undefined,
      });
    }
    if (stage === 'confirmed' && !ticket) await scheduleBookingJourney(booking.id);
    await sendAdminNotification({
      id: booking.id,
      guest_name: booking.guest_name, guest_phone: booking.guest_phone, guest_email: booking.guest_email,
      booking_ref: booking.booking_ref, category: booking.category, amount: booking.amount,
      check_in: booking.check_in, check_out: booking.check_out, property_name: propertyName,
    });
    await whatsappNewBooking(bookingId, { customer: stage === 'confirmed' && !ticket && opts.customerWhatsApp !== false, partners: true });
    // A request awaiting confirmation: tell the guest we have it (WhatsApp bookings already hear this in the chat).
    if (stage === 'requested' && !ticket && booking.booking_source !== 'whatsapp') await whatsappRequestReceived(bookingId);
  } catch (err) {
    console.error('Booking emails failed (non-fatal):', err);
  }
}
