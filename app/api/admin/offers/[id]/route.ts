// app/api/admin/offers/[id]/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, requireCaller, serviceClient } from '@/lib/server-auth';
import { planKey, roomPlans } from '@/lib/offers/rules';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; // Next 14 caches GET fetches (Supabase reads) in route handlers otherwise

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ONE_ACTIVE = 'Another offer is already on for this hotel. Turn it off first.';
const percent = z.number().int().min(1, 'Percent must be 1-90').max(90, 'Percent must be 1-90');

const patchSchema = z.object({
  name: z.string().trim().min(2).max(100),
  active: z.boolean(),
  default_percent: percent,
  plan_percents: z.record(percent),
  valid_hours: z.number().int().min(1, 'Validity must be 1-168 hours').max(168, 'Validity must be 1-168 hours'),
  code_prefix: z.string().regex(/^[A-Z]{2,5}$/, 'Code prefix must be 2-5 capital letters'),
}).partial();

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireCaller(req, ['admin']);
    if (!UUID.test(params.id)) throw new HttpError(404, 'Offer not found');
    const body = patchSchema.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new HttpError(400, body.error.issues[0]?.message || 'Invalid offer');
    const sb = serviceClient();
    const { data: offer, error: oErr } = await sb.from('offers').select('id, property_id, properties(rooms)').eq('id', params.id).maybeSingle();
    if (oErr) throw oErr;
    if (!offer) throw new HttpError(404, 'Offer not found');

    if (body.data.plan_percents) {
      const known = new Set(roomPlans((offer as any).properties?.rooms).flatMap((r) => r.plans.map((p) => planKey(r.room, p))));
      const bad = Object.keys(body.data.plan_percents).find((k) => !known.has(k));
      if (bad) throw new HttpError(400, `Unknown room or rate plan: ${bad}`);
    }
    if (body.data.active) {
      const { data: others, error: aErr } = await sb.from('offers').select('id')
        .eq('property_id', (offer as any).property_id).eq('active', true).neq('id', params.id);
      if (aErr) throw aErr;
      if ((others || []).length) throw new HttpError(409, ONE_ACTIVE);
    }

    const { data, error } = await sb.from('offers').update({ ...body.data, updated_at: new Date().toISOString() }).eq('id', params.id).select('*').single();
    if (error?.code === '23505') throw new HttpError(409, ONE_ACTIVE);
    if (error) throw error;
    return NextResponse.json({ offer: data });
  } catch (e) { return jsonError(e); }
}
