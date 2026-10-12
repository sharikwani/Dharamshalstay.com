import { describe, expect, it, vi, beforeEach } from 'vitest';

const s = vi.hoisted(() => ({ allowed: true, typing: [] as string[], saved: [] as any[], dup: false, status: 'ai', processed: [] as any[], statuses: [] as any[], sent: [] as any[], out: [] as any[] }));
vi.mock('@/lib/wa-chat/store', () => ({
  saveInbound: async (m: any, body: string, kind: string) => {
    s.saved.push([m.waId, body, kind]);
    return s.dup ? null : { conversation: { id: 'c1', phone: m.from, status: s.status }, message: { id: 'row1' }, isNewConversation: true };
  },
  setStatus: async (...a: any[]) => { s.statuses.push(a); },
  saveOutbound: async (...a: any[]) => { s.out.push(a); },
  getSettings: async () => ({ ai_mode: 'test', test_numbers: [] }),
}));
vi.mock('@/lib/whatsapp-cloud', () => ({
  markReadTyping: async (id: string) => { s.typing.push(id); }, downloadMedia: async () => ({ data: new ArrayBuffer(1), mimeType: 'audio/ogg' }),
  sendText: async (to: string, b: string) => { s.sent.push([to, b]); return { ok: true, id: 'w' }; },
}));
vi.mock('@/lib/wa-chat/assistant', () => ({ transcribe: async () => 'room for two tomorrow' }));
vi.mock('@/lib/wa-chat/process', () => ({
  HOLDING_REPLY: 'HOLD', aiAllowed: () => s.allowed, processConversation: async (...a: any[]) => { s.processed.push(a); return 'replied'; },
}));

import { handleInbound } from '@/lib/wa-chat/inbound';

const base = { waId: 'w1', from: '919800000001', profileName: 'Asha', timestamp: Math.floor(Date.now() / 1000) };
beforeEach(() => { s.allowed = true; s.typing = []; s.saved = []; s.dup = false; s.status = 'ai'; s.processed = []; s.statuses = []; s.sent = []; s.out = []; });

describe('handleInbound', () => {
  it('stores text and starts processing', async () => {
    await (await handleInbound({ ...base, kind: 'text', text: 'Hi' }));
    expect(s.saved[0]).toEqual(['w1', 'Hi', 'text']);
    expect(s.processed[0]).toEqual(['c1', 'row1', { isNew: true }]);
  });
  it('transcribes voice notes', async () => {
    await (await handleInbound({ ...base, kind: 'voice', text: '', mediaId: 'm1' }));
    expect(s.saved[0]).toEqual(['w1', '🎤 room for two tomorrow', 'voice']);
  });
  it('hands media to the owner with one holding reply', async () => {
    await (await handleInbound({ ...base, kind: 'media', text: 'this room?', mediaId: 'm2', mediaLabel: '[photo]' }));
    expect(s.saved[0]).toEqual(['w1', '[photo] this room?', 'media']);
    expect(s.statuses[0]).toEqual(['c1', 'needs_human', 'Customer sent [photo]']);
    expect(s.sent).toEqual([['919800000001', 'HOLD']]);
    expect(s.processed).toEqual([]);
  });
  it('does not send a holding reply over the owner when they have the chat', async () => {
    s.status = 'human';
    await (await handleInbound({ ...base, kind: 'media', text: '', mediaId: 'm2', mediaLabel: '[photo]' }));
    expect(s.sent).toEqual([]);
  });
  it('media from numbers the AI does not serve still goes to processing (owner email), no auto reply', async () => {
    s.allowed = false;
    await (await handleInbound({ ...base, kind: 'media', text: '', mediaId: 'm2', mediaLabel: '[photo]' }));
    expect(s.sent).toEqual([]);
    expect(s.statuses).toEqual([]);
    expect(s.processed[0]).toEqual(['c1', 'row1', { isNew: true }]);
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
  it('ignores messages older than 24 hours', async () => {
    expect(await handleInbound({ ...base, timestamp: base.timestamp - 90000, kind: 'text', text: 'old' })).toBeNull();
    expect(s.saved).toEqual([]);
  });
});
