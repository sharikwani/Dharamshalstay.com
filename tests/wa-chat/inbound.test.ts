import { describe, expect, it, vi, beforeEach } from 'vitest';

const s = vi.hoisted(() => ({
  allowed: true, typing: [] as string[], saved: [] as any[], bodies: [] as any[], dup: false, status: 'ai', isNew: true, transcript: 'room for two tomorrow' as string | null,
  processed: [] as any[], statuses: [] as any[], sent: [] as any[], out: [] as any[], emails: [] as any[],
  open: null as any, proofResult: 'cancelled' as string, proofs: [] as any[],
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
  saveOutbound: async (...a: any[]) => { s.out.push(a); },
  getSettings: async () => ({ ai_mode: 'test', test_numbers: [] }),
}));
vi.mock('@/lib/whatsapp-cloud', () => ({
  markReadTyping: async (id: string) => { s.typing.push(id); },
  downloadMedia: async () => ({ data: new ArrayBuffer(1), mimeType: 'audio/ogg' }),
  sendText: async (to: string, b: string) => { s.sent.push([to, b]); return { ok: true, id: 'w' }; },
}));
vi.mock('@/lib/wa-chat/assistant', () => ({ transcribe: async () => s.transcript }));
vi.mock('@/lib/wa-chat/process', () => ({
  HOLDING_REPLY: 'HOLD', aiAllowed: () => s.allowed, processConversation: async (...a: any[]) => { s.processed.push(a); return 'replied'; },
}));
vi.mock('@/lib/email', () => ({ sendEmail: async (m: any) => { s.emails.push(m); }, adminEmail: () => 'a@x' }));

import { handleInbound } from '@/lib/wa-chat/inbound';

const base = { waId: 'w1', from: '919800000001', profileName: 'Asha', timestamp: Math.floor(Date.now() / 1000) };
beforeEach(() => {
  Object.assign(s, { allowed: true, typing: [], saved: [], bodies: [], dup: false, status: 'ai', isNew: true, transcript: 'room for two tomorrow',
    open: null, proofResult: 'cancelled', proofs: [],
    processed: [], statuses: [], sent: [], out: [], emails: [] });
});

describe('handleInbound', () => {
  it('stores text and starts processing with a deadline', async () => {
    await (await handleInbound({ ...base, kind: 'text', text: 'Hi' }));
    expect(s.saved[0]).toEqual(['w1', 'Hi', 'text']);
    expect(s.processed[0]).toEqual(['c1', 'row1', { deadline: expect.any(Number) }]);
  });
  it('transcribes voice notes in the background, then answers', async () => {
    const work = await handleInbound({ ...base, kind: 'voice', text: '', mediaId: 'm1' });
    expect(s.saved[0]).toEqual(['w1', '[voice note]', 'voice']);
    await work;
    expect(s.bodies).toEqual([['row1', '🎤 room for two tomorrow']]);
    expect(s.processed).toHaveLength(1);
  });
  it('an unreadable voice note goes to the owner', async () => {
    s.transcript = null;
    await (await handleInbound({ ...base, kind: 'voice', text: '', mediaId: 'm1' }));
    expect(s.statuses[0]).toEqual(['c1', 'needs_human', 'Customer sent a voice note']);
    expect(s.processed).toEqual([]);
  });
  it('hands media to the owner with one holding reply and an email', async () => {
    await (await handleInbound({ ...base, kind: 'media', text: 'this room?', mediaId: 'm2', mediaLabel: '[photo]' }));
    expect(s.saved[0]).toEqual(['w1', '[photo] this room?', 'media']);
    expect(s.statuses[0]).toEqual(['c1', 'needs_human', 'Customer sent [photo]']);
    expect(s.sent).toEqual([['919800000001', 'HOLD']]);
    expect(s.emails[0].subject).toMatch(/needs you/);
    expect(s.processed).toEqual([]);
  });
  it('a second photo while waiting for the owner gets no second holding reply', async () => {
    s.status = 'needs_human';
    await (await handleInbound({ ...base, kind: 'media', text: '', mediaId: 'm2', mediaLabel: '[photo]' }));
    expect(s.sent).toEqual([]);
    expect(s.emails).toEqual([]);
  });
  it('does not send a holding reply over the owner when they have the chat', async () => {
    s.status = 'human';
    await (await handleInbound({ ...base, kind: 'media', text: '', mediaId: 'm2', mediaLabel: '[photo]' }));
    expect(s.sent).toEqual([]);
  });
  it('media from numbers the AI does not serve gets no auto reply', async () => {
    s.allowed = false; s.isNew = false;
    await (await handleInbound({ ...base, kind: 'media', text: '', mediaId: 'm2', mediaLabel: '[photo]' }));
    expect(s.sent).toEqual([]);
    expect(s.statuses).toEqual([]);
  });
  it('emails the owner about a new chat the AI will not answer', async () => {
    s.allowed = false;
    await (await handleInbound({ ...base, kind: 'text', text: 'Hi' }));
    expect(s.emails[0].subject).toMatch(/New WhatsApp chat from Asha/);
  });
  it('shows typing only when the AI will answer', async () => {
    await (await handleInbound({ ...base, kind: 'text', text: 'Hi' }));
    expect(s.typing).toEqual(['w1']);
    s.allowed = false; s.typing = [];
    await (await handleInbound({ ...base, kind: 'text', text: 'Hi' }));
    expect(s.typing).toEqual([]);
  });
  it('duplicate delivery does not process twice', async () => {
    s.dup = true;
    expect(await handleInbound({ ...base, kind: 'text', text: 'Hi' })).toBeNull();
    expect(s.processed).toEqual([]);
  });
  it('a document for an open cancellation is checked, then the AI answers', async () => {
    s.open = { id: 'x1', booking_id: 'b1' };
    await (await handleInbound({ ...base, kind: 'media', text: '', mediaId: 'm2', mediaLabel: '[photo]' }));
    expect(s.proofs[0][1]).toBe('row1');
    expect(s.statuses).toEqual([]);
    expect(s.processed).toHaveLength(1);
  });
  it('a proof sent to review does not trigger an AI reply', async () => {
    s.open = { id: 'x1', booking_id: 'b1' }; s.proofResult = 'review';
    await (await handleInbound({ ...base, kind: 'media', text: '', mediaId: 'm2', mediaLabel: '[photo]' }));
    expect(s.processed).toEqual([]);
  });
  it('ignores open cancellations while a person has the chat', async () => {
    s.open = { id: 'x1', booking_id: 'b1' }; s.status = 'human';
    await (await handleInbound({ ...base, kind: 'media', text: '', mediaId: 'm2', mediaLabel: '[photo]' }));
    expect(s.proofs).toEqual([]);
  });
  it('ignores messages older than 24 hours', async () => {
    expect(await handleInbound({ ...base, timestamp: base.timestamp - 90000, kind: 'text', text: 'old' })).toBeNull();
    expect(s.saved).toEqual([]);
  });
});
