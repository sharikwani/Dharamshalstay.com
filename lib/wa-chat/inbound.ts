import { downloadMedia, markReadTyping, sendText } from '@/lib/whatsapp-cloud';
import { sendEmail, adminEmail } from '@/lib/email';
import { siteConfig } from '@/lib/config';
import { transcribe } from './assistant';
import { openCancellation } from './booking-store';
import { handleProof } from './cancellations';
import { aiAllowed, HOLDING_REPLY, processConversation } from './process';
import { getSettings, saveInbound, saveOutbound, setMessageBody, setStatusIf } from './store';
import { VOICE_FAILED, VOICE_PLACEHOLDER, type Conversation, type Inbound } from './types';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const notify = (subject: string, html: string) =>
  sendEmail({ to: adminEmail(), subject, html }).catch((e) => console.error('WhatsApp chat email failed:', e));
const chatLink = (c: Conversation) => `<p><a href="${siteConfig.url}/admin/whatsapp?c=${c.id}">Open the chat</a></p>`;

/** Something the assistant cannot read: flag it for the owner, email them, and tell the customer once. */
async function handToOwner(c: Conversation, what: string) {
  // The owner is already chatting or already flagged; don't repeat the holding reply.
  if (c.status === 'human' || c.status === 'needs_human') return;
  // Only the call that actually moves the chat from the AI to the owner sends the holding reply and email.
  if (!(await setStatusIf(c.id, 'ai', 'needs_human', `Customer sent ${what}`))) return;
  const r = await sendText(c.phone, HOLDING_REPLY);
  await saveOutbound(c.id, 'ai', HOLDING_REPLY, r.ok ? r.id : null, r.ok ? undefined : r.error);
  const who = c.profile_name || `+${c.phone}`;
  await notify(`WhatsApp chat needs you: ${who}`, `<p>${esc(who)} sent ${esc(what)} on WhatsApp.</p>${chatLink(c)}`);
}

/**
 * Store a customer message and return the background work that answers it (null when there is nothing to do).
 * Only the quick steps are awaited here; the slow ones (voice transcription, proof checks, the AI turn) run in
 * `work`, which the webhook hands to waitUntil so Meta gets its 200 straight away.
 */
export async function handleInbound(m: Inbound): Promise<{ work: Promise<unknown> } | null> {
  const deadline = Date.now() + 50_000;
  if (m.timestamp && Date.now() / 1000 - m.timestamp > 24 * 3600) return null;
  const body = m.kind === 'voice' ? VOICE_PLACEHOLDER : m.kind === 'media' ? [m.mediaLabel, m.text].filter(Boolean).join(' ') : m.text;
  const saved = await saveInbound(m, body, m.kind);
  if (!saved) return null;
  const { conversation, message, isNewConversation } = saved;
  const served = aiAllowed(await getSettings(), conversation.phone);
  if (!served && isNewConversation) {
    const who = conversation.profile_name || `+${conversation.phone}`;
    await notify(`New WhatsApp chat from ${who}`, `<p>${esc(who)} started a WhatsApp chat. AI replies are not on for this number.</p>${chatLink(conversation)}`);
  }
  // The AI does not answer this number: nothing more to do (the owner answers from the inbox).
  if (!served) return null;
  // "Typing…" only when the assistant will actually answer.
  if (conversation.status === 'ai') await markReadTyping(m.waId);
  return { work: answer(m, conversation, message.id, deadline) };
}

/** The slow part of handling a customer message; runs after the webhook has answered. */
async function answer(m: Inbound, conversation: Conversation, messageId: string, deadline: number): Promise<unknown> {
  if (m.kind === 'media') {
    const open = conversation.status === 'ai' ? await openCancellation(conversation.id).catch(() => null) : null;
    if (!open) return handToOwner(conversation, m.mediaLabel || 'a file');
    const outcome = await handleProof(conversation, messageId, m, open);
    // handleProof already told the customer the booking is cancelled; the normal turn answers anything else.
    if (outcome === 'cancelled') return processConversation(conversation.id, messageId, { deadline });
    return outcome;
  }
  if (m.kind === 'voice') {
    const media = m.mediaId ? await downloadMedia(m.mediaId) : null;
    const text = media ? await transcribe(media.data, media.mimeType) : null;
    if (!text) {
      // Replace the placeholder so a turn waiting for pending transcriptions does not wait for this one.
      await setMessageBody(messageId, `🎤 ${VOICE_FAILED}`);
      return handToOwner(conversation, 'a voice note');
    }
    await setMessageBody(messageId, `🎤 ${text}`);
  }
  return processConversation(conversation.id, messageId, { deadline });
}
