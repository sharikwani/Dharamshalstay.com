import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import Stripe from 'stripe';
import { sendBookingEmails } from '@/lib/booking-emails';
import { adminEmail, sendEmail } from '@/lib/email';
import { settlePaidOffer } from '@/lib/offers/paid';

const SETTLED_COMMISSION = ['paid', 'waived', 'disputed'];
const OPEN_RECORD = ['pending', 'due', 'overdue'];
// Bookings that must not be confirmed by a late payment: cancelled ones, and failed ones (lost the last room).
const CLOSED = ['cancelled', 'failed'];
const LOOKUP_COLS = 'id, booking_ref, status, payment_status, commission_status';
const REREAD_COLS = 'id, booking_ref, status, payment_status, stripe_payment_intent, transaction_id, payment_reference';
const CONFIRMING_EVENTS = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'];
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * The customer paid an already-paid booking again (e.g. an older link): one of the payments must be refunded.
 * When the booking was marked paid by hand (no payment intent stored), the hand-recorded payment may be this very
 * one, so the owner is asked to check before refunding.
 */
async function secondPaymentEmail(b: { booking_ref?: string | null; stripe_payment_intent?: string | null }, session: Stripe.Checkout.Session, paymentIntent: string) {
  console.error('Stripe webhook: second payment for paid booking', b.booking_ref, paymentIntent);
  const byHand = !b.stripe_payment_intent;
  try {
    await sendEmail({
      to: adminEmail(),
      subject: byHand
        ? `Possible second payment for ${b.booking_ref} – check Stripe before refunding; it may be the payment already recorded by hand`
        : `Second payment received for ${b.booking_ref} – refund one in Stripe`,
      html: (byHand
        ? `<p>Booking <b>${esc(b.booking_ref)}</b> was already marked paid by hand, and a Stripe payment has arrived. It may be the same payment — check Stripe before refunding.</p>`
        : `<p>Booking <b>${esc(b.booking_ref)}</b> was already paid, and a second payment has arrived — refund one of them in Stripe.</p>`)
        + `<p>Amount: ₹${esc(Math.round((session.amount_total || 0) / 100))}<br>New payment intent: ${esc(paymentIntent)}<br>`
        + `Payment intent on the booking: ${esc(b.stripe_payment_intent || 'none (marked paid another way)')}<br>Checkout session: ${esc(session.id)}</p>`,
    });
  } catch (e) { console.error('Stripe webhook: owner email failed:', e); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const sig = req.headers.get('stripe-signature');

    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      console.error('Webhook signature failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    if (event.type === 'checkout.session.async_payment_failed') {
      // A delayed payment method (e.g. a bank debit) did not go through: the booking stays unpaid.
      const failed = event.data.object as Stripe.Checkout.Session;
      console.error('Stripe webhook: delayed payment failed for session', failed.id, failed.metadata?.booking_ref || '');
    }

    if (CONFIRMING_EVENTS.includes(event.type)) {
      const session = event.data.object as Stripe.Checkout.Session;

      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

      // A completed session can still be waiting for a delayed payment; async_payment_succeeded follows when it lands.
      if (session.payment_status !== 'paid') {
        console.log('Stripe webhook: session not paid yet', session.id, session.payment_status);
      } else if (url && key && session.id) {
        const { createClient } = await import('@supabase/supabase-js');
        const sb = createClient(url, key);

        // Find the booking by this session. A newer payment link replaces stripe_session_id, so an
        // older link that is still paid would match nothing; fall back to the booking id in metadata.
        let { data: found, error: findError } = await sb.from('bookings').select(LOOKUP_COLS)
          .eq('stripe_session_id', session.id).maybeSingle();
        const metaId = session.metadata?.booking_id;
        let viaMetadata = false;
        if (!findError && !found && metaId) {
          ({ data: found, error: findError } = await sb.from('bookings').select(LOOKUP_COLS).eq('id', metaId).maybeSingle());
          viaMetadata = !!found;
        }
        if (findError) {
          console.error('Stripe webhook: booking lookup failed:', findError);
          return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
        }
        if (!found) {
          console.error('Stripe webhook: no booking for session', session.id);
          return NextResponse.json({ received: true });
        }
        const bookingId = found.id;

        const paymentIntent = (session.payment_intent as string) || null;
        const money: Record<string, unknown> = {
          payment_status: 'paid',
          paid_amount: Math.round((session.amount_total || 0) / 100),
          transaction_id: paymentIntent,
          stripe_payment_intent: paymentIntent,
        };
        if (viaMetadata) money.stripe_session_id = session.id;

        // Only rows not already paid are updated, so a Stripe retry of the same event finds nothing
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
          // Paid to the platform online: same fields as the admin "platform paid" (Stripe) path.
          const update: Record<string, unknown> = { ...money, status: 'confirmed', payment_method: 'online', collected_by: 'platform', payment_channel: 'stripe' };
          if (!SETTLED_COMMISSION.includes(String(found.commission_status))) update.commission_status = 'not_applicable';
          const r = await recordMoney(update, true);
          if (r.error) {
            console.error('Stripe webhook: booking update failed:', r.error);
            return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
          }
          booking = r.data;
        } else {
          const r = await recordMoney(money, false);
          if (r.error) {
            console.error('Stripe webhook: booking update failed:', r.error);
            return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
          }
          booking = r.data;
        }

        if (!booking) {
          // Nothing matched: the booking is already paid, or it was cancelled while this payment was processed.
          const { data: now, error: rereadError } = await sb.from('bookings').select(REREAD_COLS).eq('id', bookingId).maybeSingle();
          if (rereadError) {
            console.error('Stripe webhook: booking re-read failed:', rereadError);
            return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
          }
          if (now?.payment_status === 'paid') {
            // A redelivery of the event that paid it stays silent; a different payment means the customer paid twice.
            // The payment may also have been recorded under transaction_id / payment_reference (e.g. by the admin).
            const known = [now.stripe_payment_intent, now.transaction_id, now.payment_reference].includes(paymentIntent);
            if (paymentIntent && !known) await secondPaymentEmail(now, session, paymentIntent);
            return NextResponse.json({ received: true });
          }
          if (now && !closedStatus && CLOSED.includes(now.status)) {
            closedStatus = String(now.status);
            const r = await recordMoney(money, false);
            if (r.error) {
              console.error('Stripe webhook: booking update failed:', r.error);
              return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
            }
            booking = r.data;
          }
        }

        if (booking && closedStatus) {
          // Money arrived for a booking that is already cancelled or failed: keep its status and tell the owner.
          console.error(`Stripe webhook: payment for ${closedStatus} booking`, booking.booking_ref);
          const subject = `Payment received for ${closedStatus} booking ${booking.booking_ref} — refund needed in Stripe`;
          try {
            await sendEmail({
              to: adminEmail(), subject,
              html: `<p>Payment received for ${esc(closedStatus)} booking <b>${esc(booking.booking_ref)}</b> — refund needed in Stripe.</p>`
                + `<p>Amount: ₹${esc(money.paid_amount)}<br>Payment intent: ${esc(money.stripe_payment_intent)}<br>Checkout session: ${esc(session.id)}</p>`,
            });
          } catch (e) { console.error('Stripe webhook: owner email failed:', e); }
        } else if (booking) {
          console.log('Payment confirmed for booking:', booking.booking_ref);
          const { error: recErr } = await sb.from('commission_records').update({ status: 'waived' })
            .eq('booking_id', booking.id).in('status', OPEN_RECORD);
          if (recErr) console.error('Stripe webhook: commission record waive failed:', recErr);
          await sendBookingEmails(booking.id);
          // A WhatsApp offer booking paid late (after its code was released) takes its code back, or the owner is told.
          await settlePaidOffer(booking, 'Stripe webhook');
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
