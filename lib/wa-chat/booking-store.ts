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

export async function getQuote(id: string): Promise<Quote | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await serviceClient().from('whatsapp_quotes').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as Quote) ?? null;
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

/** True when the customer wrote after `iso` (used to prove they saw the quote before saying yes). */
export async function customerSpokeSince(conversationId: string, iso: string): Promise<boolean> {
  const { data, error } = await serviceClient().from('whatsapp_chat_messages').select('id')
    .eq('conversation_id', conversationId).eq('author', 'customer').gt('created_at', iso).limit(1);
  if (error) throw error;
  return (data || []).length > 0;
}

export type OwnBooking = {
  id: string; booking_ref: string; category: string; status: string; payment_status: string | null; payment_method: string | null;
  amount: number | null; check_in: string | null; check_out: string | null; activity_date: string | null; pickup_time: string | null;
  num_guests: number | null; room_name: string | null; property_id: string | null; trek_id: string | null; paragliding_id: string | null;
  taxi_route_id: string | null; commission_status: string | null; booking_source: string | null; guest_name: string | null;
  guest_phone: string; created_at: string;
};

const OWN_COLS = 'id, booking_ref, category, status, payment_status, payment_method, amount, check_in, check_out, activity_date, pickup_time, num_guests, room_name, property_id, trek_id, paragliding_id, taxi_route_id, commission_status, booking_source, guest_name, guest_phone, created_at';

/** Bookings made with this phone number, newest first. */
export async function ownBookings(phone: string): Promise<OwnBooking[]> {
  const last4 = digits(phone).slice(-4);
  if (last4.length < 4) return [];
  const { data, error } = await serviceClient().from('bookings').select(OWN_COLS)
    .ilike('guest_phone', `%${last4}`).order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  return ((data as OwnBooking[]) || []).filter((b) => samePhone(b.guest_phone, phone)).slice(0, 20);
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
