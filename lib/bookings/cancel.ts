import { serviceClient } from '@/lib/server-auth';
import { whatsappCancelled } from '@/lib/booking-whatsapp';
import { sendCancellationEmails } from '@/lib/manual-booking-emails';
import { releaseForBooking } from '@/lib/offers/store';

const OPEN_RECORD = ['pending', 'due', 'overdue'];

export type CancelResult = { ok: true; already?: true } | { ok: false; error: string };
export const PAID_MEANWHILE = 'This booking was paid meanwhile';

/**
 * Cancel a booking: save the reason, waive unpaid commission, and optionally tell the customer and partner.
 * Only a booking that is not cancelled yet changes, so a repeated cancel sends nothing again ({ already: true }).
 * With requireUnpaid (customer-initiated WhatsApp cancels), a booking paid in the meantime is not cancelled.
 */
export async function cancelBooking(booking: { id: string; commission_status?: string | null }, reason: string,
  opts: { notify: boolean; requireUnpaid?: boolean }): Promise<CancelResult> {
  const sb = serviceClient();
  const keepCommission = booking.commission_status === 'paid';
  const update: Record<string, unknown> = { status: 'cancelled', cancelled_reason: reason };
  if (!keepCommission) update.commission_status = 'waived';
  let q = sb.from('bookings').update(update).eq('id', booking.id).neq('status', 'cancelled');
  if (opts.requireUnpaid) q = q.or('payment_status.is.null,payment_status.not.in.(paid,partially_paid)');
  const { data: changed, error } = await q.select('id');
  if (error) {
    console.error('Booking cancel failed:', error);
    return { ok: false, error: 'Could not save the change. Please try again.' };
  }
  if (!changed?.length) {
    // Nothing changed: already cancelled (by an earlier or concurrent cancel), or paid meanwhile.
    if (opts.requireUnpaid) {
      const { data: now } = await sb.from('bookings').select('status, payment_status').eq('id', booking.id).maybeSingle();
      if (now && now.status !== 'cancelled') return { ok: false, error: PAID_MEANWHILE };
    }
    return { ok: true, already: true };
  }
  if (!keepCommission) {
    try {
      const { error: e } = await sb.from('commission_records').update({ status: 'waived' }).eq('booking_id', booking.id).in('status', OPEN_RECORD);
      if (e) console.error('Commission record waive failed:', e);
    } catch (e) { console.error('Commission record waive failed:', e); }
  }
  // A cancelled booking gives its WhatsApp offer code back (it works again while still inside its window).
  try { await releaseForBooking(booking.id); } catch (e) { console.error('Offer code release failed:', e); }
  if (opts.notify) {
    try {
      await sendCancellationEmails(booking.id, reason);
      await whatsappCancelled(booking.id, reason);
    } catch (e) { console.error('Cancellation notices failed:', e); }
  }
  return { ok: true };
}
