export type WaStatus = 'sent' | 'delivered' | 'read' | 'failed';
export type ParsedWebhook = {
  statuses: { id: string; status: WaStatus; error?: string }[];
  replies: { contextId: string; from: string; text: string }[];
};

const STATUSES = ['sent', 'delivered', 'read', 'failed'];

export function parseWebhook(payload: any): ParsedWebhook {
  const out: ParsedWebhook = { statuses: [], replies: [] };
  for (const entry of Array.isArray(payload?.entry) ? payload.entry : []) {
    for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
      const value = change?.value;
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
        const text = m?.type === 'button' ? m?.button?.text
          : m?.type === 'interactive' ? m?.interactive?.button_reply?.title : null;
        const contextId = m?.context?.id;
        if (typeof text !== 'string' || typeof contextId !== 'string') continue;
        out.replies.push({ contextId, from: String(m?.from ?? ''), text });
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
