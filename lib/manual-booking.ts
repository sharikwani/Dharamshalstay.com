import type { BookingCategory } from './pricing';

export type ManualCategory = BookingCategory;
export type PaymentChoice = 'partner_collects' | 'platform_paid' | 'unpaid';
export type PaymentChannel = 'upi' | 'bank' | 'cash' | 'card' | 'stripe';
export const ACTIVITY_CATEGORIES = ['taxi', 'trek', 'paragliding'] as const;
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];
export const STAFF_ROLE_FOR: Record<ActivityCategory, 'driver' | 'guide' | 'pilot'> = { taxi: 'driver', trek: 'guide', paragliding: 'pilot' };
const isActivity = (c: string): c is ActivityCategory => (ACTIVITY_CATEGORIES as readonly string[]).includes(c);

const validPct = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100;

export function commissionRateFor(category: ManualCategory, opts: { partnerPct?: number | null; propertyPct?: number | null }): number {
  if (category === 'guide') return 20;
  if (category === 'hotel') return validPct(opts.propertyPct) ? (opts.propertyPct as number) : 10;
  return validPct(opts.partnerPct) ? (opts.partnerPct as number) : 20;
}

export function splitAmount(finalAmount: number, pct: number) {
  const commission_amount = Math.round((finalAmount * pct) / 100);
  return { commission_amount, partner_share_amount: finalAmount - commission_amount };
}

export function paymentFields(
  choice: PaymentChoice, category: ManualCategory, finalAmount: number,
  opts: { amountReceived?: number | null; channel?: PaymentChannel | null; reference?: string | null } = {},
) {
  if (choice === 'platform_paid') {
    const channel = opts.channel || 'cash';
    return {
      payment_method: channel === 'card' || channel === 'stripe' ? 'online' : 'offline',
      payment_status: 'paid', collected_by: 'platform' as const, commission_status: 'not_applicable',
      paid_amount: opts.amountReceived ?? finalAmount, payment_channel: channel, payment_reference: opts.reference?.trim() || null,
    };
  }
  if (choice === 'partner_collects') {
    return {
      payment_method: category === 'hotel' ? 'pay_at_hotel' : 'offline', payment_status: 'pending',
      collected_by: 'partner' as const, commission_status: 'pending', paid_amount: null, payment_channel: null, payment_reference: null,
    };
  }
  return {
    payment_method: 'offline', payment_status: 'pending', collected_by: null, commission_status: 'pending',
    paid_amount: null, payment_channel: null, payment_reference: null,
  };
}

export type AssignPartner = { id: string; role: string; partner_type: string | null; partner_status: string | null };
export type AssignStaff = { id: string; partner_id: string; role: string; active: boolean };
export type AssignVehicle = { id: string; partner_id: string; active: boolean };

export function checkAssignment(category: ManualCategory, partner: AssignPartner | null, staff: AssignStaff | null, vehicle: AssignVehicle | null): string | null {
  if (!isActivity(category)) {
    return partner || staff || vehicle ? 'Hotel and local guide bookings cannot be assigned to a partner.' : null;
  }
  if (!partner) return staff || vehicle ? 'Choose the partner before choosing a driver, pilot, guide or vehicle.' : null;
  if (partner.role !== 'partner' || partner.partner_status !== 'verified') return 'This partner is not approved yet, so they cannot take bookings.';
  if (partner.partner_type !== category) return `This partner is not a ${category} partner.`;
  if (staff) {
    if (staff.partner_id !== partner.id) return 'That person does not belong to the chosen partner.';
    if (!staff.active) return 'That person is not active.';
    if (staff.role !== STAFF_ROLE_FOR[category]) return `Choose a ${STAFF_ROLE_FOR[category]} for a ${category} booking.`;
  }
  if (vehicle) {
    if (category !== 'taxi') return 'Only taxi bookings can have a vehicle.';
    if (vehicle.partner_id !== partner.id) return 'That vehicle does not belong to the chosen partner.';
    if (!vehicle.active) return 'That vehicle is not active.';
  }
  return null;
}

export function todayIst(now: Date = new Date()): string {
  return new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
export function isBeforeToday(dateStr: string, today: string): boolean {
  return dateStr < today;
}
