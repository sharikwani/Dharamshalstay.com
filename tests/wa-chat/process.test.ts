import { describe, expect, it, vi, beforeEach } from 'vitest';

const NOW = () => new Date().toISOString();
const s = vi.hoisted(() => ({
  conv: null as any, settings: { ai_mode: 'on', test_numbers: [] as string[] }, hourCount: 0, dayCount: 0,
  msgs: [] as any[], seq: 0,
  lockHeld: false, lockFreeAfter: 0, acquires: 0, releases: [] as any[],
  voicePending: 0, convThrowsOnRead: 0, convReads: 0, flagFails: false,
  outbound: [] as any[], statuses: [] as any[], sent: [] as any[], emails: [] as any[], notes: [] as any[],
  sendResult: null as any, sendQueue: [] as any[], waits: 0, onAcquire: null as null | ((n: number) => void),
  reply: vi.fn(async (..._a: any[]) => 'Hello Asha!'),
}));
const addMsg = (author: string, body: string, kind = 'text', status = author === 'customer' ? 'received' : 'sent') => {
  const m = { id: `${author === 'customer' ? 'm' : 'o'}${++s.seq}`, author, body, kind, status, direction: author === 'customer' ? 'in' : 'out', created_at: NOW() };
  s.msgs.push(m);
  return m;
};
vi.mock('@/lib/wa-chat/store', () => ({
  latestInboundId: async () => [...s.msgs].reverse().find((m) => m.direction === 'in')?.id ?? null,
  getConversation: async () => {
    s.convReads++;
    if (s.convThrowsOnRead && s.convReads >= s.convThrowsOnRead) throw new Error('db down');
    return s.conv;
  },
  getSettings: async () => s.settings,
  history: async () => s.msgs.slice(-20).map((m) => ({ ...m })),
  aiRepliesSince: async (_since: string, conv?: string) => (conv ? s.hourCount : s.dayCount),
  setStatus: async (...a: any[]) => { s.statuses.push(a); s.conv = { ...s.conv, status: a[1] }; },
  setStatusIf: async (id: string, from: string, to: string, why: string) => {
    if (s.flagFails || s.conv.status !== from) return false;
    s.statuses.push([id, to, why]); s.conv = { ...s.conv, status: to }; return true;
  },
  saveOutbound: async (...a: any[]) => { s.outbound.push(a); addMsg('ai', a[2], 'text', a[3] ? 'sent' : a[6] ?? 'failed'); },
  saveSystemNote: async (...a: any[]) => { s.notes.push(a); },
  acquireTurnLock: async () => {
    s.acquires++;
    s.onAcquire?.(s.acquires);
    if (s.lockHeld && s.acquires > s.lockFreeAfter) s.lockHeld = false;
    if (s.lockHeld) return null;
    s.lockHeld = true;
    return 'token';
  },
  releaseTurnLock: async (...a: any[]) => { s.releases.push(a); s.lockHeld = false; },
  pendingVoice: async () => (s.voicePending-- > 0),
}));
vi.mock('@/lib/whatsapp-cloud', () => ({ sendText: async (to: string, body: string) => {
  s.sent.push([to, body]);
  return s.sendQueue.length ? s.sendQueue.shift() : s.sendResult ?? { ok: true, id: 'wamid.out' };
} }));
vi.mock('@/lib/wa-chat/assistant', () => ({ reply: s.reply }));
vi.mock('@/lib/email', () => ({ sendEmail: async (m: any) => { s.emails.push(m); }, adminEmail: () => 'a@x' }));

import { aiAllowed, HOLDING_REPLY, processConversation } from '@/lib/wa-chat/process';

const wait = async () => { s.waits++; };
const run = (id = 'm1', o: any = {}) => processConversation('c1', id, { wait, ...o });
beforeEach(() => {
  Object.assign(s, {
    conv: { id: 'c1', phone: '919800000001', profile_name: 'Asha', status: 'ai', last_customer_at: NOW() },
    settings: { ai_mode: 'on', test_numbers: [] }, hourCount: 0, dayCount: 0, msgs: [], seq: 0,
    lockHeld: false, lockFreeAfter: 0, acquires: 0, releases: [], voicePending: 0, convThrowsOnRead: 0, convReads: 0, flagFails: false,
    outbound: [], statuses: [], sent: [], emails: [], notes: [], sendResult: null, sendQueue: [], waits: 0, onAcquire: null,
  });
  addMsg('customer', 'hi');
  s.reply.mockReset(); s.reply.mockResolvedValue('Hello Asha!');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('processConversation', () => {
  it('replies, logs the AI message, and holds the turn lock only while answering', async () => {
    expect(await run()).toBe('replied');
    expect(s.sent).toEqual([['919800000001', 'Hello Asha!']]);
    expect(s.outbound[0]).toEqual(['c1', 'ai', 'Hello Asha!', 'wamid.out', undefined]);
    expect(s.acquires).toBe(1);
    expect(s.releases).toEqual([['c1', 'token']]);
  });
  it('debounce: an older message leaves the answer to the newest one', async () => {
    addMsg('customer', 'and breakfast?');
    expect(await run('m1')).toBe('superseded');
    expect(s.reply).not.toHaveBeenCalled();
    expect(s.acquires).toBe(0);
  });
  it('a message that arrives during the turn gets another turn from the lock holder; no reply is dropped', async () => {
    s.reply
      .mockImplementationOnce(async () => { addMsg('customer', 'also a taxi?'); return 'Room booked.'; })
      .mockImplementationOnce(async (h: any[]) => { expect(h.at(-1).body).toBe('also a taxi?'); return 'Taxi is ₹500.'; });
    expect(await run()).toBe('replied');
    expect(s.sent.map((x) => x[1])).toEqual(['Room booked.', 'Taxi is ₹500.']);
    expect(s.releases).toHaveLength(1);
  });
  it('an acted turn is sent even when a newer message arrived meanwhile', async () => {
    s.reply
      .mockImplementationOnce(async (_h: any, ctx: any) => { ctx.sideEffects.push('create_booking'); addMsg('customer', 'thanks'); return 'Booked! Ref HTL-1'; })
      .mockResolvedValueOnce('You are welcome!');
    expect(await run()).toBe('replied');
    expect(s.sent.map((x) => x[1])).toEqual(['Booked! Ref HTL-1', 'You are welcome!']);
  });
  it('a concurrent invocation waits for the lock, then exits when its message was already answered', async () => {
    s.lockHeld = true; s.lockFreeAfter = 2; // the other turn answers and releases meanwhile
    addMsg('ai', 'Answered by the other turn');
    expect(await run()).toBe('already_answered');
    expect(s.acquires).toBe(3);
    expect(s.waits).toBe(3); // debounce + two polls
    expect(s.reply).not.toHaveBeenCalled();
    expect(s.sent).toEqual([]);
    expect(s.releases).toHaveLength(1);
  });
  it('a waiter that gets the lock answers a message the other turn did not cover', async () => {
    s.lockHeld = true; s.lockFreeAfter = 1;
    expect(await run()).toBe('replied');
    expect(s.sent).toEqual([['919800000001', 'Hello Asha!']]);
  });
  it('an expired (stale) lock is taken over: the store grants it and the turn runs', async () => {
    s.lockHeld = true; s.lockFreeAfter = 0; // acquireTurnLock treats an expired processing_until as free
    expect(await run()).toBe('replied');
    expect(s.acquires).toBe(1);
  });
  it('releases the lock when the turn fails', async () => {
    s.reply.mockRejectedValue(new Error('OpenAI 500'));
    expect(await run()).toBe('failed');
    expect(s.releases).toEqual([['c1', 'token']]);
  });
  it('never getting the lock before the deadline: an unanswered message goes to the owner, not lost', async () => {
    s.lockHeld = true; s.lockFreeAfter = Infinity;
    expect(await run('m1', { deadline: Date.now() + 1000 })).toBe('handed_over');
    expect(s.sent).toEqual([['919800000001', HOLDING_REPLY]]);
    expect(s.statuses[0]).toEqual(['c1', 'needs_human', expect.stringMatching(/time/i)]);
    expect(s.emails[0].html).toMatch(/hi/);
    expect(s.releases).toEqual([]);
  });
  it('too little time for another turn on a newer message: the lock goes to that message\'s own invocation', async () => {
    s.reply.mockImplementationOnce(async () => { addMsg('customer', 'what about parking?'); return 'Room booked.'; });
    let t = Date.now();
    const deadline = t + 40_000; // first turn starts with > 25 s left, the second check has < 25 s
    const spy = vi.spyOn(Date, 'now').mockImplementation(() => (t += 2000));
    try {
      expect(await run('m1', { deadline })).toBe('replied');
    } finally { spy.mockRestore(); }
    expect(s.sent.map((x) => x[1])).toEqual(['Room booked.']);
    expect(s.statuses).toEqual([]);
    expect(s.releases).toHaveLength(1);
  });
  it('too little time for its own message: holding reply plus an owner email listing it', async () => {
    expect(await run('m1', { deadline: Date.now() + 10_000 })).toBe('handed_over');
    expect(s.reply).not.toHaveBeenCalled();
    expect(s.sent.map((x) => x[1])).toEqual([HOLDING_REPLY]);
    expect(s.emails[0].html).toMatch(/hi/);
    expect(s.releases).toHaveLength(1);
  });
  it('a waiter does not give up while the lock holder is still answering its message', async () => {
    s.lockHeld = true; s.lockFreeAfter = 3;
    s.onAcquire = (n) => { if (n === 3) addMsg('ai', 'Answer from the holder'); };
    expect(await run('m1', { deadline: Date.now() + 10_000 })).toBe('already_answered');
    expect(s.sent).toEqual([]);
    expect(s.statuses).toEqual([]);
  });
  it('an acted turn stays silent when the owner has taken over, and leaves the owner a note of the actions', async () => {
    s.reply.mockImplementation(async (_h: any, ctx: any) => {
      ctx.sideEffects.push('create_booking'); ctx.actions.push('Booking HTL-1 made (pay later)');
      s.conv = { ...s.conv, status: 'human' }; return 'Booked! Ref HTL-1';
    });
    expect(await run()).toBe('skipped');
    expect(s.sent).toEqual([]);
    expect(s.notes[0]).toEqual(['c1', expect.stringContaining('Booking HTL-1 made (pay later)')]);
  });
  it('a handover during the turn of a chat the owner took over keeps it human and sends nothing', async () => {
    s.reply.mockImplementation(async (_h: any, ctx: any) => {
      s.conv = { ...s.conv, status: 'human' }; // the owner took over while the AI was thinking
      ctx.handedOver = true; ctx.sideEffects.push('handover'); ctx.actions.push('Handed to the team: refund'); // setStatusIf(ai→needs_human) changes nothing
      return 'A team member will help you.';
    });
    expect(await run()).toBe('skipped');
    expect(s.conv.status).toBe('human');
    expect(s.sent).toEqual([]);
  });
  it('an acted turn still replies when the chat was flagged for the owner (needs_human)', async () => {
    s.reply.mockImplementation(async (_h: any, ctx: any) => {
      ctx.sideEffects.push('create_booking'); ctx.actions.push('Booking HTL-1 made'); s.conv = { ...s.conv, status: 'needs_human' }; return 'Booked! Ref HTL-1';
    });
    expect(await run()).toBe('replied');
    expect(s.sent).toEqual([['919800000001', 'Booked! Ref HTL-1']]);
  });
  it('a turn that did nothing stays silent once the chat was flagged for the owner', async () => {
    s.reply.mockImplementation(async () => { s.conv = { ...s.conv, status: 'needs_human' }; return 'AI text'; });
    expect(await run()).toBe('skipped');
    expect(s.sent).toEqual([]);
  });
  it('passes fresh side-effect and action lists to the assistant', async () => {
    await run();
    expect(s.reply.mock.calls[0][1]).toMatchObject({ sideEffects: [], actions: [] });
  });
  it('no reply while a human has the chat', async () => {
    s.conv.status = 'human';
    expect(await run()).toBe('skipped');
    expect(s.sent).toEqual([]);
  });
  it('stays silent when AI mode does not serve this number', async () => {
    s.settings = { ai_mode: 'off', test_numbers: [] };
    expect(await run()).toBe('skipped');
    expect(s.sent).toEqual([]);
  });
  it('a reply that runs past the deadline falls back to the holding message', async () => {
    s.reply.mockImplementation(() => new Promise(() => {}));
    expect(await run('m1', { deadline: Date.now() + 6050, minTurnMs: 0 })).toBe('failed');
    expect(s.sent[0][1]).toBe(HOLDING_REPLY);
    expect(s.statuses[0][1]).toBe('needs_human');
  }, 10000);
  it('an error after an action: the owner email and a chat note list the actions', async () => {
    s.reply.mockImplementation(async (_h: any, ctx: any) => {
      ctx.sideEffects.push('payment_link'); ctx.actions.push('Payment link for HTL-1: https://pay/x');
      throw new Error('OpenAI 500');
    });
    expect(await run()).toBe('failed');
    expect(s.sent[0][1]).toBe(HOLDING_REPLY);
    expect(s.emails[0].html).toMatch(/Payment link for HTL-1: https:\/\/pay\/x/);
    expect(s.notes[0][1]).toMatch(/Payment link for HTL-1/);
  });
  it('an error after the reply text was ready sends that text instead of the holding reply', async () => {
    s.reply.mockImplementation(async (_h: any, ctx: any) => { ctx.sideEffects.push('create_booking'); ctx.actions.push('Booking HTL-1 made'); return 'Booked! Ref HTL-1'; });
    s.convThrowsOnRead = 3; // the status re-read after the AI answered fails
    expect(await run()).toBe('failed');
    expect(s.sent).toEqual([['919800000001', 'Booked! Ref HTL-1']]);
    expect(s.emails[0].html).toMatch(/Booking HTL-1 made/);
  });
  it('answers without the lock when the lock column is missing (migration not applied), rather than not at all', async () => {
    const store: any = await import('@/lib/wa-chat/store');
    const spy = vi.spyOn(store, 'acquireTurnLock').mockRejectedValueOnce(Object.assign(new Error('column missing'), { code: '42703' }));
    expect(await run()).toBe('replied');
    expect(s.releases).toEqual([]);
    spy.mockRestore();
  });
  it('an error before the turn emails the owner', async () => {
    s.convThrowsOnRead = 1;
    expect(await run()).toBe('failed');
    expect(s.emails).toHaveLength(1);
  });
  it('a send that never reached Meta (no connection) is retried once', async () => {
    s.sendQueue = [{ ok: false, error: 'fetch failed', notSent: true }];
    expect(await run()).toBe('replied');
    expect(s.sent).toHaveLength(2);
    expect(s.outbound).toEqual([['c1', 'ai', 'Hello Asha!', 'wamid.out', undefined]]);
  });
  it('a reply WhatsApp refuses is not retried: it goes to the owner with its text, and does not count as an answer', async () => {
    s.sendQueue = [{ ok: false, error: 'Meta 400' }];
    expect(await run()).toBe('failed');
    expect(s.sent).toHaveLength(1);
    expect(s.statuses[0]).toEqual(['c1', 'needs_human', 'AI reply could not be sent']);
    expect(s.emails[0].html).toMatch(/Hello Asha!/);
    expect(s.outbound[0]).toEqual(['c1', 'ai', 'Hello Asha!', null, 'Meta 400']);
    // Back with the AI later: the message is still unanswered and gets a turn.
    s.conv = { ...s.conv, status: 'ai' };
    expect(await run()).toBe('replied');
    expect(s.reply).toHaveBeenCalledTimes(2);
  });
  it('PostgREST\'s unknown-column error (PGRST204) also runs unlocked', async () => {
    const store: any = await import('@/lib/wa-chat/store');
    const spy = vi.spyOn(store, 'acquireTurnLock').mockRejectedValueOnce(Object.assign(new Error('schema cache'), { code: 'PGRST204' }));
    expect(await run()).toBe('replied');
    expect(s.releases).toEqual([]);
    spy.mockRestore();
  });
  it('a lock error other than a missing column counts as not acquired', async () => {
    const store: any = await import('@/lib/wa-chat/store');
    const spy = vi.spyOn(store, 'acquireTurnLock').mockRejectedValueOnce(Object.assign(new Error('timeout'), { code: '57014' }));
    expect(await run()).toBe('replied');
    expect(s.waits).toBe(2); // debounce + one poll
    expect(s.releases).toEqual([['c1', 'token']]);
    spy.mockRestore();
  });
  it('a late voice transcript followed by a newer message: the AI gets a note naming it and judges', async () => {
    const voice = addMsg('customer', '🎤 room for two tomorrow', 'voice');
    addMsg('customer', 'hello?');
    addMsg('ai', 'Hi! How can I help?');
    // Timing alone would call it answered: the reply was saved after the transcript was written.
    const since = new Date(Date.now() - 1000).toISOString();
    s.reply.mockResolvedValue('A room for two: ₹3,000.');
    expect(await run(voice.id, { force: true, since })).toBe('replied');
    expect(s.reply.mock.calls[0][2]).toBe("The customer's earlier voice note was just transcribed: «room for two tomorrow». Answer it now if your earlier replies did not already address it. If they did and nothing else is unanswered, reply with exactly NOTHING_TO_ADD.");
    expect(s.sent.map((x) => x[1])).toEqual(['A room for two: ₹3,000.']);
  });
  it('the AI may say a late transcript was already addressed: nothing is sent', async () => {
    const voice = addMsg('customer', '🎤 room for two tomorrow', 'voice');
    addMsg('customer', 'hello?');
    addMsg('ai', 'A room for two: ₹3,000. Anything else?');
    s.reply.mockResolvedValue('NOTHING_TO_ADD');
    expect(await run(voice.id, { force: true, since: NOW() })).toBe('already_answered');
    expect(s.sent).toEqual([]);
  });
  it('a late voice transcript that is the newest message: answered unless answered after its text was written', async () => {
    const voice = addMsg('customer', '🎤 room for two tomorrow', 'voice');
    const before = new Date(Date.now() - 1000).toISOString();
    addMsg('ai', 'A room for two: ₹3,000.');
    expect(await run(voice.id, { force: true, since: before })).toBe('already_answered');
    expect(s.reply).not.toHaveBeenCalled();
    const after = new Date(Date.now() + 1000).toISOString();
    expect(await run(voice.id, { force: true, since: after })).toBe('replied');
    expect(s.reply.mock.calls[0][2]).toBeUndefined();
  });
  it('an unconfirmed send is logged as unknown and never resent', async () => {
    s.sendResult = { ok: false, unknown: true, error: 'timeout' };
    expect(await run()).toBe('replied');
    expect(s.sent).toHaveLength(1);
    expect(s.outbound[0]).toEqual(['c1', 'ai', 'Hello Asha!', null, 'Delivery not confirmed – check the chat before resending', undefined, 'unknown']);
  });
  it('waits for a voice note that is still being transcribed before answering', async () => {
    s.voicePending = 2;
    s.reply.mockImplementation(async () => { expect(s.voicePending).toBeLessThan(0); return 'ok'; });
    expect(await run()).toBe('replied');
    expect(s.waits).toBe(3); // debounce + two polls
  });
  it('aiAllowed handles test mode', () => {
    expect(aiAllowed({ ai_mode: 'test', test_numbers: ['919800000001'] }, '919800000001')).toBe(true);
    expect(aiAllowed({ ai_mode: 'test', test_numbers: ['919800000001'] }, '919800000002')).toBe(false);
    expect(aiAllowed({ ai_mode: 'on', test_numbers: [] }, 'x')).toBe(true);
    expect(aiAllowed({ ai_mode: 'off', test_numbers: ['x'] }, 'x')).toBe(false);
  });
  it('rate limit hands over', async () => {
    s.hourCount = 20;
    expect(await run()).toBe('handed_over');
    expect(s.statuses[0]).toEqual(['c1', 'needs_human', 'AI reply limit reached']);
    expect(s.sent[0][1]).toBe(HOLDING_REPLY);
  });
  it('rate limit: no holding reply when the chat was flagged meanwhile', async () => {
    s.hourCount = 20; s.flagFails = true;
    expect(await run()).toBe('handed_over');
    expect(s.sent).toEqual([]);
    expect(s.emails).toEqual([]);
  });
  it('AI failure sends holding message and hands over', async () => {
    s.reply.mockRejectedValue(new Error('OpenAI 500'));
    expect(await run()).toBe('failed');
    expect(s.sent[0][1]).toBe(HOLDING_REPLY);
    expect(s.statuses[0][1]).toBe('needs_human');
    expect(s.emails).toHaveLength(1);
  });
  it('ignores chats whose last customer message is older than 24 hours', async () => {
    s.conv.last_customer_at = new Date(Date.now() - 25 * 3600e3).toISOString();
    expect(await run()).toBe('skipped');
  });
});
