// app/api/admin/offers/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, requireCaller, serviceClient } from '@/lib/server-auth';
import { codeState, maxPercent, roomPlans } from '@/lib/offers/rules';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STORED = ['booked', 'redeemed', 'cancelled'];
const RECENT_MS = 10 * 60 * 1000;

export async function GET(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    const url = new URL(req.url);
    const status = url.searchParams.get('status') || '';
    const offerId = url.searchParams.get('offer_id') || '';
    const sb = serviceClient();
    const now = new Date().toISOString();

    let codes = sb.from('offer_codes').select('*, offers(name), bookings(booking_ref)');
    if (UUID.test(offerId)) codes = codes.eq('offer_id', offerId);
    if (status === 'issued') codes = codes.eq('status', 'issued').gt('expires_at', now);
    else if (status === 'expired') codes = codes.eq('status', 'issued').lte('expires_at', now);
    else if (STORED.includes(status)) codes = codes.eq('status', status);

    const [o, p, c] = await Promise.all([
      sb.from('offers').select('*, properties(name, rooms)').order('created_at', { ascending: false }),
      sb.from('properties').select('id, name').order('name').limit(1000),
      codes.order('issued_at', { ascending: false }).limit(200),
    ]);
    if (o.error) throw o.error;
    if (p.error) throw p.error;
    if (c.error) throw c.error;

    return NextResponse.json({
      offers: (o.data || []).map(({ properties, ...offer }: any) => ({
        ...offer, property_name: properties?.name ?? '', rooms: roomPlans(properties?.rooms), up_to: maxPercent(offer),
      })),
      codes: (c.data || []).map(({ offers, bookings, ...code }: any) => ({
        ...code, state: codeState(code), offer_name: offers?.name ?? '', booking_ref: bookings?.booking_ref ?? null,
      })),
      properties: p.data || [],
    });
  } catch (e) { return jsonError(e); }
}

const createSchema = z.object({
  property_id: z.string().uuid(),
  name: z.string().trim().min(2).max(100).optional(),
  default_percent: z.number().int().min(1, 'Percent must be 1-90').max(90, 'Percent must be 1-90'),
  valid_hours: z.number().int().min(1).max(168).default(3),
  code_prefix: z.string().regex(/^[A-Z]{2,5}$/, 'Code prefix must be 2-5 capital letters'),
});

export async function POST(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    const body = createSchema.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new HttpError(400, body.error.issues[0]?.message || 'Invalid offer');
    const sb = serviceClient();
    const { data: prop, error: pErr } = await sb.from('properties').select('id, name').eq('id', body.data.property_id).maybeSingle();
    if (pErr) throw pErr;
    if (!prop) throw new HttpError(404, 'Property not found');
    // A repeated "Add offer" (double click, lost response) gets the inactive offer it just made, not a second one.
    const since = new Date(Date.now() - RECENT_MS).toISOString();
    const { data: recent, error: rErr } = await sb.from('offers').select('*')
      .eq('property_id', prop.id).eq('active', false).gte('created_at', since)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (rErr) throw rErr;
    if (recent) return NextResponse.json({ offer: recent, duplicate: true });
    const { data, error } = await sb.from('offers')
      .insert({ ...body.data, name: body.data.name || `WhatsApp offer – ${prop.name}`, active: false, plan_percents: {} })
      .select('*').single();
    if (error) throw error;
    return NextResponse.json({ offer: data });
  } catch (e) { return jsonError(e); }
}
