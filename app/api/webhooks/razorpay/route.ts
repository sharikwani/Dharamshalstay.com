import { NextRequest, NextResponse } from 'next/server';
import { webhookSignatureValid } from '@/lib/razorpay';
import { recordOnlinePayment } from '@/lib/payments/record';
import { schedulePaymentReminder } from '@/lib/email/jobs';

export const fetchCache = 'force-no-store';

/**
 * Razorpay webhook (Dashboard → Settings → Webhooks, URL /api/webhooks/razorpay, events payment_link.paid and payment.failed).
 * Razorpay retries until it gets a 2xx, so a database failure answers 500.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    if (!webhookSignatureValid(body, req.headers.get('x-razorpay-signature'))) {
      console.error('Razorpay webhook: missing or invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    let event: any;
    try { event = JSON.parse(body); } catch { return NextResponse.json({ error: 'Bad body' }, { status: 400 }); }

    if (event?.event === 'payment_link.paid') {
      const link = event.payload?.payment_link?.entity;
      const payment = event.payload?.payment?.entity;
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (link?.id && url && key) {
        const { createClient } = await import('@supabase/supabase-js');
        const ok = await recordOnlinePayment(createClient(url, key), {
          provider: 'razorpay',
          linkId: link.id,
          bookingId: link.notes?.booking_id,
          paymentId: payment?.id || null,
          amount: Math.round(Number(link.amount_paid ?? payment?.amount ?? 0) / 100),
        });
        if (!ok) return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
      }
    }

    // A failed card/UPI attempt on a booking's payment link: email the guest a retry link (once per booking).
    if (event?.event === 'payment.failed') {
      const bookingId = event.payload?.payment?.entity?.notes?.booking_id;
      if (typeof bookingId === 'string' && /^[0-9a-f-]{36}$/i.test(bookingId)) await schedulePaymentReminder(bookingId, 'failed');
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Razorpay webhook error:', err);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
