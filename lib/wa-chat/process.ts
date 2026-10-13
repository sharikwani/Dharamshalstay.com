import { sendText, type SendResult } from '@/lib/whatsapp-cloud';
import { sendEmail, adminEmail } from '@/lib/email';
import { siteConfig } from '@/lib/config';
import { reply } from './assistant';
import {
  acquireTurnLock, aiRepliesSince, getConversation, getSettings, history, latestInboundId, pendingVoice, releaseTurnLock,
  saveOutbound, saveSystemNote, setStatusIf,
} from './store';
import { UNCONFIRMED, type ChatMessage, type ChatSettings, type Conversation } from './types';
import type { ToolCtx } from './tools';

export const HOLDING_REPLY = 'Thank you for your message! A member of our team will reply here shortly. 🙏';
const HOUR = 3600e3;
/** How often a turn that is waiting for the lock (or for a voice transcription) looks again. */
const POLL_MS = 1500;
/** Time one AI turn needs (thinking + sending) before the invocation deadline; with less left, the owner takes over. */
const MIN_TURN_MS = 15_000;
/** At most this many polls for a voice note that is still being transcribed. */
const VOICE_POLLS = 14;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export function aiAllowed(settings: ChatSettings, phone: string): boolean {
  return settings.ai_mode === 'on' || (settings.ai_mode === 'test' && settings.test_numbers.includes(phone));
}

const link = (id: string) => `${siteConfig.url}/admin/whatsapp?c=${id}`;
const notify = (subject: string, html: string) =>
  sendEmail({ to: adminEmail(), subject, html }).catch((e) => console.error('WhatsApp chat email failed:', e));
const who = (c: Conversation) => c.profile_name || `+${c.phone}`;
const list = (items: string[]) => `<ul>${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;

/** Time left for the AI after the debounce, keeping room to send before Vercel's 60 s limit. */
function withDeadline<T>(work: Promise<T>, deadline: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const budget = Math.max(0, deadline - Date.now() - 6000);
  return Promise.race([
    work,
    new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('AI reply took too long')), budget); }),
  ]).finally(() => clearTimeout(timer));
}

/** Log what we sent; a send that may have gone out (unknown) is logged as such and never resent. */
async function logReply(conversationId: string, text: string, r: SendResult) {
  if (r.ok) return saveOutbound(conversationId, 'ai', text, r.id, undefined);
  if (r.unknown) return saveOutbound(conversationId, 'ai', text, null, UNCONFIRMED, undefined, 'unknown');
  return saveOutbound(conversationId, 'ai', text, null, r.error);
}

async function sendReply(c: Conversation, text: string) {
  const r = await sendText(c.phone, text);
  await logReply(c.id, text, r);
}

/** Customer messages after the last message we (AI or owner) sent; system notes do not count as answers. */
function unanswered(hist: ChatMessage[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (let i = hist.length - 1; i >= 0; i--) {
    const m = hist[i];
    if (m.kind === 'system') continue;
    if (m.author !== 'customer') break;
    out.unshift(m);
  }
  return out;
}

/**
 * After a turn, the customer messages that came after the one it answered. They may be stored before that turn's
 * reply (they arrived while it was thinking), so they are moved after it: the AI sees them in the order it answers.
 */
function afterAnswered(hist: ChatMessage[], answeredId: string): { hist: ChatMessage[]; pending: ChatMessage[] } {
  const i = hist.findIndex((m) => m.id === answeredId);
  if (i < 0) return { hist, pending: unanswered(hist) };
  const later = hist.slice(i + 1);
  const pending = later.filter((m) => m.author === 'customer');
  return { hist: [...hist.slice(0, i + 1), ...later.filter((m) => m.author !== 'customer'), ...pending], pending };
}

/** The chat when the AI may answer it now (served number, AI has the chat, 24-hour window open), else null. */
async function answerable(conversationId: string): Promise<Conversation | null> {
  const [conv, settings] = await Promise.all([getConversation(conversationId), getSettings()]);
  if (!conv || !aiAllowed(settings, conv.phone) || conv.status !== 'ai') return null;
  if (!conv.last_customer_at || Date.now() - Date.parse(conv.last_customer_at) > 24 * HOUR) return null;
  return conv;
}

/** Out of time with messages unanswered: flag the chat, send the holding reply and email the owner (only once). */
async function giveUp(c: Conversation, pending: ChatMessage[], why: string): Promise<'handed_over' | 'skipped'> {
  if (!(await setStatusIf(c.id, 'ai', 'needs_human', why))) return 'skipped';
  await sendReply(c, HOLDING_REPLY);
  await notify(`WhatsApp chat needs you: ${who(c)}`,
    `<p>${esc(why)}. These messages from ${esc(who(c))} are unanswered:</p>${list(pending.map((m) => m.body))}<p><a href="${link(c.id)}">Open the chat</a></p>`);
  return 'handed_over';
}

const UNLOCKED = 'unlocked';

type Outcome = 'replied' | 'handed_over' | 'skipped' | 'failed' | 'superseded' | 'already_answered';

/**
 * Answer a conversation after a customer message. Waits briefly so a burst of messages gets one reply, then takes
 * the conversation's turn lock so only one turn runs at a time. The lock holder answers the latest message and, if
 * more arrived meanwhile, runs another turn, until nothing is unanswered or time runs out (then the owner takes
 * over with a holding reply). A turn that waited for the lock exits when its message was answered meanwhile.
 * Stays silent when AI is off for this number or a person has the chat. Never throws.
 */
export async function processConversation(conversationId: string, messageId: string,
  opts: { wait?: (ms: number) => Promise<void>; deadline?: number; minTurnMs?: number } = {}): Promise<Outcome> {
  const deadline = opts.deadline ?? Date.now() + 50_000;
  const minTurn = opts.minTurnMs ?? MIN_TURN_MS;
  const wait = opts.wait || sleep;
  let token: string | null = null;
  try {
    await wait(2000);
    // A newer message has its own invocation, which answers everything (this message included).
    if ((await latestInboundId(conversationId)) !== messageId) return 'superseded';
    if (!(await answerable(conversationId))) return 'skipped';
    // If the lock itself cannot be read (database trouble), answer unlocked rather than not at all.
    const lock = () => acquireTurnLock(conversationId).catch((e) => { console.error('WhatsApp chat: turn lock failed', e); return UNLOCKED; });
    while (!(token = await lock())) {
      if (Date.now() > deadline - minTurn) {
        // Another turn kept the lock all along (slow or stuck): never leave the message silently unanswered.
        const c = await answerable(conversationId);
        const pending = c ? unanswered(await history(conversationId, 20)) : [];
        return c && pending.length ? await giveUp(c, pending, 'AI ran out of time (another reply was still in progress)') : 'skipped';
      }
      await wait(POLL_MS);
    }
  } catch (e: any) {
    console.error('WhatsApp AI processing failed before the turn:', e);
    await notify('WhatsApp chat needs you (AI error)', `<p>The assistant could not start answering: ${esc(e?.message || e)}</p><p><a href="${link(conversationId)}">Open the chat</a></p>`);
    return 'failed';
  }
  const held = token;
  try {
    return await turns(conversationId, deadline, minTurn, wait);
  } finally {
    if (held !== UNLOCKED) await releaseTurnLock(conversationId, held).catch((e) => console.error('WhatsApp chat: lock release failed', e));
  }
}

/** The lock holder's loop: one turn per batch of unanswered customer messages. */
async function turns(conversationId: string, deadline: number, minTurn: number, wait: (ms: number) => Promise<void>): Promise<Outcome> {
  let result: Outcome = 'already_answered';
  let answeredId: string | null = null;
  for (;;) {
    let conv: Conversation | null;
    let hist: ChatMessage[];
    let pending: ChatMessage[];
    try {
      conv = await answerable(conversationId);
      if (!conv) return result === 'already_answered' ? 'skipped' : result;
      // A voice note sent just before is still being transcribed: wait, so the turn does not answer "[voice note]".
      for (let i = 0; i < VOICE_POLLS && Date.now() < deadline - minTurn && (await pendingVoice(conversationId)); i++) await wait(POLL_MS);
      const all = await history(conversationId, 20);
      ({ hist, pending } = answeredId ? afterAnswered(all, answeredId) : { hist: all, pending: unanswered(all) });
    } catch (e: any) {
      console.error('WhatsApp AI processing failed:', e);
      await notify('WhatsApp chat needs you (AI error)', `<p>The assistant could not read the chat: ${esc(e?.message || e)}</p><p><a href="${link(conversationId)}">Open the chat</a></p>`);
      return 'failed';
    }
    // Answered already (by the turn that held the lock before this one, or by the owner).
    if (!pending.length) return result;
    if (Date.now() > deadline - minTurn) return giveUp(conv, pending, 'AI ran out of time');
    const outcome = await turn(conv, hist, deadline);
    if (outcome !== 'replied') return outcome;
    result = outcome;
    answeredId = pending[pending.length - 1].id;
    try {
      // Another message arrived while this turn was thinking: answer it too (its own invocation waits for the lock).
      if ((await latestInboundId(conversationId)) === answeredId) return result;
    } catch (e) {
      console.error('WhatsApp AI processing: newer-message check failed', e);
      return result;
    }
  }
}

/** One AI turn: think, then send the reply unless a person has the chat. */
async function turn(conv: Conversation, hist: ChatMessage[], deadline: number): Promise<Outcome> {
  const ctx: ToolCtx = { conversationId: conv.id, phone: conv.phone, profileName: conv.profile_name, handedOver: false, sideEffects: [], actions: [] };
  let text: string | null = null;
  let sent = false;
  try {
    const now = Date.now();
    const [hourCount, dayCount] = await Promise.all([
      aiRepliesSince(new Date(now - HOUR).toISOString(), conv.id),
      aiRepliesSince(new Date(now - 24 * HOUR).toISOString()),
    ]);
    if (hourCount >= 20 || dayCount >= 200) {
      // Only the call that flags the chat sends the holding reply and the email.
      if (await setStatusIf(conv.id, 'ai', 'needs_human', 'AI reply limit reached')) {
        await sendReply(conv, HOLDING_REPLY);
        await notify(`WhatsApp chat needs you: ${who(conv)}`, `<p>The AI reply limit was reached for ${esc(who(conv))}.</p><p><a href="${link(conv.id)}">Open the chat</a></p>`);
      }
      return 'handed_over';
    }

    text = await withDeadline(reply(hist, ctx), deadline);
    const acted = (ctx.sideEffects?.length ?? 0) > 0;
    const status = (await getConversation(conv.id))?.status;
    // The owner took over while the AI was thinking: never talk over them; what the AI already did goes into the
    // chat as a note for the owner. A chat only flagged for the owner (needs_human) still hears about actions.
    if (status === 'human' || (status !== 'ai' && !acted)) {
      if (acted) await saveSystemNote(conv.id, `AI reply not sent (${status === 'human' ? 'you have the chat' : `chat is ${status}`}). It had already: ${(ctx.actions ?? []).join('; ')}`);
      return 'skipped';
    }
    if (!text) {
      if (!ctx.handedOver) throw new Error('Empty AI reply');
      text = HOLDING_REPLY;
    }
    sent = true; // from here an error must not send the reply (or a holding reply) again
    await sendReply(conv, text);
    return ctx.handedOver ? 'handed_over' : 'replied';
  } catch (e) {
    return fail(conv, e, ctx, text, sent);
  }
}

/**
 * A turn failed (error or timeout). Hand the chat to the owner and tell the customer once: the reply text when the
 * AI had acted and finished it, else the holding reply. Actions already taken go into the owner email and a note.
 */
async function fail(conv: Conversation, e: any, ctx: ToolCtx, text: string | null, sent: boolean): Promise<'failed'> {
  console.error('WhatsApp AI processing failed:', e);
  const actions = ctx.actions ?? [];
  const acted = (ctx.sideEffects?.length ?? 0) > 0;
  try {
    const moved = await setStatusIf(conv.id, 'ai', 'needs_human', `AI error: ${String(e?.message || e).slice(0, 200)}`);
    if (sent) {
      // The customer already has the reply.
    } else if (text && (moved || acted)) {
      // The reply was ready: send it rather than the holding reply (never over an owner who has the chat).
      const status = moved ? 'ai' : (await getConversation(conv.id).catch(() => null))?.status;
      if (status !== 'human') await sendReply(conv, text);
    } else if (moved) {
      await sendReply(conv, HOLDING_REPLY);
    }
    if (acted) await saveSystemNote(conv.id, `AI error after it had: ${actions.join('; ')}`);
    if (moved || acted) {
      await notify('WhatsApp chat needs you (AI error)',
        `<p>The assistant could not answer ${esc(who(conv))}: ${esc(e?.message || e)}</p>`
        + (acted ? `<p>It had already done this; check what the customer was told:</p>${list(actions)}` : '')
        + `<p><a href="${link(conv.id)}">Open the chat</a></p>`);
    }
  } catch (e2) { console.error('WhatsApp AI failure handling failed:', e2); }
  return 'failed';
}
