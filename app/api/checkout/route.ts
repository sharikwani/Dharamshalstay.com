import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const body = await req.json();
    const { bookingId, bookingRef, amount, guestName, guestEmail, hotelName, roomName, checkIn, checkOut } = body;

    if (!amount || amount < 100) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Amount is in INR, Stripe expects paise (1 INR = 100 paise)
    const amountInPaise = Math.round(amount * 100);

    const description = [
      hotelName || 'Dharamshala Stay Booking',
      roomName ? '- ' + roomName : '',
      checkIn ? '(' + checkIn + ' to ' + (checkOut || '') + ')' : '',
    ].filter(Boolean).join(' ');

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      currency: 'inr',
      line_items: [{
        price_data: {
          currency: 'inr',
          unit_amount: amountInPaise,
          product_data: {
            name: hotelName || 'Booking',
            description: description.substring(0, 500),
          },
        },
        quantity: 1,
      }],
      customer_email: guestEmail || undefined,
      metadata: {
        booking_id: bookingId || '',
        booking_ref: bookingRef || '',
        guest_name: guestName || '',
      },
      success_url: process.env.NEXT_PUBLIC_SITE_URL + '/booking/success?session_id={CHECKOUT_SESSION_ID}&ref=' + (bookingRef || ''),
      cancel_url: process.env.NEXT_PUBLIC_SITE_URL + '/hotels?payment=cancelled',
    });

    // Update booking with stripe session ID
    if (bookingId) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (url && key) {
        const { createClient } = await import('@supabase/supabase-js');
        const sb = createClient(url, key);
        await sb.from('bookings').update({
          stripe_session_id: session.id,
          payment_method: 'online',
        }).eq('id', bookingId);
      }
    }

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err: any) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json({ error: err.message || 'Checkout failed' }, { status: 500 });
  }
}
