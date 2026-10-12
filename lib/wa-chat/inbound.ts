import { downloadMedia, markReadTyping, sendText } from '@/lib/whatsapp-cloud';
import { sendEmail, adminEmail } from '@/lib/email';
import { siteConfig } from '@/lib/config';
import { transcribe } from './assistant';
import { openCancellation } from './booking-store';
import { handleProof } from './cancellations';
import { aiAllowed, HOLDING_REPLY, processConversation } from './process';
import { getSettings, saveInbound, saveOutbound, setMessageBody, setStatus } from './store';
import type { Conversation, Inbound } from './types';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const notify = (subject: string, html: string) =>
  sendEmail({ to: adminEmail(), subject, html }).catch((e) => console.error('WhatsApp chat email failed:', e));
const chatLink = (c: Conversation) => `<p><a href="${siteConfig.url}/admin/whatsapp?c=${c.id}">Open the chat</a></p>`;

/** Something the assistant cannot read: flag it for the owner, email them, and tell the customer once. */
async function handToOwner(c: Conversation, what: string) {
  // The owner is already chatting or already flagged; don't repeat the holding reply.
  if (c.status === 'human' || c.status === 'needs_human') return;
  await setStatus(c.id, 'needs_human', `Customer sent ${what}`);
  const r = await sendText(c.phone, HOLDING_REPLY);
  await saveOutbound(c.id, 'ai', HOLDING_REPLY, r.ok ? r.id : null, r.ok ? undefined : r.error);
  const who = c.profile_name || `+${c.phone}`;
  await notify(`WhatsApp chat needs you: ${who}`, `<p>${esc(who)} sent ${esc(what)} on WhatsApp.</p>${chatLink(c)}`);
}

/**
 * Store a customer message and return the background work that answers it (null when there is
 * nothing to do). Slow steps (voice transcription, the AI) run in that background work so Meta
 * gets its 200 straight away.
 */
export async function handleInbound(m: Inbound): Promise<Promise<unknown> | null> {
  const deadline = Date.now() + 50_000;
  if (m.timestamp && Date.now() / 1000 - m.timestamp > 24 * 3600) return null;
  const body = m.kind === 'voice' ? '[voice note]' : m.kind === 'media' ? [m.mediaLabel, m.text].filter(Boolean).join(' ') : m.text;
  const saved = await saveInbound(m, body, m.kind);
  if (!saved) return null;
  const { conversation, message, isNewConversation } = saved;
  const served = aiAllowed(await getSettings(), conversation.phone);
  if (!served && isNewConversation) {
    const who = conversation.profile_name || `+${conversation.phone}`;
    await notify(`New WhatsApp chat from ${who}`, `<p>${esc(who)} started a WhatsApp chat. AI replies are not on for this number.</p>${chatLink(conversation)}`);
  }
  // "Typing…" only when the assistant will actually answer.
  if (served && conversation.status === 'ai') await markReadTyping(m.waId);
  if (!served) return processConversation(conversation.id, message.id, { deadline });
  if (m.kind === 'media') {
    const open = conversation.status === 'ai' ? await openCancellation(conversation.id).catch(() => null) : null;
    if (!open) return handToOwner(conversation, m.mediaLabel || 'a file');
    return (async () => {
      const outcome = await handleProof(conversation, message.id, m, open);
      if (outcome === 'cancelled') return processConversation(conversation.id, message.id, { deadline });
    })();
  }
  if (m.kind === 'voice') {
    return (async () => {
      const media = m.mediaId ? await downloadMedia(m.mediaId) : null;
      const text = media ? await transcribe(media.data, media.mimeType) : null;
      if (!text) return handToOwner(conversation, 'a voice note');
      await setMessageBody(message.id, `🎤 ${text}`);
      return processConversation(conversation.id, message.id, { deadline });
    })();
  }
  return processConversation(conversation.id, message.id, { deadline });
}
