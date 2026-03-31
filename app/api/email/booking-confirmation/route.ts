import { NextRequest, NextResponse } from 'next/server';
import { sendBookingConfirmation, sendAdminNotification } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { bookingId } = await req.json();
    if (!bookingId) return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return NextResponse.json({ error: 'Not configured' }, { status: 500 });

    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(url, key);

    const { data: booking } = await sb.from('bookings').select('*').eq('id', bookingId).single();
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    // Get property name if hotel booking
    let propertyName = '';
    if (booking.property_id) {
      const { data: prop } = await sb.from('properties').select('name').eq('id', booking.property_id).single();
      if (prop) propertyName = prop.name;
    }

    // Send to guest
    if (booking.guest_email) {
      await sendBookingConfirmation({
        guest_name: booking.guest_name,
        guest_email: booking.guest_email,
        booking_ref: booking.booking_ref,
        check_in: booking.check_in,
        check_out: booking.check_out,
        activity_date: booking.activity_date,
        amount: booking.amount,
        category: booking.category,
        room_name: booking.room_name,
        property_name: propertyName,
        paid_amount: booking.paid_amount,
      });
    }

    // Send to admin
    await sendAdminNotification({
      guest_name: booking.guest_name,
      guest_phone: booking.guest_phone,
      guest_email: booking.guest_email,
      booking_ref: booking.booking_ref,
      category: booking.category,
      amount: booking.amount,
      check_in: booking.check_in,
      check_out: booking.check_out,
      property_name: propertyName,
    });

    return NextResponse.json({ sent: true });
  } catch (err: any) {
    console.error('Email API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
