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
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

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

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (url && key && session.id) {
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

        const closedStatus = CLOSED.includes(found.status) ? String(found.status) : null;
        const cancelled = !!closedStatus;
        const update: Record<string, unknown> = {
          payment_status: 'paid',
          paid_amount: Math.round((session.amount_total || 0) / 100),
          transaction_id: session.payment_intent as string,
          stripe_payment_intent: session.payment_intent as string,
        };
        if (viaMetadata) update.stripe_session_id = session.id;
        if (!cancelled) {
          // Paid to the platform online: same fields as the admin "platform paid" (Stripe) path.
          Object.assign(update, { status: 'confirmed', payment_method: 'online', collected_by: 'platform', payment_channel: 'stripe' });
          if (!SETTLED_COMMISSION.includes(String(found.commission_status))) update.commission_status = 'not_applicable';
        }

        // Only rows not already paid are updated, so a Stripe retry of the same event finds nothing
        // to update and does not send the emails / WhatsApp alerts again.
        const { data: booking, error } = await sb.from('bookings')
          .update(update)
          .eq('id', found.id)
          .or('payment_status.is.null,payment_status.neq.paid')
          .select()
          .maybeSingle();

        if (error) {
          console.error('Stripe webhook: booking update failed:', error);
          return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
        }

        if (booking && cancelled) {
          // Money arrived for a booking that is already cancelled or failed: keep its status and tell the owner.
          console.error(`Stripe webhook: payment for ${closedStatus} booking`, booking.booking_ref);
          const subject = `Payment received for ${closedStatus} booking ${booking.booking_ref} — refund needed in Stripe`;
          try {
            await sendEmail({
              to: adminEmail(), subject,
              html: `<p>Payment received for ${esc(closedStatus)} booking <b>${esc(booking.booking_ref)}</b> — refund needed in Stripe.</p>`
                + `<p>Amount: ₹${esc(update.paid_amount)}<br>Payment intent: ${esc(update.stripe_payment_intent)}<br>Checkout session: ${esc(session.id)}</p>`,
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
