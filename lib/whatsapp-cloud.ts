import { createHmac, timingSafeEqual } from 'node:crypto';

const GRAPH = 'https://graph.facebook.com/v21.0';

export function isWhatsAppConfigured(): boolean {
  return !!process.env.WHATSAPP_TOKEN && !!process.env.WHATSAPP_PHONE_NUMBER_ID;
}

export function cleanParam(v: unknown): string {
  const s = String(v ?? '').replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim().slice(0, 300);
  return s || '-';
}

/**
 * unknown: the request may have reached Meta (timeout, connection lost after sending, or an accepted reply we could
 * not read), so the message may have been delivered. Callers must not resend it blindly.
 */
export type SendResult = { ok: true; id: string } | { ok: false; error?: string; skipped?: true; unknown?: true };

/** Errors that happen before anything is sent (no connection was made), so the message surely was not sent. */
const NOT_SENT = ['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ERR_INVALID_URL'];

/** A fetch that threw: unknown delivery, unless the connection was never made. */
function thrown(e: any): SendResult {
  const error = e?.message || 'Network error';
  const code = e?.cause?.code || e?.code;
  return NOT_SENT.includes(code) ? { ok: false, error } : { ok: false, unknown: true, error };
}

/** Meta's answer: a rejection (HTTP error) is a failure; an accepted request without a message id is unknown. */
async function answer(res: Response): Promise<SendResult> {
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data?.error?.message || `HTTP ${res.status}` };
  const id = data?.messages?.[0]?.id;
  return id ? { ok: true, id } : { ok: false, unknown: true, error: 'No message id returned' };
}

export async function sendTemplate(opts: { to: string; template: string; params: unknown[]; language?: string }): Promise<SendResult> {
  if (!isWhatsAppConfigured()) return { ok: false, skipped: true };
  try {
    const res = await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      signal: AbortSignal.timeout(5000),
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp', to: opts.to, type: 'template',
        template: {
          name: opts.template, language: { code: opts.language || 'en' },
          components: [{ type: 'body', parameters: opts.params.map((p) => ({ type: 'text', text: cleanParam(p) })) }],
        },
      }),
    });
    return await answer(res);
  } catch (e: any) {
    return thrown(e);
  }
}

export function verifySignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !header?.startsWith('sha256=')) return false;
  const expected = Buffer.from(createHmac('sha256', secret).update(rawBody).digest('hex'));
  const got = Buffer.from(header.slice(7));
  return expected.length === got.length && timingSafeEqual(expected, got);
}

const auth = () => ({ Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` });

/** Free-form text, allowed within 24 hours of the customer's last message. */
export async function sendText(to: string, body: string): Promise<SendResult> {
  if (!isWhatsAppConfigured()) return { ok: false, skipped: true };
  try {
    const res = await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST', signal: AbortSignal.timeout(5000), headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: body.slice(0, 4096), preview_url: true } }),
    });
    return await answer(res);
  } catch (e: any) {
    return thrown(e);
  }
}

/** Blue ticks plus "typing…" while the reply is prepared. Never throws. */
export async function markReadTyping(waMessageId: string): Promise<void> {
  if (!isWhatsAppConfigured()) return;
  try {
    await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST', signal: AbortSignal.timeout(5000), headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: waMessageId, typing_indicator: { type: 'text' } }),
    });
  } catch (e) { console.error('WhatsApp: mark read failed', e); }
}

export async function downloadMedia(mediaId: string): Promise<{ data: ArrayBuffer; mimeType: string } | null> {
  if (!isWhatsAppConfigured()) return null;
  try {
    const meta = await fetch(`${GRAPH}/${mediaId}`, { headers: auth(), signal: AbortSignal.timeout(5000) });
    const info: any = await meta.json().catch(() => ({}));
    if (!meta.ok || !info?.url) return null;
    if (Number(info.file_size) > 16 * 1024 * 1024) return null;
    const file = await fetch(info.url, { headers: auth(), signal: AbortSignal.timeout(10000) });
    if (!file.ok) return null;
    return { data: await file.arrayBuffer(), mimeType: info.mime_type || 'application/octet-stream' };
  } catch (e) {
    console.error('WhatsApp: media download failed', e);
    return null;
  }
}
