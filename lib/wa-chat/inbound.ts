import { downloadMedia, markReadTyping, sendText } from '@/lib/whatsapp-cloud';
import { transcribe } from './assistant';
import { aiAllowed, HOLDING_REPLY, processConversation } from './process';
import { getSettings, saveInbound, saveOutbound, setStatus } from './store';
import type { Inbound } from './types';

/** Store a customer message and return the background work that answers it (null when there is nothing to do). */
export async function handleInbound(m: Inbound): Promise<Promise<unknown> | null> {
  if (m.timestamp && Date.now() / 1000 - m.timestamp > 24 * 3600) return null;
  let body = m.text;
  if (m.kind === 'voice') {
    const media = m.mediaId ? await downloadMedia(m.mediaId) : null;
    const text = media ? await transcribe(media.data, media.mimeType) : null;
    body = text ? `🎤 ${text}` : '[voice note]';
  } else if (m.kind === 'media') {
    body = [m.mediaLabel, m.text].filter(Boolean).join(' ');
  }
  const saved = await saveInbound(m, body, m.kind);
  if (!saved) return null;
  const { conversation, message, isNewConversation } = saved;
  const served = aiAllowed(await getSettings(), conversation.phone);
  // "Typing…" only when the assistant will actually answer.
  if (served && conversation.status === 'ai') await markReadTyping(m.waId);
  // Photos and unreadable voice notes go to a person; numbers the AI does not serve get no auto reply.
  if ((m.kind === 'media' || body === '[voice note]') && served) {
    return (async () => {
      // The owner is already chatting; don't talk over them.
      if (conversation.status === 'human') return;
      await setStatus(conversation.id, 'needs_human', `Customer sent ${m.kind === 'media' ? m.mediaLabel : 'a voice note'}`);
      const r = await sendText(conversation.phone, HOLDING_REPLY);
      await saveOutbound(conversation.id, 'ai', HOLDING_REPLY, r.ok ? r.id : null, r.ok ? undefined : r.error);
    })();
  }
  return processConversation(conversation.id, message.id, { isNew: isNewConversation });
}
