// tests/wa-chat/cancellations.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  own: [] as any[], saved: [] as any[], updated: [] as any[], cancels: [] as any[], cancelOk: true, verdict: { verdict: 'matches', notes: 'ok' } as any,
  media: { data: new ArrayBuffer(2), mimeType: 'image/jpeg' } as any, uploads: [] as any[], bodies: [] as any[], statuses: [] as any[], sent: [] as any[], outs: [] as any[], emails: [] as any[],
}));
vi.mock('@/lib/wa-chat/booking-store', () => ({
  ownBookings: async () => h.own,
  findOwnBooking: async (_p: string, ref: string) => h.own.find((b) => b.booking_ref === String(ref).trim().toUpperCase()) ?? null,
  saveCancellation: async (row: any) => { h.saved.push(row); return { id: 'x1', ...row }; },
  updateCancellation: async (...a: any[]) => { h.updated.push(a); },
}));
vi.mock('@/lib/bookings/cancel', () => ({ cancelBooking: async (...a: any[]) => { h.cancels.push(a); return h.cancelOk ? { ok: true } : { ok: false, error: 'x' }; } }));
vi.mock('@/lib/wa-chat/proof', () => ({ checkProof: async () => h.verdict }));
vi.mock('@/lib/whatsapp-cloud', () => ({
  downloadMedia: async () => h.media,
  sendText: async (to: string, body: string) => { h.sent.push([to, body]); return { ok: true, id: 'w' }; },
}));
vi.mock('@/lib/wa-chat/store', () => ({
  setMessageBody: async (...a: any[]) => { h.bodies.push(a); },
  setStatus: async (...a: any[]) => { h.statuses.push(a); },
  saveOutbound: async (...a: any[]) => { h.outs.push(a); },
}));
vi.mock('@/lib/email', () => ({ sendEmail: async (m: any) => { h.emails.push(m); }, adminEmail: () => 'a@x' }));
vi.mock('@/lib/server-auth', () => ({
  serviceClient: () => ({ storage: { from: () => ({
    upload: async (path: string) => { h.uploads.push(path); return { error: null }; },
    createSignedUrl: async () => ({ data: { signedUrl: 'https://signed/proof' } }),
  }) } }),
}));

import { handleProof, requestCancellation } from '@/lib/wa-chat/cancellations';

const ctx = () => ({ conversationId: 'c1', phone: '919800000001', profileName: 'Asha', handedOver: false });
const handover = async (a: any, c: any) => { c.handedOver = true; return { ok: true }; };
const future = (days: number) => new Date(Date.now() + days * 86400e3 + 5.5 * 3600e3).toISOString().slice(0, 10);
const booking = (over: any = {}) => ({ id: 'b1', booking_ref: 'TRK-1', category: 'trek', status: 'pending', payment_status: 'pending', activity_date: future(5), guest_name: 'Asha Rao', trek_id: 't1', created_at: new Date().toISOString(), commission_status: 'pending', ...over });
const ask = (a: any, c = ctx()) => requestCancellation({ booking_ref: 'TRK-1', reason_text: 'fever', ...a }, c, handover);

beforeEach(() => {
  Object.assign(h, { own: [booking()], saved: [], updated: [], cancels: [], cancelOk: true, verdict: { verdict: 'matches', notes: 'ok' },
    media: { data: new ArrayBuffer(2), mimeType: 'image/jpeg' }, uploads: [], bodies: [], statuses: [], sent: [], outs: [], emails: [] });
});

describe('requestCancellation', () => {
  it('asks for proof for a valid reason on an unpaid booking 24h+ away', async () => {
    expect(await ask({ reason_code: 'medical' })).toMatchObject({ result: 'need_proof' });
    expect(h.saved[0]).toEqual({ conversation_id: 'c1', booking_id: 'b1', reason_code: 'medical', reason_text: 'fever', status: 'awaiting_proof' });
  });
  it('not found / already cancelled', async () => {
    expect(await ask({ booking_ref: 'TRK-404', reason_code: 'medical' })).toMatchObject({ result: 'not_found' });
    h.own = [booking({ status: 'cancelled' })];
    expect(await ask({ reason_code: 'medical' })).toMatchObject({ result: 'already_cancelled' });
  });
  it('hands over paid bookings', async () => {
    h.own = [booking({ payment_status: 'paid' })];
    const c = ctx();
    expect(await ask({ reason_code: 'medical' }, c)).toMatchObject({ result: 'handed_over' });
    expect(c.handedOver).toBe(true);
    expect(h.cancels).toEqual([]);
  });
  it('refuses within 24 hours', async () => {
    h.own = [booking({ activity_date: future(0) })];
    expect(await ask({ reason_code: 'medical' })).toMatchObject({ result: 'not_allowed_within_24h' });
    expect(h.saved).toEqual([]);
  });
  it('hands over "other" reasons and unknown start dates', async () => {
    expect(await ask({ reason_code: 'other' })).toMatchObject({ result: 'handed_over' });
    h.own = [booking({ activity_date: null })];
    expect(await ask({ reason_code: 'medical' })).toMatchObject({ result: 'handed_over' });
  });
  it('cancels a verified duplicate without proof', async () => {
    h.own = [booking(), booking({ id: 'b0', booking_ref: 'TRK-0' })];
    expect(await ask({ reason_code: 'duplicate_or_mistake' })).toMatchObject({ result: 'cancelled' });
    expect(h.cancels[0][0].id).toBe('b1');
    expect(h.cancels[0][2]).toEqual({ notify: true });
  });
  it('hands over a "mistake" with no duplicate', async () => {
    expect(await ask({ reason_code: 'duplicate_or_mistake' })).toMatchObject({ result: 'handed_over' });
    expect(h.cancels).toEqual([]);
  });
});

describe('handleProof', () => {
  const conv: any = { id: 'c1', phone: '919800000001', profile_name: 'Asha', status: 'ai' };
  const open: any = { id: 'x1', conversation_id: 'c1', booking_id: 'b1', reason_code: 'medical', reason_text: 'fever', status: 'awaiting_proof' };
  const msg: any = { waId: 'w9', from: '919800000001', kind: 'media', text: '', mediaId: 'm1', mediaLabel: '[photo]' };

  it('cancels when the proof matches', async () => {
    expect(await handleProof(conv, 'row9', msg, open)).toBe('cancelled');
    expect(h.uploads[0]).toBe('c1/x1.jpg');
    expect(h.cancels[0][1]).toMatch(/WhatsApp: Illness or medical emergency - fever \(proof checked\)/);
    expect(h.updated.at(-1)).toEqual(['x1', expect.objectContaining({ status: 'cancelled', verdict: 'matches', proof_path: 'c1/x1.jpg' })]);
    expect(h.bodies[0][1]).toMatch(/TRK-1.*cancelled/);
  });
  it('sends anything else to the owner for review', async () => {
    h.verdict = { verdict: 'mismatch', notes: 'Name differs' };
    expect(await handleProof(conv, 'row9', msg, open)).toBe('review');
    expect(h.cancels).toEqual([]);
    expect(h.statuses[0]).toEqual(['c1', 'needs_human', expect.stringMatching(/TRK-1/)]);
    expect(h.sent[0][1]).toMatch(/review/i);
    expect(h.emails[0].html).toMatch(/Name differs/);
    expect(h.emails[0].html).toMatch(/https:\/\/signed\/proof/);
    expect(h.updated.at(-1)).toEqual(['x1', expect.objectContaining({ status: 'needs_review', verdict: 'mismatch' })]);
  });
  it('re-checks the booking: paid or now inside 24h goes to review even if the proof matches', async () => {
    h.own = [booking({ payment_status: 'paid' })];
    expect(await handleProof(conv, 'row9', msg, open)).toBe('review');
    h.own = [booking({ activity_date: future(0) })];
    expect(await handleProof(conv, 'row9', msg, open)).toBe('review');
    expect(h.cancels).toEqual([]);
  });
  it('a download failure is reviewed, not cancelled', async () => {
    h.media = null;
    expect(await handleProof(conv, 'row9', msg, open)).toBe('review');
    expect(h.uploads).toEqual([]);
  });
});
