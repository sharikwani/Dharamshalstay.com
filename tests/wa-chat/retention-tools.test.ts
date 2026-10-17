import { describe, expect, it, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  booking: null as any, rows: [] as any[], recorded: [] as any[], answers: [] as any[], coupons: [] as any[], emails: [] as any[],
  found: null as any, reserved: [] as any[],
}));
vi.mock('@/lib/wa-chat/booking-store', () => ({ findOwnBooking: async () => h.booking }));
vi.mock('@/lib/retention/store', () => ({
  offersFor: async () => h.rows,
  recordOffer: async (r: any) => { h.recorded.push(r); h.rows.push({ step: r.step, outcome: 'offered', reason_code: r.reason_code, reason_text: r.reason_text }); },
  answerOffer: async (_id: string, step: string, accepted: boolean, extra: any) => {
    const r = h.rows.find((x) => x.step === step && x.outcome === 'offered');
    if (!r) return false;
    r.outcome = accepted ? 'accepted' : 'declined'; h.answers.push([step, accepted, extra]); return true;
  },
  issueCoupon: async (c: any) => { const x = { ...c, code: 'DSK-TEST12', id: 'k1' }; h.coupons.push(x); return x; },
  findCoupon: async () => h.found,
  reserveCoupon: async (...a: any[]) => { h.reserved.push(a); return true; },
}));
vi.mock('@/lib/email', () => ({ sendEmail: async (m: any) => { h.emails.push(m); }, adminEmail: () => 'a@x' }));

import { answerRetentionOffer, applyCoupon, checkCoupon, retentionGate } from '@/lib/wa-chat/retention-tools';

const ctx = () => ({ conversationId: 'c1', phone: '919800000001', profileName: 'Asha', handedOver: false, sideEffects: [] as string[], actions: [] as string[] });
const handover = async (_a: any, c: any) => { c.handedOver = true; return { ok: true }; };
const booking = (o: Record<string, unknown> = {}) => ({
  id: 'b1', booking_ref: 'HTL-1', category: 'hotel', status: 'confirmed', amount: 8000, payment_status: 'pending', payment_method: 'pay_at_hotel',
  check_in: '2026-11-20', check_out: '2026-11-22', activity_date: null, guest_name: 'Asha', razorpay_payment_id: null, ...o,
});

beforeEach(() => { Object.assign(h, { booking: booking(), rows: [], recorded: [], answers: [], coupons: [], emails: [], found: null, reserved: [] }); });

describe('keep-your-booking flow', () => {
  it('never makes offers for emergencies or duplicates', async () => {
    expect(await retentionGate(h.booking, ctx(), 'medical', 'fever')).toBeNull();
    expect(await retentionGate(h.booking, ctx(), 'family_emergency', '')).toBeNull();
    expect(await retentionGate(h.booking, ctx(), 'duplicate_or_mistake', '')).toBeNull();
  });
  it('offers a free date change first, then 25%, then 5%, then lets them cancel', async () => {
    const c = ctx();
    const first: any = await retentionGate(h.booking, c, 'other', 'plans changed');
    expect(first).toMatchObject({ result: 'offer', step: 'date_change' });
    expect((await answerRetentionOffer({ booking_ref: 'HTL-1', accepted: false }, c, handover) as any).step).toBe('next_25');
    const third: any = await answerRetentionOffer({ booking_ref: 'HTL-1', accepted: false }, c, handover);
    expect(third).toMatchObject({ step: 'instant_5', amount: 400, choices: ['at_hotel', 'credit'] });
    expect(await answerRetentionOffer({ booking_ref: 'HTL-1', accepted: false }, c, handover)).toMatchObject({ result: 'all_declined' });
    // After every "no", request_cancellation goes on with the normal rules: no more offers.
    expect(await retentionGate(h.booking, c, 'other', 'plans changed')).toBeNull();
    expect(h.coupons).toEqual([]);
  });
  it('a free date change goes to the team', async () => {
    const c = ctx();
    await retentionGate(h.booking, c, 'travel_disruption', 'flight moved');
    expect(await answerRetentionOffer({ booking_ref: 'HTL-1', accepted: true }, c, handover)).toMatchObject({ result: 'date_change_requested' });
    expect(c.handedOver).toBe(true);
  });
  it('keeping it for 25% issues a capped coupon that starts at checkout', async () => {
    h.rows = [{ step: 'date_change', outcome: 'declined', reason_code: 'other', reason_text: 'x' }, { step: 'next_25', outcome: 'offered', reason_code: 'other', reason_text: 'x' }];
    const r: any = await answerRetentionOffer({ booking_ref: 'HTL-1', accepted: true }, ctx(), handover);
    expect(r).toMatchObject({ result: 'kept', coupon: { code: 'DSK-TEST12', percent: 25, works_from: '2026-11-22' } });
    expect(h.coupons[0]).toMatchObject({ kind: 'next_25', max_discount: 2000, active_from: '2026-11-22', valid_until: '2027-05-22' });
    expect(h.emails[0].subject).toMatch(/Booking kept/);
  });
  it('5% refund only for online payments; queued for the owner, never sent automatically', async () => {
    h.rows = [{ step: 'date_change', outcome: 'declined' }, { step: 'next_25', outcome: 'declined' }, { step: 'instant_5', outcome: 'offered' }];
    expect(await answerRetentionOffer({ booking_ref: 'HTL-1', accepted: true, choice: 'refund' }, ctx(), handover)).toMatchObject({ error: expect.stringContaining('at_hotel or credit') });
    h.booking = booking({ payment_status: 'paid', razorpay_payment_id: 'pay_1' });
    const r: any = await answerRetentionOffer({ booking_ref: 'HTL-1', accepted: true, choice: 'refund' }, ctx(), handover);
    expect(r).toMatchObject({ result: 'kept', refund: '₹400' });
    expect(h.answers.at(-1)).toEqual(['instant_5', true, { choice: 'refund', amount: 400, refund_status: 'pending' }]);
    expect(h.emails[0].subject).toMatch(/Send a ₹400 refund/);
  });
});

describe('coupons on a new booking', () => {
  const coupon = (o: Record<string, unknown> = {}) => ({
    id: 'k1', code: 'DSK-TEST12', phone: '919800000001', booking_id: 'b0', kind: 'next_25', percent: 25, amount: null, max_discount: 2000,
    status: 'issued', active_from: '2020-01-01', valid_until: '2999-01-01', booking_status: 'completed', used_booking_ref: null, ...o,
  });
  it('only the guest who earned it can use it', async () => {
    h.found = coupon({ phone: '919999999999' });
    expect(await checkCoupon({ code: 'dsk test12' }, ctx())).toMatchObject({ valid: false });
  });
  it('waits until the kept stay is over', async () => {
    h.found = coupon({ active_from: '2999-01-01' });
    expect(await checkCoupon({ code: 'DSK-TEST12' }, ctx())).toMatchObject({ valid: false, reason: expect.stringContaining('2999-01-01') });
  });
  it('applies 25% up to ₹2,000 to a new hotel booking and tells the owner', async () => {
    h.found = coupon();
    h.booking = booking({ id: 'b2', booking_ref: 'HTL-2', amount: 12000 });
    expect(await applyCoupon({ code: 'DSK-TEST12', booking_ref: 'HTL-2' }, ctx())).toMatchObject({ applied: true, discount: '₹2,000' });
    expect(h.reserved[0]).toEqual(['k1', 'HTL-2']);
    expect(h.emails[0].subject).toMatch(/Apply coupon DSK-TEST12 to HTL-2/);
  });
  it('not on the booking it came from, and the 25% is for hotels only', async () => {
    h.found = coupon({ booking_id: 'b1' });
    expect(await applyCoupon({ code: 'DSK-TEST12', booking_ref: 'HTL-1' }, ctx())).toMatchObject({ error: expect.any(String) });
    h.found = coupon();
    h.booking = booking({ id: 'b3', category: 'taxi' });
    expect(await applyCoupon({ code: 'DSK-TEST12', booking_ref: 'TXI-1' }, ctx())).toMatchObject({ error: expect.stringContaining('hotel') });
  });
});
