import { describe, expect, it, vi, beforeEach } from 'vitest';

const s = vi.hoisted(() => ({
  latest: 'm1', conv: { id: 'c1', phone: '919800000001', profile_name: 'Asha', status: 'ai', last_customer_at: new Date().toISOString() } as any,
  settings: { ai_mode: 'on', test_numbers: [] as string[] }, hourCount: 0, dayCount: 0,
  outbound: [] as any[], statuses: [] as any[], sent: [] as any[], emails: [] as any[],
  reply: vi.fn(async (..._a: any[]) => 'Hello Asha!'),
}));
vi.mock('@/lib/wa-chat/store', () => ({
  latestInboundId: async () => s.latest,
  getConversation: async () => s.conv,
  getSettings: async () => s.settings,
  history: async () => [{ author: 'customer', body: 'hi', kind: 'text' }],
  aiRepliesSince: async (_since: string, conv?: string) => (conv ? s.hourCount : s.dayCount),
  setStatus: async (...a: any[]) => { s.statuses.push(a); },
  saveOutbound: async (...a: any[]) => { s.outbound.push(a); },
}));
vi.mock('@/lib/whatsapp-cloud', () => ({ sendText: async (to: string, body: string) => { s.sent.push([to, body]); return { ok: true, id: 'wamid.out' }; } }));
vi.mock('@/lib/wa-chat/assistant', () => ({ reply: s.reply }));
vi.mock('@/lib/email', () => ({ sendEmail: async (m: any) => { s.emails.push(m); }, adminEmail: () => 'a@x' }));

import { aiAllowed, HOLDING_REPLY, processConversation } from '@/lib/wa-chat/process';

const wait = async () => {};
beforeEach(() => {
  s.latest = 'm1'; s.conv = { ...s.conv, status: 'ai', last_customer_at: new Date().toISOString() };
  s.settings = { ai_mode: 'on', test_numbers: [] }; s.hourCount = 0; s.dayCount = 0;
  s.outbound = []; s.statuses = []; s.sent = []; s.emails = [];
  s.reply.mockReset(); s.reply.mockResolvedValue('Hello Asha!');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('processConversation', () => {
  it('replies and logs the AI message', async () => {
    expect(await processConversation('c1', 'm1', { wait })).toBe('replied');
    expect(s.sent).toEqual([['919800000001', 'Hello Asha!']]);
    expect(s.outbound[0]).toEqual(['c1', 'ai', 'Hello Asha!', 'wamid.out', undefined]);
  });
  it('debounce: only the newest message replies', async () => {
    s.latest = 'm3';
    expect(await processConversation('c1', 'm1', { wait })).toBe('superseded');
    expect(s.reply).not.toHaveBeenCalled();
  });
  it('drops the reply when a newer message arrives while thinking', async () => {
    s.reply.mockImplementation(async () => { s.latest = 'm2'; return 'late'; });
    expect(await processConversation('c1', 'm1', { wait })).toBe('superseded');
    expect(s.sent).toEqual([]);
  });
  it('still sends the reply when the turn booked something, even if a newer message arrived', async () => {
    s.reply.mockImplementation(async (_h: any, ctx: any) => { ctx.sideEffects = ['create_booking']; s.latest = 'm2'; return 'Booked! Ref HTL-1'; });
    expect(await processConversation('c1', 'm1', { wait })).toBe('replied');
    expect(s.sent).toEqual([['919800000001', 'Booked! Ref HTL-1']]);
    expect(s.outbound[0]).toEqual(['c1', 'ai', 'Booked! Ref HTL-1', 'wamid.out', undefined]);
  });
  it('passes a fresh side-effect list to the assistant', async () => {
    await processConversation('c1', 'm1', { wait });
    expect(s.reply.mock.calls[0][1]).toMatchObject({ sideEffects: [] });
  });
  it('no reply while a human has the chat', async () => {
    s.conv.status = 'human';
    expect(await processConversation('c1', 'm1', { wait })).toBe('skipped');
    expect(s.sent).toEqual([]);
  });
  it('stays silent when AI mode does not serve this number', async () => {
    s.settings = { ai_mode: 'off', test_numbers: [] };
    expect(await processConversation('c1', 'm1', { wait })).toBe('skipped');
    expect(s.sent).toEqual([]);
  });
  it('does not talk over the owner who took over while the AI was thinking', async () => {
    s.reply.mockImplementation(async () => { s.conv = { ...s.conv, status: 'human' }; return 'AI text'; });
    expect(await processConversation('c1', 'm1', { wait })).toBe('skipped');
    expect(s.sent).toEqual([]);
  });
  it('a reply that runs past the deadline falls back to the holding message', async () => {
    s.reply.mockImplementation(() => new Promise(() => {}));
    expect(await processConversation('c1', 'm1', { wait, deadline: Date.now() + 6050 })).toBe('failed');
    expect(s.sent[0][1]).toBe(HOLDING_REPLY);
    expect(s.statuses[0][1]).toBe('needs_human');
  }, 10000);
  it('aiAllowed handles test mode', () => {
    expect(aiAllowed({ ai_mode: 'test', test_numbers: ['919800000001'] }, '919800000001')).toBe(true);
    expect(aiAllowed({ ai_mode: 'test', test_numbers: ['919800000001'] }, '919800000002')).toBe(false);
    expect(aiAllowed({ ai_mode: 'on', test_numbers: [] }, 'x')).toBe(true);
    expect(aiAllowed({ ai_mode: 'off', test_numbers: ['x'] }, 'x')).toBe(false);
  });
  it('rate limit hands over', async () => {
    s.hourCount = 20;
    expect(await processConversation('c1', 'm1', { wait })).toBe('handed_over');
    expect(s.statuses[0]).toEqual(['c1', 'needs_human', 'AI reply limit reached']);
    expect(s.sent[0][1]).toBe(HOLDING_REPLY);
  });
  it('AI failure sends holding message and hands over', async () => {
    s.reply.mockRejectedValue(new Error('OpenAI 500'));
    expect(await processConversation('c1', 'm1', { wait })).toBe('failed');
    expect(s.sent[0][1]).toBe(HOLDING_REPLY);
    expect(s.statuses[0][1]).toBe('needs_human');
    expect(s.emails).toHaveLength(1);
  });
  it('ignores chats whose last customer message is older than 24 hours', async () => {
    s.conv.last_customer_at = new Date(Date.now() - 25 * 3600e3).toISOString();
    expect(await processConversation('c1', 'm1', { wait })).toBe('skipped');
  });
});
