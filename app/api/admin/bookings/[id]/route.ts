import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, requireCaller, serviceClient } from '@/lib/server-auth';
import { ACTIVITY_CATEGORIES, checkAssignment, commissionRateFor, paymentFields, splitAmount } from '@/lib/manual-booking';
import { whatsappNewBooking, whatsappReassignedAway } from '@/lib/booking-whatsapp';
import { loadBookingView, sendManualBookingEmails, sendReassignedAwayEmail } from '@/lib/manual-booking-emails';

import { cancelBooking } from '@/lib/bookings/cancel';
import { confirmBooking } from '@/lib/bookings/confirm';
import { settlePaidOffer } from '@/lib/offers/paid';
import { withItemLinks } from '@/lib/bookings/links';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; // Next 14 caches GET fetches (Supabase reads) in route handlers otherwise

const uuid = z.string().uuid();
const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('assign'),
    partner_id: uuid.nullable(),
    staff_id: uuid.nullable().optional(),
    vehicle_id: uuid.nullable().optional(),
    notify: z.boolean().default(true),
  }),
  z.object({
    action: z.literal('payment'),
    choice: z.enum(['partner_collects', 'platform_paid', 'unpaid']),
    amount_received: z.number().int().min(0).max(10_000_000).optional(),
    channel: z.enum(['upi', 'bank', 'cash', 'card', 'stripe', 'razorpay']).optional(),
    reference: z.string().max(200).optional(),
    notify: z.boolean().default(false),
  }),
  z.object({
    action: z.literal('cancel'),
    reason: z.string().trim().min(3).max(500),
    notify: z.boolean().default(true),
  }),
  z.object({ action: z.literal('confirm') }),
  z.object({ action: z.literal('commission_paid') }),
]);

const isId = (id: string) => uuid.safeParse(id).success;

/** Same stored value? Null and undefined match, and numbers match across types (the database may send "4500.00"). */
function sameValue(a: unknown, b: unknown): boolean {
  if (a == null || b == null) return a == null && b == null;
  if (typeof a === 'number' || typeof b === 'number') return Number(a) === Number(b);
  return String(a) === String(b);
}

const OPEN_RECORD = ['pending', 'due', 'overdue'];
const SETTLED = ['paid', 'waived', 'disputed'];

/** Add the commission record the database trigger would have made at booking time, unless one exists. */
async function ensureCommissionRecord(sb: ReturnType<typeof serviceClient>, merged: Record<string, any>) {
  const { data: existing, error: findError } = await sb.from('commission_records').select('id').eq('booking_id', merged.id).limit(1).maybeSingle();
  if (findError) { console.error('Commission record lookup failed:', findError); return; }
  if (existing) return;
  const base = new Date(String(merged.check_out || merged.activity_date || new Date().toISOString().slice(0, 10)) + 'T00:00:00Z');
  base.setUTCDate(base.getUTCDate() + 7);
  const { error } = await sb.from('commission_records').insert({
    booking_id: merged.id, property_id: merged.property_id ?? null, provider_type: merged.category,
    booking_amount: merged.amount, commission_pct: merged.commission_pct, commission_amount: merged.commission_amount,
    status: 'pending', due_date: base.toISOString().slice(0, 10),
  });
  // 23505: the record already exists (unique booking_id, migration v25) -- one record per booking is the goal.
  if (error && error.code !== '23505') console.error('Commission record insert failed:', error);
}

/** Keep commission_records in step with the booking. The booking change already succeeded, so failures are only logged. */
async function syncCommissionRecords(sb: ReturnType<typeof serviceClient>, booking: Record<string, any>, update: Record<string, unknown>, action: string) {
  const id = booking.id as string;
  try {
    const next = (update.commission_status ?? booking.commission_status) as string;
    const merged: Record<string, any> = { ...booking, ...update, id };
    if (next === 'not_applicable') {
      const { error } = await sb.from('commission_records').delete().eq('booking_id', id).in('status', OPEN_RECORD);
      if (error) console.error('Commission record delete failed:', error);
      return;
    }
    if (action === 'assign') {
      const { error } = await sb.from('commission_records')
        .update({ commission_amount: update.commission_amount, commission_pct: update.commission_pct })
        .eq('booking_id', id).in('status', OPEN_RECORD);
      if (error) console.error('Commission record update failed:', error);
    }
    if (next === 'pending' && Number(merged.commission_amount) > 0) await ensureCommissionRecord(sb, merged);
  } catch (e) { console.error('Commission record sync failed:', e); }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireCaller(req, ['admin']);
    if (!isId(params.id)) throw new HttpError(404, 'Booking not found.');
    const booking = await loadBookingView(params.id);
    if (!booking) throw new HttpError(404, 'Booking not found.');
    const { data: messages, error: msgError } = await serviceClient().from('whatsapp_messages')
      .select('id, recipient_kind, to_phone, template, status, error, created_at')
      .eq('booking_id', params.id).order('created_at', { ascending: false });
    if (msgError) console.error('Could not load WhatsApp messages:', msgError);
    // Only the last 4 digits of a number leave the server.
    const whatsapp_messages = (messages || []).map(({ to_phone, ...m }: any) => ({
      ...m, to_last4: String(to_phone || '').replace(/\D/g, '').slice(-4),
    }));
    return NextResponse.json({
      booking: { ...(await withItemLinks([booking]))[0], partner_response: booking.partner_response ?? null, partner_responded_at: booking.partner_responded_at ?? null },
      whatsapp_messages,
    });
  } catch (e) { return jsonError(e); }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const caller = await requireCaller(req, ['admin']);
    if (!isId(params.id)) throw new HttpError(404, 'Booking not found.');
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      const where = parsed.error.issues[0]?.path.join('.');
      throw new HttpError(400, `Please check the details.${where ? ` (${where})` : ''}`);
    }
    const body = parsed.data;
    const id = params.id;
    const sb = serviceClient();

    const { data: booking, error: loadError } = await sb.from('bookings').select('*').eq('id', id).maybeSingle();
    if (loadError) throw new HttpError(500, 'Could not load the booking. Please try again.');
    if (!booking) throw new HttpError(404, 'Booking not found.');
    if (booking.status === 'cancelled') throw new HttpError(409, 'This booking is cancelled.');

    if (body.action === 'confirm') {
      // Pending -> confirmed and the customer is told; already confirmed is a no-op, other states are refused.
      const r = await confirmBooking(id, 'admin');
      if (!r.ok) throw new HttpError(r.status, r.error);
      return NextResponse.json({ booking: await loadBookingView(id), already: r.already });
    }

    if (body.action === 'commission_paid') {
      if (!OPEN_RECORD.includes(booking.commission_status) || !(Number(booking.commission_amount) > 0)) {
        throw new HttpError(409, booking.commission_status === 'paid' ? 'Commission is already marked as paid.' : 'No commission is owed on this booking.');
      }
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const now = new Date().toISOString();
      const { error } = await sb.from('bookings').update({ commission_status: 'paid', commission_paid_date: today, updated_at: now })
        .eq('id', id).in('commission_status', OPEN_RECORD);
      if (error) throw error;
      const { error: recError } = await sb.from('commission_records').update({ status: 'paid', paid_date: today, settled_by: caller.user.id, updated_at: now }).eq('booking_id', id);
      if (recError) console.error('Commission record update failed:', recError);
      return NextResponse.json({ booking: await loadBookingView(id) });
    }

    if (body.action === 'cancel') {
      const r = await cancelBooking({ id, commission_status: booking.commission_status }, body.reason, { notify: body.notify });
      if (!r.ok) throw new HttpError(500, r.error);
      return NextResponse.json({ booking: await loadBookingView(id) });
    }

    let update: Record<string, unknown>;
    // Notices go out only when this change actually changes something the partner or customer sees.
    let changed = false;
    if (body.action === 'assign') {
      if (!(ACTIVITY_CATEGORIES as readonly string[]).includes(booking.category)) {
        throw new HttpError(400, 'Hotel and local guide bookings cannot be reassigned here.');
      }
      if (booking.commission_status === 'paid') {
        throw new HttpError(409, 'Commission for this booking is already settled; it cannot be reassigned.');
      }
      const load = async (table: string, rowId: string | null | undefined, cols: string) => {
        if (!rowId) return null;
        const { data, error } = await sb.from(table).select(cols).eq('id', rowId).maybeSingle();
        if (error) throw new HttpError(500, 'Could not check the assignment. Please try again.');
        if (!data) throw new HttpError(400, 'The chosen partner, person or vehicle was not found.');
        return data as any;
      };
      const partner = await load('profiles', body.partner_id, 'id, role, partner_type, partner_services, partner_status, commission_pct');
      const staff = await load('partner_staff', body.staff_id, 'id, partner_id, role, active');
      const vehicle = await load('vehicles', body.vehicle_id, 'id, partner_id, active');
      const problem = checkAssignment(booking.category, partner, staff, vehicle);
      if (problem) throw new HttpError(400, problem);

      const pct = Math.min(99.99, commissionRateFor(booking.category, {
        partnerPct: partner?.commission_pct != null ? Number(partner.commission_pct) : null,
      }));
      const split = splitAmount(Number(booking.amount), pct);
      changed = !sameValue(booking.partner_id, partner?.id) || !sameValue(booking.staff_id, staff?.id) || !sameValue(booking.vehicle_id, vehicle?.id);
      update = {
        partner_id: partner?.id ?? null, staff_id: staff?.id ?? null, vehicle_id: vehicle?.id ?? null,
        commission_pct: pct, commission_amount: split.commission_amount, partner_share_amount: split.partner_share_amount,
      };
      // Same rule as the booking-time trigger: commission is owed when the partner collects offline.
      const owed = booking.collected_by !== 'platform' && ['offline', 'pay_at_hotel'].includes(booking.payment_method);
      if (!SETTLED.includes(booking.commission_status)) {
        if (split.commission_amount === 0) update.commission_status = 'not_applicable';
        else if (owed && (booking.commission_status ?? 'not_applicable') === 'not_applicable') update.commission_status = 'pending';
      }
      // A new partner has not answered yet; drop the previous partner's Accept / Can't do it.
      if ((booking.partner_id ?? null) !== (update.partner_id ?? null)) {
        update.partner_response = null;
        update.partner_responded_at = null;
      }
    } else {
      const paidOnline = Boolean(booking.stripe_payment_intent || booking.razorpay_payment_id) || (booking.payment_status === 'paid' && booking.payment_method === 'online');
      if (paidOnline && (body.choice === 'unpaid' || body.choice === 'partner_collects')) {
        throw new HttpError(409, 'This booking was paid online; refund it in Razorpay or Stripe first.');
      }
      // Website bookings may have no commission/share saved yet; fill both so partners see the right money
      const fill: Record<string, unknown> = {};
      if (booking.commission_amount == null || booking.partner_share_amount == null) {
        let propertyPct: number | null = null;
        if (booking.category === 'hotel' && booking.property_id) {
          const { data: prop } = await sb.from('properties').select('commission_pct').eq('id', booking.property_id).maybeSingle();
          propertyPct = prop?.commission_pct != null ? Number(prop.commission_pct) : null;
        }
        const pct = Math.min(99.99, booking.commission_pct != null ? Number(booking.commission_pct) : commissionRateFor(booking.category, { propertyPct }));
        Object.assign(fill, splitAmount(Number(booking.amount), pct));
        if (booking.commission_pct == null) fill.commission_pct = pct;
      }
      const fields: Record<string, unknown> = paymentFields(body.choice, booking.category, Number(booking.amount), {
        amountReceived: body.amount_received, channel: body.channel, reference: body.reference,
        commissionAmount: Number((fill.commission_amount ?? booking.commission_amount) ?? 0),
      });
      if (['paid', 'disputed', 'waived'].includes(booking.commission_status)) delete fields.commission_status;
      changed = Object.entries(fields).some(([k, v]) => !sameValue(booking[k], v));
      update = { ...fields, ...fill };
    }

    const { error } = await sb.from('bookings').update(update).eq('id', id);
    if (error) {
      console.error('Booking update failed:', error);
      throw new HttpError(500, 'Could not save the change. Please try again.');
    }

    await syncCommissionRecords(sb, booking, update, body.action);

    // Paid to the platform: a WhatsApp offer booking takes its code back, or the owner is told (never blocks the save).
    if (body.action === 'payment' && body.choice === 'platform_paid' && booking.offer_code) {
      await settlePaidOffer({ id, booking_ref: booking.booking_ref }, 'Admin booking payment');
    }

    // Emails never block the save
    try {
      if (body.action === 'assign' && body.notify && changed) {
        await sendManualBookingEmails(id, { customer: false, partner: true, subjectPrefix: 'Updated: ' });
        if (booking.partner_id && booking.partner_id !== update.partner_id) await sendReassignedAwayEmail(id, booking.partner_id);
        await whatsappNewBooking(id, { customer: false, partners: true });
        const partnerChanged = booking.partner_id && booking.partner_id !== update.partner_id;
        if (partnerChanged || (booking.staff_id && booking.staff_id !== update.staff_id)) {
          await whatsappReassignedAway(id, { partner_id: booking.partner_id ?? null, staff_id: booking.staff_id ?? null });
        }
      }
      if (body.action === 'payment' && body.notify && changed) await sendManualBookingEmails(id, { customer: true, partner: false, subjectPrefix: 'Updated: ' });
    } catch (e) { console.error('Booking update emails failed:', e); }

    return NextResponse.json({ booking: await loadBookingView(id) });
  } catch (e) { return jsonError(e); }
}
