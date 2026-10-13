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

import { saveInbound, saveOutbound, getSettings, setStatusIf } from '@/lib/wa-chat/store';

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
  it('saveInbound never writes the status it read (the owner may have taken over meanwhile)', async () => {
    db.results = [
      { data: { id: 'c1', unread_admin: 0, status: 'ai' }, error: null },
      { data: { id: 'm1', conversation_id: 'c1' }, error: null },
      { data: { id: 'c1', unread_admin: 1, status: 'human' }, error: null },
    ];
    const r = await saveInbound(m, 'Hi', 'text');
    expect(r?.conversation.status).toBe('human');
    const updates = db.calls.filter(([t, op]) => t === 'whatsapp_conversations' && op === 'update');
    expect(updates).toHaveLength(1);
    expect(updates[0][2]).not.toHaveProperty('status');
  });
  it('saveInbound reopens a closed chat only with a conditional update', async () => {
    db.results = [
      { data: { id: 'c1', unread_admin: 0, status: 'closed' }, error: null },
      { data: { id: 'm1', conversation_id: 'c1' }, error: null },
      { data: [{ id: 'c1' }], error: null },
      { data: { id: 'c1', unread_admin: 1, status: 'ai' }, error: null },
    ];
    expect((await saveInbound(m, 'Hi', 'text'))?.conversation.status).toBe('ai');
    const i = db.calls.findIndex(([t, op, row]) => t === 'whatsapp_conversations' && op === 'update' && row?.status === 'ai');
    expect(i).toBeGreaterThan(-1);
    expect(db.calls.slice(i + 1, i + 3)).toEqual([['whatsapp_conversations', 'eq', 'id', 'c1'], ['whatsapp_conversations', 'eq', 'status', 'closed']]);
  });
  it('setStatusIf changes the status only from the expected one and says whether it did', async () => {
    db.results = [{ data: [{ id: 'c1' }], error: null }, { data: [], error: null }];
    expect(await setStatusIf('c1', 'ai', 'needs_human', 'why')).toBe(true);
    expect(await setStatusIf('c1', 'ai', 'needs_human', 'why')).toBe(false);
    expect(db.calls).toContainEqual(['whatsapp_conversations', 'eq', 'status', 'ai']);
  });
  it('saveInbound ignores duplicates without touching the conversation', async () => {
    db.results = [
      { data: { id: 'c1', unread_admin: 2, status: 'closed' }, error: null },
      { data: null, error: { code: '23505' } },
    ];
    expect(await saveInbound(m, 'Hi', 'text')).toBeNull();
    expect(db.calls.some(([t, op]) => t === 'whatsapp_conversations' && op === 'update')).toBe(false);
  });
  it('saveOutbound logs sent, failed or an explicit status such as unknown', async () => {
    await saveOutbound('c1', 'ai', 'a', 'wamid.1');
    await saveOutbound('c1', 'ai', 'b', null, 'Bad number');
    await saveOutbound('c1', 'ai', 'c', null, 'Delivery not confirmed', undefined, 'unknown');
    const rows = db.calls.filter(([t, op]) => t === 'whatsapp_chat_messages' && op === 'insert').map((c) => c[2]);
    expect(rows.map((r) => [r.status, r.error])).toEqual([['sent', null], ['failed', 'Bad number'], ['unknown', 'Delivery not confirmed']]);
  });
  it('getSettings falls back to off', async () => {
    db.results = [{ data: null, error: { message: 'x' } }];
    expect(await getSettings()).toEqual({ ai_mode: 'off', test_numbers: [] });
  });
});
