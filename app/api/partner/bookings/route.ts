import { NextResponse } from 'next/server';
import { requireCaller, serviceClient, jsonError } from '@/lib/server-auth';
import { toBookingViews } from '@/lib/manual-booking-emails';

export const dynamic = 'force-dynamic';

const REVEAL_CONTACT = ['confirmed', 'completed'];

export async function GET(req: Request) {
  try {
    const caller = await requireCaller(req, ['partner']);
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
    const bookings = views.map((v) => {
      const show = REVEAL_CONTACT.includes(v.status);
      return {
        id: v.id, booking_ref: v.booking_ref, category: v.category, status: v.status,
        item_name: v.item_name, date_text: v.date_text, assignee_text: v.assignee_text,
        num_guests: v.num_guests, amount: v.amount, collected_by: v.collected_by, payment_text: v.payment_text,
        commission_amount: v.commission_amount, partner_share_amount: v.partner_share_amount,
        special_requests: v.special_requests ?? null, created_at: v.created_at,
        guest_name: v.guest_name,
        guest_phone: show ? v.guest_phone ?? null : null,
        guest_email: show ? v.guest_email ?? null : null,
      };
    });
    return NextResponse.json({ bookings });
  } catch (e) { return jsonError(e); }
}
