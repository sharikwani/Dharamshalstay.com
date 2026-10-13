import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, requireCaller, serviceClient } from '@/lib/server-auth';
import { loadOnboarding } from '@/lib/partners/load';
import { canVerify } from '@/lib/partners/admin-actions';
import { whatsappProfilePatch } from '@/lib/partners/whatsapp';
import { emailPartnerDecision } from '@/lib/partners/emails';
import { inBackground } from '@/lib/background';

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
    // Set after every successful write, so a failed reload afterwards is not reported as an error.
    let committed = false;
    const saveProfile = async (patch: Record<string, unknown>) => {
      const { error } = await sb.from('profiles').update(patch).eq('id', p.id);
      if (error) { console.error(error); throw new HttpError(500, SAVE_FAILED); }
      committed = true;
    };
    type Decision = 'verified' | 'changes_requested' | 'rejected' | 'suspended';
    /**
     * A status decision changes the row only if it still has the status this decision was made on, so a double
     * click or two admins at once make one change and send one email. The email goes out after the response.
     */
    const decide = async (target: Decision, patch: Record<string, unknown>, note?: string) => {
      if (p.partner_status === target) return; // already in place: nothing to change, nobody to email again
      const { data: changed, error } = await sb.from('profiles').update({ ...patch, partner_status: target })
        .eq('id', p.id).eq('partner_status', p.partner_status).select('id');
      if (error) { console.error(error); throw new HttpError(500, SAVE_FAILED); }
      if (!changed?.length) {
        // Someone else changed the status meanwhile: fine if it is this same decision, otherwise ask to reload.
        const current = await loadOnboarding(params.id);
        if (current.profile.partner_status === target) return;
        throw new HttpError(409, "This partner's status changed meanwhile. Reload the page and try again.");
      }
      committed = true;
      inBackground('Partner decision email', () => (note ? emailPartnerDecision(p.email, name, target, note) : emailPartnerDecision(p.email, name, target)));
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
      committed = true;
    } else if ((a.action === 'verify' || a.action === 'reinstate') && p.partner_status === 'verified') {
      // Already verified (double click, another admin): nothing to change and no second email.
    } else if (a.action === 'verify') {
      // Only a partner who signed and submitted can be verified; suspended partners use reinstate.
      if (p.partner_status !== 'pending_verification') throw new HttpError(409, 'Only partners waiting for review can be verified.');
      const reason = canVerify(state);
      if (reason) throw new HttpError(409, reason);
      await decide('verified', { verified_at: now, verification_note: null });
    } else if (a.action === 'request_changes' || a.action === 'reject' || a.action === 'suspend') {
      const status = a.action === 'request_changes' ? 'changes_requested' : a.action === 'reject' ? 'rejected' : 'suspended';
      await decide(status, { verification_note: a.note }, a.note);
    } else if (a.action === 'reinstate') {
      if (p.partner_status !== 'suspended') throw new HttpError(409, 'Only suspended partners can be reinstated.');
      await decide('verified', { verification_note: null });
    } else if (a.action === 'set_commission') {
      await saveProfile({ commission_pct: a.commission_pct });
    } else if (a.action === 'set_whatsapp') {
      await saveProfile(whatsappProfilePatch({
        rawNumber: a.whatsapp_number || p.whatsapp_number || p.phone, alerts: a.whatsapp_alerts, wasOn: !!p.whatsapp_alerts, by: 'admin',
      }));
    }
    try {
      return NextResponse.json(await loadOnboarding(params.id));
    } catch (e) {
      // The decision is saved; a slow or failed reload must not report it as an error.
      if (!committed) throw e;
      console.error('Partner reload after a saved decision failed:', e);
      return NextResponse.json({ saved: true, reload: true });
    }
  } catch (e) { return jsonError(e); }
}
