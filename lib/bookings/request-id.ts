/**
 * A form's client_request_id lets a retried submit get back the booking it already made. The id comes from the
 * browser, so the earlier booking is only handed back when the retry is really the same request: same phone and
 * same booking details. Anything else is refused without revealing the earlier booking.
 */

/** Columns to read for an earlier booking with the same request id. */
export const REQUEST_ID_COLUMNS =
  'id, booking_ref, amount, payment_method, status, guest_phone, category, property_id, taxi_route_id, trek_id, paragliding_id, check_in, check_out, activity_date, room_name, num_guests';

/** The details a retry must repeat exactly. Missing keys are not compared. */
export type RequestDetails = {
  guest_phone: string;
  category: string;
  property_id?: string | null;
  taxi_route_id?: string | null;
  trek_id?: string | null;
  paragliding_id?: string | null;
  guide_id?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  activity_date?: string | null;
  room_name?: string | null;
  num_guests?: number | null;
};

export type EarlierMatch = 'same' | 'other_request' | 'closed';

const last10 = (p: unknown) => String(p ?? '').replace(/\D/g, '').slice(-10);
const norm = (v: unknown) => (v === undefined || v === null || v === '' ? null : String(v).trim());

/**
 * 'same' when the earlier booking is this request (phone and details match) and still open; 'closed' when it is
 * this request but was cancelled or failed; 'other_request' when the phone or any detail differs.
 */
export function matchEarlier(earlier: Record<string, any>, req: RequestDetails): EarlierMatch {
  const phone = last10(req.guest_phone);
  if (!phone || phone.length < 10 || last10(earlier.guest_phone) !== phone) return 'other_request';
  for (const [key, want] of Object.entries(req)) {
    if (key === 'guest_phone' || want === undefined) continue;
    if (key === 'num_guests') {
      if (Number(earlier.num_guests) !== Number(want)) return 'other_request';
    } else if (norm(earlier[key]) !== norm(want)) return 'other_request';
  }
  return earlier.status === 'cancelled' || earlier.status === 'failed' ? 'closed' : 'same';
}

/** Customer-facing refusal: never says which booking or whose. */
export const ALREADY_RECEIVED = 'We already received a booking from this form – please check your email/WhatsApp or contact us';
