// lib/wa-chat/retention-tools.ts
/**
 * Keeping a booking the guest wants to cancel. request_cancellation asks retentionGate first; the guest's answers
 * come back through answer_retention_offer. Each offer is made once, in order (free date change, 25% off the next
 * booking, 5% now); after the last "no" the normal cancellation rules apply, with no more offers (no nagging).
 * Money never moves here: a 5% refund is queued for the owner to send, a 5% off at the hotel is passed to the owner.
 */
import { sendEmail, adminEmail } from '@/lib/email';
import { siteConfig } from '@/lib/config';
import {
  activeFrom, addMonths, couponDiscount, couponState, instantAmount, instantChoices, nextStep, offerText,
  INSTANT_PERCENT, NEXT_MAX, NEXT_PERCENT, RETENTION_REASONS, VALID_MONTHS, type Choice, type Step,
} from '@/lib/retention/rules';
import { answerOffer, findCoupon, issueCoupon, offersFor, recordOffer, reserveCoupon } from '@/lib/retention/store';
import { findOwnBooking, type OwnBooking } from './booking-store';
import type { ToolCtx } from './tools';
import { markSideEffect } from './types';

type Handover = (a: any, ctx: ToolCtx) => Promise<unknown>;

const fn = (name: string, description: string, properties: Record<string, any>, required: string[] = []) =>
  ({ type: 'function', function: { name, description, parameters: { type: 'object', properties, required, additionalProperties: false } } });
const str = (description: string) => ({ type: 'string', description });

export const RETENTION_TOOL_DEFS = [
  fn('answer_retention_offer', 'The customer\'s answer to the keep-your-booking offer that request_cancellation (or this tool) just gave. Only after they answered it in their own words.', {
    booking_ref: str('Booking reference'),
    accepted: { type: 'boolean', description: 'True if they accept this offer and keep the booking; false if they decline or still want to cancel' },
    choice: { type: 'string', enum: ['refund', 'at_hotel', 'credit'], description: 'For the 5% offer only: the option they chose from the offer' },
  }, ['booking_ref', 'accepted']),
  fn('check_coupon', 'Check a Dharamshala Stay loyalty coupon (code like DSK-ABC123) the customer wants to use.', { code: str('Coupon code') }, ['code']),
  fn('apply_coupon', 'Put a valid loyalty coupon on a booking this customer just made with create_booking. The team takes the discount off when confirming.', {
    code: str('Coupon code'), booking_ref: str('The new booking reference'),
  }, ['code', 'booking_ref']),
];

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const notify = (subject: string, html: string) =>
  sendEmail({ to: adminEmail(), subject, html: `${html}<p><a href="${siteConfig.url}/admin/offers">Admin → Offers &amp; codes</a></p>` })
    .catch((e) => console.error('Retention email failed:', e));

export const normalizeCoupon = (input: unknown) => {
  const t = String(input ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return t.length > 3 ? `${t.slice(0, 3)}-${t.slice(3)}` : t;
};

function offerResult(step: Step, b: OwnBooking) {
  return {
    result: 'offer' as const, step, offer: offerText(step, b),
    ...(step === 'instant_5' ? { choices: instantChoices(b), amount: instantAmount(b) } : {}),
    next: 'Make this offer once, warmly and briefly. When they answer, call answer_retention_offer. If they say no, accept it without arguing.',
  };
}

/**
 * Before cancelling: the next keep-your-booking offer, or null to go on with the normal cancellation rules.
 * Never blocks a cancellation on an error.
 */
export async function retentionGate(b: OwnBooking, ctx: ToolCtx, reasonCode: string, reasonText: string) {
  if (!RETENTION_REASONS.includes(reasonCode)) return null;
  try {
    const n = nextStep(b, await offersFor(b.id));
    if (!n || n === 'kept') return null;
    if (!n.pending) await recordOffer({ booking_id: b.id, conversation_id: ctx.conversationId, step: n.step, reason_code: reasonCode, reason_text: reasonText });
    return offerResult(n.step, b);
  } catch (e) {
    console.error('Retention offer failed (cancelling as usual):', e);
    return null;
  }
}

export async function answerRetentionOffer(a: { booking_ref: string; accepted: boolean; choice?: Choice }, ctx: ToolCtx, handover: Handover) {
  const b = await findOwnBooking(ctx.phone, a.booking_ref);
  if (!b) return { error: 'No booking with that reference for this WhatsApp number.' };
  const rows = await offersFor(b.id);
  const n = nextStep(b, rows);
  if (n === 'kept') return { result: 'already_kept', message: 'They already chose to keep this booking.' };
  if (!n || !n.pending) return { error: 'No offer is waiting for an answer. Call request_cancellation first.' };
  const step = n.step;
  const ref = b.booking_ref;
  const who = b.guest_name || ctx.profileName || `+${ctx.phone}`;

  if (!a.accepted) {
    if (!(await answerOffer(b.id, step, false))) return { error: 'That offer was already answered.' };
    const first = rows.find((r) => r.reason_code) || { reason_code: 'other', reason_text: '' };
    const next = nextStep(b, await offersFor(b.id));
    if (next && next !== 'kept') {
      await recordOffer({ booking_id: b.id, conversation_id: ctx.conversationId, step: next.step, reason_code: first.reason_code || 'other', reason_text: first.reason_text || '' });
      return offerResult(next.step, b);
    }
    return { result: 'all_declined', next: `They still want to cancel: call request_cancellation again now with booking_ref ${ref} and the same reason. Make no more offers.` };
  }

  if (step === 'date_change') {
    if (!(await answerOffer(b.id, step, true))) return { error: 'That offer was already answered.' };
    markSideEffect(ctx, 'answer_retention_offer', `${ref} kept: guest wants a free date change`);
    await handover({ reason: `Keep ${ref}: the guest wants a free date change instead of cancelling` }, ctx);
    return { result: 'date_change_requested', message: 'A team member will arrange the new dates in this chat shortly. No cancellation.' };
  }

  if (step === 'next_25') {
    const from = activeFrom(b) || today();
    if (!(await answerOffer(b.id, step, true))) return { error: 'That offer was already answered.' };
    const c = await issueCoupon({ phone: ctx.phone, booking_id: b.id, kind: 'next_25', percent: NEXT_PERCENT, amount: null, max_discount: NEXT_MAX, active_from: from, valid_until: addMonths(from, VALID_MONTHS) });
    markSideEffect(ctx, 'answer_retention_offer', `${ref} kept: coupon ${c.code} (${NEXT_PERCENT}% next booking, max ${rupees(NEXT_MAX)})`);
    await notify(`Booking kept: ${ref} (${NEXT_PERCENT}% next-booking coupon)`,
      `<p>${esc(who)} kept booking <b>${esc(ref)}</b> instead of cancelling, for coupon <b>${c.code}</b>: ${NEXT_PERCENT}% off their next hotel booking, up to ${rupees(NEXT_MAX)}, from ${c.active_from} to ${c.valid_until}. Split 50/50 with the hotel of that booking.</p>`);
    return {
      result: 'kept', coupon: { code: c.code, percent: NEXT_PERCENT, max_discount: rupees(NEXT_MAX), works_from: c.active_from, valid_until: c.valid_until },
      rules: 'One use, on a hotel booking with Dharamshala Stay (WhatsApp or website), from the checkout day of this booking. Not combined with other offers. Void if this booking is cancelled.',
    };
  }

  // instant_5
  const amount = instantAmount(b);
  const allowed = instantChoices(b);
  if (!a.choice || !allowed.includes(a.choice)) return { error: `Ask which they prefer: ${allowed.join(' or ')}.` };
  if (!(await answerOffer(b.id, step, true, { choice: a.choice, amount, ...(a.choice === 'refund' ? { refund_status: 'pending' as const } : {}) }))) {
    return { error: 'That offer was already answered.' };
  }
  if (a.choice === 'credit') {
    const from = activeFrom(b) || today();
    const c = await issueCoupon({ phone: ctx.phone, booking_id: b.id, kind: 'credit_5', percent: null, amount, max_discount: null, active_from: from, valid_until: addMonths(from, VALID_MONTHS) });
    markSideEffect(ctx, 'answer_retention_offer', `${ref} kept: ${rupees(amount)} credit coupon ${c.code}`);
    await notify(`Booking kept: ${ref} (${rupees(amount)} credit)`,
      `<p>${esc(who)} kept <b>${esc(ref)}</b> for a ${rupees(amount)} credit coupon <b>${c.code}</b> (${c.active_from} to ${c.valid_until}). Split 50/50 with the hotel.</p>`);
    return {
      result: 'kept', coupon: { code: c.code, amount: rupees(amount), works_from: c.active_from, valid_until: c.valid_until },
      rules: 'One use, on a booking with Dharamshala Stay from the checkout day of this booking. Void if this booking is cancelled.',
    };
  }
  if (a.choice === 'refund') {
    markSideEffect(ctx, 'answer_retention_offer', `${ref} kept: ${rupees(amount)} refund to send`);
    await notify(`Send a ${rupees(amount)} refund: ${ref} kept`,
      `<p>${esc(who)} kept <b>${esc(ref)}</b> for ${INSTANT_PERCENT}% back. <b>Please refund ${rupees(amount)}</b> to their original payment in Razorpay (payment ${esc(b.razorpay_payment_id || 'see booking')}), then mark it done in Offers &amp; codes. Hotel share 50%: ${rupees(Math.round(amount / 2))}.</p>`);
    return { result: 'kept', refund: rupees(amount), message: `The ${rupees(amount)} goes back to their original payment within 3-5 business days.` };
  }
  // at_hotel: the property takes the 5% off when the guest pays.
  markSideEffect(ctx, 'answer_retention_offer', `${ref} kept: ${rupees(amount)} off at the property`);
  await notify(`Tell the hotel: ${rupees(amount)} off ${ref}`,
    `<p>${esc(who)} kept <b>${esc(ref)}</b> for ${INSTANT_PERCENT}% off. <b>Ask the property to take ${rupees(amount)} off</b> what the guest pays (our share 50%: ${rupees(Math.round(amount / 2))}).</p>`);
  return { result: 'kept', discount_at_property: rupees(amount), message: `${rupees(amount)} comes off what they pay at the property; our team tells the property.` };
}

export async function checkCoupon(a: { code: string }, ctx: ToolCtx) {
  const c = await findCoupon(normalizeCoupon(a.code));
  if (!c || c.phone !== ctx.phone) return { valid: false, reason: 'Coupon not found for this WhatsApp number.' };
  const state = couponState(c, c.booking_status, today());
  const what = c.kind === 'credit_5' ? `${rupees(c.amount || 0)} off` : `${c.percent}% off, up to ${rupees(c.max_discount || 0)}`;
  if (state !== 'active') {
    const why = { waiting: `It starts working on ${c.active_from}.`, expired: 'It has expired.', used: 'It was already used.', reserved: `It is already on booking ${c.used_booking_ref}.`, void: 'It is no longer valid because the original booking was cancelled.' }[state];
    return { valid: false, code: c.code, discount: what, reason: why };
  }
  return { valid: true, code: c.code, discount: what, valid_until: c.valid_until, how: c.kind === 'next_25' ? 'Hotel bookings only. Make the booking as usual, then call apply_coupon.' : 'Make the booking as usual, then call apply_coupon.' };
}

export async function applyCoupon(a: { code: string; booking_ref: string }, ctx: ToolCtx) {
  const c = await findCoupon(normalizeCoupon(a.code));
  if (!c || c.phone !== ctx.phone) return { error: 'Coupon not found for this WhatsApp number.' };
  if (couponState(c, c.booking_status, today()) !== 'active') return { error: 'This coupon cannot be used now. Call check_coupon to see why.' };
  const b = await findOwnBooking(ctx.phone, a.booking_ref);
  if (!b || b.status === 'cancelled') return { error: 'No open booking with that reference for this WhatsApp number.' };
  if (b.id === c.booking_id) return { error: 'The coupon is for the next booking, not the one it came with.' };
  if (c.kind === 'next_25' && b.category !== 'hotel') return { error: 'This coupon is for hotel bookings only.' };
  const discount = couponDiscount(c, b.amount || 0);
  if (!(await reserveCoupon(c.id, b.booking_ref))) return { error: 'This coupon was just used on another booking.' };
  markSideEffect(ctx, 'apply_coupon', `Coupon ${c.code} on ${b.booking_ref}: ${rupees(discount)} off`);
  await notify(`Apply coupon ${c.code} to ${b.booking_ref}`,
    `<p>Please take <b>${rupees(discount)}</b> off booking <b>${esc(b.booking_ref)}</b> (coupon ${c.code}) before confirming, then mark the coupon used in Offers &amp; codes. Split 50/50 with the hotel.</p>`);
  return { applied: true, booking_ref: b.booking_ref, discount: rupees(discount), message: 'Our team takes this off when confirming the booking.' };
}
