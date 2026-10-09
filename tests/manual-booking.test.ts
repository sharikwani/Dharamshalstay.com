import { describe, it, expect } from 'vitest';
import { quoteBooking } from '@/lib/pricing';
import { effectiveCollector, commissionRateFor, splitAmount, paymentFields, checkAssignment, isBeforeToday, todayIst } from '@/lib/manual-booking';

describe('guide pricing', () => {
  it('day rate × days', () => expect(quoteBooking('guide', { price_per_day: 2500 }, { num_guests: 3, guide_days: 2 })).toEqual({ amount: 5000, commission_pct: 20 }));
  it('clamps days to 1..30', () => {
    expect(quoteBooking('guide', { price_per_day: 1000 }, { num_guests: 1, guide_days: 0 }).amount).toBe(1000);
    expect(quoteBooking('guide', { price_per_day: 1000 }, { num_guests: 1, guide_days: 99 }).amount).toBe(30000);
  });
});

describe('commissionRateFor', () => {
  it('uses partner rate for activities, default 20', () => {
    expect(commissionRateFor('taxi', { partnerPct: 15 })).toBe(15);
    expect(commissionRateFor('trek', {})).toBe(20);
  });
  it('uses property rate for hotels, default 10', () => {
    expect(commissionRateFor('hotel', { propertyPct: 12 })).toBe(12);
    expect(commissionRateFor('hotel', {})).toBe(10);
  });
  it('guides are 20', () => expect(commissionRateFor('guide', { partnerPct: 5 })).toBe(20));
});

describe('splitAmount', () => {
  it('rounds commission and gives the rest to the partner', () => expect(splitAmount(3333, 20)).toEqual({ commission_amount: 667, partner_share_amount: 2666 }));
});

describe('paymentFields', () => {
  it('partner collects (hotel uses pay_at_hotel)', () => {
    const f = paymentFields('partner_collects', 'hotel', 5000);
    expect(f).toMatchObject({ payment_method: 'pay_at_hotel', payment_status: 'pending', collected_by: 'partner', commission_status: 'pending', paid_amount: null });
    expect(paymentFields('partner_collects', 'taxi', 5000).payment_method).toBe('offline');
  });
  it('platform paid records amount, channel, reference', () => {
    expect(paymentFields('platform_paid', 'trek', 4000, { channel: 'upi', reference: 'UTR1' })).toMatchObject({
      payment_method: 'offline', payment_status: 'paid', collected_by: 'platform', commission_status: 'not_applicable',
      paid_amount: 4000, payment_channel: 'upi', payment_reference: 'UTR1',
    });
    expect(paymentFields('platform_paid', 'trek', 4000, { channel: 'card', amountReceived: 3500 })).toMatchObject({ payment_method: 'online', paid_amount: 3500 });
  });
  it('unpaid', () => {
    expect(paymentFields('unpaid', 'guide', 2000)).toMatchObject({ payment_method: 'offline', payment_status: 'pending', collected_by: null, commission_status: 'pending', paid_amount: null });
  });
});

describe('paymentFields with zero commission', () => {
  it('is not_applicable for partner_collects and unpaid', () => {
    expect(paymentFields('partner_collects', 'trek', 4000, { commissionAmount: 0 }).commission_status).toBe('not_applicable');
    expect(paymentFields('unpaid', 'trek', 4000, { commissionAmount: 0 }).commission_status).toBe('not_applicable');
    expect(paymentFields('unpaid', 'trek', 4000, { commissionAmount: 100 }).commission_status).toBe('pending');
  });
});

describe('effectiveCollector', () => {
  it('uses collected_by when set', () => {
    expect(effectiveCollector({ collected_by: 'partner', payment_status: 'paid' })).toBe('partner');
    expect(effectiveCollector({ collected_by: 'platform', payment_status: 'pending' })).toBe('platform');
  });
  it('treats paid or online website bookings as platform-collected', () => {
    expect(effectiveCollector({ collected_by: null, payment_status: 'paid', payment_method: 'online' })).toBe('platform');
    expect(effectiveCollector({ collected_by: null, payment_status: 'partially_paid' })).toBe('platform');
    expect(effectiveCollector({ payment_method: 'online', payment_status: 'pending' })).toBe('platform');
  });
  it('defaults other website bookings to partner-collected', () => {
    expect(effectiveCollector({ collected_by: null, payment_status: 'pending', payment_method: 'pay_at_hotel' })).toBe('partner');
    expect(effectiveCollector({})).toBe('partner');
  });
});

describe('checkAssignment', () => {
  const partner = { id: 'p1', role: 'partner', partner_type: 'taxi', partner_status: 'verified' };
  const driver = { id: 's1', partner_id: 'p1', role: 'driver', active: true };
  const car = { id: 'v1', partner_id: 'p1', active: true };
  it('accepts a verified partner with own driver and car', () => expect(checkAssignment('taxi', partner, driver, car)).toBeNull());
  it('accepts an unassigned activity booking', () => expect(checkAssignment('taxi', null, null, null)).toBeNull());
  it('rejects unverified, wrong type, other partner staff/vehicle, wrong role, inactive', () => {
    expect(checkAssignment('taxi', { ...partner, partner_status: 'onboarding' }, null, null)).toMatch(/approved/i);
    expect(checkAssignment('trek', partner, null, null)).toMatch(/trek/i);
    expect(checkAssignment('taxi', partner, { ...driver, partner_id: 'p2' }, null)).toMatch(/does not belong/i);
    expect(checkAssignment('taxi', partner, null, { ...car, partner_id: 'p2' })).toMatch(/does not belong/i);
    expect(checkAssignment('taxi', partner, { ...driver, role: 'pilot' }, null)).toMatch(/driver/i);
    expect(checkAssignment('taxi', partner, { ...driver, active: false }, null)).toMatch(/not active/i);
  });
  it('staff or vehicle without a partner is rejected', () => expect(checkAssignment('taxi', null, driver, null)).toMatch(/choose the partner/i));
  it('hotel and guide bookings cannot take a partner', () => expect(checkAssignment('hotel', partner, null, null)).toMatch(/cannot be assigned/i));
  it('vehicles only for taxi', () => expect(checkAssignment('trek', { ...partner, partner_type: 'trek' }, null, car)).toMatch(/only taxi/i));
});

describe('dates', () => {
  it('todayIst formats in IST', () => expect(todayIst(new Date('2026-10-09T20:00:00Z'))).toBe('2026-10-10'));
  it('isBeforeToday', () => {
    expect(isBeforeToday('2026-10-09', '2026-10-10')).toBe(true);
    expect(isBeforeToday('2026-10-10', '2026-10-10')).toBe(false);
  });
});
