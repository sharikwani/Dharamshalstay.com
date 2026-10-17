// lib/retention/store.ts
import { randomInt } from 'node:crypto';
import { serviceClient } from '@/lib/server-auth';
import { makeCouponCode, type Choice, type OfferRow, type Step } from './rules';

export type Coupon = {
  id: string; code: string; phone: string; booking_id: string; kind: 'next_25' | 'credit_5'; percent: number | null; amount: number | null;
  max_discount: number | null; status: string; active_from: string; valid_until: string; funding: string;
  used_booking_ref: string | null; used_at: string | null; created_at: string;
};

const now = () => new Date().toISOString();

export type StoredOffer = OfferRow & { reason_code: string | null; reason_text: string | null };

export async function offersFor(bookingId: string): Promise<StoredOffer[]> {
  const { data, error } = await serviceClient().from('retention_offers').select('step, outcome, choice, amount, reason_code, reason_text').eq('booking_id', bookingId);
  if (error) throw error;
  return (data || []) as StoredOffer[];
}

/** Record that an offer was made (once per booking and step; a repeat is ignored). */
export async function recordOffer(row: { booking_id: string; conversation_id: string | null; step: Step; reason_code: string; reason_text: string }): Promise<void> {
  const { error } = await serviceClient().from('retention_offers').insert(row);
  if (error && error.code !== '23505') throw error;
}

/** The guest's answer to an offer still waiting for one. False when it was answered already. */
export async function answerOffer(bookingId: string, step: Step, accepted: boolean, extra: { choice?: Choice; amount?: number; refund_status?: 'pending' } = {}): Promise<boolean> {
  const { data, error } = await serviceClient().from('retention_offers')
    .update({ outcome: accepted ? 'accepted' : 'declined', ...extra, updated_at: now() })
    .eq('booking_id', bookingId).eq('step', step).eq('outcome', 'offered').select('id');
  if (error) throw error;
  return (data || []).length > 0;
}

/** Issue a coupon for a kept booking (one per booking and kind: a repeat returns the existing one). */
export async function issueCoupon(c: Pick<Coupon, 'phone' | 'booking_id' | 'kind' | 'percent' | 'amount' | 'max_discount' | 'active_from' | 'valid_until'>): Promise<Coupon> {
  const sb = serviceClient();
  for (let i = 0; i < 4; i++) {
    const { data, error } = await sb.from('loyalty_coupons').insert({ ...c, code: makeCouponCode(randomInt) }).select('*').single();
    if (!error) return data as Coupon;
    if (error.code !== '23505') throw error;
    const { data: existing } = await sb.from('loyalty_coupons').select('*').eq('booking_id', c.booking_id).eq('kind', c.kind).maybeSingle();
    if (existing) return existing as Coupon;
    // Otherwise the random code clashed with another coupon: try a new one.
  }
  throw new Error('Could not create a coupon code');
}

export async function findCoupon(code: string): Promise<(Coupon & { booking_status: string | null; booking_ref: string | null }) | null> {
  const { data, error } = await serviceClient().from('loyalty_coupons').select('*, bookings(status, booking_ref)').eq('code', code).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { bookings, ...c } = data as any;
  return { ...c, booking_status: bookings?.status ?? null, booking_ref: bookings?.booking_ref ?? null };
}

/** Hold a coupon for a new booking (the team applies the discount when confirming). False if it was not free. */
export async function reserveCoupon(id: string, bookingRef: string): Promise<boolean> {
  const { data, error } = await serviceClient().from('loyalty_coupons').update({ status: 'reserved', used_booking_ref: bookingRef })
    .eq('id', id).eq('status', 'issued').select('id');
  if (error) throw error;
  return (data || []).length > 0;
}

export async function setCouponStatus(id: string, status: 'issued' | 'used' | 'void'): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (status === 'used') patch.used_at = now();
  if (status === 'issued') { patch.used_at = null; patch.used_booking_ref = null; }
  const { error } = await serviceClient().from('loyalty_coupons').update(patch).eq('id', id);
  if (error) throw error;
}

export async function listCoupons(): Promise<(Coupon & { booking_status: string | null; booking_ref: string | null })[]> {
  const { data, error } = await serviceClient().from('loyalty_coupons').select('*, bookings(status, booking_ref)').order('created_at', { ascending: false }).limit(500);
  if (error) throw error;
  return ((data || []) as any[]).map(({ bookings, ...c }) => ({ ...c, booking_status: bookings?.status ?? null, booking_ref: bookings?.booking_ref ?? null }));
}

export async function listRetention(): Promise<any[]> {
  const { data, error } = await serviceClient().from('retention_offers')
    .select('id, step, outcome, choice, amount, refund_status, reason_code, reason_text, created_at, updated_at, bookings(booking_ref, guest_name, guest_phone, amount, status, razorpay_payment_id)')
    .order('created_at', { ascending: false }).limit(500);
  if (error) throw error;
  return data || [];
}

export async function markRefundDone(id: string): Promise<boolean> {
  const { data, error } = await serviceClient().from('retention_offers').update({ refund_status: 'done', updated_at: now() })
    .eq('id', id).eq('refund_status', 'pending').select('id');
  if (error) throw error;
  return (data || []).length > 0;
}
