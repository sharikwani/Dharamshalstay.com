import { sendEmail, adminEmail } from '@/lib/email';
import { siteConfig } from '@/lib/config';
import { reply } from './assistant';
import {
  acquireTurnLock, aiRepliesSince, getConversation, getSettings, history, latestInboundId, pendingVoice, releaseTurnLock,
  saveSystemNote, setStatusIf,
} from './store';
import { definitelyFailed, sendLogged } from './send';
import { isAnswer, unanswered, type ChatMessage, type ChatSettings, type Conversation } from './types';
import type { ToolCtx } from './tools';

export const HOLDING_REPLY = 'Thank you for your message! A member of our team will reply here shortly. 🙏';
const HOUR = 3600e3;
/** How often a turn that is waiting for the lock (or for a voice transcription) looks again. */
const POLL_MS = 1500;
/** Time one AI turn needs (thinking + sending) before the invocation deadline; with less left, the owner takes over. */
const MIN_TURN_MS = 15_000;
/**
 * A further turn for a message that is not this invocation's own needs this much time (the AI gets the time left
 * minus 6 s); with less, the lock is released for that message's own invocation, which is polling for it.
 */
const LOOP_TURN_MS = 25_000;
/** A turn waiting for the lock keeps waiting until this close to its deadline (it only needs to send a holding reply). */
const GIVE_UP_MS = 6_000;
/** At most this many polls (about 30 s) for a voice note that is still being transcribed. */
const VOICE_POLLS = 20;
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

const sendReply = (c: Conversation, text: string) => sendLogged(c, text);

/** The reply the AI gives when a late voice transcript needs no answer (nothing is sent then). */
export const NOTHING_TO_ADD = 'NOTHING_TO_ADD';

/**
 * The sentinel token inside a reply: NOTHING_TO_ADD (any case, underscores or dashes) as a whole word, optionally
 * quoted, starred or code-fenced and followed by punctuation. Never consumes line breaks outside a fence.
 */
const TOKEN = /(?:```[a-z]*[ \t]*\r?\n?)?[ \t]*[`*«»"'“”]*\bnothing[_-]to[_-]add\b[`*«»"'“”]*[.!]?[ \t]*(?:\r?\n?[ \t]*```)?/gi;
/** Natural-language "nothing to add" counts only as the entire reply (after quotes, fences and punctuation). */
const WHOLE = /^nothing[ _-]*to[ _-]*add$/i;

/**
 * Remove the NOTHING_TO_ADD sentinel from an AI reply. `had`: it was there; `rest`: what is left ('' when nothing
 * meaningful is left). Replies without the token come back byte-identical.
 */
export function stripSentinel(text: string): { had: boolean; rest: string } {
  const bare = text.replace(/```[a-z]*/gi, ' ').replace(/[`*_«»"'“”.!?,:;\s-]+/g, ' ').trim();
  if (WHOLE.test(bare)) return { had: true, rest: '' };
  if (!text.match(TOKEN)) return { had: false, rest: text };
  const rest = text.replace(TOKEN, (m) => (/\n/.test(m) ? '\n' : ' ')).replace(/^[\s.,:;!?-]+/, '').replace(/ {2,}/g, ' ').trim();
  return { had: true, rest: /[0-9a-z\u00c0-\uffff]/i.test(rest) ? rest : '' };
}

type Pending = { hist: ChatMessage[]; pending: ChatMessage[]; note?: string };

/**
 * What is unanswered for this invocation: normally the customer messages after the last answer. For a voice note
 * transcribed late (`since` = when its text was written) that is not unanswered in that sense:
 * - if a later customer message exists, replies may have been written without the transcript, so a turn runs with a
 *   note naming it and the AI judges whether its earlier replies already addressed it;
 * - if it is the newest customer message, it is unanswered unless something was answered after its text was written.
 */
function pendingFor(all: ChatMessage[], messageId: string, { since, answer }: Extra = {}): Pending {
  const pending = unanswered(all);
  if (answer?.length) {
    // Earlier messages a direct notice (e.g. "your booking is cancelled") was sent after, so they look answered.
    const extra = all.filter((m) => answer.includes(m.id) && !pending.includes(m));
    if (!extra.length) return { hist: all, pending };
    return {
      hist: all, pending: [...extra, ...pending],
      note: `These earlier customer messages have not been answered yet (another notice was sent in between): ${extra.map((m) => `«${m.body}»`).join(' ')}. Answer them now. If your replies already answered them and nothing else is unanswered, reply with exactly ${NOTHING_TO_ADD}.`,
    };
  }
  if (!since || pending.some((m) => m.id === messageId)) return { hist: all, pending };
  const own = all.find((m) => m.id === messageId);
  if (!own) return { hist: all, pending };
  const newest = [...all].reverse().find((m) => m.author === 'customer');
  if (newest && newest.id !== own.id) {
    return {
      hist: all, pending: pending.length ? pending : [own],
      note: `The customer's earlier voice note was just transcribed: «${own.body.replace(/^🎤\s*/, '')}». Answer it now if your earlier replies did not already address it. If they did and nothing else is unanswered, reply with exactly ${NOTHING_TO_ADD}.`,
    };
  }
  if (pending.length) return { hist: all, pending };
  const answeredSince = all.some((m) => isAnswer(m) && Date.parse(m.created_at) > Date.parse(since));
  return answeredSince ? { hist: all, pending } : { hist: [...all.filter((m) => m !== own), own], pending: [own] };
}

/**
 * After a turn, the customer messages that came after the one it answered. They may be stored before that turn's
 * reply (they arrived while it was thinking), so they are moved after it: the AI sees them in the order it answers.
 */
function afterAnswered(hist: ChatMessage[], answeredId: string): Pending {
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

type Outcome = 'replied' | 'handed_over' | 'skipped' | 'failed' | 'superseded' | 'already_answered' | 'deferred';
/**
 * since: a forced voice-note turn, when its transcript was written. answer: ids of earlier customer messages this
 * turn must answer although a direct notice was sent after them.
 */
type Extra = { since?: string; answer?: string[] };
type Opts = { wait?: (ms: number) => Promise<void>; deadline?: number; minTurnMs?: number; force?: boolean } & Extra;

/** "Column does not exist" (Postgres) or "not in the schema cache" (PostgREST): migration v25 is not applied yet. */
const NO_LOCK_COLUMN = ['42703', 'PGRST204'];

/**
 * Answer a conversation after a customer message. Waits briefly so a burst of messages gets one reply, then takes
 * the conversation's turn lock so only one turn runs at a time. The lock holder answers the latest message and, if
 * more arrived meanwhile, runs another turn, until nothing is unanswered or time runs out (then the owner takes
 * over with a holding reply). A turn that waited for the lock exits when its message was answered meanwhile.
 * Stays silent when AI is off for this number or a person has the chat. Never throws.
 */
export async function processConversation(conversationId: string, messageId: string, opts: Opts = {}): Promise<Outcome> {
  const deadline = opts.deadline ?? Date.now() + 50_000;
  const minTurn = opts.minTurnMs ?? MIN_TURN_MS;
  const wait = opts.wait || sleep;
  let token: string | null = null;
  try {
    await wait(2000);
    // A newer message has its own invocation, which answers everything (this message included). A late voice
    // transcription (force) still checks after taking the lock whether its text was answered.
    if (!opts.force && (await latestInboundId(conversationId)) !== messageId) return 'superseded';
    if (!(await answerable(conversationId))) return 'skipped';
    // Without the lock column (migration not applied) answer unlocked rather than not at all; any other lock
    // error counts as "not acquired" and the turn keeps waiting.
    const lock = () => acquireTurnLock(conversationId).catch((e: any) => {
      console.error('WhatsApp chat: turn lock failed', e);
      return NO_LOCK_COLUMN.includes(e?.code) ? UNLOCKED : null;
    });
    while (!(token = await lock())) {
      if (Date.now() > deadline - GIVE_UP_MS) {
        // Another turn kept the lock until our own deadline (slow or stuck): if our message is still unanswered,
        // the owner takes over; never leave it silently unanswered.
        const c = await answerable(conversationId);
        const { pending } = c ? pendingFor(await history(conversationId, 20), messageId, opts) : { pending: [] as ChatMessage[] };
        if (!c || !pending.some((m) => m.id === messageId || opts.answer?.includes(m.id))) return 'already_answered';
        return await giveUp(c, pending, 'AI ran out of time (another reply was still in progress)');
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
    return await turns(conversationId, messageId, { since: opts.since, answer: opts.answer }, deadline, minTurn, wait);
  } finally {
    if (held !== UNLOCKED) await releaseTurnLock(conversationId, held).catch((e) => console.error('WhatsApp chat: lock release failed', e));
  }
}

/** The lock holder's loop: one turn per batch of unanswered customer messages. */
async function turns(conversationId: string, messageId: string, extra: Extra, deadline: number, minTurn: number,
  wait: (ms: number) => Promise<void>): Promise<Outcome> {
  let result: Outcome = 'already_answered';
  let answeredId: string | null = null;
  for (;;) {
    let conv: Conversation | null;
    let hist: ChatMessage[];
    let pending: ChatMessage[];
    let note: string | undefined;
    let all: ChatMessage[];
    try {
      conv = await answerable(conversationId);
      if (!conv) return result === 'already_answered' ? 'skipped' : result;
      // A voice note sent just before is still being transcribed: wait, so the turn does not answer "[voice note]".
      for (let i = 0; i < VOICE_POLLS && Date.now() < deadline - minTurn && (await pendingVoice(conversationId)); i++) await wait(POLL_MS);
      all = await history(conversationId, 20);
      ({ hist, pending, note } = answeredId ? afterAnswered(all, answeredId) : pendingFor(all, messageId, extra));
    } catch (e: any) {
      console.error('WhatsApp AI processing failed:', e);
      await notify('WhatsApp chat needs you (AI error)', `<p>The assistant could not read the chat: ${esc(e?.message || e)}</p><p><a href="${link(conversationId)}">Open the chat</a></p>`);
      return 'failed';
    }
    // Answered already (by the turn that held the lock before this one, or by the owner).
    if (!pending.length) return result;
    const left = deadline - Date.now();
    // Not enough time for a full turn on a message that is not ours: its own invocation is polling for the lock
    // and has more time, so release the lock to it.
    const lastId = pending[pending.length - 1].id;
    if (left < LOOP_TURN_MS && lastId !== messageId && !extra.answer?.includes(lastId)) return result === 'already_answered' ? 'deferred' : result;
    if (left < minTurn) return giveUp(conv, pending, 'AI ran out of time');
    const outcome = await turn(conv, hist, deadline, note);
    if (outcome !== 'replied') return outcome;
    result = outcome;
    // The newest customer message this turn saw (for a late voice note, a later message answered earlier).
    answeredId = [...all].reverse().find((m) => m.author === 'customer')?.id ?? pending[pending.length - 1].id;
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
async function turn(conv: Conversation, hist: ChatMessage[], deadline: number, note?: string): Promise<Outcome> {
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

    text = await withDeadline(reply(hist, ctx, note), deadline);
    const acted = (ctx.sideEffects?.length ?? 0) > 0;
    // The sentinel (asked for with a late voice transcript) is never sent, in whatever form it comes back.
    const stripped = stripSentinel(text);
    if (stripped.had) {
      text = stripped.rest;
      if (!text && !acted) return 'already_answered';
      if (!text) {
        // It acted but gave no words for the customer: send nothing invented; a person tells them.
        await setStatusIf(conv.id, 'ai', 'needs_human', 'AI acted but gave no reply');
        await saveSystemNote(conv.id, `AI reply not sent (it gave no text). It had already: ${(ctx.actions ?? []).join('; ')}`);
        await notify(`WhatsApp chat needs you: ${who(conv)}`, `<p>The assistant acted for ${esc(who(conv))} but gave no reply, so nothing was sent. Please tell the customer:</p>${list(ctx.actions ?? [])}<p><a href="${link(conv.id)}">Open the chat</a></p>`);
        return 'handed_over';
      }
    }
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
    const r = await sendReply(conv, text);
    if (definitelyFailed(r)) {
      // WhatsApp refused it twice: the customer has nothing. The failed row does not count as an answer.
      await setStatusIf(conv.id, 'ai', 'needs_human', 'AI reply could not be sent');
      if (ctx.actions?.length) await saveSystemNote(conv.id, `AI reply could not be sent. It had already: ${ctx.actions.join('; ')}`);
      await notify(`WhatsApp chat needs you: ${who(conv)}`,
        `<p>The AI reply to ${esc(who(conv))} could not be sent (${esc(!r.ok ? r.error : '')}). Please send it yourself:</p><blockquote>${esc(text)}</blockquote>`
        + (ctx.actions?.length ? `<p>It had already:</p>${list(ctx.actions)}` : '') + `<p><a href="${link(conv.id)}">Open the chat</a></p>`);
      return 'failed';
    }
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
