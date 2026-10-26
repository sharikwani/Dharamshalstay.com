import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { HttpError, jsonError, requireCaller, serviceClient } from '@/lib/server-auth';
import { GUIDE_UPLOAD_BUCKET, publishGuidePhoto } from '@/lib/guides/store';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/** GET ?status=pending|active|inactive|rejected: guide sign-ups for the owner to review, with a private photo preview link. */
export async function GET(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    const status = new URL(req.url).searchParams.get('status') || 'pending';
    const sb = serviceClient();
    const { data, error } = await sb.from('guides').select('*').eq('status', status).order('created_at', { ascending: false }).limit(200);
    if (error) throw new HttpError(500, 'Run migration v54 first (local guides).');
    const guides = await Promise.all((data || []).map(async (g: any) => {
      if (g.photo || !g.photo_upload) return { ...g, photo_preview: g.photo || null };
      const { data: signed } = await sb.storage.from(GUIDE_UPLOAD_BUCKET).createSignedUrl(g.photo_upload, 3600);
      return { ...g, photo_preview: signed?.signedUrl || null };
    }));
    return NextResponse.json({ guides });
  } catch (e) { return jsonError(e); }
}

const schema = z.object({
  id: z.string().uuid(),
  action: z.enum(['approve', 'reject', 'hide', 'set_flags']),
  verified: z.boolean().optional(),
  hp_registration_verified: z.boolean().optional(),
  note: z.string().max(500).optional(),
});

/** PATCH: approve (publishes the photo), reject (deletes it) or hide a guide, or set the badges; public pages update at once. */
export async function PATCH(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    const body = schema.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new HttpError(400, 'Invalid request');
    const b = body.data;
    const sb = serviceClient();
    const { data: g, error: loadErr } = await sb.from('guides').select('id, slug, photo, photo_upload').eq('id', b.id).maybeSingle();
    if (loadErr || !g) throw new HttpError(404, 'Guide not found');

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { updated_at: now };
    if (b.action === 'approve') {
      Object.assign(patch, { status: 'active', published_at: now });
      if (!g.photo) patch.photo = await publishGuidePhoto(g.photo_upload);
    }
    if (b.action === 'reject') {
      patch.status = 'rejected';
      if (g.photo_upload) { await sb.storage.from(GUIDE_UPLOAD_BUCKET).remove([g.photo_upload]); patch.photo_upload = null; }
    }
    if (b.action === 'hide') patch.status = 'inactive';
    if (typeof b.verified === 'boolean') patch.verified = b.verified;
    if (typeof b.hp_registration_verified === 'boolean') patch.hp_registration_verified = b.hp_registration_verified;
    if (b.note) patch.admin_notes = b.note;
    const { data, error } = await sb.from('guides').update(patch).eq('id', b.id).select('slug, status').single();
    if (error) throw new HttpError(500, 'Could not update the guide');
    revalidatePath('/local-guides');
    if (data.slug) revalidatePath('/local-guides/' + data.slug);
    return NextResponse.json({ ok: true, status: data.status });
  } catch (e) { return jsonError(e); }
}
