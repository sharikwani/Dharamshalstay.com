import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import Stripe from 'stripe';
import { recordOnlinePayment } from '@/lib/payments/record';

const CONFIRMING_EVENTS = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'];

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
        const ok = await recordOnlinePayment(createClient(url, key), {
          provider: 'stripe',
          linkId: session.id,
          bookingId: session.metadata?.booking_id,
          paymentId: (session.payment_intent as string) || null,
          amount: Math.round((session.amount_total || 0) / 100),
        });
        if (!ok) return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
