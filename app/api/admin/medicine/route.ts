import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, requireCaller, serviceClient } from '@/lib/server-auth';
import { MEDICINE_BUCKET, MEDICINE_STATUSES, PRESCRIPTION_RETENTION_DAYS } from '@/lib/medicine/options';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/** Prescriptions are health data: delete files older than the retention period (runs whenever admin opens the list). */
async function purgeOldPrescriptions(sb: ReturnType<typeof serviceClient>) {
  const before = new Date(Date.now() - PRESCRIPTION_RETENTION_DAYS * 24 * 3600e3).toISOString();
  const { data } = await sb.from('medicine_requests').select('id, prescription_path').lt('created_at', before).not('prescription_path', 'is', null).limit(100);
  const old = (data || []).filter((r: any) => r.prescription_path);
  if (!old.length) return;
  const { error } = await sb.storage.from(MEDICINE_BUCKET).remove(old.map((r: any) => r.prescription_path));
  if (error) { console.error('Prescription purge failed:', error); return; }
  await sb.from('medicine_requests').update({ prescription_path: null }).in('id', old.map((r: any) => r.id));
}

/** GET ?status=new|checking|doctor_confirmed|delivered|rejected (default new): requests with a 1-hour prescription link. */
export async function GET(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    const status = new URL(req.url).searchParams.get('status') || 'new';
    if (!(MEDICINE_STATUSES as readonly string[]).includes(status)) throw new HttpError(400, 'Unknown status');
    const sb = serviceClient();
    await purgeOldPrescriptions(sb).catch((e) => console.error('Prescription purge failed:', e));
    const { data, error } = await sb.from('medicine_requests').select('*').eq('status', status).order('created_at', { ascending: false }).limit(200);
    if (error) throw new HttpError(500, 'Run migration v57 first (medicine requests).');
    const { data: counts } = await sb.from('medicine_requests').select('status').in('status', ['new', 'checking', 'doctor_confirmed']);
    const open: Record<string, number> = {};
    (counts || []).forEach((r: any) => { open[r.status] = (open[r.status] || 0) + 1; });
    const requests = await Promise.all((data || []).map(async (r: any) => {
      const { ip_hash: _ip, ...rest } = r;
      if (!r.prescription_path) return { ...rest, prescription_url: null };
      const { data: signed } = await sb.storage.from(MEDICINE_BUCKET).createSignedUrl(r.prescription_path, 3600);
      return { ...rest, prescription_url: signed?.signedUrl || null };
    }));
    return NextResponse.json({ requests, open });
  } catch (e) { return jsonError(e); }
}

const schema = z.object({
  id: z.string().uuid(),
  status: z.enum(MEDICINE_STATUSES).optional(),
  note: z.string().max(1000).optional(),
});

/** PATCH: move a request along (checking, doctor confirmed, delivered, rejected) and keep a note. */
export async function PATCH(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    const body = schema.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new HttpError(400, 'Invalid request');
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.data.status) patch.status = body.data.status;
    if (typeof body.data.note === 'string') patch.admin_notes = body.data.note;
    const { data, error } = await serviceClient().from('medicine_requests').update(patch).eq('id', body.data.id).select('status').maybeSingle();
    if (error) throw new HttpError(500, 'Could not update the request');
    if (!data) throw new HttpError(404, 'Request not found');
    return NextResponse.json({ ok: true, status: data.status });
  } catch (e) { return jsonError(e); }
}
