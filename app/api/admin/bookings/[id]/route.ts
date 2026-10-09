import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, requireCaller, serviceClient } from '@/lib/server-auth';
import { checkAssignment, commissionRateFor, paymentFields, splitAmount } from '@/lib/manual-booking';
import { loadBookingView, sendCancellationEmails, sendManualBookingEmails } from '@/lib/manual-booking-emails';

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

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireCaller(req, ['admin']);
    const booking = await loadBookingView(params.id);
    if (!booking) throw new HttpError(404, 'Booking not found.');
    return NextResponse.json({ booking });
  } catch (e) { return jsonError(e); }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireCaller(req, ['admin']);
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
      update = paymentFields(body.choice, booking.category, Number(booking.amount), {
        amountReceived: body.amount_received, channel: body.channel, reference: body.reference,
      });
    } else {
      update = { status: 'cancelled', cancel_reason: body.reason };
      if (booking.commission_status !== 'paid') update.commission_status = 'waived';
    }

    const { error } = await sb.from('bookings').update(update).eq('id', id);
    if (error) {
      console.error('Booking update failed:', error);
      throw new HttpError(500, 'Could not save the change. Please try again.');
    }

    // Emails never block the save
    try {
      if (body.action === 'assign' && body.notify) await sendManualBookingEmails(id, { customer: false, partner: true, subjectPrefix: 'Updated: ' });
      if (body.action === 'payment' && body.notify) await sendManualBookingEmails(id, { customer: true, partner: false, subjectPrefix: 'Updated: ' });
      if (body.action === 'cancel' && body.notify) await sendCancellationEmails(id, body.reason);
    } catch (e) { console.error('Booking update emails failed:', e); }

    return NextResponse.json({ booking: await loadBookingView(id) });
  } catch (e) { return jsonError(e); }
}
