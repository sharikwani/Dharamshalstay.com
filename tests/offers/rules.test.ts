// tests/offers/rules.test.ts
import { describe, expect, it } from 'vitest';
import {
  CODE_ALPHABET, cappedPlanPercents, codeState, discounted, formatIST, hoursLeft, isExpired, judgeCode, makeCode,
  maxPercent, normalizeCode, offerNeedsOnline, planPercent, roomPlans, rulesLine, shouldRelease, upToText,
} from '@/lib/offers/rules';

const OFFER = { default_percent: 20, plan_percents: { 'Deluxe|Breakfast': 25, 'Deluxe|Room Only': 15 } };
const NOW = Date.parse('2026-10-13T10:00:00Z');
const iso = (mins: number) => new Date(NOW + mins * 60e3).toISOString();
const code = (over: any = {}): any => ({ status: 'issued', expires_at: iso(60), percent: 25, booked_percent: null, booking_id: null, ...over });
const booking = (over: any = {}): any => ({ id: 'b1', booking_ref: 'HTL-1', status: 'pending', payment_status: 'pending', created_at: iso(-10), guest_name: 'Asha', guest_phone: '9800000001', ...over });

describe('codes', () => {
  it('makes PREFIX- plus 5 unambiguous characters', () => {
    expect(CODE_ALPHABET).not.toMatch(/[0O1I]/);
    expect(CODE_ALPHABET).toHaveLength(32);
    const seq = [0, 31, 7, 22, 30];
    let i = 0;
    expect(makeCode('PNV', () => seq[i++])).toBe('PNV-A9HY8');
    for (let n = 0; n < 50; n++) {
      expect(makeCode('PNV', (m) => Math.floor(Math.random() * m))).toMatch(/^PNV-[ABCDEFGHJKLMNPQRSTUVWXYZ2-9]{5}$/);
    }
  });
  it('normalizes codes typed with spaces, lower case or no dash', () => {
    expect(normalizeCode(' pnv 7k3q9 ')).toBe('PNV-7K3Q9');
    expect(normalizeCode('PNV7K3Q9')).toBe('PNV-7K3Q9');
    expect(normalizeCode('pnv-7k3q9')).toBe('PNV-7K3Q9');
    expect(normalizeCode('hello')).toBe('HELLO');
    expect(normalizeCode(null)).toBe('');
  });
});

describe('percents', () => {
  it('max is the highest of the default and the plan percents', () => {
    expect(maxPercent(OFFER)).toBe(25);
    expect(maxPercent({ default_percent: 30, plan_percents: { 'Deluxe|Breakfast': 25 } })).toBe(30);
    expect(maxPercent({ default_percent: 20, plan_percents: {} })).toBe(20);
    expect(maxPercent({ default_percent: 20, plan_percents: { 'Deluxe|Breakfast': 95 } })).toBe(20);
  });
  it('plan percent falls back to the default', () => {
    expect(planPercent(OFFER, 'Deluxe', 'Breakfast')).toBe(25);
    expect(planPercent(OFFER, 'Deluxe', 'Half Board')).toBe(20);
    expect(planPercent(OFFER, 'Deluxe', null)).toBe(20);
    expect(planPercent({ default_percent: 20, plan_percents: { 'Deluxe|Breakfast': 95 } }, 'Deluxe', 'Breakfast')).toBe(20);
  });
  it('caps plan percents at the code snapshot and rounds discounts', () => {
    expect(cappedPlanPercents({ plan_percents: { 'Deluxe|Breakfast': 30, 'Deluxe|Room Only': 15 } }, 25)).toEqual({ 'Deluxe|Breakfast': 25, 'Deluxe|Room Only': 15 });
    expect(discounted(8000, 25)).toBe(6000);
    expect(discounted(4999, 15)).toBe(4249);
  });
  it('lists active rooms with their plan names', () => {
    expect(roomPlans([{ name: 'Deluxe', rate_plans: [{ name: 'Room Only' }, { name: '' }] }, { name: 'Old', is_active: false }, { name: 'Cottage' }, null]))
      .toEqual([{ room: 'Deluxe', plans: ['Room Only'] }, { room: 'Cottage', plans: [] }]);
    expect(roomPlans(null)).toEqual([]);
  });
  it('up-to wording uses the highest percent', () => {
    expect(upToText(OFFER)).toBe('Up to 25% off, only through this WhatsApp chat');
  });
});

describe('expiry and release', () => {
  it('a code is expired at or after expires_at', () => {
    expect(isExpired({ expires_at: iso(1) }, NOW)).toBe(false);
    expect(isExpired({ expires_at: iso(0) }, NOW)).toBe(true);
    expect(codeState({ status: 'issued', expires_at: iso(-1) }, NOW)).toBe('expired');
    expect(codeState({ status: 'booked', expires_at: iso(-1) }, NOW)).toBe('booked');
  });
  it('hours left rounds up and is at least 1', () => {
    expect(hoursLeft(iso(179), NOW)).toBe(3);
    expect(hoursLeft(iso(-5), NOW)).toBe(1);
    expect(offerNeedsOnline(iso(179), NOW)).toBe("This offer needs online payment, which isn't available right now; show the code at reception within 3 hours instead");
    expect(offerNeedsOnline(iso(30), NOW)).toMatch(/within 1 hour instead$/);
  });
  it('releases a booked code when its booking is dead or unpaid past the online hold', () => {
    const b = code({ status: 'booked', booking_id: 'b1' });
    expect(shouldRelease(b, booking({ status: 'cancelled' }), NOW)).toBe(true);
    expect(shouldRelease(b, booking({ status: 'failed' }), NOW)).toBe(true);
    expect(shouldRelease(b, null, NOW)).toBe(true);
    expect(shouldRelease(b, booking({ created_at: iso(-36) }), NOW)).toBe(true);
    expect(shouldRelease(b, booking({ created_at: iso(-34) }), NOW)).toBe(false);
    expect(shouldRelease(b, booking({ created_at: iso(-600), payment_status: 'paid', status: 'confirmed' }), NOW)).toBe(false);
    expect(shouldRelease(code(), null, NOW)).toBe(false);
  });
  it('a claimed code with no booking yet is released only after it expires', () => {
    expect(shouldRelease(code({ status: 'booked' }), null, NOW)).toBe(false);
    expect(shouldRelease(code({ status: 'booked', expires_at: iso(-1) }), null, NOW)).toBe(true);
  });
});

describe('judgeCode', () => {
  it('walk-in codes are valid until they expire', () => {
    expect(judgeCode(code(), null, NOW)).toEqual({ valid: true, reason: null, path: 'walk_in', percent: 25 });
    expect(judgeCode(code({ expires_at: iso(-1) }), null, NOW)).toEqual({ valid: false, reason: 'expired', path: 'walk_in', percent: 25 });
  });
  it('paid bookings stay valid with no time limit', () => {
    const c = code({ status: 'booked', booking_id: 'b1', booked_percent: 20, expires_at: iso(-6000) });
    expect(judgeCode(c, booking({ payment_status: 'paid' }), NOW)).toEqual({ valid: true, reason: null, path: 'paid_booking', percent: 20 });
    expect(judgeCode(c, booking(), NOW)).toEqual({ valid: false, reason: 'awaiting_payment', path: 'paid_booking', percent: 20 });
  });
  it('used and cancelled codes are not valid', () => {
    expect(judgeCode(code({ status: 'redeemed' }), null, NOW)).toMatchObject({ valid: false, reason: 'already_used', path: 'walk_in' });
    expect(judgeCode(code({ status: 'cancelled' }), null, NOW)).toMatchObject({ valid: false, reason: 'cancelled' });
  });
});

describe('wording', () => {
  it('formats times in India time', () => {
    expect(formatIST('2026-10-13T13:00:00Z')).toMatch(/13 Oct.*6:30\s*pm/i);
  });
  it('rules line covers both paths, or reception only without online payment', () => {
    const c = { expires_at: '2026-10-13T13:00:00Z', percent: 25 };
    expect(rulesLine(c, true)).toMatch(/^Up to 25% off\. Book in this chat .* pay online in full .* reception .* Not valid with pay later\.$/);
    expect(rulesLine(c, false)).toMatch(/reception/);
    expect(rulesLine(c, false)).not.toMatch(/pay online/);
  });
});
