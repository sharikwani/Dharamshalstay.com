import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, clientIp, jsonError, serviceClient } from '@/lib/server-auth';
import { KYC_BUCKET, loadOnboarding, requireActivityPartner } from '@/lib/partners/load';
import { agreementFor, sha256Hex } from '@/lib/partners/agreement';
import { renderAgreementPdf } from '@/lib/partners/agreement-pdf';
import { namesMatch } from '@/lib/partners/validate';
import { emailAdminPartnerSubmitted, emailAgreementCopy } from '@/lib/partners/emails';

export const runtime = 'nodejs';
const schema = z.object({ signed_name: z.string().trim().min(2).max(200), accepted: z.literal(true) });

export async function POST(req: Request) {
  try {
    const { profile, user } = await requireActivityPartner(req, { editable: true });
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new HttpError(400, 'Tick the box and type your full name to sign.');

    const state = await loadOnboarding(profile.id);
    if (!state.readyToSign) throw new HttpError(409, 'Finish the remaining steps before signing: ' + state.missing.filter((m) => m.key !== 'agreement').map((m) => m.label).join(', '));
    if (!namesMatch(parsed.data.signed_name, profile.legal_name || '')) {
      throw new HttpError(400, `Type your name exactly as entered in your details: ${profile.legal_name}`);
    }

    const a = agreementFor(profile.partner_type);
    const sha256 = sha256Hex(a.body);
    const signedAt = new Date().toISOString();
    const ip = clientIp(req);
    const userAgent = (req.headers.get('user-agent') || '').slice(0, 500);
    const pdf = await renderAgreementPdf({ ...a, signedName: parsed.data.signed_name, signedAt, ip, email: user.email || profile.email, sha256 });

    const sb = serviceClient();
    const pdfPath = `${profile.id}/agreement-${a.version}-${Date.now()}.pdf`;
    const { error: upErr } = await sb.storage.from(KYC_BUCKET).upload(pdfPath, Buffer.from(pdf), { contentType: 'application/pdf' });
    if (upErr) throw upErr;

    // Append-only: a re-sign (e.g. after changes_requested) adds a new row; earlier signatures are kept.
    const { error: insErr } = await sb.from('partner_agreements').insert({
      partner_id: profile.id, version: a.version, body_text: a.body, body_sha256: sha256,
      signed_name: parsed.data.signed_name, signed_at: signedAt, ip, user_agent: userAgent, pdf_path: pdfPath,
    });
    if (insErr) throw insErr;

    const { error: upd } = await sb.from('profiles').update({ partner_status: 'pending_verification', submitted_at: signedAt, verification_note: null }).eq('id', profile.id);
    if (upd) throw upd;

    await emailAgreementCopy(user.email || profile.email, profile.legal_name, pdf, a.version);
    await emailAdminPartnerSubmitted({ id: profile.id, legal_name: profile.legal_name, partner_type: profile.partner_type, email: profile.email, phone: profile.phone });
    return NextResponse.json({ ok: true });
  } catch (e) { return jsonError(e); }
}
