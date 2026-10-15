import { serviceClient } from '@/lib/server-auth';

const digits = (s: unknown) => String(s ?? '').replace(/\D/g, '');
const now = () => new Date().toISOString();

/** Same customer when the last 10 digits match (handles +91, spaces, dashes). */
export const samePhone = (a: unknown, b: unknown) => {
  const x = digits(a), y = digits(b);
  return x.length >= 10 && y.length >= 10 && x.slice(-10) === y.slice(-10);
};

export type Quote = {
  id: string; conversation_id: string; category: 'hotel' | 'taxi' | 'trek' | 'paragliding'; input: Record<string, any>;
  amount: number; summary: string; expires_at: string; used_at: string | null; used_booking_id: string | null; created_at: string;
};

const QUOTE_MINUTES = 30;

export async function saveQuote(q: Pick<Quote, 'conversation_id' | 'category' | 'input' | 'amount' | 'summary'>): Promise<Quote> {
  const { data, error } = await serviceClient().from('whatsapp_quotes')
    .insert({ ...q, expires_at: new Date(Date.now() + QUOTE_MINUTES * 60e3).toISOString() }).select('*').single();
  if (error) throw error;
  return data as Quote;
}

/** Mark a quote as being booked. Only the first caller gets true, so one quote makes one booking. */
export async function claimQuote(id: string): Promise<boolean> {
  const { data, error } = await serviceClient().from('whatsapp_quotes').update({ used_at: now() }).eq('id', id).is('used_at', null).select('id');
  if (error) throw error;
  return (data || []).length > 0;
}

export async function releaseQuote(id: string): Promise<void> {
  const { error } = await serviceClient().from('whatsapp_quotes').update({ used_at: null }).eq('id', id);
  if (error) console.error('WhatsApp quote release failed:', error);
}

export async function linkQuoteBooking(id: string, bookingId: string): Promise<void> {
  const { error } = await serviceClient().from('whatsapp_quotes').update({ used_booking_id: bookingId }).eq('id', id);
  if (error) console.error('WhatsApp quote link failed:', error);
}

/**
 * The newest quote in this conversation, used or expired included. create_booking books only this one and refuses
 * it when it is used or expired, so an older quote is never booked by mistake.
 */
export async function latestQuote(conversationId: string): Promise<Quote | null> {
  const { data, error } = await serviceClient().from('whatsapp_quotes').select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return (data as Quote) ?? null;
}

type ChatRow = { author: string; kind?: string | null; status?: string | null; created_at: string };

/**
 * Pure ordering check behind confirmedAfter: some AI message that was actually sent comes after `iso`,
 * and a customer message comes after that first AI message.
 */
export function confirmedInOrder(rows: ChatRow[], iso: string): boolean {
  const t0 = Date.parse(iso);
  const after = rows.filter((r) => Date.parse(r.created_at) > t0).sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  // System notes are for the owner only; they never reached the customer.
  const ai = after.find((r) => r.author === 'ai' && r.kind !== 'system' && r.status !== 'failed');
  if (!ai) return false;
  const tAi = Date.parse(ai.created_at);
  return after.some((r) => r.author === 'customer' && Date.parse(r.created_at) > tAi);
}

/** True when the AI sent a message after `iso` (the quote summary) and the customer answered it. */
export async function confirmedAfter(conversationId: string, iso: string): Promise<boolean> {
  const { data, error } = await serviceClient().from('whatsapp_chat_messages').select('author, kind, status, created_at')
    .eq('conversation_id', conversationId).gt('created_at', iso).order('created_at', { ascending: true }).limit(200);
  if (error) throw error;
  return confirmedInOrder((data as ChatRow[]) || [], iso);
}

export type OwnBooking = {
  id: string; booking_ref: string; category: string; status: string; payment_status: string | null; payment_method: string | null;
  amount: number | null; check_in: string | null; check_out: string | null; activity_date: string | null; pickup_time: string | null;
  num_guests: number | null; room_name: string | null; property_id: string | null; trek_id: string | null; paragliding_id: string | null;
  taxi_route_id: string | null; commission_status: string | null; stripe_payment_intent: string | null; razorpay_payment_id: string | null; booking_source: string | null; guest_name: string | null;
  guest_phone: string; created_at: string;
};

const OWN_COLS = 'id, booking_ref, category, status, payment_status, payment_method, amount, check_in, check_out, activity_date, pickup_time, num_guests, room_name, property_id, trek_id, paragliding_id, taxi_route_id, commission_status, stripe_payment_intent, razorpay_payment_id, booking_source, guest_name, guest_phone, created_at';

/** Bookings made with this phone number, newest first. */
export async function ownBookings(phone: string): Promise<OwnBooking[]> {
  const last4 = digits(phone).slice(-4);
  if (last4.length < 4) return [];
  const { data, error } = await serviceClient().from('bookings').select(OWN_COLS)
    .ilike('guest_phone', `%${last4}`).order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  // Failed bookings lost the last room to another guest; customers never see them.
  return ((data as OwnBooking[]) || []).filter((b) => b.status !== 'failed' && samePhone(b.guest_phone, phone)).slice(0, 20);
}

export async function findOwnBooking(phone: string, ref: string): Promise<OwnBooking | null> {
  const want = String(ref || '').trim().toUpperCase();
  if (!want) return null;
  return (await ownBookings(phone)).find((b) => String(b.booking_ref || '').toUpperCase() === want) ?? null;
}

export type Cancellation = {
  id: string; conversation_id: string; booking_id: string; reason_code: string; reason_text: string; status: string;
  proof_path: string | null; verdict: string | null; verdict_notes: string | null; created_at: string;
};

export async function saveCancellation(row: Pick<Cancellation, 'conversation_id' | 'booking_id' | 'reason_code' | 'reason_text' | 'status'>): Promise<Cancellation> {
  const { data, error } = await serviceClient().from('whatsapp_cancellations').insert(row).select('*').single();
  if (error) throw error;
  return data as Cancellation;
}

/** The request still waiting for a proof document, if any (last 24 hours). */
export async function openCancellation(conversationId: string): Promise<Cancellation | null> {
  const since = new Date(Date.now() - 24 * 3600e3).toISOString();
  const { data, error } = await serviceClient().from('whatsapp_cancellations').select('*')
    .eq('conversation_id', conversationId).eq('status', 'awaiting_proof').gte('created_at', since)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return (data as Cancellation) ?? null;
}

export async function updateCancellation(id: string, patch: Partial<Cancellation>): Promise<void> {
  const { error } = await serviceClient().from('whatsapp_cancellations').update({ ...patch, updated_at: now() }).eq('id', id);
  if (error) console.error('WhatsApp cancellation update failed:', error);
}

/** Take a waiting cancellation for processing. Only the first caller gets true. */
export async function claimCancellation(id: string): Promise<boolean> {
  const { data, error } = await serviceClient().from('whatsapp_cancellations').update({ status: 'needs_review', updated_at: now() }).eq('id', id).eq('status', 'awaiting_proof').select('id');
  if (error) throw error;
  return (data || []).length > 0;
}
