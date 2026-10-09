import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { serviceClient } from '@/lib/server-auth';

const RETURN_PATH: Record<string, string> = { hotel: '/hotels', taxi: '/taxi', trek: '/treks', paragliding: '/paragliding' };

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'Online payment is not available yet' }, { status: 503 });
    const { bookingId } = await req.json().catch(() => ({}));
    if (typeof bookingId !== 'string' || !bookingId) return NextResponse.json({ error: 'Missing booking' }, { status: 400 });

    const sb = serviceClient();
    const { data: b } = await sb.from('bookings').select('*').eq('id', bookingId).single();
    if (!b) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    if (b.payment_status === 'paid') return NextResponse.json({ error: 'This booking is already paid' }, { status: 409 });
    if (!b.amount || b.amount < 100) return NextResponse.json({ error: 'This booking has no online price' }, { status: 400 });

    let title = 'Dharamshala Stay booking';
    if (b.property_id) {
      const { data: p } = await sb.from('properties').select('name').eq('id', b.property_id).single();
      if (p?.name) title = p.name;
    }
    const dates = b.check_in ? `${b.check_in} to ${b.check_out || ''}` : b.activity_date || '';
    const description = [b.room_name, dates, b.booking_ref].filter(Boolean).join(' · ');

    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      currency: 'inr',
      line_items: [{ quantity: 1, price_data: { currency: 'inr', unit_amount: Math.round(b.amount * 100), product_data: { name: title, description: description.slice(0, 500) || undefined } } }],
      customer_email: b.guest_email || undefined,
      metadata: { booking_id: b.id, booking_ref: b.booking_ref || '' },
      success_url: process.env.NEXT_PUBLIC_SITE_URL + '/booking/success?session_id={CHECKOUT_SESSION_ID}&ref=' + encodeURIComponent(b.booking_ref || ''),
      cancel_url: process.env.NEXT_PUBLIC_SITE_URL + (RETURN_PATH[b.category] || '/') + '?payment=cancelled',
    });
    await sb.from('bookings').update({ stripe_session_id: session.id, payment_method: 'online' }).eq('id', b.id);
    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json({ error: 'Could not start payment' }, { status: 500 });
  }
}
