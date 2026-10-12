import { describe, expect, it, vi, beforeEach } from 'vitest';

const db = vi.hoisted(() => ({ calls: [] as any[], results: [] as any[] }));
function chain(table: string): any {
  const c: any = new Proxy({}, {
    get(_t, prop: string) {
      if (prop === 'then') { const r = db.results.shift() ?? { data: null, error: null }; return (res: any) => res(r); }
      return (...args: any[]) => { db.calls.push([table, prop, ...args]); return c; };
    },
  });
  return c;
}
vi.mock('@/lib/server-auth', () => ({ serviceClient: () => ({ from: (t: string) => chain(t) }) }));

import { saveInbound, getSettings } from '@/lib/wa-chat/store';

beforeEach(() => { db.calls = []; db.results = []; });

const m = { waId: 'w1', from: '919800000001', profileName: 'Asha', timestamp: 1, kind: 'text' as const, text: 'Hi' };

describe('store', () => {
  it('saveInbound creates the conversation, stores the message, then updates counters', async () => {
    db.results = [
      { data: null, error: null },
      { data: { id: 'c1', unread_admin: 0 }, error: null },
      { data: { id: 'm1', conversation_id: 'c1' }, error: null },
      { data: { id: 'c1', unread_admin: 1, status: 'ai' }, error: null },
    ];
    const r = await saveInbound(m, 'Hi', 'text');
    expect(r?.isNewConversation).toBe(true);
    expect(r?.message.id).toBe('m1');
    expect(r?.conversation.unread_admin).toBe(1);
    const msgInsert = db.calls.find(([t, op]) => t === 'whatsapp_chat_messages' && op === 'insert');
    expect(msgInsert[2]).toMatchObject({ wa_message_id: 'w1', author: 'customer' });
    // Ordering uses server receive time, not Meta's whole-second timestamp.
    expect(msgInsert[2].created_at).toBeUndefined();
  });
  it('two first messages at once: the losing insert re-reads the conversation', async () => {
    db.results = [
      { data: null, error: null },
      { data: null, error: { code: '23505' } },
      { data: { id: 'c1', unread_admin: 1, status: 'ai' }, error: null },
      { data: { id: 'm2', conversation_id: 'c1' }, error: null },
      { data: { id: 'c1', unread_admin: 2, status: 'ai' }, error: null },
    ];
    const r = await saveInbound(m, 'Hi', 'text');
    expect(r?.message.id).toBe('m2');
    expect(r?.isNewConversation).toBe(false);
  });
  it('saveInbound ignores duplicates without touching the conversation', async () => {
    db.results = [
      { data: { id: 'c1', unread_admin: 2, status: 'closed' }, error: null },
      { data: null, error: { code: '23505' } },
    ];
    expect(await saveInbound(m, 'Hi', 'text')).toBeNull();
    expect(db.calls.some(([t, op]) => t === 'whatsapp_conversations' && op === 'update')).toBe(false);
  });
  it('getSettings falls back to off', async () => {
    db.results = [{ data: null, error: { message: 'x' } }];
    expect(await getSettings()).toEqual({ ai_mode: 'off', test_numbers: [] });
  });
});
