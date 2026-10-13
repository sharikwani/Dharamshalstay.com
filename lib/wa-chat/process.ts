import { sendText } from '@/lib/whatsapp-cloud';
import { sendEmail, adminEmail } from '@/lib/email';
import { siteConfig } from '@/lib/config';
import { reply } from './assistant';
import { aiRepliesSince, getConversation, getSettings, history, latestInboundId, saveOutbound, setStatus } from './store';
import type { ChatSettings } from './types';
import type { ToolCtx } from './tools';

export const HOLDING_REPLY = 'Thank you for your message! A member of our team will reply here shortly. 🙏';
const HOUR = 3600e3;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export function aiAllowed(settings: ChatSettings, phone: string): boolean {
  return settings.ai_mode === 'on' || (settings.ai_mode === 'test' && settings.test_numbers.includes(phone));
}

const link = (id: string) => `${siteConfig.url}/admin/whatsapp?c=${id}`;
const notify = (subject: string, html: string) =>
  sendEmail({ to: adminEmail(), subject, html }).catch((e) => console.error('WhatsApp chat email failed:', e));

/** Time left for the AI after the debounce, keeping room to send before Vercel's 60 s limit. */
function withDeadline<T>(work: Promise<T>, deadline: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const budget = Math.max(0, deadline - Date.now() - 6000);
  return Promise.race([
    work,
    new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('AI reply took too long')), budget); }),
  ]).finally(() => clearTimeout(timer));
}

/**
 * Answer a conversation after a customer message. Waits briefly so a burst of messages gets one
 * reply, and stays silent when AI is off for this number or a person has the chat. Never throws.
 */
export async function processConversation(conversationId: string, messageId: string, opts: { wait?: (ms: number) => Promise<void>; deadline?: number } = {}) {
  const deadline = opts.deadline ?? Date.now() + 50_000;
  let holdingSent = false;
  let phone = '';
  try {
    await (opts.wait || sleep)(2000);
    if ((await latestInboundId(conversationId)) !== messageId) return 'superseded';
    const [conv, settings] = await Promise.all([getConversation(conversationId), getSettings()]);
    if (!conv) return 'skipped';
    phone = conv.phone;
    const who = conv.profile_name || `+${conv.phone}`;
    if (!aiAllowed(settings, conv.phone)) return 'skipped';
    if (conv.status === 'human' || conv.status === 'needs_human') return 'skipped';
    if (!conv.last_customer_at || Date.now() - Date.parse(conv.last_customer_at) > 24 * HOUR) return 'skipped';

    const now = Date.now();
    const [hourCount, dayCount] = await Promise.all([
      aiRepliesSince(new Date(now - HOUR).toISOString(), conv.id),
      aiRepliesSince(new Date(now - 24 * HOUR).toISOString()),
    ]);
    if (hourCount >= 20 || dayCount >= 200) {
      await setStatus(conv.id, 'needs_human', 'AI reply limit reached');
      const r = await sendText(conv.phone, HOLDING_REPLY);
      holdingSent = true;
      await saveOutbound(conv.id, 'ai', HOLDING_REPLY, r.ok ? r.id : null, r.ok ? undefined : r.error);
      await notify(`WhatsApp chat needs you: ${who}`, `<p>The AI reply limit was reached for ${esc(who)}.</p><p><a href="${link(conv.id)}">Open the chat</a></p>`);
      return 'handed_over';
    }

    const ctx: ToolCtx = { conversationId: conv.id, phone: conv.phone, profileName: conv.profile_name, handedOver: false, sideEffects: [] };
    let text = await withDeadline(reply(await history(conv.id, 20), ctx), deadline);
    // A newer message gets its own turn. Drop this reply only if nothing happened: once a tool booked, cancelled,
    // issued a code or made a payment link, the customer must hear about it (the newer turn answers its own message).
    const acted = (ctx.sideEffects?.length ?? 0) > 0;
    if (!acted && (await latestInboundId(conversationId)) !== messageId) return 'superseded';
    // The owner may have taken over while the AI was thinking.
    if ((await getConversation(conv.id))?.status !== 'ai' && !ctx.handedOver) return 'skipped';
    if (!text) {
      if (!ctx.handedOver) throw new Error('Empty AI reply');
      text = HOLDING_REPLY;
    }
    const r = await sendText(conv.phone, text);
    holdingSent = true;
    await saveOutbound(conv.id, 'ai', text, r.ok ? r.id : null, r.ok ? undefined : r.error);
    return ctx.handedOver ? 'handed_over' : 'replied';
  } catch (e: any) {
    console.error('WhatsApp AI processing failed:', e);
    try {
      if (phone && !holdingSent) {
        const r = await sendText(phone, HOLDING_REPLY);
        await saveOutbound(conversationId, 'ai', HOLDING_REPLY, r.ok ? r.id : null, r.ok ? undefined : r.error);
      }
      await setStatus(conversationId, 'needs_human', `AI error: ${String(e?.message || e).slice(0, 200)}`);
      await notify('WhatsApp chat needs you (AI error)', `<p>The assistant could not answer: ${esc(e?.message || e)}</p><p><a href="${link(conversationId)}">Open the chat</a></p>`);
    } catch (e2) { console.error('WhatsApp AI failure handling failed:', e2); }
    return 'failed';
  }
}
