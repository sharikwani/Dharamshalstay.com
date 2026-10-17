import { describe, expect, it } from 'vitest';
import { addMonths, couponDiscount, couponState, instantAmount, instantChoices, makeCouponCode, nextStep, offerText } from '@/lib/retention/rules';

const hotel = (o: Record<string, unknown> = {}) => ({
  status: 'confirmed', amount: 8000, payment_status: 'pending', payment_method: 'pay_at_hotel',
  check_in: '2026-11-20', check_out: '2026-11-22', activity_date: null, ...o,
}) as any;

describe('retention offers', () => {
  it('offers each step once, in order, and stops when one is accepted', () => {
    expect(nextStep(hotel(), [])).toEqual({ step: 'date_change', pending: false });
    expect(nextStep(hotel(), [{ step: 'date_change', outcome: 'offered' }])).toEqual({ step: 'date_change', pending: true });
    expect(nextStep(hotel(), [{ step: 'date_change', outcome: 'declined' }])).toEqual({ step: 'next_25', pending: false });
    expect(nextStep(hotel(), [{ step: 'date_change', outcome: 'declined' }, { step: 'next_25', outcome: 'declined' }])).toEqual({ step: 'instant_5', pending: false });
    expect(nextStep(hotel(), [{ step: 'date_change', outcome: 'declined' }, { step: 'next_25', outcome: 'declined' }, { step: 'instant_5', outcome: 'declined' }])).toBeNull();
    expect(nextStep(hotel(), [{ step: 'date_change', outcome: 'declined' }, { step: 'next_25', outcome: 'accepted' }])).toBe('kept');
  });
  it('skips the 5% when the price is unknown', () => {
    expect(nextStep(hotel({ amount: null }), [{ step: 'date_change', outcome: 'declined' }, { step: 'next_25', outcome: 'declined' }])).toBeNull();
  });
  it('5% is a refund only for online payments, off at the hotel otherwise', () => {
    expect(instantAmount(hotel())).toBe(400);
    expect(instantChoices(hotel())).toEqual(['at_hotel', 'credit']);
    expect(instantChoices(hotel({ payment_status: 'paid', razorpay_payment_id: 'pay_1' }))).toEqual(['refund', 'credit']);
    expect(offerText('instant_5', hotel())).toContain('5% (₹400) off');
    expect(offerText('instant_5', hotel({ payment_status: 'paid' }))).toMatch(/3-5 business days/);
  });
  it('the 25% coupon names its start day and cap', () => {
    expect(offerText('next_25', hotel())).toMatch(/25% off .*up to ₹2,000.*22 Nov 2026/);
  });
});

describe('coupons', () => {
  const c = { status: 'issued', active_from: '2026-11-22', valid_until: '2027-05-22' };
  it('wait for checkout, then work for six months, and die with the kept booking', () => {
    expect(couponState(c, 'confirmed', '2026-11-21')).toBe('waiting');
    expect(couponState(c, 'completed', '2026-11-22')).toBe('active');
    expect(couponState(c, 'completed', '2027-05-23')).toBe('expired');
    expect(couponState(c, 'cancelled', '2026-12-01')).toBe('void');
    expect(couponState({ ...c, status: 'used' }, 'completed', '2026-12-01')).toBe('used');
  });
  it('25% is capped at ₹2,000; credit is a fixed amount', () => {
    expect(couponDiscount({ kind: 'next_25', percent: 25, amount: null, max_discount: 2000 }, 6000)).toBe(1500);
    expect(couponDiscount({ kind: 'next_25', percent: 25, amount: null, max_discount: 2000 }, 20000)).toBe(2000);
    expect(couponDiscount({ kind: 'credit_5', percent: null, amount: 400, max_discount: null }, 300)).toBe(300);
  });
  it('codes and dates', () => {
    expect(makeCouponCode(() => 0)).toBe('DSK-AAAAAA');
    expect(addMonths('2026-11-22', 6)).toBe('2027-05-22');
    expect(addMonths('2026-08-31', 6)).toBe('2027-02-28');
  });
});
