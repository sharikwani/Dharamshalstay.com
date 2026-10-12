import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutLink } from '@/lib/bookings/checkout';

export async function POST(req: NextRequest) {
  try {
    const { bookingId } = await req.json().catch(() => ({}));
    if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'Online payment is not available yet' }, { status: 503 });
    if (typeof bookingId !== 'string' || !bookingId) return NextResponse.json({ error: 'Missing booking' }, { status: 400 });
    const r = await createCheckoutLink(bookingId);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    return NextResponse.json({ url: r.url, sessionId: r.sessionId });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json({ error: 'Could not start payment' }, { status: 500 });
  }
}
