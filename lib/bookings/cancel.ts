import { serviceClient } from '@/lib/server-auth';
import { whatsappCancelled } from '@/lib/booking-whatsapp';
import { sendCancellationEmails } from '@/lib/manual-booking-emails';

const OPEN_RECORD = ['pending', 'due', 'overdue'];

/** Cancel a booking: save the reason, waive unpaid commission, and optionally tell the customer and partner. */
export async function cancelBooking(booking: { id: string; commission_status?: string | null }, reason: string, opts: { notify: boolean }):
  Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = serviceClient();
  const keepCommission = booking.commission_status === 'paid';
  const update: Record<string, unknown> = { status: 'cancelled', cancelled_reason: reason };
  if (!keepCommission) update.commission_status = 'waived';
  const { error } = await sb.from('bookings').update(update).eq('id', booking.id);
  if (error) {
    console.error('Booking cancel failed:', error);
    return { ok: false, error: 'Could not save the change. Please try again.' };
  }
  if (!keepCommission) {
    try {
      const { error: e } = await sb.from('commission_records').update({ status: 'waived' }).eq('booking_id', booking.id).in('status', OPEN_RECORD);
      if (e) console.error('Commission record waive failed:', e);
    } catch (e) { console.error('Commission record waive failed:', e); }
  }
  if (opts.notify) {
    try {
      await sendCancellationEmails(booking.id, reason);
      await whatsappCancelled(booking.id, reason);
    } catch (e) { console.error('Cancellation notices failed:', e); }
  }
  return { ok: true };
}
