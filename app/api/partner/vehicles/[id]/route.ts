import { NextResponse } from 'next/server';
import { HttpError, jsonError, serviceClient } from '@/lib/server-auth';
import { KYC_BUCKET, requireActivityPartner } from '@/lib/partners/load';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { profile } = await requireActivityPartner(req, { editable: true });
    const sb = serviceClient();
    const { data: v } = await sb.from('vehicles').select('id').eq('id', params.id).eq('partner_id', profile.id).single();
    if (!v) throw new HttpError(404, 'Vehicle not found.');
    const { data: docs } = await sb.from('partner_documents').select('storage_path').eq('vehicle_id', v.id);
    if (docs?.length) await sb.storage.from(KYC_BUCKET).remove(docs.map((d: any) => d.storage_path));
    await sb.from('vehicles').delete().eq('id', v.id);
    return NextResponse.json({ ok: true });
  } catch (e) { return jsonError(e); }
}
