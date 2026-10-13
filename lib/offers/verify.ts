// lib/offers/verify.ts
import { HttpError, serviceClient } from '@/lib/server-auth';
import { cappedPlanPercents, judgeCode, normalizeCode, REASON_TEXT, type CheckResult, type CodeBooking, type OfferCode } from './rules';
import { findCode, settle } from './store';

export type Viewer = { id: string; role: 'admin' | 'partner' };
export type RedeemResult = { ok: true; result: CheckResult } | { ok: false; error: string; status: number; result?: CheckResult };

const NOT_FOUND_PER_HOUR = 30;

type Loaded = {
  c: OfferCode; booking: CodeBooking | null; defaultPercent: number; planPercents: Record<string, number>;
  propertyName: string; guestName: string | null;
};

/** The code with its offer, property and guest; null when it does not exist or belongs to another partner's property. */
async function load(code: string, viewer: Viewer): Promise<Loaded | null> {
  const found = await findCode(code);
  if (!found) return null;
  const sb = serviceClient();
  const { data: offer, error: oErr } = await sb.from('offers').select('id, property_id, default_percent, plan_percents').eq('id', found.offer_id).maybeSingle();
  if (oErr) throw oErr;
  if (!offer) return null;
  const { data: prop, error: pErr } = await sb.from('properties').select('id, name, owner_id').eq('id', offer.property_id).maybeSingle();
  if (pErr) throw pErr;
  if (!prop || (viewer.role !== 'admin' && prop.owner_id !== viewer.id)) return null;
  const { code: c, booking } = await settle(found);
  let guestName = booking?.guest_name ?? null;
  if (!guestName && c.conversation_id) {
    const { data: conv } = await sb.from('whatsapp_conversations').select('profile_name').eq('id', c.conversation_id).maybeSingle();
    guestName = conv?.profile_name ?? null;
  }
  return { c, booking, defaultPercent: offer.default_percent, planPercents: offer.plan_percents || {}, propertyName: prop.name, guestName };
}

function toResult(f: Loaded): CheckResult {
  const v = judgeCode(f.c, f.booking);
  const walkIn = v.path === 'walk_in';
  return {
    ...v,
    code: f.c.code,
    status: f.c.status,
    default_percent: walkIn ? Math.min(f.defaultPercent, f.c.percent) : null,
    plan_percents: walkIn ? cappedPlanPercents({ plan_percents: f.planPercents }, f.c.percent) : null,
    guest: { name: f.guestName, phone: f.booking?.guest_phone || f.c.phone },
    expires_at: f.c.expires_at,
    booking_ref: f.booking?.booking_ref ?? null,
    property_name: f.propertyName,
    redeemed_at: f.c.redeemed_at,
  };
}

const notFound = (code: string): CheckResult => ({
  valid: false, reason: 'not_found', path: null, percent: null, code, status: null, default_percent: null, plan_percents: null,
  guest: null, expires_at: null, booking_ref: null, property_name: null, redeemed_at: null,
});

async function logCheck(codeId: string | null, entered: string, by: string, result: string): Promise<void> {
  const { error } = await serviceClient().from('offer_code_checks').insert({ code_id: codeId, code_entered: entered.slice(0, 40), checked_by: by, result });
  if (error) console.error('Offer code check log failed:', error);
}

/** Codes are short; stop a partner account from guessing them. */
async function assertNotThrottled(viewer: Viewer): Promise<void> {
  if (viewer.role === 'admin') return;
  const since = new Date(Date.now() - 3600e3).toISOString();
  const { count, error } = await serviceClient().from('offer_code_checks').select('id', { count: 'exact', head: true })
    .eq('checked_by', viewer.id).eq('result', 'not_found').gte('created_at', since);
  if (error) throw error;
  if ((count || 0) >= NOT_FOUND_PER_HOUR) throw new HttpError(429, 'Too many wrong codes. Please wait an hour and try again.');
}

export async function checkCode(input: string, opts: { viewer: Viewer }): Promise<CheckResult> {
  const code = normalizeCode(input);
  await assertNotThrottled(opts.viewer);
  const f = await load(code, opts.viewer);
  const result = f ? toResult(f) : notFound(code);
  await logCheck(f?.c.id ?? null, code, opts.viewer.id, result.valid ? 'valid' : result.reason!);
  return result;
}

/** Make a code single-use. Walk-in: issued and not expired. Paid booking: booked and the booking is paid. */
export async function redeemCode(input: string, by: Viewer): Promise<RedeemResult> {
  const code = normalizeCode(input);
  await assertNotThrottled(by);
  const f = await load(code, by);
  if (!f) {
    await logCheck(null, code, by.id, 'not_found');
    return { ok: false, error: REASON_TEXT.not_found, status: 404 };
  }
  const before = toResult(f);
  if (!before.valid) return { ok: false, error: REASON_TEXT[before.reason!], status: 409, result: before };
  const at = new Date().toISOString();
  let q = serviceClient().from('offer_codes').update({ status: 'redeemed', redeemed_at: at, redeemed_by: by.id }).eq('id', f.c.id);
  q = before.path === 'walk_in' ? q.eq('status', 'issued').gt('expires_at', at) : q.eq('status', 'booked');
  const { data, error } = await q.select('id');
  if (error) throw error;
  if (!data?.length) return { ok: false, error: 'This code was just used or changed. Check it again.', status: 409 };
  await logCheck(f.c.id, code, by.id, 'redeemed');
  return { ok: true, result: { ...before, valid: false, reason: 'already_used', status: 'redeemed', redeemed_at: at } };
}

export async function cancelCode(input: string, by: Viewer, notes?: string): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (by.role !== 'admin') throw new HttpError(403, 'Only the admin can cancel offer codes');
  const code = normalizeCode(input);
  const c = await findCode(code);
  if (!c) return { ok: false, error: REASON_TEXT.not_found, status: 404 };
  const patch: Record<string, unknown> = { status: 'cancelled' };
  if (notes?.trim()) patch.notes = notes.trim().slice(0, 500);
  const { data, error } = await serviceClient().from('offer_codes').update(patch).eq('id', c.id).in('status', ['issued', 'booked']).select('id');
  if (error) throw error;
  if (!data?.length) return { ok: false, error: 'Only issued or booked codes can be cancelled', status: 409 };
  await logCheck(c.id, code, by.id, 'cancelled');
  return { ok: true };
}
