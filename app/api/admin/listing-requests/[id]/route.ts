import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, requireCaller } from '@/lib/server-auth';
import { actOnListingRequest } from '@/lib/listings/admin';

export const dynamic = 'force-dynamic';

const body = z.object({
  action: z.enum(['link_owner', 'remove_listing', 'restore_listing', 'reject', 'mark_done']),
  note: z.string().max(500).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireCaller(req, ['admin']);
    const parsed = body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, 'Unknown action');
    const result = await actOnListingRequest(params.id, parsed.data.action, parsed.data.note);
    return NextResponse.json({ ok: true, result });
  } catch (e) { return jsonError(e); }
}
