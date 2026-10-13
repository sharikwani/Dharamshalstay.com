// lib/offers/store.ts
import { randomInt } from 'node:crypto';
import { serviceClient } from '@/lib/server-auth';
import { makeCode, maxPercent, shouldRelease, type CodeBooking, type Offer, type OfferCode } from './rules';

const OFFER_COLS = 'id, property_id, name, active, default_percent, plan_percents, valid_hours, code_prefix, created_at, updated_at';
const BOOKING_COLS = 'id, booking_ref, status, payment_status, created_at, guest_name, guest_phone';
const INSERT_TRIES = 5;
const RELEASED = { status: 'issued', booking_id: null, booked_percent: null };
const nowIso = () => new Date().toISOString();

/** The property's offer that is switched on, or null. */
export async function offerFor(propertyId: string): Promise<Offer | null> {
  const { data, error } = await serviceClient().from('offers').select(OFFER_COLS).eq('property_id', propertyId).eq('active', true).maybeSingle();
  if (error) throw error;
  return (data as Offer) ?? null;
}

export async function activeOffers(): Promise<Offer[]> {
  const { data, error } = await serviceClient().from('offers').select(OFFER_COLS).eq('active', true);
  if (error) throw error;
  return (data as Offer[]) || [];
}

/** An offer by id, on or off (issued codes keep working after the offer is switched off). */
export async function getOffer(id: string): Promise<Offer | null> {
  const { data, error } = await serviceClient().from('offers').select(OFFER_COLS).eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as Offer) ?? null;
}

export async function findCode(code: string): Promise<OfferCode | null> {
  const { data, error } = await serviceClient().from('offer_codes').select('*').eq('code', code).maybeSingle();
  if (error) throw error;
  return (data as OfferCode) ?? null;
}

export type IssueResult = { ok: true; code: OfferCode; reused: boolean } | { ok: false; error: string };

/** The phone's unexpired code for this offer, or a new random one. Only while the offer is on. */
export async function issueCode(offerId: string, phone: string, conversationId: string | null): Promise<IssueResult> {
  const offer = await getOffer(offerId);
  if (!offer || !offer.active) return { ok: false, error: 'This hotel has no WhatsApp offer right now.' };
  const sb = serviceClient();
  const { data: existing, error: findErr } = await sb.from('offer_codes').select('*')
    .eq('offer_id', offerId).eq('phone', phone).in('status', ['issued', 'booked']).gt('expires_at', nowIso())
    .order('issued_at', { ascending: false }).limit(1).maybeSingle();
  if (findErr) throw findErr;
  if (existing) return { ok: true, code: existing as OfferCode, reused: true };

  const issued = new Date();
  const row = {
    offer_id: offerId, phone, conversation_id: conversationId, percent: maxPercent(offer), status: 'issued',
    issued_at: issued.toISOString(), expires_at: new Date(issued.getTime() + offer.valid_hours * 3600e3).toISOString(),
  };
  for (let i = 0; i < INSERT_TRIES; i++) {
    const { data, error } = await sb.from('offer_codes').insert({ ...row, code: makeCode(offer.code_prefix, (n) => randomInt(n)) }).select('*').single();
    if (!error) return keepOldest(sb, offerId, phone, data as OfferCode);
    if (error.code !== '23505') throw error; // 23505 = the random code already exists; try another
  }
  throw new Error('Could not create a unique offer code');
}

/**
 * The DB does not stop two simultaneous requests from each issuing a code. After inserting, look at the phone's
 * active codes; if ours is not the oldest, cancel ours as a duplicate and hand back the oldest.
 */
async function keepOldest(sb: ReturnType<typeof serviceClient>, offerId: string, phone: string, mine: OfferCode): Promise<IssueResult> {
  const { data, error } = await sb.from('offer_codes').select('*')
    .eq('offer_id', offerId).eq('phone', phone).in('status', ['issued', 'booked']).gt('expires_at', nowIso())
    .order('issued_at', { ascending: true }).order('id', { ascending: true });
  if (error) throw error;
  const active = (data as OfferCode[]) || [];
  const oldest = active[0];
  if (!oldest || oldest.id === mine.id) return { ok: true, code: mine, reused: false };
  const { error: cErr } = await sb.from('offer_codes').update({ status: 'cancelled', notes: 'duplicate' }).eq('id', mine.id);
  if (cErr) throw cErr;
  return { ok: true, code: oldest, reused: true };
}

/** Reserve a code for a booking being made. Only the first caller gets true. */
export async function claimCode(id: string, percent: number): Promise<boolean> {
  const { data, error } = await serviceClient().from('offer_codes').update({ status: 'booked', booked_percent: percent })
    .eq('id', id).eq('status', 'issued').gt('expires_at', nowIso()).select('id');
  if (error) throw error;
  return (data || []).length > 0;
}

/** False when the link could not be saved (logged here). */
export async function linkCodeBooking(id: string, bookingId: string): Promise<boolean> {
  const { error } = await serviceClient().from('offer_codes').update({ booking_id: bookingId }).eq('id', id);
  if (error) console.error('Offer code link failed:', error);
  return !error;
}

export async function releaseCode(id: string): Promise<void> {
  const { error } = await serviceClient().from('offer_codes').update(RELEASED).eq('id', id).eq('status', 'booked');
  if (error) console.error('Offer code release failed:', error);
}

export async function releaseForBooking(bookingId: string): Promise<void> {
  const { error } = await serviceClient().from('offer_codes').update(RELEASED).eq('booking_id', bookingId).eq('status', 'booked');
  if (error) console.error('Offer code release failed:', error);
}

/** The code with its booking; a booked code whose booking died or stayed unpaid is released first. */
export async function settle(c: OfferCode): Promise<{ code: OfferCode; booking: CodeBooking | null }> {
  let booking: CodeBooking | null = null;
  if (c.booking_id) {
    const { data, error } = await serviceClient().from('bookings').select(BOOKING_COLS).eq('id', c.booking_id).maybeSingle();
    if (error) throw error;
    booking = (data as CodeBooking) ?? null;
  }
  if (!shouldRelease(c, booking)) return { code: c, booking };
  await releaseCode(c.id);
  return { code: { ...c, status: 'issued', booking_id: null, booked_percent: null }, booking: null };
}

/**
 * A paid booking keeps its offer code. If the code was released while the booking was unpaid, take it back;
 * if it was used, cancelled or booked elsewhere meanwhile, report a conflict for the owner.
 */
export async function attachPaidOffer(bookingId: string): Promise<'none' | 'attached' | 'conflict'> {
  const sb = serviceClient();
  const { data: b, error: bErr } = await sb.from('bookings').select('id, offer_code, offer_percent').eq('id', bookingId).maybeSingle();
  if (bErr) throw bErr;
  if (!b?.offer_code) return 'none';
  const { data: c, error: cErr } = await sb.from('offer_codes').select('id, status, booking_id').eq('code', b.offer_code).maybeSingle();
  if (cErr) throw cErr;
  if (!c) return 'conflict';
  if (c.status === 'booked' && c.booking_id === bookingId) return 'attached';
  if (c.status !== 'issued') return 'conflict';
  const { data: rows, error } = await sb.from('offer_codes').update({ status: 'booked', booking_id: bookingId, booked_percent: b.offer_percent })
    .eq('id', c.id).eq('status', 'issued').select('id');
  if (error) throw error;
  return (rows || []).length ? 'attached' : 'conflict';
}
