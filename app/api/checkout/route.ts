import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutLink, type CheckoutResult } from '@/lib/bookings/checkout';
import { websitePayLaterFallback } from '@/lib/bookings/pay-later';
import { onlinePaymentEnabled } from '@/lib/razorpay';

export const fetchCache = 'force-no-store';

export async function POST(req: NextRequest) {
  try {
    const { bookingId, payLaterIfUnavailable } = await req.json().catch(() => ({}));
    if (!onlinePaymentEnabled()) return NextResponse.json({ error: 'Online payment is not available yet' }, { status: 503 });
    if (typeof bookingId !== 'string' || !bookingId) return NextResponse.json({ error: 'Missing booking' }, { status: 400 });
    let r: CheckoutResult | null = null;
    try { r = await createCheckoutLink(bookingId); } catch (err) { console.error('Checkout link error:', err); }
    if (r?.ok) return NextResponse.json({ url: r.url, sessionId: r.sessionId });
    // The payment provider itself failed (not a refusal such as already paid): the booking form's fresh online booking becomes
    // pay later, exactly like the WhatsApp fallback, so it is not left waiting for a payment that cannot happen.
    if (payLaterIfUnavailable === true && (!r || r.status >= 500)) {
      const later = await websitePayLaterFallback(bookingId);
      if (later) return NextResponse.json({ pay_later: true, payment_method: later });
    }
    if (r) return NextResponse.json({ error: r.error }, { status: r.status });
    return NextResponse.json({ error: 'Could not start payment' }, { status: 500 });
  } catch (err) {
    console.error('Checkout error:', err);
    return NextResponse.json({ error: 'Could not start payment' }, { status: 500 });
  }
}
