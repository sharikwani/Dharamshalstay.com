import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { HttpError, jsonError, requireCaller, serviceClient } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/** GET ?status=pending|active|inactive|rejected: guide sign-ups for the owner to review. */
export async function GET(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    const status = new URL(req.url).searchParams.get('status') || 'pending';
    const { data, error } = await serviceClient().from('guides').select('*').eq('status', status).order('created_at', { ascending: false }).limit(200);
    if (error) throw new HttpError(500, 'Run migration v54 first (local guides).');
    return NextResponse.json({ guides: data || [] });
  } catch (e) { return jsonError(e); }
}

const schema = z.object({
  id: z.string().uuid(),
  action: z.enum(['approve', 'reject', 'hide', 'set_flags']),
  verified: z.boolean().optional(),
  hp_registration_verified: z.boolean().optional(),
  note: z.string().max(500).optional(),
});

/** PATCH: approve, reject or hide a guide, or set the Verified / HP-registered badges; public pages update at once. */
export async function PATCH(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    const body = schema.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new HttpError(400, 'Invalid request');
    const b = body.data;
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { updated_at: now };
    if (b.action === 'approve') Object.assign(patch, { status: 'active', published_at: now });
    if (b.action === 'reject') patch.status = 'rejected';
    if (b.action === 'hide') patch.status = 'inactive';
    if (typeof b.verified === 'boolean') patch.verified = b.verified;
    if (typeof b.hp_registration_verified === 'boolean') patch.hp_registration_verified = b.hp_registration_verified;
    if (b.note) patch.admin_notes = b.note;
    const { data, error } = await serviceClient().from('guides').update(patch).eq('id', b.id).select('slug, status').single();
    if (error) throw new HttpError(500, 'Could not update the guide');
    revalidatePath('/local-guides');
    if (data.slug) revalidatePath('/local-guides/' + data.slug);
    return NextResponse.json({ ok: true, status: data.status });
  } catch (e) { return jsonError(e); }
}
