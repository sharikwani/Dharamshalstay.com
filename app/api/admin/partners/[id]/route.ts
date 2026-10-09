import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, requireCaller, serviceClient } from '@/lib/server-auth';
import { loadOnboarding } from '@/lib/partners/load';
import { canVerify } from '@/lib/partners/admin-actions';
import { normalizeIndianPhone } from '@/lib/whatsapp';
import { emailPartnerDecision } from '@/lib/partners/emails';

export const dynamic = 'force-dynamic';

const PARTNER_TYPES = ['paragliding', 'taxi', 'trek'];
const SAVE_FAILED = 'Could not save. Please try again.';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve_doc'), document_id: z.string().uuid() }),
  z.object({ action: z.literal('reject_doc'), document_id: z.string().uuid(), reason: z.string().trim().min(3).max(500) }),
  z.object({ action: z.literal('verify') }),
  z.object({ action: z.literal('request_changes'), note: z.string().trim().min(3).max(2000) }),
  z.object({ action: z.literal('reject'), note: z.string().trim().min(3).max(2000) }),
  z.object({ action: z.literal('suspend'), note: z.string().trim().min(3).max(2000) }),
  z.object({ action: z.literal('reinstate') }),
  z.object({ action: z.literal('set_commission'), commission_pct: z.number().min(0).max(100) }),
  z.object({ action: z.literal('set_whatsapp'), whatsapp_number: z.string().trim().max(20).optional(), whatsapp_alerts: z.boolean() }),
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
    if (!PARTNER_TYPES.includes(p.partner_type)) throw new HttpError(404, 'Partner not found.');
    const now = new Date().toISOString();
    const name = p.legal_name || p.full_name || 'Partner';
    const saveProfile = async (patch: Record<string, unknown>) => {
      const { error } = await sb.from('profiles').update(patch).eq('id', p.id);
      if (error) { console.error(error); throw new HttpError(500, SAVE_FAILED); }
    };

    if (a.action === 'approve_doc' || a.action === 'reject_doc') {
      const { data: d, error: lookupError } = await sb.from('partner_documents').select('id').eq('id', a.document_id).eq('partner_id', p.id).single();
      if (lookupError && lookupError.code !== 'PGRST116') throw lookupError;
      if (!d) throw new HttpError(404, 'Document not found.');
      const { error } = await sb.from('partner_documents').update({
        status: a.action === 'approve_doc' ? 'approved' : 'rejected',
        rejection_reason: a.action === 'reject_doc' ? a.reason : null,
        reviewed_by: admin.id, reviewed_at: now,
      }).eq('id', d.id);
      if (error) { console.error(error); throw new HttpError(500, SAVE_FAILED); }
    } else if (a.action === 'verify') {
      const reason = canVerify(state);
      if (reason) throw new HttpError(409, reason);
      await saveProfile({ partner_status: 'verified', verified_at: now, verification_note: null });
      await emailPartnerDecision(p.email, name, 'verified');
    } else if (a.action === 'request_changes' || a.action === 'reject' || a.action === 'suspend') {
      const status = a.action === 'request_changes' ? 'changes_requested' : a.action === 'reject' ? 'rejected' : 'suspended';
      await saveProfile({ partner_status: status, verification_note: a.note });
      await emailPartnerDecision(p.email, name, status, a.note);
    } else if (a.action === 'reinstate') {
      if (p.partner_status !== 'suspended') throw new HttpError(409, 'Only suspended partners can be reinstated.');
      await saveProfile({ partner_status: 'verified', verification_note: null });
      await emailPartnerDecision(p.email, name, 'verified');
    } else if (a.action === 'set_commission') {
      await saveProfile({ commission_pct: a.commission_pct });
    } else if (a.action === 'set_whatsapp') {
      const raw = a.whatsapp_number || p.whatsapp_number || p.phone;
      const number = normalizeIndianPhone(raw);
      if ((a.whatsapp_alerts || a.whatsapp_number) && !number) throw new HttpError(400, 'Enter a valid Indian mobile number for WhatsApp.');
      await saveProfile({
        whatsapp_number: number, whatsapp_alerts: a.whatsapp_alerts,
        ...(a.whatsapp_alerts && !p.whatsapp_alerts ? { whatsapp_opt_in_at: now } : {}),
      });
    }
    return NextResponse.json(await loadOnboarding(params.id));
  } catch (e) { return jsonError(e); }
}
