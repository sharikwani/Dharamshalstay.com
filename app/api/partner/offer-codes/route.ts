import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, requireCaller } from '@/lib/server-auth';
import { assertActive } from '@/lib/partners/load';
import { checkCode, redeemCode, type Viewer } from '@/lib/offers/verify';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; // Next 14 caches GET fetches (Supabase reads) in route handlers otherwise

const schema = z.object({ action: z.enum(['check', 'redeem']), code: z.string().trim().min(4).max(20) });

/** Check a WhatsApp offer code for one of the caller's own properties, or mark it used. */
export async function POST(req: Request) {
  try {
    const caller = await requireCaller(req, ['partner']);
    assertActive(caller.profile.partner_status);
    const body = schema.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new HttpError(400, 'Enter the offer code');
    const viewer: Viewer = { id: caller.profile.id, role: 'partner' };
    if (body.data.action === 'check') return NextResponse.json({ result: await checkCode(body.data.code, { viewer }) });
    const r = await redeemCode(body.data.code, viewer);
    return r.ok ? NextResponse.json({ result: r.result }) : NextResponse.json({ error: r.error, result: r.result ?? null }, { status: r.status });
  } catch (e) { return jsonError(e); }
}
