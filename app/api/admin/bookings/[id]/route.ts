import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, requireCaller, serviceClient } from '@/lib/server-auth';
import { ACTIVITY_CATEGORIES, checkAssignment, commissionRateFor, paymentFields, splitAmount } from '@/lib/manual-booking';
import { loadBookingView, sendCancellationEmails, sendManualBookingEmails, sendReassignedAwayEmail } from '@/lib/manual-booking-emails';

export const dynamic = 'force-dynamic';

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
    channel: z.enum(['upi', 'bank', 'cash', 'card', 'stripe']).optional(),
    reference: z.string().max(200).optional(),
    notify: z.boolean().default(false),
  }),
  z.object({
    action: z.literal('cancel'),
    reason: z.string().trim().min(3).max(500),
    notify: z.boolean().default(true),
  }),
]);

const isId = (id: string) => uuid.safeParse(id).success;

const OPEN_RECORD = ['pending', 'due', 'overdue'];

/** Keep commission_records in step with the booking. The booking change already succeeded, so failures are only logged. */
async function syncCommissionRecords(sb: ReturnType<typeof serviceClient>, booking: Record<string, any>, update: Record<string, unknown>, action: string) {
  const id = booking.id as string;
  try {
    if (action === 'cancel') {
      if (booking.commission_status === 'paid') return;
      const { error } = await sb.from('commission_records').update({ status: 'waived' }).eq('booking_id', id).in('status', OPEN_RECORD);
      if (error) console.error('Commission record waive failed:', error);
    } else if (action === 'assign') {
      const { error } = await sb.from('commission_records')
        .update({ commission_amount: update.commission_amount, commission_pct: update.commission_pct })
        .eq('booking_id', id).in('status', OPEN_RECORD);
      if (error) console.error('Commission record update failed:', error);
    } else if (action === 'payment') {
      const next = (update.commission_status ?? booking.commission_status) as string;
      const merged = { ...booking, ...update };
      if (next === 'not_applicable') {
        const { error } = await sb.from('commission_records').delete().eq('booking_id', id).in('status', ['pending', 'due']);
        if (error) console.error('Commission record delete failed:', error);
      } else if (next === 'pending' && Number(merged.commission_amount) > 0) {
        const { data: existing, error: findError } = await sb.from('commission_records').select('id').eq('booking_id', id).limit(1).maybeSingle();
        if (findError) { console.error('Commission record lookup failed:', findError); return; }
        if (existing) return;
        const base = new Date(String(merged.check_out || merged.activity_date || new Date().toISOString().slice(0, 10)) + 'T00:00:00Z');
        base.setUTCDate(base.getUTCDate() + 7);
        const { error } = await sb.from('commission_records').insert({
          booking_id: id, property_id: merged.property_id ?? null, provider_type: merged.category,
          booking_amount: merged.amount, commission_pct: merged.commission_pct, commission_amount: merged.commission_amount,
          status: 'pending', due_date: base.toISOString().slice(0, 10),
        });
        if (error) console.error('Commission record insert failed:', error);
      }
    }
  } catch (e) { console.error('Commission record sync failed:', e); }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireCaller(req, ['admin']);
    if (!isId(params.id)) throw new HttpError(404, 'Booking not found.');
    const booking = await loadBookingView(params.id);
    if (!booking) throw new HttpError(404, 'Booking not found.');
    return NextResponse.json({ booking });
  } catch (e) { return jsonError(e); }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireCaller(req, ['admin']);
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

    let update: Record<string, unknown>;
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
      const partner = await load('profiles', body.partner_id, 'id, role, partner_type, partner_status, commission_pct');
      const staff = await load('partner_staff', body.staff_id, 'id, partner_id, role, active');
      const vehicle = await load('vehicles', body.vehicle_id, 'id, partner_id, active');
      const problem = checkAssignment(booking.category, partner, staff, vehicle);
      if (problem) throw new HttpError(400, problem);

      const pct = Math.min(99.99, commissionRateFor(booking.category, {
        partnerPct: partner?.commission_pct != null ? Number(partner.commission_pct) : null,
      }));
      const split = splitAmount(Number(booking.amount), pct);
      update = {
        partner_id: partner?.id ?? null, staff_id: staff?.id ?? null, vehicle_id: vehicle?.id ?? null,
        commission_pct: pct, commission_amount: split.commission_amount, partner_share_amount: split.partner_share_amount,
      };
    } else if (body.action === 'payment') {
      const paidOnline = Boolean(booking.stripe_payment_intent) || (booking.payment_status === 'paid' && booking.payment_method === 'online');
      if (paidOnline && (body.choice === 'unpaid' || body.choice === 'partner_collects')) {
        throw new HttpError(409, 'This booking was paid online; record a refund in Stripe first.');
      }
      // Website bookings may have no commission/share saved yet; fill both so partners see the right money
      const fill: Record<string, unknown> = {};
      if (booking.commission_amount == null || booking.partner_share_amount == null) {
        const pct = Math.min(99.99, booking.commission_pct != null ? Number(booking.commission_pct) : commissionRateFor(booking.category, {}));
        Object.assign(fill, splitAmount(Number(booking.amount), pct));
        if (booking.commission_pct == null) fill.commission_pct = pct;
      }
      const fields: Record<string, unknown> = paymentFields(body.choice, booking.category, Number(booking.amount), {
        amountReceived: body.amount_received, channel: body.channel, reference: body.reference,
        commissionAmount: Number((fill.commission_amount ?? booking.commission_amount) ?? 0),
      });
      if (['paid', 'disputed', 'waived'].includes(booking.commission_status)) delete fields.commission_status;
      update = { ...fields, ...fill };
    } else {
      update = { status: 'cancelled', cancelled_reason: body.reason };
      if (booking.commission_status !== 'paid') update.commission_status = 'waived';
    }

    const { error } = await sb.from('bookings').update(update).eq('id', id);
    if (error) {
      console.error('Booking update failed:', error);
      throw new HttpError(500, 'Could not save the change. Please try again.');
    }

    await syncCommissionRecords(sb, booking, update, body.action);

    // Emails never block the save
    try {
      if (body.action === 'assign' && body.notify) {
        await sendManualBookingEmails(id, { customer: false, partner: true, subjectPrefix: 'Updated: ' });
        if (booking.partner_id && booking.partner_id !== update.partner_id) await sendReassignedAwayEmail(id, booking.partner_id);
      }
      if (body.action === 'payment' && body.notify) await sendManualBookingEmails(id, { customer: true, partner: false, subjectPrefix: 'Updated: ' });
      if (body.action === 'cancel' && body.notify) await sendCancellationEmails(id, body.reason);
    } catch (e) { console.error('Booking update emails failed:', e); }

    return NextResponse.json({ booking: await loadBookingView(id) });
  } catch (e) { return jsonError(e); }
}
