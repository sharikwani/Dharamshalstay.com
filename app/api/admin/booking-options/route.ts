import { NextResponse } from 'next/server';
import { HttpError, jsonError, requireCaller, serviceClient } from '@/lib/server-auth';
import { BOOKABLE_STATUS, STAFF_ROLE_FOR, type ActivityCategory } from '@/lib/manual-booking';

export const dynamic = 'force-dynamic';

const ITEMS: Record<string, { table: string; cols: string; order: string }> = {
  hotel: { table: 'properties', cols: 'id, name, destination_slug, price_min, rooms, commission_pct, contact_email, contact_phone, listing_type', order: 'name' },
  taxi: { table: 'taxi_routes', cols: 'id, from_location, to_location, vehicle_category, vehicle_name, price, price_type, commission_pct', order: 'from_location' },
  trek: { table: 'treks', cols: 'id, name, price_per_person, commission_pct', order: 'name' },
  paragliding: { table: 'paragliding_packages', cols: 'id, name, destination, price_per_person, commission_pct', order: 'name' },
  guide: { table: 'guides', cols: 'id, name, phone, email, price_per_day', order: 'name' },
};

export async function GET(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    const type = new URL(req.url).searchParams.get('type') || '';
    const cfg = ITEMS[type];
    if (!cfg) throw new HttpError(400, 'Choose a booking type.');
    const sb = serviceClient();

    const { data: items, error } = await sb.from(cfg.table).select(cfg.cols).eq('status', BOOKABLE_STATUS[type as keyof typeof BOOKABLE_STATUS]).order(cfg.order);
    if (error) throw error;

    let partners: any[] = [];
    if (type === 'taxi' || type === 'trek' || type === 'paragliding') {
      const { data: profs, error: pErr } = await sb.from('profiles')
        .select('id, legal_name, business_name, full_name, phone, email, commission_pct')
        .eq('role', 'partner').eq('partner_status', 'verified').eq('partner_type', type)
        .order('legal_name');
      if (pErr) throw pErr;
      const ids = (profs || []).map((p: any) => p.id);
      let staff: any[] = [];
      let vehicles: any[] = [];
      if (ids.length) {
        const { data: s, error: sErr } = await sb.from('partner_staff')
          .select('id, partner_id, full_name, phone, role').in('partner_id', ids).eq('active', true).eq('role', STAFF_ROLE_FOR[type as ActivityCategory]);
        if (sErr) throw sErr;
        staff = s || [];
        if (type === 'taxi') {
          const { data: v, error: vErr } = await sb.from('vehicles')
            .select('id, partner_id, registration_no, make_model, vehicle_type, seats').in('partner_id', ids).eq('active', true);
          if (vErr) throw vErr;
          vehicles = v || [];
        }
      }
      partners = (profs || []).map((p: any) => ({
        id: p.id, legal_name: p.legal_name, business_name: p.business_name || p.full_name, phone: p.phone, email: p.email,
        commission_pct: p.commission_pct,
        staff: staff.filter((s) => s.partner_id === p.id).map(({ partner_id, ...rest }) => rest),
        vehicles: vehicles.filter((v) => v.partner_id === p.id).map(({ partner_id, ...rest }) => rest),
      }));
    }
    return NextResponse.json({ items: items || [], partners });
  } catch (e) { return jsonError(e); }
}
