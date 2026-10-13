import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, requireCaller, serviceClient, jsonError } from '@/lib/server-auth';
import { confirmBooking } from '@/lib/bookings/confirm';
import { toBookingViews } from '@/lib/manual-booking-emails';
import { assertActive } from '@/lib/partners/load';

export const dynamic = 'force-dynamic';

const REVEAL_CONTACT = ['confirmed', 'completed'];

export async function GET(req: Request) {
  try {
    const caller = await requireCaller(req, ['partner']);
    assertActive(caller.profile.partner_status);
    const sb = serviceClient();

    let query = sb.from('bookings').select('*');
    if (!caller.profile.partner_type || caller.profile.partner_type === 'hotel') {
      const { data: props, error: propsErr } = await sb.from('properties').select('id').eq('owner_id', caller.profile.id);
      if (propsErr) { console.error('Partner properties load failed:', propsErr); return NextResponse.json({ error: 'Could not load bookings' }, { status: 500 }); }
      const ids = (props || []).map((p: any) => p.id);
      if (!ids.length) return NextResponse.json({ bookings: [] });
      query = query.in('property_id', ids);
    } else {
      query = query.eq('partner_id', caller.profile.id);
    }
    const { data: rows, error } = await query.order('created_at', { ascending: false }).limit(200);
    if (error) { console.error('Partner bookings load failed:', error); return NextResponse.json({ error: 'Could not load bookings' }, { status: 500 }); }

    const views = await toBookingViews(rows || []);
    const responses = new Map((rows || []).map((r: any) => [r.id, r]));
    const bookings = views.map((v) => {
      const row: any = responses.get(v.id);
      const show = REVEAL_CONTACT.includes(v.status);
      return {
        id: v.id, booking_ref: v.booking_ref, category: v.category, status: v.status,
        item_name: v.item_name, date_text: v.date_text, assignee_text: v.assignee_text,
        num_guests: v.num_guests, amount: v.amount, collected_by: v.effective_collector, payment_text: v.payment_text,
        commission_amount: v.commission_amount, commission_status: v.commission_status ?? null, partner_share_amount: v.partner_share_amount,
        special_requests: v.special_requests ?? null, created_at: v.created_at,
        guest_name: v.guest_name,
        partner_response: row?.partner_response ?? null, partner_responded_at: row?.partner_responded_at ?? null,
        offer_code: row?.offer_code ?? null, offer_percent: row?.offer_percent ?? null,
        // Pay-later bookings (not online) can be confirmed by the partner.
        payment_method: row?.payment_method ?? null,
        guest_phone: show ? v.guest_phone ?? null : null,
        guest_email: show ? v.guest_email ?? null : null,
      };
    });
    return NextResponse.json({ bookings });
  } catch (e) { return jsonError(e); }
}

const patchSchema = z.object({ id: z.string().uuid(), action: z.literal('confirm') });

/** The partner confirms a pending booking; the customer is told by email and WhatsApp. */
export async function PATCH(req: Request) {
  try {
    const caller = await requireCaller(req, ['partner']);
    assertActive(caller.profile.partner_status);
    const parsed = patchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, 'Please check the details.');
    const { id } = parsed.data;
    const sb = serviceClient();

    const { data: booking, error } = await sb.from('bookings')
      .select('id, status, property_id, partner_id, payment_method, payment_status').eq('id', id).maybeSingle();
    if (error) throw new HttpError(500, 'Could not load the booking. Please try again.');
    if (!booking) throw new HttpError(404, 'Booking not found.');

    // Same scope as GET: hotel partners see bookings of the properties they own, others their assigned bookings.
    let mine = false;
    if (!caller.profile.partner_type || caller.profile.partner_type === 'hotel') {
      if (booking.property_id) {
        const { data: prop, error: propErr } = await sb.from('properties').select('id')
          .eq('id', booking.property_id).eq('owner_id', caller.profile.id).maybeSingle();
        if (propErr) throw new HttpError(500, 'Could not load the booking. Please try again.');
        mine = Boolean(prop);
      }
    } else {
      mine = booking.partner_id === caller.profile.id;
    }
    if (!mine) throw new HttpError(404, 'Booking not found.');

    // Online bookings are confirmed by their payment.
    if (booking.payment_method === 'online' && booking.payment_status !== 'paid') {
      throw new HttpError(409, 'This booking is waiting for online payment.');
    }
    const r = await confirmBooking(id, 'partner');
    if (!r.ok) throw new HttpError(r.status, r.error);
    return NextResponse.json({ ok: true, already: r.already });
  } catch (e) { return jsonError(e); }
}
