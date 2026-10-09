import { createHmac, timingSafeEqual } from 'node:crypto';

const GRAPH = 'https://graph.facebook.com/v21.0';

export function isWhatsAppConfigured(): boolean {
  return !!process.env.WHATSAPP_TOKEN && !!process.env.WHATSAPP_PHONE_NUMBER_ID;
}

export function cleanParam(v: unknown): string {
  const s = String(v ?? '').replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim().slice(0, 300);
  return s || '-';
}

export type SendResult = { ok: true; id: string } | { ok: false; error?: string; skipped?: true };

export async function sendTemplate(opts: { to: string; template: string; params: unknown[]; language?: string }): Promise<SendResult> {
  if (!isWhatsAppConfigured()) return { ok: false, skipped: true };
  try {
    const res = await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp', to: opts.to, type: 'template',
        template: {
          name: opts.template, language: { code: opts.language || 'en' },
          components: [{ type: 'body', parameters: opts.params.map((p) => ({ type: 'text', text: cleanParam(p) })) }],
        },
      }),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data?.error?.message || `HTTP ${res.status}` };
    const id = data?.messages?.[0]?.id;
    return id ? { ok: true, id } : { ok: false, error: 'No message id returned' };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Network error' };
  }
}

export function verifySignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !header?.startsWith('sha256=')) return false;
  const expected = Buffer.from(createHmac('sha256', secret).update(rawBody).digest('hex'));
  const got = Buffer.from(header.slice(7));
  return expected.length === got.length && timingSafeEqual(expected, got);
}
