import { z } from 'zod';
import { quoteBooking } from '@/lib/pricing';
import { sendBookingEmails } from '@/lib/booking-emails';
import { todayIST } from './timing';

export const bookingSchema = z.object({
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
  plan_index: z.number().int().min(0).max(50).optional().nullable(),
  payment_method: z.enum(['online', 'offline', 'pay_at_hotel', 'partial_online']).default('offline'),
  booking_source: z.enum(['website', 'whatsapp', 'phone', 'walkin']).default('website'),
  room_name: z.string().optional(),
  plan_name: z.string().max(200).optional(),
});
export type BookingInput = z.infer<typeof bookingSchema>;

export type CreateResult =
  | { ok: true; booking: { id: string; booking_ref: string }; amount: number; payment_method: string; demo?: true }
  | { ok: false; error: string; status: number };

/** The same date rules the booking form uses, in IST. Null when the dates are fine. */
export function dateProblem(d: Pick<BookingInput, 'category' | 'check_in' | 'check_out' | 'activity_date'>, today = todayIST()): string | null {
  if (d.check_in && d.check_in < today) return 'Check-in date cannot be in the past';
  if (d.check_in && d.check_out && d.check_out <= d.check_in) return 'Check-out must be after check-in';
  if (d.activity_date && d.activity_date < today) return 'Activity date cannot be in the past';
  if (d.category === 'hotel' && (!d.check_in || !d.check_out)) return 'Check-in and check-out dates are required for hotel bookings';
  return null;
}

export async function createBooking(data: BookingInput, opts: { userId: string | null; callerRole?: string | null }): Promise<CreateResult> {
  const problem = dateProblem(data);
  if (problem) return { ok: false, error: problem, status: 400 };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && key) {
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(url, key);

    // Nor can a partner's email be used as the guest email (admins booking on someone's behalf excepted).
    if (data.guest_email && opts.callerRole !== 'admin') {
      const { data: partnerRows } = await sb.from('profiles').select('id')
        .eq('email', data.guest_email.trim().toLowerCase()).eq('role', 'partner').limit(1);
      if (partnerRows?.length) {
        return { ok: false, error: 'This email belongs to a partner account and can\'t be used for customer bookings. Please use a different email.', status: 400 };
      }
    }

    // Price comes from the database row, never from the browser.
    const TABLE = { hotel: 'properties', taxi: 'taxi_routes', trek: 'treks', paragliding: 'paragliding_packages' } as const;
    const entityId = data.property_id || data.taxi_route_id || data.trek_id || data.paragliding_id || null;
    let entity: Record<string, any> | null = null;
    if (entityId) {
      const { data: row } = await sb.from(TABLE[data.category]).select('*').eq('id', entityId).single();
      entity = row || null;
    }
    const { amount, commission_pct } = quoteBooking(data.category, entity, {
      num_guests: data.num_guests, check_in: data.check_in, check_out: data.check_out,
      room_name: data.room_name, plan_index: data.plan_index ?? null,
    });
    const commission_amount = Math.round(amount * commission_pct / 100);
    // Online payment needs a price; quote-only bookings are taken as pay-later.
    const payment_method = data.payment_method === 'online' && (amount < 100 || !process.env.STRIPE_SECRET_KEY) ? 'offline' : data.payment_method;
    const commission_status = (payment_method === 'offline' || payment_method === 'pay_at_hotel') && commission_amount > 0
      ? 'pending' : 'not_applicable';
    const room_label = data.room_name ? (data.plan_name ? `${data.room_name} - ${data.plan_name}` : data.room_name) : null;

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
      amount,
      payment_method,
      payment_status: 'pending',
      status: 'pending',
      booking_source: data.booking_source,
      commission_pct,
      commission_amount,
      commission_status,
      user_id: opts.userId,
      room_name: room_label,
    }).select().single();

    if (error) {
      console.error('Booking insert error:', error);
      return { ok: false, error: 'Failed to create booking', status: 500 };
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
            body: JSON.stringify({ booking_ref: booking.booking_ref, guest: data.guest_name, phone: data.guest_phone, check_in: data.check_in, check_out: data.check_out, guests: data.num_guests, amount, payment: payment_method }),
            booking_id: booking.id, property_id: data.property_id, status: 'queued',
          });
        }
      }
      await sb.from('notification_log').insert({
        type: 'booking_new', recipient_type: 'admin',
        subject: `New ${data.category} Booking: ${booking.booking_ref}`,
        body: JSON.stringify({ booking_ref: booking.booking_ref, category: data.category, guest: data.guest_name, amount }),
        booking_id: booking.id, property_id: data.property_id || null, status: 'queued',
      });
    } catch (notifErr) {
      console.error('Notification logging failed (non-fatal):', notifErr);
    }

    if (payment_method !== 'online') await sendBookingEmails(booking.id);
    return { ok: true, booking: { id: booking.id, booking_ref: booking.booking_ref }, amount, payment_method };
  } else {
    console.log('[Booking] No Supabase:', JSON.stringify(data, null, 2));
    return { ok: true, booking: { id: '', booking_ref: 'BKG-DEMO-00001' }, amount: 0, payment_method: data.payment_method, demo: true };
  }
}
