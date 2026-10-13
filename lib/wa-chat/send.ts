import { sendText, type SendResult } from '@/lib/whatsapp-cloud';
import { saveOutbound } from './store';
import { UNCONFIRMED } from './types';

/** The send surely did not reach the customer (Meta refused it, or nothing was sent). */
export const definitelyFailed = (r: SendResult) => !r.ok && !r.unknown;

/** Log an AI-authored message: sent, failed, or unknown (it may have gone out; never resent). */
export async function logSend(conversationId: string, text: string, r: SendResult) {
  if (r.ok) return saveOutbound(conversationId, 'ai', text, r.id, undefined);
  if (r.unknown) return saveOutbound(conversationId, 'ai', text, null, UNCONFIRMED, undefined, 'unknown');
  return saveOutbound(conversationId, 'ai', text, null, r.error);
}

/**
 * Send an AI-authored text and log the outcome. A definite failure is retried once; an unknown one is never
 * retried (it may have been delivered). Never throws.
 */
export async function sendLogged(c: { id: string; phone: string }, text: string): Promise<SendResult> {
  let r: SendResult;
  try {
    r = await sendText(c.phone, text);
    if (!r.ok && !r.unknown && !r.skipped) r = await sendText(c.phone, text);
  } catch (e: any) {
    r = { ok: false, unknown: true, error: e?.message || 'Send failed' };
  }
  try { await logSend(c.id, text, r); } catch (e) { console.error('WhatsApp chat: could not log a sent message:', e); }
  return r;
}
