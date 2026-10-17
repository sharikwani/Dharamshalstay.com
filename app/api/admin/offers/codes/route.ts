// app/api/admin/offers/codes/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, requireCaller } from '@/lib/server-auth';
import { cancelCode, checkCode, redeemCode, type Viewer } from '@/lib/offers/verify';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; // Next 14 caches GET fetches (Supabase reads) in route handlers otherwise

const schema = z.object({
  action: z.enum(['check', 'redeem', 'cancel']),
  code: z.string().trim().min(4).max(20),
  notes: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  try {
    const caller = await requireCaller(req, ['admin']);
    const body = schema.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new HttpError(400, 'Enter an offer code');
    const viewer: Viewer = { id: caller.profile.id, role: 'admin' };
    const { action, code, notes } = body.data;
    if (action === 'check') return NextResponse.json({ result: await checkCode(code, { viewer }) });
    if (action === 'redeem') {
      const r = await redeemCode(code, viewer);
      return r.ok ? NextResponse.json({ result: r.result }) : NextResponse.json({ error: r.error, result: r.result ?? null }, { status: r.status });
    }
    const r = await cancelCode(code, viewer, notes);
    return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: r.status });
  } catch (e) { return jsonError(e); }
}
