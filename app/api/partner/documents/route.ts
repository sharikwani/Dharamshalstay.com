import { NextResponse } from 'next/server';
import { HttpError, jsonError, serviceClient } from '@/lib/server-auth';
import { KYC_BUCKET, requireActivityPartner } from '@/lib/partners/load';
import { DOC_TYPES, docTarget, type DocType } from '@/lib/partners/types';
import { checkUpload } from '@/lib/partners/validate';

export const runtime = 'nodejs';
function isRealDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const t = Date.parse(s + 'T00:00:00Z');
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s;
}
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'application/pdf': 'pdf' };

export async function POST(req: Request) {
  try {
    const { profile } = await requireActivityPartner(req, { editable: true });
    const form = await req.formData();
    const file = form.get('file');
    const docType = String(form.get('doc_type') || '') as DocType;
    const staffId = (form.get('staff_id') as string) || null;
    const vehicleId = (form.get('vehicle_id') as string) || null;
    const expiresOn = (form.get('expires_on') as string) || null;

    if (!(file instanceof File)) throw new HttpError(400, 'Choose a file to upload.');
    if (!DOC_TYPES.includes(docType)) throw new HttpError(400, 'Unknown document type.');
    const problem = checkUpload({ type: file.type, size: file.size });
    if (problem) throw new HttpError(400, problem);
    if (expiresOn && !isRealDate(expiresOn)) throw new HttpError(400, 'Expiry date is not valid.');

    const sb = serviceClient();
    const target = docTarget(docType);
    if (target === 'staff') {
      if (!staffId) throw new HttpError(400, 'Choose which person this licence belongs to.');
      const { data: s } = await sb.from('partner_staff').select('id').eq('id', staffId).eq('partner_id', profile.id).single();
      if (!s) throw new HttpError(404, 'Person not found.');
    }
    if (target === 'vehicle') {
      if (!vehicleId) throw new HttpError(400, 'Choose which vehicle this document is for.');
      const { data: v } = await sb.from('vehicles').select('id').eq('id', vehicleId).eq('partner_id', profile.id).single();
      if (!v) throw new HttpError(404, 'Vehicle not found.');
    }
    const sId = target === 'staff' ? staffId : null;
    const vId = target === 'vehicle' ? vehicleId : null;

    // Replace any earlier upload in the same slot that is not yet approved.
    let prevQuery = sb.from('partner_documents').select('id, storage_path, status').eq('partner_id', profile.id).eq('doc_type', docType);
    prevQuery = sId ? prevQuery.eq('staff_id', sId) : prevQuery.is('staff_id', null);
    prevQuery = vId ? prevQuery.eq('vehicle_id', vId) : prevQuery.is('vehicle_id', null);
    const { data: prev, error: prevErr } = await prevQuery;
    if (prevErr) throw prevErr;
    const replaceable = (prev || []).filter((p: any) => p.status !== 'approved');

    const path = `${profile.id}/${docType}-${crypto.randomUUID()}.${EXT[file.type]}`;
    const { error: upErr } = await sb.storage.from(KYC_BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
    if (upErr) throw upErr;

    const { data: row, error } = await sb.from('partner_documents').insert({
      partner_id: profile.id, doc_type: docType, staff_id: sId, vehicle_id: vId, storage_path: path,
      file_name: file.name.slice(0, 200), mime_type: file.type, expires_on: expiresOn,
    }).select('id').single();
    if (error) { await sb.storage.from(KYC_BUCKET).remove([path]); throw error; }

    if (replaceable.length) {
      const { error: delErr } = await sb.from('partner_documents').delete().in('id', replaceable.map((p: any) => p.id));
      if (delErr) throw delErr;
      const { error: rmErr } = await sb.storage.from(KYC_BUCKET).remove(replaceable.map((p: any) => p.storage_path));
      if (rmErr) console.error('KYC file cleanup failed', rmErr);
    }
    return NextResponse.json({ ok: true, id: row.id });
  } catch (e) { return jsonError(e); }
}
