import { sendBookingEmails } from '@/lib/booking-emails';
import { adminEmail, sendEmail } from '@/lib/email';
import { settlePaidOffer } from '@/lib/offers/paid';
import { availabilityFor } from '@/lib/availability/store';
import { matchesRoom } from '@/lib/availability/calc';

export type PaymentProvider = 'stripe' | 'razorpay';

/** Where each provider's link and payment ids live on the booking, and its name in logs and owner emails. */
const PROVIDERS = {
  stripe: { name: 'Stripe', linkCol: 'stripe_session_id', paymentCol: 'stripe_payment_intent', linkLabel: 'Checkout session', paymentLabel: 'payment intent' },
  razorpay: { name: 'Razorpay', linkCol: 'razorpay_link_id', paymentCol: 'razorpay_payment_id', linkLabel: 'Payment link', paymentLabel: 'payment id' },
} as const;

/** A completed online payment, as told by the provider's webhook. */
export type OnlinePayment = {
  provider: PaymentProvider;
  /** The checkout session / payment link that was paid. */
  linkId: string;
  /** The booking id the link was made for (its metadata / notes): found by it when a newer link replaced this one. */
  bookingId?: string | null;
  paymentId: string | null;
  /** In rupees. */
  amount: number;
};

const SETTLED_COMMISSION = ['paid', 'waived', 'disputed'];
const OPEN_RECORD = ['pending', 'due', 'overdue'];
// Bookings that must not be confirmed by a late payment: cancelled ones, and failed ones (lost the last room).
const CLOSED = ['cancelled', 'failed'];
const LOOKUP_COLS = 'id, booking_ref, status, payment_status, commission_status';
const REREAD_COLS = 'id, booking_ref, status, payment_status, stripe_payment_intent, razorpay_payment_id, transaction_id, payment_reference';
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** A paid hotel booking already counts itself, so a negative count left means its room type is now oversold: tell the owner. Never throws. */
async function overbookingAlert(sb: any, b: any, log: string) {
  try {
    if (b.category !== 'hotel' || !b.property_id || !b.check_in || !b.check_out) return;
    const avail = await availabilityFor(b.property_id, b.check_in, b.check_out, { sb, now: new Date() });
    const key = b.room_key && avail[b.room_key] ? b.room_key : Object.keys(avail).find((k) => matchesRoom(b, k));
    const room = key ? avail[key] : undefined;
    if (!room?.tracked || room.left === null || room.left >= 0) return;
    await sendEmail({
      to: adminEmail(),
      subject: `Possible overbooking: ${b.booking_ref}`,
      html: `<p>Booking <b>${esc(b.booking_ref)}</b> was paid online, and ${esc(b.room_name || 'its room type')} is now oversold for ${esc(b.check_in)} to ${esc(b.check_out)} (${esc(Math.abs(room.left))} over).</p>`
        + `<p>Check the calendar and move or refund a booking.</p>`,
    });
  } catch (e) { console.error(`${log}: overbooking check failed:`, e); }
}

/**
 * The customer paid an already-paid booking again (e.g. an older link): one of the payments must be refunded.
 * When the booking was marked paid by hand (no provider payment id stored), the hand-recorded payment may be this very
 * one, so the owner is asked to check before refunding.
 */
async function secondPaymentEmail(b: any, p: OnlinePayment, log: string) {
  const { name, linkLabel, paymentLabel } = PROVIDERS[p.provider];
  console.error(`${log}: second payment for paid booking`, b.booking_ref, p.paymentId);
  const byHand = !b.stripe_payment_intent && !b.razorpay_payment_id;
  try {
    await sendEmail({
      to: adminEmail(),
      subject: byHand
        ? `Possible second payment for ${b.booking_ref} – check ${name} before refunding; it may be the payment already recorded by hand`
        : `Second payment received for ${b.booking_ref} – refund one in ${name}`,
      html: (byHand
        ? `<p>Booking <b>${esc(b.booking_ref)}</b> was already marked paid by hand, and a ${name} payment has arrived. It may be the same payment — check ${name} before refunding.</p>`
        : `<p>Booking <b>${esc(b.booking_ref)}</b> was already paid, and a second payment has arrived — refund one of them in ${name}.</p>`)
        + `<p>Amount: ₹${esc(p.amount)}<br>New ${paymentLabel}: ${esc(p.paymentId)}<br>`
        + `Online payment on the booking: ${esc(b.stripe_payment_intent || b.razorpay_payment_id || 'none (marked paid another way)')}<br>${linkLabel}: ${esc(p.linkId)}</p>`,
    });
  } catch (e) { console.error(`${log}: owner email failed:`, e); }
}

/**
 * Records a completed online payment on its booking: confirms an open booking (once, so a redelivered webhook sends
 * nothing again), keeps a cancelled or failed one as it is and asks the owner to refund, and flags a second payment.
 * Returns false when the database failed, so the webhook answers 500 and the provider retries.
 */
export async function recordOnlinePayment(sb: any, p: OnlinePayment): Promise<boolean> {
  const { name, linkCol, paymentCol, linkLabel, paymentLabel } = PROVIDERS[p.provider];
  const log = `${name} webhook`;

  // Find the booking by this link. A newer payment link replaces the stored one, so an older link that is
  // still paid would match nothing; fall back to the booking id it was made for.
  let { data: found, error: findError } = await sb.from('bookings').select(LOOKUP_COLS).eq(linkCol, p.linkId).maybeSingle();
  let viaMetadata = false;
  if (!findError && !found && p.bookingId) {
    ({ data: found, error: findError } = await sb.from('bookings').select(LOOKUP_COLS).eq('id', p.bookingId).maybeSingle());
    viaMetadata = !!found;
  }
  if (findError) {
    console.error(`${log}: booking lookup failed:`, findError);
    return false;
  }
  if (!found) {
    console.error(`${log}: no booking for`, p.linkId);
    return true;
  }
  const bookingId = found.id;

  const money: Record<string, unknown> = {
    payment_status: 'paid',
    paid_amount: p.amount,
    transaction_id: p.paymentId,
    [paymentCol]: p.paymentId,
  };
  if (viaMetadata) money[linkCol] = p.linkId;

  // Only rows not already paid are updated, so a retry of the same event finds nothing
  // to update and does not send the emails / WhatsApp alerts again.
  const recordMoney = (update: Record<string, unknown>, open: boolean) => {
    let q = sb.from('bookings').update(update).eq('id', bookingId).or('payment_status.is.null,payment_status.neq.paid');
    // Confirm only a booking that is still open now: a cancel that lands meanwhile wins.
    if (open) q = q.not('status', 'in', '(cancelled,failed)');
    return q.select().maybeSingle();
  };

  let closedStatus = CLOSED.includes(found.status) ? String(found.status) : null;
  let booking: any = null;
  if (!closedStatus) {
    // Paid to the platform online: same fields as the admin "platform paid" path.
    const update: Record<string, unknown> = { ...money, status: 'confirmed', payment_method: 'online', collected_by: 'platform', payment_channel: p.provider };
    if (!SETTLED_COMMISSION.includes(String(found.commission_status))) update.commission_status = 'not_applicable';
    const r = await recordMoney(update, true);
    if (r.error) {
      console.error(`${log}: booking update failed:`, r.error);
      return false;
    }
    booking = r.data;
  } else {
    const r = await recordMoney(money, false);
    if (r.error) {
      console.error(`${log}: booking update failed:`, r.error);
      return false;
    }
    booking = r.data;
  }

  if (!booking) {
    // Nothing matched: the booking is already paid, or it was cancelled while this payment was processed.
    const { data: now, error: rereadError } = await sb.from('bookings').select(REREAD_COLS).eq('id', bookingId).maybeSingle();
    if (rereadError) {
      console.error(`${log}: booking re-read failed:`, rereadError);
      return false;
    }
    if (now?.payment_status === 'paid') {
      // A redelivery of the event that paid it stays silent; a different payment means the customer paid twice.
      // The payment may also have been recorded under transaction_id / payment_reference (e.g. by the admin).
      const known = [now.stripe_payment_intent, now.razorpay_payment_id, now.transaction_id, now.payment_reference].includes(p.paymentId);
      if (p.paymentId && !known) await secondPaymentEmail(now, p, log);
      return true;
    }
    if (now && !closedStatus && CLOSED.includes(now.status)) {
      closedStatus = String(now.status);
      const r = await recordMoney(money, false);
      if (r.error) {
        console.error(`${log}: booking update failed:`, r.error);
        return false;
      }
      booking = r.data;
    }
  }

  if (booking && closedStatus) {
    // Money arrived for a booking that is already cancelled or failed: keep its status and tell the owner.
    console.error(`${log}: payment for ${closedStatus} booking`, booking.booking_ref);
    try {
      await sendEmail({
        to: adminEmail(),
        subject: `Payment received for ${closedStatus} booking ${booking.booking_ref} — refund needed in ${name}`,
        html: `<p>Payment received for ${esc(closedStatus)} booking <b>${esc(booking.booking_ref)}</b> — refund needed in ${name}.</p>`
          + `<p>Amount: ₹${esc(p.amount)}<br>${paymentLabel[0].toUpperCase() + paymentLabel.slice(1)}: ${esc(p.paymentId)}<br>${linkLabel}: ${esc(p.linkId)}</p>`,
      });
    } catch (e) { console.error(`${log}: owner email failed:`, e); }
  } else if (booking) {
    console.log('Payment confirmed for booking:', booking.booking_ref);
    const { error: recErr } = await sb.from('commission_records').update({ status: 'waived' })
      .eq('booking_id', booking.id).in('status', OPEN_RECORD);
    if (recErr) console.error(`${log}: commission record waive failed:`, recErr);
    await sendBookingEmails(booking.id, 'confirmed');
    await overbookingAlert(sb, booking, log);
    // A WhatsApp offer booking paid late (after its code was released) takes its code back, or the owner is told.
    await settlePaidOffer(booking, log);
  }
  return true;
}
