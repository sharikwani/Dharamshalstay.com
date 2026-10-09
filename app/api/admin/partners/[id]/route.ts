import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, requireCaller, serviceClient } from '@/lib/server-auth';
import { loadOnboarding } from '@/lib/partners/load';
import { canVerify } from '@/lib/partners/admin-actions';
import { emailPartnerDecision } from '@/lib/partners/emails';

export const dynamic = 'force-dynamic';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve_doc'), document_id: z.string().uuid() }),
  z.object({ action: z.literal('reject_doc'), document_id: z.string().uuid(), reason: z.string().trim().min(3).max(500) }),
  z.object({ action: z.literal('verify') }),
  z.object({ action: z.literal('request_changes'), note: z.string().trim().min(3).max(2000) }),
  z.object({ action: z.literal('reject'), note: z.string().trim().min(3).max(2000) }),
  z.object({ action: z.literal('suspend'), note: z.string().trim().min(3).max(2000) }),
  z.object({ action: z.literal('reinstate') }),
  z.object({ action: z.literal('set_commission'), commission_pct: z.number().min(0).max(100) }),
]);

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireCaller(req, ['admin']);
    return NextResponse.json(await loadOnboarding(params.id));
  } catch (e) { return jsonError(e); }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { profile: admin } = await requireCaller(req, ['admin']);
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new HttpError(400, 'Invalid action. A reason or note is required for rejections.');
    const a = parsed.data;
    const sb = serviceClient();
    const state = await loadOnboarding(params.id);
    const p = state.profile;
    const now = new Date().toISOString();
    const name = p.legal_name || p.full_name || 'Partner';

    if (a.action === 'approve_doc' || a.action === 'reject_doc') {
      const { data: d } = await sb.from('partner_documents').select('id').eq('id', a.document_id).eq('partner_id', p.id).single();
      if (!d) throw new HttpError(404, 'Document not found.');
      await sb.from('partner_documents').update({
        status: a.action === 'approve_doc' ? 'approved' : 'rejected',
        rejection_reason: a.action === 'reject_doc' ? a.reason : null,
        reviewed_by: admin.id, reviewed_at: now,
      }).eq('id', d.id);
    } else if (a.action === 'verify') {
      const reason = canVerify(state);
      if (reason) throw new HttpError(409, reason);
      await sb.from('profiles').update({ partner_status: 'verified', verified_at: now, verification_note: null }).eq('id', p.id);
      await emailPartnerDecision(p.email, name, 'verified');
    } else if (a.action === 'request_changes' || a.action === 'reject' || a.action === 'suspend') {
      const status = a.action === 'request_changes' ? 'changes_requested' : a.action === 'reject' ? 'rejected' : 'suspended';
      await sb.from('profiles').update({ partner_status: status, verification_note: a.note }).eq('id', p.id);
      await emailPartnerDecision(p.email, name, status, a.note);
    } else if (a.action === 'reinstate') {
      if (p.partner_status !== 'suspended') throw new HttpError(409, 'Only suspended partners can be reinstated.');
      await sb.from('profiles').update({ partner_status: 'verified', verification_note: null }).eq('id', p.id);
      await emailPartnerDecision(p.email, name, 'verified');
    } else if (a.action === 'set_commission') {
      await sb.from('profiles').update({ commission_pct: a.commission_pct }).eq('id', p.id);
    }
    return NextResponse.json(await loadOnboarding(params.id));
  } catch (e) { return jsonError(e); }
}
