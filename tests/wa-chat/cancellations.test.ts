// tests/wa-chat/cancellations.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  own: [] as any[], ownSeq: [] as any[][], status: 'ai', sendQueue: [] as any[], cancelResult: null as any, saved: [] as any[], updated: [] as any[], cancels: [] as any[], cancelOk: true, verdict: { verdict: 'matches', notes: 'ok' } as any,
  media: { data: new ArrayBuffer(2), mimeType: 'image/jpeg' } as any, claim: true, ownThrows: false, proofArgs: [] as any[], downloads: 0, uploads: [] as any[], bodies: [] as any[], statuses: [] as any[], sent: [] as any[], outs: [] as any[], emails: [] as any[],
}));
vi.mock('@/lib/wa-chat/booking-store', () => ({
  ownBookings: async () => { if (h.ownThrows) throw new Error('db down'); return h.ownSeq.length ? h.ownSeq.shift()! : h.own; },
  claimCancellation: async () => h.claim,
  findOwnBooking: async (_p: string, ref: string) => h.own.find((b) => b.booking_ref === String(ref).trim().toUpperCase()) ?? null,
  saveCancellation: async (row: any) => { h.saved.push(row); return { id: 'x1', ...row }; },
  updateCancellation: async (...a: any[]) => { h.updated.push(a); },
}));
vi.mock('@/lib/bookings/cancel', () => ({
  PAID_MEANWHILE: 'This booking was paid meanwhile',
  cancelBooking: async (...a: any[]) => { h.cancels.push(a); return h.cancelResult ?? (h.cancelOk ? { ok: true } : { ok: false, error: 'x' }); },
}));
vi.mock('@/lib/wa-chat/proof', () => ({ checkProof: async (a: any) => { h.proofArgs.push(a); return h.verdict; } }));
vi.mock('@/lib/whatsapp-cloud', () => ({
  downloadMedia: async () => { h.downloads++; return h.media; },
  sendText: async (to: string, body: string) => { h.sent.push([to, body]); return h.sendQueue.length ? h.sendQueue.shift() : { ok: true, id: 'w' }; },
}));
vi.mock('@/lib/wa-chat/store', () => ({
  setMessageBody: async (...a: any[]) => { h.bodies.push(a); },
  setStatusIf: async (id: string, from: string, to: string, why: string) => { if (h.status !== from) return false; h.statuses.push([id, to, why]); h.status = to; return true; },
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
  Object.assign(h, { ownSeq: [], status: 'ai', sendQueue: [], cancelResult: null, claim: true, ownThrows: false, proofArgs: [], downloads: 0, own: [booking()], saved: [], updated: [], cancels: [], cancelOk: true, verdict: { verdict: 'matches', notes: 'ok' },
    media: { data: new ArrayBuffer(2), mimeType: 'image/jpeg' }, uploads: [], bodies: [], statuses: [], sent: [], outs: [], emails: [] });
});

describe('requestCancellation', () => {
  it('asks for proof for a valid reason on an unpaid booking 24h+ away', async () => {
    expect(await ask({ reason_code: 'medical' })).toMatchObject({ result: 'need_proof' });
    expect(h.saved[0]).toEqual({ conversation_id: 'c1', booking_id: 'b1', reason_code: 'medical', reason_text: 'fever', status: 'awaiting_proof' });
  });
  it('records a side effect for need_proof, cancelled and handed_over, none for refusals', async () => {
    const c1: any = ctx();
    await ask({ reason_code: 'medical' }, c1);
    expect(c1.sideEffects).toEqual(['request_cancellation']);
    const c2: any = ctx();
    await ask({ reason_code: 'other' }, c2);
    expect(c2.sideEffects).toEqual(['request_cancellation']);
    const c3: any = ctx();
    await ask({ booking_ref: 'TRK-404', reason_code: 'medical' }, c3);
    expect(c3.sideEffects ?? []).toEqual([]);
    h.own = [booking(), booking({ id: 'b2', booking_ref: 'TRK-2' })];
    const c4: any = ctx();
    expect(await ask({ reason_code: 'duplicate_or_mistake' }, c4)).toMatchObject({ result: 'cancelled' });
    expect(c4.sideEffects).toEqual(['request_cancellation']);
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
  it('treats partially paid bookings and ones with a Stripe payment as paid', async () => {
    for (const over of [{ payment_status: 'partially_paid' }, { payment_status: 'pending', stripe_payment_intent: 'pi_1' }]) {
      h.own = [booking(over)];
      h.saved = [];
      const c = ctx();
      expect(await ask({ reason_code: 'medical' }, c)).toMatchObject({ result: 'handed_over' });
      expect(c.handedOver).toBe(true);
      expect(h.saved).toEqual([]);
      expect(h.cancels).toEqual([]);
    }
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
    expect(h.cancels[0][2]).toEqual({ notify: true, requireUnpaid: true, customerWhatsApp: false });
  });
  it('a duplicate re-reads the bookings right before cancelling', async () => {
    // findOwnBooking saw both; the read right before cancelling shows the other one cancelled meanwhile.
    h.own = [booking(), booking({ id: 'b0', booking_ref: 'TRK-0' })];
    h.ownSeq = [[booking(), booking({ id: 'b0', booking_ref: 'TRK-0', status: 'cancelled' })]];
    expect(await ask({ reason_code: 'duplicate_or_mistake' })).toMatchObject({ result: 'handed_over' });
    // This booking was paid meanwhile.
    h.ownSeq = [[booking({ payment_status: 'paid' }), booking({ id: 'b0', booking_ref: 'TRK-0' })]];
    const c = ctx();
    expect(await ask({ reason_code: 'duplicate_or_mistake' }, c)).toMatchObject({ result: 'handed_over' });
    expect(c.handedOver).toBe(true);
    expect(h.cancels).toEqual([]);
  });
  it('a duplicate cancelled or paid between the check and the cancel is reported, not claimed', async () => {
    h.own = [booking(), booking({ id: 'b0', booking_ref: 'TRK-0' })];
    h.cancelResult = { ok: true, already: true };
    expect(await ask({ reason_code: 'duplicate_or_mistake' })).toMatchObject({ result: 'already_cancelled' });
    h.cancelResult = { ok: false, error: 'This booking was paid meanwhile' };
    const c = ctx();
    expect(await ask({ reason_code: 'duplicate_or_mistake' }, c)).toMatchObject({ result: 'handed_over' });
    expect(c.handedOver).toBe(true);
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
    expect(h.cancels[0][2]).toEqual({ notify: true, requireUnpaid: true, customerWhatsApp: false });
  });
  it('always tells the customer the booking is cancelled, without waiting for the AI', async () => {
    expect(await handleProof(conv, 'row9', msg, open)).toBe('cancelled');
    expect(h.sent).toEqual([['919800000001', 'Your booking TRK-1 is cancelled. No payment was taken.']]);
    expect(h.outs[0]).toEqual(['c1', 'ai', 'Your booking TRK-1 is cancelled. No payment was taken.', 'w', undefined]);
  });
  it('a cancellation notice that cannot be sent goes to the owner by email', async () => {
    h.sendQueue = [{ ok: false, error: 'Meta 400' }];
    expect(await handleProof(conv, 'row9', msg, open)).toBe('cancelled');
    expect(h.sent).toHaveLength(1); // an HTTP refusal is never retried
    expect(h.emails[0].subject).toMatch(/could not tell/);
    expect(h.emails[0].html).toMatch(/Your booking TRK-1 is cancelled/);
  });
  it('a proof review does not answer over an owner who has the chat', async () => {
    h.status = 'human';
    h.verdict = { verdict: 'mismatch', notes: 'Name differs' };
    expect(await handleProof(conv, 'row9', msg, open)).toBe('review');
    expect(h.status).toBe('human');
    expect(h.sent).toEqual([]);
    expect(h.emails).toHaveLength(1);
  });
  it('a booking cancelled meanwhile is reported as already cancelled', async () => {
    h.cancelResult = { ok: true, already: true };
    expect(await handleProof(conv, 'row9', msg, open)).toBe('cancelled');
    expect(h.sent).toEqual([['919800000001', 'Your booking TRK-1 is already cancelled.']]);
  });
  it('a booking paid meanwhile is not cancelled: the customer hears it is reviewed and the owner is emailed', async () => {
    h.cancelResult = { ok: false, error: 'This booking was paid meanwhile' };
    expect(await handleProof(conv, 'row9', msg, open)).toBe('review');
    expect(h.sent[0][1]).toMatch(/review/i);
    expect(h.emails[0].html).toMatch(/paid meanwhile/);
    expect(h.statuses[0][1]).toBe('needs_human');
  });
  it('re-reads the booking right before cancelling', async () => {
    h.ownSeq = [[booking()], [booking({ payment_status: 'paid' })]];
    expect(await handleProof(conv, 'row9', msg, open)).toBe('review');
    expect(h.cancels).toEqual([]);
    expect(h.emails[0].html).toMatch(/booking is now paid/);
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
  it('passes the stored start day to the proof check', async () => {
    h.own = [booking({ activity_date: null, check_in: '2030-01-05' })];
    await handleProof(conv, 'row9', msg, open);
    expect(h.proofArgs[0].startDate).toBe('2030-01-05');
  });
  it('an error falls back to owner review and never rejects', async () => {
    h.ownThrows = true;
    expect(await handleProof(conv, 'row9', msg, open)).toBe('review');
    expect(h.sent[0][1]).toMatch(/review/i);
    expect(h.statuses[0][1]).toBe('needs_human');
    expect(h.updated.at(-1)).toEqual(['x1', expect.objectContaining({ status: 'needs_review', verdict_notes: expect.stringMatching(/^error: db down/) })]);
    expect(h.emails[0].html).not.toMatch(/signed/);
  });
  it('says so when the proof matched but cancelling failed', async () => {
    h.cancelOk = false;
    expect(await handleProof(conv, 'row9', msg, open)).toBe('review');
    expect(h.emails[0].html).toMatch(/cancelling failed/);
  });
  it('does nothing when another run already claimed the request', async () => {
    h.claim = false;
    expect(await handleProof(conv, 'row9', msg, open)).toBe('busy');
    expect(h.downloads).toBe(0);
    expect(h.cancels).toEqual([]);
    expect(h.sent).toEqual([]);
    expect(h.emails).toEqual([]);
  });
});
