import type { Inbound } from '@/lib/wa-chat/types';

export type WaStatus = 'sent' | 'delivered' | 'read' | 'failed';
export type ParsedWebhook = {
  statuses: { id: string; status: WaStatus; error?: string }[];
  replies: { contextId: string; from: string; text: string }[];
  inbound: Inbound[];
};

const STATUSES = ['sent', 'delivered', 'read', 'failed'];
const MEDIA_LABEL: Record<string, string> = {
  image: '[photo]', video: '[video]', document: '[document]', sticker: '[sticker]', location: '[location]', contacts: '[contact card]',
};

export function parseWebhook(payload: any): ParsedWebhook {
  const out: ParsedWebhook = { statuses: [], replies: [], inbound: [] };
  for (const entry of Array.isArray(payload?.entry) ? payload.entry : []) {
    for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
      const value = change?.value;
      const names = new Map((Array.isArray(value?.contacts) ? value.contacts : []).map((c: any) => [String(c?.wa_id ?? ''), c?.profile?.name ?? null]));
      for (const s of Array.isArray(value?.statuses) ? value.statuses : []) {
        if (typeof s?.id !== 'string' || !STATUSES.includes(s?.status)) continue;
        const item: ParsedWebhook['statuses'][number] = { id: s.id, status: s.status };
        if (s.status === 'failed') {
          const e = s.errors?.[0];
          const msg = e?.title || e?.message;
          if (msg) item.error = String(msg);
        }
        out.statuses.push(item);
      }
      for (const m of Array.isArray(value?.messages) ? value.messages : []) {
        if (m?.type === 'button' || m?.type === 'interactive') {
          const text = m?.type === 'button' ? m?.button?.text : m?.interactive?.button_reply?.title;
          const contextId = m?.context?.id;
          if (typeof text === 'string' && typeof contextId === 'string') out.replies.push({ contextId, from: String(m?.from ?? ''), text });
          continue;
        }
        if (typeof m?.id !== 'string' || typeof m?.from !== 'string') continue;
        const base = { waId: m.id, from: m.from, profileName: (names.get(m.from) as string | null) ?? null, timestamp: Number(m.timestamp) || 0 };
        if (m.type === 'text') out.inbound.push({ ...base, kind: 'text', text: String(m.text?.body ?? '').slice(0, 2000) });
        else if (m.type === 'audio') out.inbound.push({ ...base, kind: 'voice', text: '', mediaId: m.audio?.id });
        else if (MEDIA_LABEL[m.type]) {
          const media = m[m.type] || {};
          out.inbound.push({ ...base, kind: 'media', text: String(media.caption ?? '').slice(0, 2000), mediaId: media.id, mediaLabel: MEDIA_LABEL[m.type] });
        }
      }
    }
  }
  return out;
}

export function replyAction(text: string): 'accepted' | 'declined' | null {
  const t = String(text || '').toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z' ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (t === "can't do it" || t === 'cant do it' || t === 'cannot do it') return 'declined';
  if (t === 'accept') return 'accepted';
  // Fallback for slightly different wording: decline phrases take priority over accept.
  if (/can'?t do it|cannot/.test(t)) return 'declined';
  if (t.includes('accept')) return 'accepted';
  return null;
}

export const STATUS_RANK: Record<string, number> = { queued: 0, sent: 1, delivered: 2, read: 3 };
