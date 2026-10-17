import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, requireCaller } from '@/lib/server-auth';
import { setReply, setReviewStatus } from '@/lib/reviews/moderate';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; // Next 14 caches GET fetches (Supabase reads) in route handlers otherwise

const bodySchema = z.union([
  z.object({ status: z.enum(['approved', 'rejected', 'hidden']) }).strict(),
  z.object({ owner_reply: z.string().max(5000) }).strict(),
]);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { user } = await requireCaller(req, ['admin']);
    if (!z.string().uuid().safeParse(params.id).success) throw new HttpError(400, 'Unknown review');
    const body = bodySchema.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new HttpError(400, 'Invalid request');
    if ('status' in body.data) {
      const summary = await setReviewStatus(params.id, body.data.status, user.id);
      return NextResponse.json({ ok: true, summary });
    }
    await setReply(params.id, { by: 'owner' }, body.data.owner_reply);
    return NextResponse.json({ ok: true });
  } catch (e) { return jsonError(e); }
}
