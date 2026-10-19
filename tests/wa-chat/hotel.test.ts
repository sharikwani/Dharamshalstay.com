import { describe, expect, it, vi, beforeEach } from 'vitest';

const s = vi.hoisted(() => ({
  decision: {} as any, latest: 'm1', lock: 'tok' as string | null, sent: [] as any[], statuses: [] as any[], emails: [] as any[], prompts: [] as string[],
}));
vi.mock('@/lib/server-auth', () => {
  const q: any = { select: () => q, eq: () => q, not: () => q, order: () => q, limit: () => Promise.resolve({ data: [{ id: 'p1', name: 'Young Monk Hostel', slug: 'young-monk', contact_phone: '+919193191934', owner_id: 'admin1', owner_email: null }] }), maybeSingle: () => Promise.resolve({ data: null }) };
  return { serviceClient: () => ({ from: () => q }) };
});
vi.mock('@/lib/listings/ownership', () => ({ adminIds: async () => new Set(['admin1']), isUnclaimed: (p: any, a: Set<string>) => !p.owner_email && a.has(p.owner_id) }));
vi.mock('@/lib/listings/links', () => ({ claimUrl: (p: any) => `https://x/claim/${p.slug}?t=KEY` }));
vi.mock('@/lib/wa-chat/store', () => ({
  acquireTurnLock: async () => s.lock, releaseTurnLock: async () => {}, latestInboundId: async () => s.latest,
  history: async () => [{ id: 'm1', author: 'customer', kind: 'text', body: 'Can we have a call today?' }],
  setStatus: async (...a: any[]) => { s.statuses.push(a); },
}));
vi.mock('@/lib/wa-chat/send', () => ({ sendLogged: async (_c: any, t: string) => { s.sent.push(t); return { ok: true, id: 'w' }; } }));
vi.mock('@/lib/wa-chat/assistant', () => ({ toOpenAiMessages: (m: any[]) => m.map((x) => ({ role: 'user', content: x.body })) }));
vi.mock('@/lib/email', () => ({ sendEmail: async (m: any) => { s.emails.push(m); }, adminEmail: () => 'a@x' }));

import { answerHotel, hotelModeAllowed, hotelPrompt } from '@/lib/wa-chat/hotel';

const conv: any = { id: 'c1', phone: '919193191934', profile_name: 'Young Monk', status: 'human', handover_reason: 'Hotel or business number (Young Monk Hostel): the AI does not reply' };

beforeEach(() => {
  Object.assign(s, { decision: { skip: false, reply: 'Namaste! Happy to talk. What time suits you?', handover: true, reason: 'Wants a call today' }, latest: 'm1', lock: 'tok', sent: [], statuses: [], emails: [], prompts: [] });
  process.env.OPENAI_API_KEY = 'k';
  vi.stubGlobal('fetch', async (_u: string, init: any) => {
    s.prompts.push(JSON.parse(init.body).messages[0].content);
    return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(s.decision) } }] }) };
  });
});

describe('hotel mode', () => {
  it('answers chats parked only because the number is a hotel, never ones the owner took over', () => {
    expect(hotelModeAllowed(conv)).toBe(true);
    expect(hotelModeAllowed({ status: 'ai', handover_reason: null })).toBe(true);
    expect(hotelModeAllowed({ status: 'human', handover_reason: null })).toBe(false);
    expect(hotelModeAllowed({ status: 'needs_human', handover_reason: 'Hotel: wants a call' })).toBe(false);
  });
  it('gives the AI the hotel claim link and the no-numbers rule', () => {
    const p = hotelPrompt({ id: 'p1', name: 'Young Monk Hostel', slug: 'young-monk', claimed: false }, 'Monday');
    expect(p).toMatch(/claim\/young-monk\?t=KEY/);
    expect(p).toMatch(/NOT a guest/);
    expect(p).toMatch(/commission/);
  });
  it('replies, hands a call request to the owner, and emails what it said', async () => {
    expect(await answerHotel(conv, 'm1', 'Can we have a call today?', 'Young Monk Hostel', { settleMs: 0 })).toBe('handed over');
    expect(s.sent).toEqual(['Namaste! Happy to talk. What time suits you?']);
    expect(s.statuses[0]).toEqual(['c1', 'needs_human', 'Hotel: Wants a call today']);
    expect(s.emails[0].subject).toMatch(/hotel needs you: Young Monk Hostel/);
    expect(s.emails[0].html).toMatch(/What time suits you/);
    expect(s.prompts[0]).toMatch(/claim\/young-monk\?t=KEY/);
  });
  it('stays quiet for an automatic greeting', async () => {
    s.decision = { skip: true, reply: '', handover: false, reason: '' };
    expect(await answerHotel(conv, 'm1', 'Thank you for contacting us!', null, { settleMs: 0 })).toBe('skipped');
    expect(s.sent).toEqual([]);
    expect(s.emails).toEqual([]);
  });
  it('leaves two quick messages to one reply from the newest', async () => {
    s.latest = 'm2';
    expect(await answerHotel(conv, 'm1', 'Hello', null, { settleMs: 0 })).toBe('newer message');
    expect(s.sent).toEqual([]);
  });
  it('emails the owner if the AI fails', async () => {
    vi.stubGlobal('fetch', async () => ({ ok: false, status: 500, json: async () => ({}) }));
    expect(await answerHotel(conv, 'm1', 'Hi', 'Hotel Tibet', { settleMs: 0 })).toBe('failed');
    expect(s.sent).toEqual([]);
    expect(s.emails[0].html).toMatch(/could not reply/);
  });
});
