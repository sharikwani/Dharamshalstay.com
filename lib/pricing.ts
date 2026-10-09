/**
 * Prices are shown exactly as listed (matching MakeMyTrip). The booking
 * discount is applied by our team when the booking is confirmed, so it is
 * shown as a note under the price -- never subtracted from the displayed rate.
 */
export const BOOKING_DISCOUNT_MAX = 500;
export const BOOKING_DISCOUNT_NOTE = 'Discount of up to ₹500 on every booking';

// Booking prices are always computed here, on the server, from database rows.
// The browser only shows an estimate; it never decides what is charged.

export type BookingCategory = 'hotel' | 'taxi' | 'trek' | 'paragliding';
export type QuoteInput = { num_guests: number; check_in?: string | null; check_out?: string | null; room_name?: string | null; plan_index?: number | null };
export type HotelLike = { price_min?: number | null; rooms?: any[] | null; commission_pct?: number | null };

const DEFAULT_COMMISSION: Record<BookingCategory, number> = { hotel: 10, taxi: 10, trek: 10, paragliding: 15 };

export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = Date.parse(checkIn + 'T00:00:00Z');
  const b = Date.parse(checkOut + 'T00:00:00Z');
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
  return Math.round((b - a) / 86_400_000);
}

export function hotelNightlyPrice(property: HotelLike, roomName?: string | null, planIndex?: number | null): number {
  const room = roomName ? (property.rooms || []).find((r: any) => r?.name === roomName) : null;
  if (room) {
    const plans = Array.isArray(room.rate_plans) ? room.rate_plans : [];
    const plan = typeof planIndex === 'number' ? plans[planIndex] : undefined;
    if (plan && Number(plan.price) > 0) return Number(plan.price);
    if (Number(room.base_price) > 0) return Number(room.base_price);
  }
  return Number(property.price_min) > 0 ? Number(property.price_min) : 0;
}

function pct(entity: Record<string, any> | null, category: BookingCategory): number {
  const v = Number(entity?.commission_pct);
  return Number.isFinite(v) && v >= 0 && v <= 100 && entity?.commission_pct != null ? v : DEFAULT_COMMISSION[category];
}

export function quoteBooking(category: BookingCategory, entity: Record<string, any> | null, input: QuoteInput) {
  const guests = Math.max(1, Math.floor(input.num_guests || 1));
  const commission_pct = pct(entity, category);
  if (!entity) return { amount: 0, commission_pct };

  let amount = 0;
  if (category === 'hotel') {
    const nights = input.check_in && input.check_out ? nightsBetween(input.check_in, input.check_out) : 0;
    amount = hotelNightlyPrice(entity, input.room_name, input.plan_index) * nights;
  } else if (category === 'trek' || category === 'paragliding') {
    amount = (Number(entity.price_per_person) || 0) * guests;
  } else if (category === 'taxi') {
    amount = entity.price_type === 'per_km' ? 0 : Number(entity.price) || 0;
  }
  return { amount: Math.round(amount), commission_pct };
}
