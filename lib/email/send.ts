/**
 * The single path every email goes out through: suppression checks, Resend, and the email_messages log.
 * - Bounced or complained addresses are never emailed again.
 * - Marketing needs consent, no unsubscribe, and respects the per-week cap (checked by the caller that picks recipients).
 * - Marketing carries List-Unsubscribe headers (Gmail/Yahoo one-click unsubscribe).
 */
import { Resend } from 'resend';
import { serviceClient } from '@/lib/server-auth';
import { renderEmail, renderText, SITE, type EmailDoc } from './layout';
import { normEmail } from './contacts';

export type EmailKind = 'transactional' | 'marketing' | 'admin';
export const FROM = {
  transactional: process.env.EMAIL_FROM || 'Dharamshala Stay <bookings@dharamshalastay.com>',
  marketing: process.env.EMAIL_FROM_MARKETING || 'Dharamshala Stay <travel@dharamshalastay.com>',
  admin: process.env.EMAIL_FROM || 'Dharamshala Stay <bookings@dharamshalastay.com>',
};
export const REPLY_TO = process.env.EMAIL_REPLY_TO || 'support@dharamshalastay.com';
export const ADMIN_TO = () => process.env.ADMIN_EMAIL || 'hello@dharamshalastay.com';

let _resend: Resend | null = null;
const resend = () => (_resend ||= new Resend(process.env.RESEND_API_KEY || ''));
export const emailConfigured = () => !!process.env.RESEND_API_KEY;

/** The HTML Resend holds for a sent email (for emails logged before we kept our own copy). */
export async function fetchSentHtml(resendId: string): Promise<string | null> {
  if (!emailConfigured()) return null;
  try { return (await resend().emails.get(resendId)).data?.html || null; } catch { return null; }
}

export const unsubscribeUrl = (token: string) => `${SITE()}/email/unsubscribe?t=${encodeURIComponent(token)}`;

export type DeliverInput = {
  to: string;
  subject: string;
  doc: EmailDoc;
  kind: EmailKind;
  template: string;
  bookingId?: string | null;
  inquiryId?: string | null;
  campaignId?: string | null;
  replyTo?: string;
  attachments?: { filename: string; content: Buffer }[];
};

export type DeliverResult = { ok: boolean; status: 'sent' | 'skipped' | 'failed'; reason?: string; id?: string };

/** Send one email. Never throws. */
export async function deliver(input: DeliverInput): Promise<DeliverResult> {
  const to = normEmail(input.to);
  if (!to) return { ok: false, status: 'skipped', reason: 'invalid address' };
  let sb: ReturnType<typeof serviceClient> | null = null;
  try { sb = serviceClient(); } catch { /* no database configured (tests, local preview) */ }

  let contact: any = null;
  if (sb) try { contact = (await sb.from('contacts').select('id,marketing_consent,unsubscribed_at,suppressed_reason,unsubscribe_token').eq('email', to).maybeSingle()).data; } catch { /* table may not exist yet */ }

  let html: string | null = null;
  const log = async (status: string, extra: Record<string, unknown> = {}) => {
    if (!sb) return;
    try {
      const row = {
        contact_id: contact?.id || null, to_email: to, kind: input.kind, template: input.template, subject: input.subject,
        status, booking_id: input.bookingId || null, inquiry_id: input.inquiryId || null, campaign_id: input.campaignId || null, ...extra,
      };
      // A copy of what was sent, so admin can open it later (column added in migration v38).
      const { error } = await sb.from('email_messages').insert(html ? { ...row, html } : row);
      if (error && html && /html/.test(error.message || '')) await sb.from('email_messages').insert(row);
    } catch (e) { console.error('email log failed:', e); }
  };

  if (contact?.suppressed_reason && input.kind !== 'admin') { await log('skipped', { error: 'suppressed: ' + contact.suppressed_reason }); return { ok: false, status: 'skipped', reason: 'suppressed' }; }
  if (input.kind === 'marketing' && (!contact?.marketing_consent || contact?.unsubscribed_at)) {
    await log('skipped', { error: 'no marketing consent' });
    return { ok: false, status: 'skipped', reason: 'no consent' };
  }

  const doc: EmailDoc = input.kind === 'marketing' && contact?.unsubscribe_token
    ? { ...input.doc, footer: { kind: 'marketing', unsubscribeUrl: unsubscribeUrl(contact.unsubscribe_token) } }
    : input.doc;

  if (!emailConfigured()) { await log('skipped', { error: 'RESEND_API_KEY not set' }); console.log('[email skipped: no RESEND_API_KEY]', input.subject); return { ok: false, status: 'skipped', reason: 'not configured' }; }

  const headers: Record<string, string> = {};
  if (input.kind === 'marketing' && contact?.unsubscribe_token) {
    headers['List-Unsubscribe'] = `<${SITE()}/api/email/unsubscribe?t=${contact.unsubscribe_token}>, <mailto:${REPLY_TO}?subject=unsubscribe>`;
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }

  try {
    html = renderEmail(doc);
    const { data, error } = await resend().emails.send({
      from: FROM[input.kind], to, replyTo: input.replyTo || REPLY_TO, subject: input.subject,
      html, text: renderText(doc), headers, attachments: input.attachments,
      tags: [{ name: 'template', value: input.template.replace(/[^a-zA-Z0-9_-]/g, '_') }, { name: 'kind', value: input.kind }],
    });
    if (error || !data?.id) { await log('failed', { error: String(error?.message || 'no id') }); return { ok: false, status: 'failed', reason: error?.message }; }
    await log('sent', { resend_id: data.id });
    return { ok: true, status: 'sent', id: data.id };
  } catch (e: any) {
    await log('failed', { error: String(e?.message || e) });
    return { ok: false, status: 'failed', reason: String(e?.message || e) };
  }
}
