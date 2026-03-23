import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/** Get today in IST as YYYY-MM-DD (same logic as client-side getTodayIST) */
function getTodayIST(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  return ist.toISOString().split('T')[0];
}

const schema = z.object({
  category: z.enum(['hotel', 'taxi', 'trek', 'paragliding']),
  guest_name: z.string().min(2, 'Name is required'),
  guest_email: z.string().email().optional().or(z.literal('')),
  guest_phone: z.string().min(10, 'Valid phone required'),
  num_guests: z.number().min(1).default(1),
  special_requests: z.string().optional(),
  check_in: z.string().optional(),
  check_out: z.string().optional(),
  activity_date: z.string().optional(),
  pickup_time: z.string().optional(),
  property_id: z.string().uuid().optional().nullable(),
  taxi_route_id: z.string().uuid().optional().nullable(),
  trek_id: z.string().uuid().optional().nullable(),
  paragliding_id: z.string().uuid().optional().nullable(),
  pickup_location: z.string().optional(),
  drop_location: z.string().optional(),
  vehicle_type: z.string().optional(),
  amount: z.number().min(0).default(0),
  payment_method: z.enum(['online', 'offline', 'pay_at_hotel', 'partial_online']).default('offline'),
  booking_source: z.enum(['website', 'whatsapp', 'phone', 'walkin', 'admin']).default('website'),
  commission_pct: z.number().min(0).max(100).default(10),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    // Server-side date validation using IST (matches frontend)
    const today = getTodayIST();
    if (data.check_in && data.check_in < today) {
      return NextResponse.json({ error: 'Check-in date cannot be in the past' }, { status: 400 });
    }
    if (data.check_in && data.check_out && data.check_out <= data.check_in) {
      return NextResponse.json({ error: 'Check-out must be after check-in' }, { status: 400 });
    }
    if (data.activity_date && data.activity_date < today) {
      return NextResponse.json({ error: 'Activity date cannot be in the past' }, { status: 400 });
    }

    // Category-specific date requirements
    if (data.category === 'hotel' && (!data.check_in || !data.check_out)) {
      return NextResponse.json({ error: 'Check-in and check-out dates are required for hotel bookings' }, { status: 400 });
    }

    // Calculate commission
    const commission_amount = Math.round(data.amount * data.commission_pct / 100);
    const commission_status = (data.payment_method === 'offline' || data.payment_method === 'pay_at_hotel') && commission_amount > 0
      ? 'pending' : 'not_applicable';

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (url && key) {
      const { createClient } = await import('@supabase/supabase-js');
      const sb = createClient(url, key);

      const { data: booking, error } = await sb.from('bookings').insert({
        category: data.category,
        guest_name: data.guest_name,
        guest_email: data.guest_email || null,
        guest_phone: data.guest_phone,
        num_guests: data.num_guests,
        special_requests: data.special_requests || null,
        check_in: data.check_in || null,
        check_out: data.check_out || null,
        activity_date: data.activity_date || null,
        pickup_time: data.pickup_time || null,
        property_id: data.property_id || null,
        taxi_route_id: data.taxi_route_id || null,
        trek_id: data.trek_id || null,
        paragliding_id: data.paragliding_id || null,
        pickup_location: data.pickup_location || null,
        drop_location: data.drop_location || null,
        vehicle_type: data.vehicle_type || null,
        amount: data.amount,
        payment_method: data.payment_method,
        payment_status: 'pending',
        status: 'pending',
        booking_source: data.booking_source,
        commission_pct: data.commission_pct,
        commission_amount,
        commission_status,
      }).select().single();

      if (error) {
        console.error('Booking insert error:', error);
        return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
      }

      // Notification logging (non-blocking -- don't fail booking if this errors)
      try {
        if (data.property_id) {
          const { data: prop } = await sb.from('properties').select('contact_email, contact_phone, name').eq('id', data.property_id).single();
          if (prop?.contact_email) {
            await sb.from('notification_log').insert({
              type: 'booking_new', recipient_type: 'hotel',
              recipient_email: prop.contact_email, recipient_phone: prop.contact_phone,
              subject: `New Booking: ${data.guest_name} - ${prop.name}`,
              body: JSON.stringify({ booking_ref: booking.booking_ref, guest: data.guest_name, phone: data.guest_phone, check_in: data.check_in, check_out: data.check_out, guests: data.num_guests, amount: data.amount, payment: data.payment_method }),
              booking_id: booking.id, property_id: data.property_id, status: 'queued',
            });
          }
        }
        await sb.from('notification_log').insert({
          type: 'booking_new', recipient_type: 'admin',
          subject: `New ${data.category} Booking: ${booking.booking_ref}`,
          body: JSON.stringify({ booking_ref: booking.booking_ref, category: data.category, guest: data.guest_name, amount: data.amount }),
          booking_id: booking.id, property_id: data.property_id || null, status: 'queued',
        });
      } catch (notifErr) {
        console.error('Notification logging failed (non-fatal):', notifErr);
      }

      return NextResponse.json({ success: true, booking_ref: booking.booking_ref, booking_id: booking.id });
    } else {
      console.log('📩 Booking (no Supabase):', JSON.stringify(data, null, 2));
      return NextResponse.json({ success: true, booking_ref: 'BKG-DEMO-00001' });
    }
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
