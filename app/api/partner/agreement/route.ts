import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, clientIp, jsonError, serviceClient } from '@/lib/server-auth';
import { KYC_BUCKET, loadOnboarding, requireActivityPartner } from '@/lib/partners/load';
import { agreementFor, sha256Hex } from '@/lib/partners/agreement';
import { renderAgreementPdf } from '@/lib/partners/agreement-pdf';
import { namesMatch } from '@/lib/partners/validate';
import { emailAdminPartnerSubmitted, emailAgreementCopy } from '@/lib/partners/emails';
import { inBackground } from '@/lib/background';
import { EDITABLE_STATUSES } from '@/lib/partners/types';

export const fetchCache = 'force-no-store';

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
    const sb = serviceClient();

    // Claim the submission first: only one request can move the partner from onboarding / changes_requested to
    // review, so a double click or a retry cannot store two signatures or send the emails twice.
    const { data: claimed, error: claimErr } = await sb.from('profiles')
      .update({ partner_status: 'pending_verification', submitted_at: signedAt, verification_note: null })
      .eq('id', profile.id).in('partner_status', EDITABLE_STATUSES).select('id');
    if (claimErr) throw claimErr;
    if (!claimed?.length) throw new HttpError(409, 'Your agreement is already submitted. Reload the page to see its status.');

    // Anything failing from here on hands the status back, so the partner can simply sign again.
    const before = state.profile;
    let pdfPath: string | null = null;
    try {
      const pdf = await renderAgreementPdf({ ...a, signedName: parsed.data.signed_name, signedAt, ip, email: user.email || profile.email, sha256 });
      const path = `${profile.id}/agreement-${a.version}-${Date.now()}.pdf`;
      const { error: upErr } = await sb.storage.from(KYC_BUCKET).upload(path, Buffer.from(pdf), { contentType: 'application/pdf' });
      if (upErr) throw upErr;
      pdfPath = path;

      // Append-only: a re-sign (e.g. after changes_requested) adds a new row; earlier signatures are kept.
      const { error: insErr } = await sb.from('partner_agreements').insert({
        partner_id: profile.id, version: a.version, body_text: a.body, body_sha256: sha256,
        signed_name: parsed.data.signed_name, signed_at: signedAt, ip, user_agent: userAgent, pdf_path: path,
      });
      if (insErr) throw insErr;

      // The partner's rate follows the agreement they signed (25% trek and paragliding, 20% taxi). A rate the
      // admin already set by hand (anything but the old 20% default) is kept.
      const current = before.commission_pct;
      if (a.commission !== 20 && (current == null || Number(current) === 20)) {
        const { error: rateErr } = await sb.from('profiles').update({ commission_pct: a.commission }).eq('id', profile.id);
        if (rateErr) console.error('Agreement: could not set the commission rate', profile.id, rateErr);
      }

      // Sent after the response: a slow or failing email never fails a signature that is saved.
      inBackground('Agreement emails', async () => {
        const results = await Promise.allSettled([
          emailAgreementCopy(user.email || profile.email, profile.legal_name, pdf, a.version),
          emailAdminPartnerSubmitted({ id: profile.id, legal_name: profile.legal_name, partner_type: profile.partner_type, email: profile.email, phone: profile.phone }),
        ]);
        for (const r of results) if (r.status === 'rejected') console.error('Agreement email failed:', r.reason);
      });
    } catch (e) {
      const { error: backErr } = await sb.from('profiles')
        .update({ partner_status: before.partner_status, submitted_at: before.submitted_at ?? null, verification_note: before.verification_note ?? null })
        .eq('id', profile.id).eq('partner_status', 'pending_verification');
      if (backErr) console.error('Agreement: could not hand the status back', profile.id, backErr);
      if (pdfPath) {
        const { error: rmErr } = await sb.storage.from(KYC_BUCKET).remove([pdfPath]);
        if (rmErr) console.error('Agreement: could not remove the unused PDF', pdfPath, rmErr);
      }
      throw e;
    }
    return NextResponse.json({ ok: true });
  } catch (e) { return jsonError(e); }
}
