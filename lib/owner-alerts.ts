/**
 * Owner alerts on WhatsApp. Every admin email alert (bookings, enquiries, payments, cancellations, chats that
 * need a person, partner news, stories, reviews...) also goes to the owner's WhatsApp as a short message with
 * a link to open it in admin (approved template owner_alert, migration v50). Email stays the record.
 * Mode in whatsapp_settings.owner_alerts: off | important (default) | all.
 */
import { serviceClient } from '@/lib/server-auth';
import { isWhatsAppConfigured, sendTemplate } from '@/lib/whatsapp-cloud';
import { renderText, SITE, type EmailDoc } from '@/lib/email/layout';

export type OwnerAlertMode = 'off' | 'important' | 'all';

/** Admin emails that are never worth a ping (the owner is the one doing them). */
const NEVER = new Set(['campaign_test', 'admin_compose']);
/** Always important. */
const IMPORTANT_TEMPLATES = new Set(['admin_new_booking', 'admin_new_enquiry', 'admin_partner_signup']);
/** Other admin alerts are important when their subject is about money, a booking or a person waiting. */
const IMPORTANT_WORDS = /\b(book|booking|bookings|enquir|inquir|payment|paid|refund|cancel|human|hand ?over|handed|needs? (you|a person)|declin|complain|urgent|partner|document|accepted|rejected)/i;

export function shouldAlert(mode: OwnerAlertMode, template: string, subject: string): boolean {
  if (mode === 'off' || NEVER.has(template)) return false;
  if (mode === 'all') return true;
  return IMPORTANT_TEMPLATES.has(template) || IMPORTANT_WORDS.test(subject);
}

const ADMIN_LINK = /https?:\/\/[^\s)]+\/admin[^\s)]*/;

/** Title, a one-paragraph summary and the admin link, from the alert email itself. */
export function alertParts(subject: string, doc: EmailDoc): { title: string; detail: string; link: string } {
  const text = renderText(doc);
  const link = (text.match(ADMIN_LINK)?.[0] || SITE() + '/admin').replace(/[.,;:]+$/, '');
  const body = text
    .split('\n').slice(1) // the first line is the heading
    .filter((l) => !/^Dharamshala Stay, VPO|^Unsubscribe:|^Questions\? Reply/.test(l))
    .join(' ')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\(\s*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const detail = body.length > 420 ? body.slice(0, 417).replace(/\s+\S*$/, '') + '...' : body || subject;
  return { title: subject.replace(/\s+/g, ' ').trim().slice(0, 120), detail, link };
}

async function settings(): Promise<{ mode: OwnerAlertMode; phone: string | null }> {
  try {
    const { data } = await serviceClient().from('whatsapp_settings').select('*').eq('id', 1).maybeSingle();
    const mode = (['off', 'important', 'all'] as const).includes(data?.owner_alerts) ? data!.owner_alerts as OwnerAlertMode : 'off';
    return { mode, phone: data?.owner_phone || null };
  } catch { return { mode: 'off', phone: null }; }
}

/** WhatsApp the owner about an admin email alert. Never throws; skipped when off or before migration v50. */
export async function notifyOwner(input: { subject: string; template: string; doc: EmailDoc }): Promise<void> {
  if (process.env.NODE_ENV === 'test' || !isWhatsAppConfigured()) return;
  try {
    const { mode, phone } = await settings();
    if (!phone || !shouldAlert(mode, input.template, input.subject)) return;
    const { title, detail, link } = alertParts(input.subject, input.doc);
    const r = await sendTemplate({ to: phone, template: 'owner_alert', params: [title, detail, link] });
    if (!r.ok && r.skipped) return;
    const { error } = await serviceClient().from('whatsapp_messages').insert({
      recipient_kind: 'owner', to_phone: phone, template: 'owner_alert',
      wa_message_id: r.ok ? r.id : null, status: r.ok ? 'sent' : 'failed', error: r.ok ? null : r.error || 'Unknown error',
    });
    if (error) console.error('Owner alert: could not log:', error);
  } catch (e) { console.error('Owner alert failed:', e); }
}
