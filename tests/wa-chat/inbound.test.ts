import { describe, expect, it, vi, beforeEach } from 'vitest';

const s = vi.hoisted(() => ({
  allowed: true, typing: [] as string[], saved: [] as any[], bodies: [] as any[], dup: false, status: 'ai', isNew: true, transcript: 'room for two tomorrow' as string | null,
  processed: [] as any[], statuses: [] as any[], sent: [] as any[], out: [] as any[], emails: [] as any[],
  open: null as any, proofResult: 'cancelled' as string, proofs: [] as any[], hold: null as Promise<void> | null, flip: true, hist: [] as any[], sendResult: null as any,
}));
vi.mock('@/lib/wa-chat/booking-store', () => ({ openCancellation: async () => s.open }));
vi.mock('@/lib/wa-chat/cancellations', () => ({ handleProof: async (...a: any[]) => { s.proofs.push(a); return s.proofResult; } }));
vi.mock('@/lib/wa-chat/store', () => ({
  saveInbound: async (m: any, body: string, kind: string) => {
    s.saved.push([m.waId, body, kind]);
    return s.dup ? null : { conversation: { id: 'c1', phone: m.from, profile_name: 'Asha', status: s.status }, message: { id: 'row1' }, isNewConversation: s.isNew };
  },
  setMessageBody: async (...a: any[]) => { s.bodies.push(a); },
  setStatus: async (...a: any[]) => { s.statuses.push(a); },
  setStatusIf: async (id: string, from: string, to: string, why: string) => { if (s.status !== from || !s.flip) return false; s.statuses.push([id, to, why]); return true; },
  saveOutbound: async (...a: any[]) => { s.out.push(a); },
  // Rows logged meanwhile (the holding reply) are part of the history, as in the database.
  history: async () => [...s.hist, ...s.out.map((a, i) => ({ id: `out${i}`, author: a[1], kind: 'text', status: a[3] ? 'sent' : a[6] ?? 'failed', body: a[2] }))],
  getSettings: async () => ({ ai_mode: 'test', test_numbers: [] }),
}));
vi.mock('@/lib/whatsapp-cloud', () => ({
  markReadTyping: async (id: string) => { s.typing.push(id); },
  downloadMedia: async () => ({ data: new ArrayBuffer(1), mimeType: 'audio/ogg' }),
  sendText: async (to: string, b: string) => { s.sent.push([to, b]); return s.sendResult ?? { ok: true, id: 'w' }; },
}));
vi.mock('@/lib/wa-chat/assistant', () => ({ transcribe: async () => s.transcript }));
vi.mock('@/lib/wa-chat/process', () => ({
  HOLDING_REPLY: 'HOLD', aiAllowed: () => s.allowed, processConversation: async (...a: any[]) => { s.processed.push(a); if (s.hold) await s.hold; return 'replied'; },
}));
vi.mock('@/lib/email', () => ({ sendEmail: async (m: any) => { s.emails.push(m); }, adminEmail: () => 'a@x' }));

import { handleInbound } from '@/lib/wa-chat/inbound';

/** Store the message, then run the background work the webhook hands to waitUntil. */
const runIn = async (m: any) => { const r = await handleInbound(m); await r?.work; return r; };

const base = { waId: 'w1', from: '919800000001', profileName: 'Asha', timestamp: Math.floor(Date.now() / 1000) };
beforeEach(() => {
  Object.assign(s, { allowed: true, typing: [], saved: [], bodies: [], dup: false, status: 'ai', isNew: true, transcript: 'room for two tomorrow',
    open: null, proofResult: 'cancelled', proofs: [], hold: null, flip: true, hist: [], sendResult: null,
    processed: [], statuses: [], sent: [], out: [], emails: [] });
});

describe('handleInbound', () => {
  it('stores text and starts processing with a deadline', async () => {
    await runIn({ ...base, kind: 'text', text: 'Hi' });
    expect(s.saved[0]).toEqual(['w1', 'Hi', 'text']);
    expect(s.processed[0]).toEqual(['c1', 'row1', { deadline: expect.any(Number) }]);
  });
  it('returns the background work without waiting for it', async () => {
    let finish!: () => void;
    s.hold = new Promise<void>((r) => { finish = r; });
    const r = await handleInbound({ ...base, kind: 'text', text: 'Hi' });
    expect(r?.work).toBeInstanceOf(Promise);
    let done = false;
    r!.work.then(() => { done = true; });
    await new Promise((x) => setTimeout(x, 10));
    expect(done).toBe(false);
    finish();
    await r!.work;
    expect(done).toBe(true);
  });
  it('transcribes voice notes in the background, then answers', async () => {
    const r = await handleInbound({ ...base, kind: 'voice', text: '', mediaId: 'm1' });
    expect(s.saved[0]).toEqual(['w1', '[voice note]', 'voice']);
    await r?.work;
    expect(s.bodies).toEqual([['row1', '🎤 room for two tomorrow']]);
    expect(s.processed).toHaveLength(1);
    // Forced: a later text may have been answered while this was transcribed.
    expect(s.processed[0][2]).toMatchObject({ force: true, since: expect.any(String), deadline: expect.any(Number) });
  });
  it('an unreadable voice note goes to the owner', async () => {
    s.transcript = null;
    await runIn({ ...base, kind: 'voice', text: '', mediaId: 'm1' });
    expect(s.statuses[0]).toEqual(['c1', 'needs_human', 'Customer sent a voice note']);
    expect(s.processed).toEqual([]);
    // The placeholder is replaced, so a turn waiting for transcriptions does not wait for this one.
    expect(s.bodies).toEqual([['row1', '🎤 [voice note – could not be transcribed]']]);
  });
  it('sends the holding reply only when it moved the chat from AI to the owner itself', async () => {
    s.flip = false; // another message flagged the chat a moment ago
    await runIn({ ...base, kind: 'media', text: '', mediaId: 'm2', mediaLabel: '[photo]' });
    expect(s.sent).toEqual([]);
    expect(s.emails).toEqual([]);
  });
  it('hands media to the owner with one holding reply and an email', async () => {
    await runIn({ ...base, kind: 'media', text: 'this room?', mediaId: 'm2', mediaLabel: '[photo]' });
    expect(s.saved[0]).toEqual(['w1', '[photo] this room?', 'media']);
    expect(s.statuses[0]).toEqual(['c1', 'needs_human', 'Customer sent [photo]']);
    expect(s.sent).toEqual([['919800000001', 'HOLD']]);
    expect(s.emails[0].subject).toMatch(/needs you/);
    expect(s.processed).toEqual([]);
  });
  it('uses the deadline the webhook computed when the request arrived', async () => {
    const r = await handleInbound({ ...base, kind: 'text', text: 'Hi' }, 12345);
    await r?.work;
    expect(s.processed[0][2]).toEqual({ deadline: 12345 });
  });
  it('a photo handed to the owner lists earlier unanswered texts in the email', async () => {
    s.hist = [
      { id: 'a1', author: 'ai', kind: 'text', status: 'sent', body: 'Hello!' },
      { id: 't1', author: 'customer', kind: 'text', status: 'received', body: 'Room for 2 on Friday?' },
      { id: 'row1', author: 'customer', kind: 'media', status: 'received', body: '[photo]' },
    ];
    await runIn({ ...base, kind: 'media', text: '', mediaId: 'm2', mediaLabel: '[photo]' });
    expect(s.emails[0].html).toMatch(/Also unanswered:[\s\S]*Room for 2 on Friday\?/);
    expect(s.emails[0].html).not.toMatch(/Hello!/);
  });
  it('an auto-cancel after an unanswered text: the turn is forced to answer that text', async () => {
    s.open = { id: 'x1', booking_id: 'b1' };
    s.hist = [
      { id: 'a1', author: 'ai', kind: 'text', status: 'sent', body: 'Please send the proof.' },
      { id: 't1', author: 'customer', kind: 'text', status: 'received', body: 'Also, can I rebook for May?' },
      { id: 'row1', author: 'customer', kind: 'media', status: 'received', body: '[photo]' },
    ];
    await runIn({ ...base, kind: 'media', text: '', mediaId: 'm2', mediaLabel: '[photo]' });
    expect(s.processed).toEqual([['c1', 'row1', { deadline: expect.any(Number), force: true, answer: ['t1'] }]]);
  });
  it('a document that lost the race for an open cancellation still gets a normal turn', async () => {
    s.open = { id: 'x1', booking_id: 'b1' }; s.proofResult = 'busy';
    await runIn({ ...base, kind: 'media', text: '', mediaId: 'm2', mediaLabel: '[photo]' });
    expect(s.processed).toEqual([['c1', 'row1', { deadline: expect.any(Number) }]]);
  });
  it('a holding reply that may have gone out is logged as unknown', async () => {
    s.sendResult = { ok: false, unknown: true, error: 'timeout' };
    await runIn({ ...base, kind: 'media', text: '', mediaId: 'm2', mediaLabel: '[photo]' });
    expect(s.sent).toHaveLength(1);
    expect(s.out[0]).toEqual(['c1', 'ai', 'HOLD', null, 'Delivery not confirmed – check the chat before resending', undefined, 'unknown']);
  });
  it('a second photo while waiting for the owner gets no second holding reply', async () => {
    s.status = 'needs_human';
    await runIn({ ...base, kind: 'media', text: '', mediaId: 'm2', mediaLabel: '[photo]' });
    expect(s.sent).toEqual([]);
    expect(s.emails).toEqual([]);
  });
  it('does not send a holding reply over the owner when they have the chat', async () => {
    s.status = 'human';
    await runIn({ ...base, kind: 'media', text: '', mediaId: 'm2', mediaLabel: '[photo]' });
    expect(s.sent).toEqual([]);
  });
  it('media from numbers the AI does not serve gets no auto reply', async () => {
    s.allowed = false; s.isNew = false;
    await runIn({ ...base, kind: 'media', text: '', mediaId: 'm2', mediaLabel: '[photo]' });
    expect(s.sent).toEqual([]);
    expect(s.statuses).toEqual([]);
  });
  it('emails the owner about a new chat the AI will not answer', async () => {
    s.allowed = false;
    await runIn({ ...base, kind: 'text', text: 'Hi' });
    expect(s.emails[0].subject).toMatch(/New WhatsApp chat from Asha/);
  });
  it('shows typing only when the AI will answer', async () => {
    await runIn({ ...base, kind: 'text', text: 'Hi' });
    expect(s.typing).toEqual(['w1']);
    s.allowed = false; s.typing = [];
    await runIn({ ...base, kind: 'text', text: 'Hi' });
    expect(s.typing).toEqual([]);
  });
  it('duplicate delivery does not process twice', async () => {
    s.dup = true;
    expect(await handleInbound({ ...base, kind: 'text', text: 'Hi' })).toBeNull();
    expect(s.processed).toEqual([]);
  });
  it('a document for an open cancellation is checked, then the AI answers', async () => {
    s.open = { id: 'x1', booking_id: 'b1' };
    await runIn({ ...base, kind: 'media', text: '', mediaId: 'm2', mediaLabel: '[photo]' });
    expect(s.proofs[0][1]).toBe('row1');
    expect(s.statuses).toEqual([]);
    expect(s.processed).toHaveLength(1);
  });
  it('a proof sent to review does not trigger an AI reply', async () => {
    s.open = { id: 'x1', booking_id: 'b1' }; s.proofResult = 'review';
    await runIn({ ...base, kind: 'media', text: '', mediaId: 'm2', mediaLabel: '[photo]' });
    expect(s.processed).toEqual([]);
  });
  it('ignores open cancellations while a person has the chat', async () => {
    s.open = { id: 'x1', booking_id: 'b1' }; s.status = 'human';
    await runIn({ ...base, kind: 'media', text: '', mediaId: 'm2', mediaLabel: '[photo]' });
    expect(s.proofs).toEqual([]);
  });
  it('ignores messages older than 24 hours', async () => {
    expect(await handleInbound({ ...base, timestamp: base.timestamp - 90000, kind: 'text', text: 'old' })).toBeNull();
    expect(s.saved).toEqual([]);
  });
});
