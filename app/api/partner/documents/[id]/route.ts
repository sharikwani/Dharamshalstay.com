import { NextResponse } from 'next/server';
import { HttpError, jsonError, serviceClient } from '@/lib/server-auth';
import { KYC_BUCKET, requireActivityPartner } from '@/lib/partners/load';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { profile } = await requireActivityPartner(req, { editable: true });
    const sb = serviceClient();
    const { data: d } = await sb.from('partner_documents').select('id, storage_path, status').eq('id', params.id).eq('partner_id', profile.id).single();
    if (!d) throw new HttpError(404, 'Document not found.');
    if (d.status === 'approved') throw new HttpError(409, 'Approved documents cannot be removed.');
    await sb.storage.from(KYC_BUCKET).remove([d.storage_path]);
    await sb.from('partner_documents').delete().eq('id', d.id);
    return NextResponse.json({ ok: true });
  } catch (e) { return jsonError(e); }
}
