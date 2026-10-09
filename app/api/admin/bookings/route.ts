import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, requireCaller, serviceClient } from '@/lib/server-auth';
import { quoteBooking, nightsBetween } from '@/lib/pricing';
import { BOOKABLE_STATUS, checkAssignment, commissionRateFor, isBeforeToday, paymentFields, splitAmount, todayIst } from '@/lib/manual-booking';
import { sendManualBookingEmails } from '@/lib/manual-booking-emails';

export const dynamic = 'force-dynamic';

const TABLE = { hotel: 'properties', taxi: 'taxi_routes', trek: 'treks', paragliding: 'paragliding_packages', guide: 'guides' } as const;
const ITEM_COLUMN = { hotel: 'property_id', taxi: 'taxi_route_id', trek: 'trek_id', paragliding: 'paragliding_id', guide: 'guide_id' } as const;

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const schema = z.object({
  category: z.enum(['hotel', 'taxi', 'trek', 'paragliding', 'guide']),
  item_id: z.string().uuid().nullable(),
  room_name: z.string().max(120).optional(),
  plan_index: z.number().int().min(0).optional(),
  plan_name: z.string().max(77).optional(),
  check_in: date.optional(),
  check_out: date.optional(),
  activity_date: date.optional(),
  pickup_time: z.string().max(20).optional(),
  pickup_location: z.string().max(300).optional(),
  drop_location: z.string().max(300).optional(),
  vehicle_type: z.string().max(50).optional(),
  num_guests: z.number().int().min(1).max(100),
  guide_days: z.number().int().min(1).max(30).optional(),
  guest_name: z.string().min(2).max(200),
  guest_phone: z.string().min(10).max(20),
  guest_email: z.union([z.string().email().max(200), z.literal('')]).optional(),
  special_requests: z.string().max(2000).optional(),
  final_amount: z.number().int().min(0).max(10_000_000).optional(),
  price_override_reason: z.string().max(500).optional(),
  payment: z.object({
    choice: z.enum(['partner_collects', 'platform_paid', 'unpaid']),
    amount_received: z.number().int().min(0).max(10_000_000).optional(),
    channel: z.enum(['upi', 'bank', 'cash', 'card', 'stripe']).optional(),
    reference: z.string().max(200).optional(),
  }),
  partner_id: z.string().uuid().nullable().optional(),
  staff_id: z.string().uuid().nullable().optional(),
  vehicle_id: z.string().uuid().nullable().optional(),
  allow_past_date: z.boolean().optional(),
  notify_customer: z.boolean().default(true),
  notify_partner: z.boolean().default(true),
});

const PAST = "That date is in the past. Tick 'allow past date' to record an earlier booking.";

export async function POST(req: Request) {
  try {
    const { profile: admin } = await requireCaller(req, ['admin']);
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      const where = parsed.error.issues[0]?.path.join('.');
      throw new HttpError(400, `Please check the booking details.${where ? ` (${where})` : ''}`);
    }
    const body = parsed.data;
    const category = body.category;
    const sb = serviceClient();

    // The item being booked
    let item: Record<string, any> | null = null;
    if (body.item_id) {
      const { data, error } = await sb.from(TABLE[category]).select('*').eq('id', body.item_id).maybeSingle();
      if (error) throw new HttpError(500, 'Could not load the chosen item. Please try again.');
      if (!data) throw new HttpError(404, 'The chosen item was not found.');
      if (data.status !== BOOKABLE_STATUS[category]) throw new HttpError(400, 'This item is not available for booking.');
      item = data;
    } else {
      if (category !== 'taxi') throw new HttpError(400, 'Please choose what is being booked.');
      if (!body.pickup_location?.trim() || !body.drop_location?.trim()) throw new HttpError(400, 'Enter the pickup and drop locations for a custom trip.');
      if (body.final_amount == null) throw new HttpError(400, 'Enter the price for a custom trip.');
    }

    // Dates and list price
    const today = todayIst();
    if (category === 'hotel') {
      if (!body.check_in || !body.check_out) throw new HttpError(400, 'Choose check-in and check-out dates.');
      if (nightsBetween(body.check_in, body.check_out) < 1) throw new HttpError(400, 'Check-out must be after check-in.');
      if (!body.allow_past_date && isBeforeToday(body.check_in, today)) throw new HttpError(400, PAST);
    } else {
      if (!body.activity_date) throw new HttpError(400, 'Choose the date of the booking.');
      if (!body.allow_past_date && isBeforeToday(body.activity_date, today)) throw new HttpError(400, PAST);
    }
    const quoted = item
      ? quoteBooking(category, item, {
          num_guests: body.num_guests, check_in: body.check_in, check_out: body.check_out,
          room_name: body.room_name, plan_index: body.plan_index, guide_days: body.guide_days,
        }).amount
      : null;
    const list_amount = quoted || null; // a catalogue price of 0 means no price on file

    // Final price
    const final = body.final_amount ?? list_amount;
    if (final == null) throw new HttpError(400, 'Enter the price for this booking.');
    const price_overridden = list_amount == null ? true : final !== list_amount;

    // Partner / staff / vehicle
    const load = async (table: string, id: string | null | undefined, cols: string) => {
      if (!id) return null;
      const { data, error } = await sb.from(table).select(cols).eq('id', id).maybeSingle();
      if (error) throw new HttpError(500, 'Could not check the assignment. Please try again.');
      if (!data) throw new HttpError(400, 'The chosen partner, person or vehicle was not found.');
      return data as any;
    };
    const partner = await load('profiles', body.partner_id, 'id, role, partner_type, partner_status, commission_pct');
    const staff = await load('partner_staff', body.staff_id, 'id, partner_id, role, active');
    const vehicle = await load('vehicles', body.vehicle_id, 'id, partner_id, active');
    const problem = checkAssignment(category, partner, staff, vehicle);
    if (problem) throw new HttpError(400, problem);

    // Commission and payment
    const pct = Math.min(99.99, commissionRateFor(category, {
      partnerPct: partner?.commission_pct != null ? Number(partner.commission_pct) : null,
      propertyPct: category === 'hotel' && item?.commission_pct != null ? Number(item.commission_pct) : null,
    }));
    const split = splitAmount(final, pct);
    const pay = paymentFields(body.payment.choice, category, final, {
      amountReceived: body.payment.amount_received, channel: body.payment.channel, reference: body.payment.reference,
    });

    // Save
    const isHotel = category === 'hotel';
    const row = {
      category,
      guest_name: body.guest_name.trim(),
      guest_phone: body.guest_phone.trim(),
      guest_email: body.guest_email?.trim() || null,
      special_requests: body.special_requests?.trim() || null,
      num_guests: body.num_guests,
      check_in: isHotel ? body.check_in : null,
      check_out: isHotel ? body.check_out : null,
      activity_date: isHotel ? null : body.activity_date,
      pickup_time: isHotel ? null : body.pickup_time || null,
      property_id: null, taxi_route_id: null, trek_id: null, paragliding_id: null, guide_id: null,
      [ITEM_COLUMN[category]]: item?.id ?? null,
      guide_days: category === 'guide' ? body.guide_days ?? 1 : null,
      pickup_location: body.pickup_location?.trim() || null,
      drop_location: body.drop_location?.trim() || null,
      vehicle_type: body.vehicle_type || null,
      room_name: body.room_name ? (body.plan_name ? `${body.room_name} - ${body.plan_name}` : body.room_name) : null,
      amount: final,
      list_amount,
      price_overridden,
      price_override_reason: price_overridden ? body.price_override_reason?.trim() || null : null,
      commission_pct: pct,
      commission_amount: split.commission_amount,
      partner_share_amount: split.partner_share_amount,
      ...pay,
      partner_id: partner?.id ?? null,
      staff_id: staff?.id ?? null,
      vehicle_id: vehicle?.id ?? null,
      booking_source: 'admin',
      status: 'confirmed',
      created_by: admin.id,
    };
    const { data: saved, error } = await sb.from('bookings').insert(row).select('id, booking_ref').single();
    if (error || !saved) {
      console.error('Manual booking insert failed:', error);
      throw new HttpError(500, 'Could not save the booking. Please try again.');
    }

    // Emails never block the save
    try {
      await sendManualBookingEmails(saved.id, { customer: body.notify_customer && !!row.guest_email, partner: body.notify_partner });
    } catch (e) { console.error('Manual booking emails failed:', e); }

    return NextResponse.json({ id: saved.id, booking_ref: saved.booking_ref });
  } catch (e) { return jsonError(e); }
}
