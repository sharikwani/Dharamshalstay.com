import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { HttpError, jsonError, requireCaller, serviceClient } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/** GET ?status=pending|published|rejected|hidden: local service sign-ups for the owner to review. */
export async function GET(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    const status = new URL(req.url).searchParams.get('status') || 'pending';
    const { data, error } = await serviceClient().from('local_services').select('*').eq('status', status).order('created_at', { ascending: false }).limit(200);
    if (error) throw new HttpError(500, 'Run migration v52 first (local_services table).');
    return NextResponse.json({ services: data || [] });
  } catch (e) { return jsonError(e); }
}

const schema = z.object({ id: z.string().uuid(), action: z.enum(['approve', 'reject', 'hide']), note: z.string().max(500).optional() });

/** PATCH: approve, reject or hide a listing; public pages update at once. */
export async function PATCH(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    const body = schema.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new HttpError(400, 'Invalid request');
    const status = body.data.action === 'approve' ? 'published' : body.data.action === 'reject' ? 'rejected' : 'hidden';
    const { data, error } = await serviceClient().from('local_services').update({
      status, admin_notes: body.data.note || null, updated_at: new Date().toISOString(),
      ...(status === 'published' ? { published_at: new Date().toISOString() } : {}),
    }).eq('id', body.data.id).select('slug').single();
    if (error) throw new HttpError(500, 'Could not update the listing');
    revalidatePath('/luggage-storage');
    revalidatePath('/luggage-storage/' + data.slug);
    return NextResponse.json({ ok: true, status });
  } catch (e) { return jsonError(e); }
}
