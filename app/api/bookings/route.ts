import { NextRequest, NextResponse } from 'next/server';
import { getCaller } from '@/lib/server-auth';
import { bookingSchema, createBooking } from '@/lib/bookings/create';
import { bookingPagePath } from '@/lib/bookings/stay-details';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = bookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;
    // Never trust a user_id from the body: derive it from the caller's token.
    const caller = await getCaller(req);

    // Partner accounts run a business on the site; they can't also book as a customer.
    if (caller?.profile.role === 'partner') {
      return NextResponse.json({ error: "You're logged in with a partner account. Partner accounts can't make customer bookings — please log out and book with a personal email." }, { status: 403 });
    }

    const r = await createBooking(data, { userId: caller?.user.id ?? null, callerRole: caller?.profile.role ?? null });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    if (r.demo) return NextResponse.json({ success: true, booking_ref: r.booking.booking_ref });
    return NextResponse.json({ success: true, booking_ref: r.booking.booking_ref, booking_id: r.booking.id, amount: r.amount, payment_method: r.payment_method, details_url: bookingPagePath(r.booking) });
  } catch (err) {
    console.error('Booking API error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return NextResponse.json({ error: 'Not configured' }, { status: 500 });

    // AUTH CHECK: verify admin or matching property owner via Authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const sbAuth = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user } } = await sbAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const sbAdmin = createClient(url, key);
    const { data: profile } = await sbAdmin.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const property_id = searchParams.get('property_id');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = sbAdmin.from('bookings').select('*').order('created_at', { ascending: false }).limit(limit);
    if (category) query = query.eq('category', category);
    if (status) query = query.eq('status', status);
    if (property_id) query = query.eq('property_id', property_id);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ bookings: data || [] });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
