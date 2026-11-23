import { serviceClient } from '@/lib/server-auth';
import { downloadMedia } from '@/lib/whatsapp-cloud';

/** Private bucket (migration v58): only the server reads it; the admin inbox gets short-lived signed links. */
export const WHATSAPP_MEDIA_BUCKET = 'whatsapp-media';

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'application/pdf': 'pdf',
  'video/mp4': 'mp4', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a',
};

/** Storage path for a message's file. */
export function mediaPath(conversationId: string, messageId: string, mime: string): string {
  const base = mime.split(';')[0].trim().toLowerCase();
  return `${conversationId}/${messageId}.${EXT[base] || 'bin'}`;
}

/**
 * Copy a photo, document or voice note from Meta (media ids expire) into our bucket and note it on the message,
 * so the owner can see it in the inbox. Never throws: the chat works the same without it.
 */
export async function archiveMedia(mediaId: string, conversationId: string, messageId: string): Promise<void> {
  try {
    const media = await downloadMedia(mediaId);
    if (!media) return;
    const sb = serviceClient();
    const path = mediaPath(conversationId, messageId, media.mimeType);
    const { error: upErr } = await sb.storage.from(WHATSAPP_MEDIA_BUCKET)
      .upload(path, media.data, { contentType: media.mimeType, upsert: true });
    if (upErr) { console.error('WhatsApp media: upload failed', upErr); return; }
    const { error } = await sb.from('whatsapp_chat_messages').update({ media_path: path, media_mime: media.mimeType }).eq('id', messageId);
    if (error) console.error('WhatsApp media: could not note the file on the message', error);
  } catch (e) {
    console.error('WhatsApp media: archive failed', e);
  }
}

/** Signed links (1 hour) for the messages that carry a file, keyed by message id. */
export async function signedMediaUrls(messages: { id: string; media_path?: string | null }[]): Promise<Record<string, string>> {
  const withFile = messages.filter((m) => m.media_path);
  if (!withFile.length) return {};
  const { data, error } = await serviceClient().storage.from(WHATSAPP_MEDIA_BUCKET)
    .createSignedUrls(withFile.map((m) => m.media_path!), 3600);
  if (error || !data) { console.error('WhatsApp media: could not sign links', error); return {}; }
  const out: Record<string, string> = {};
  withFile.forEach((m, i) => { if (data[i]?.signedUrl) out[m.id] = data[i].signedUrl; });
  return out;
}
