import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, requireCaller, serviceClient } from '@/lib/server-auth';
import { quoteBooking, nightsBetween } from '@/lib/pricing';
import { BOOKABLE_STATUS, checkAssignment, commissionRateFor, isBeforeToday, paymentFields, splitAmount, todayIst } from '@/lib/manual-booking';
import { sendManualBookingEmails } from '@/lib/manual-booking-emails';
import { whatsappNewBooking } from '@/lib/booking-whatsapp';
import { roomSummaries } from '@/lib/availability/calc';
import { inBackground } from '@/lib/background';
import { matchEarlier, REQUEST_ID_COLUMNS, type RequestDetails } from '@/lib/bookings/request-id';

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
    channel: z.enum(['upi', 'bank', 'cash', 'card', 'stripe', 'razorpay']).optional(),
    reference: z.string().max(200).optional(),
  }),
  partner_id: z.string().uuid().nullable().optional(),
  staff_id: z.string().uuid().nullable().optional(),
  vehicle_id: z.string().uuid().nullable().optional(),
  allow_past_date: z.boolean().optional(),
  notify_customer: z.boolean().default(true),
  notify_partner: z.boolean().default(true),
  notify_customer_whatsapp: z.boolean().default(false),
  /** One id per form, so a repeated submit (lost response, double click) returns the booking it already made. */
  client_request_id: z.string().uuid().optional(),
});

const PAST = "That date is in the past. Tick 'allow past date' to record an earlier booking.";

type Body = z.infer<typeof schema>;

/** The details this form's booking is saved with, as the request-id check compares them. */
function requestDetails(body: Body): RequestDetails {
  const isHotel = body.category === 'hotel';
  const items: Record<string, string | null> = { property_id: null, taxi_route_id: null, trek_id: null, paragliding_id: null, guide_id: null };
  items[ITEM_COLUMN[body.category]] = body.item_id ?? null;
  return {
    guest_phone: body.guest_phone, category: body.category, ...items,
    check_in: isHotel ? body.check_in ?? null : null,
    check_out: isHotel ? body.check_out ?? null : null,
    activity_date: isHotel ? null : body.activity_date ?? null,
    room_name: body.room_name ? (body.plan_name ? `${body.room_name} - ${body.plan_name}` : body.room_name) : null,
    num_guests: body.num_guests,
  };
}

/**
 * The booking this form already saved (lost response, double click). Returned only when it is the same booking;
 * a different booking under the same form id, or one cancelled since, is refused so nothing is saved twice.
 */
async function earlierFromForm(sb: any, body: Body): Promise<NextResponse | null> {
  const { data: b, error } = await sb.from('bookings').select(`${REQUEST_ID_COLUMNS}, guide_id`)
    .eq('client_request_id', body.client_request_id).maybeSingle();
  if (error) { console.error('Manual booking request-id lookup failed:', error); return null; }
  if (!b) return null;
  const match = matchEarlier(b, requestDetails(body));
  if (match === 'same') return NextResponse.json({ id: b.id, booking_ref: b.booking_ref, duplicate: true });
  throw new HttpError(409, match === 'closed'
    ? `This form already saved booking ${b.booking_ref}, which is now ${b.status}. Check the bookings list, then reload the form to make a new booking.`
    : `This form already saved booking ${b.booking_ref} with different details. Check the bookings list before saving again.`);
}

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

    // A repeated submit of this form gets the booking it already made, before any other check.
    if (body.client_request_id) {
      const earlier = await earlierFromForm(sb, body);
      if (earlier) return earlier;
    }

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
      commissionAmount: split.commission_amount,
    });

    // Save
    const isHotel = category === 'hotel';
    // Room calendar: same rule as createBooking -- the room type when the name matches one exactly. Admins record
    // walk-ins and phone bookings, so availability is not checked here.
    const room_key = isHotel && body.room_name ? roomSummaries(item?.rooms).find((r) => r.key === body.room_name)?.key ?? null : null;
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
      room_key,
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
      ...(body.client_request_id ? { client_request_id: body.client_request_id } : {}),
    };
    const { data: saved, error } = await sb.from('bookings').insert(row).select('id, booking_ref').single();
    if (error?.code === '23505' && body.client_request_id) {
      // This form was already submitted: return that booking and send no second emails / WhatsApp.
      const earlier = await earlierFromForm(sb, body);
      if (earlier) return earlier;
    }
    if (error || !saved) {
      console.error('Manual booking insert failed:', error);
      throw new HttpError(500, 'Could not save the booking. Please try again.');
    }

    // Emails never block the save: they are sent after the response.
    inBackground('Manual booking emails', async () => {
      await sendManualBookingEmails(saved.id, { customer: body.notify_customer && !!row.guest_email, partner: body.notify_partner });
      if (body.notify_partner || body.notify_customer_whatsapp) {
        await whatsappNewBooking(saved.id, { customer: body.notify_customer_whatsapp === true, partners: body.notify_partner });
      }
    });

    return NextResponse.json({ id: saved.id, booking_ref: saved.booking_ref });
  } catch (e) { return jsonError(e); }
}
