// app/api/partner/reviews/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, requireCaller } from '@/lib/server-auth';
import { assertActive } from '@/lib/partners/load';
import { listPartnerReviews } from '@/lib/reviews/store';
import { setReply } from '@/lib/reviews/moderate';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; // Next 14 caches GET fetches (Supabase reads) in route handlers otherwise

/** Property owners are partners with partner_type 'hotel' or none (older accounts). */
const ownsProperties = (type: unknown) => !type || type === 'hotel';

export async function GET(req: Request) {
  try {
    const { profile } = await requireCaller(req, ['partner']);
    assertActive(profile.partner_status);
    if (!ownsProperties(profile.partner_type)) return NextResponse.json({ reviews: [] });
    return NextResponse.json({ reviews: await listPartnerReviews(profile.id) });
  } catch (e) { return jsonError(e); }
}

const schema = z.object({ review_id: z.string().uuid(), reply: z.string().max(5000) });

export async function POST(req: Request) {
  try {
    const { profile } = await requireCaller(req, ['partner']);
    assertActive(profile.partner_status);
    const body = schema.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new HttpError(400, 'Invalid request');
    await setReply(body.data.review_id, { by: 'partner', partnerId: profile.id }, body.data.reply);
    return NextResponse.json({ ok: true });
  } catch (e) { return jsonError(e); }
}
