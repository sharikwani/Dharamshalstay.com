/**
 * Template messages (booking confirmations, enquiry replies sent by the team) are not part of a chat's history, so a
 * customer replying "1" or "yes" to one would confuse the assistant. This note gives the assistant the filled-in text
 * of what we sent this number in the last 7 days (whatsapp_template_sends, migration v40). Never throws.
 */
import { serviceClient } from '@/lib/server-auth';

let cache: { at: number; bodies: Record<string, string> } | null = null;

/** Our approved template bodies from Meta, cached for 30 minutes. */
async function templateBodies(): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.at < 30 * 60e3) return cache.bodies;
  const bodies: Record<string, string> = {};
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_WABA_ID}/message_templates?fields=name,components&limit=100`,
      { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` }, cache: 'no-store', signal: AbortSignal.timeout(5000) });
    const j: any = await res.json();
    for (const t of j.data || []) bodies[t.name] = (t.components || []).find((c: any) => c.type === 'BODY')?.text || '';
    cache = { at: Date.now(), bodies };
  } catch { /* fall back to the raw values */ }
  return bodies;
}

export function fillTemplate(body: string, params: string[]): string {
  return body.replace(/\{\{(\d+)\}\}/g, (m, n) => params[Number(n) - 1] ?? m).replace(/\*/g, '').replace(/\n{2,}/g, '\n').trim();
}

export async function recentTemplatesNote(phone: string, days = 7): Promise<string> {
  try {
    const since = new Date(Date.now() - days * 86400e3).toISOString();
    const { data } = await serviceClient().from('whatsapp_template_sends').select('template, params, created_at')
      .eq('to_phone', phone).gte('created_at', since).order('created_at', { ascending: false }).limit(4);
    if (!data?.length) return '';
    const bodies = await templateBodies();
    const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
    const lines = data.reverse().map((r: any) => {
      const params = (r.params || []).map(String);
      const text = bodies[r.template] ? fillTemplate(bodies[r.template], params) : params.join(' | ');
      return `- ${when(r.created_at)}: ${text.slice(0, 900)}`;
    });
    return '\n\nMessages our team sent this customer recently by WhatsApp (they are not in the chat above; the customer may be replying to the latest one, e.g. with "1", "2" or "yes"):\n' + lines.join('\n')
      + '\nIf the customer is answering a question our team asked in one of these messages, thank them in one short line and call handover so the team sees the answer. Do not ask them to repeat it.';
  } catch (e) {
    console.error('WhatsApp template context failed:', e);
    return '';
  }
}
