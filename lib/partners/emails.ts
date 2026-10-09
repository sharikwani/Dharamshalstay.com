import { sendEmail, adminEmail } from '@/lib/email';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.dharamshalastay.com';
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const wrap = (title: string, inner: string) => `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px"><h2 style="color:#1e3a5f">${title}</h2>${inner}<p style="color:#94a3b8;font-size:12px;margin-top:24px">Dharamshala Stay</p></div>`;

export async function emailAgreementCopy(to: string, name: string, pdf: Uint8Array, version: string) {
  await sendEmail({
    to: [to, adminEmail()],
    subject: `Your signed Dharamshala Stay partner agreement (${version})`,
    html: wrap('Agreement signed', `<p>Hi ${esc(name)},</p><p>Thank you for signing the Dharamshala Stay partner agreement. A PDF copy is attached for your records.</p><p>Our team is now checking your documents. We will email you as soon as your account is approved.</p>`),
    attachments: [{ filename: `dharamshala-stay-partner-agreement-${version}.pdf`, content: Buffer.from(pdf) }],
  });
}

export async function emailAdminPartnerSubmitted(p: { id: string; legal_name: string; partner_type: string; email: string; phone: string }) {
  await sendEmail({
    to: adminEmail(),
    subject: `New ${p.partner_type} partner to verify: ${p.legal_name}`,
    html: wrap('Partner waiting for verification', `<p><b>${esc(p.legal_name)}</b> (${esc(p.partner_type)}) has uploaded documents and signed the agreement.</p><p>${esc(p.email)} · ${esc(p.phone || '')}</p><p><a href="${SITE}/admin/partners/${p.id}">Review documents</a></p>`),
  });
}

const DECISION: Record<string, { subject: string; title: string; text: string }> = {
  verified: { subject: 'Your Dharamshala Stay partner account is approved', title: 'You are approved', text: 'Your documents are verified and your partner account is active. You can now add your packages and start receiving bookings.' },
  changes_requested: { subject: 'Action needed on your Dharamshala Stay partner account', title: 'Some details need fixing', text: 'We could not approve your account yet. Please log in, fix the items below and submit again.' },
  rejected: { subject: 'Your Dharamshala Stay partner application', title: 'Application not approved', text: 'We are unable to approve your partner account.' },
  suspended: { subject: 'Your Dharamshala Stay partner account is suspended', title: 'Account suspended', text: 'Your partner account has been suspended and will not receive new bookings.' },
};

export async function emailPartnerDecision(to: string, name: string, decision: 'verified' | 'changes_requested' | 'rejected' | 'suspended', note?: string) {
  const d = DECISION[decision];
  await sendEmail({
    to,
    subject: d.subject,
    html: wrap(d.title, `<p>Hi ${esc(name)},</p><p>${d.text}</p>${note ? `<p style="background:#f8fafc;padding:12px;border-radius:8px">${esc(note)}</p>` : ''}<p><a href="${SITE}/partner/onboarding">Open your partner account</a></p>`),
  });
}
