import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import Stripe from 'stripe';

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

        // Update booking payment status
        const { data: booking } = await sb.from('bookings')
          .update({
            payment_status: 'paid',
            paid_amount: Math.round((session.amount_total || 0) / 100),
            transaction_id: session.payment_intent as string,
            stripe_payment_intent: session.payment_intent as string,
            status: 'confirmed',
          })
          .eq('stripe_session_id', session.id)
          .select()
          .single();

        if (booking) {
          console.log('Payment confirmed for booking:', booking.booking_ref);

          // Send confirmation email (non-blocking)
          try {
            await fetch(process.env.NEXT_PUBLIC_SITE_URL + '/api/email/booking-confirmation', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ bookingId: booking.id }),
            });
          } catch (emailErr) {
            console.error('Email send failed (non-fatal):', emailErr);
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
