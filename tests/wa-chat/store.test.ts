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
  it('saveInbound upserts the conversation and stores the message', async () => {
    db.results = [
      { data: null, error: null },
      { data: { id: 'c1', unread_admin: 0 }, error: null },
      { data: { id: 'm1', conversation_id: 'c1' }, error: null },
    ];
    const r = await saveInbound(m, 'Hi', 'text');
    expect(r?.isNewConversation).toBe(true);
    expect(r?.message.id).toBe('m1');
    expect(db.calls.some(([t, op, row]) => t === 'whatsapp_chat_messages' && op === 'insert' && row.wa_message_id === 'w1' && row.author === 'customer')).toBe(true);
  });
  it('saveInbound ignores duplicates', async () => {
    db.results = [
      { data: { id: 'c1', unread_admin: 2 }, error: null },
      { data: { id: 'c1', unread_admin: 3 }, error: null },
      { data: null, error: { code: '23505' } },
    ];
    expect(await saveInbound(m, 'Hi', 'text')).toBeNull();
  });
  it('getSettings falls back to off', async () => {
    db.results = [{ data: null, error: { message: 'x' } }];
    expect(await getSettings()).toEqual({ ai_mode: 'off', test_numbers: [] });
  });
});
