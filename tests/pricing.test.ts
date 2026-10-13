import { describe, it, expect } from 'vitest';
import { nightsBetween, hotelNightlyPrice, quoteBooking, extraBedOption, extraBedProblem } from '@/lib/pricing';

const hotel = {
  price_min: 1800,
  commission_pct: 12,
  rooms: [
    { name: 'Deluxe', base_price: 2500, rate_plans: [{ meal_plan: 'ep', price: 2400 }, { meal_plan: 'cp', price: 2900 }] },
    { name: 'Standard', base_price: 1800, rate_plans: [] },
  ],
};

describe('nightsBetween', () => {
  it('counts nights', () => expect(nightsBetween('2026-11-01', '2026-11-04')).toBe(3));
  it('is 0 for same or reversed dates', () => {
    expect(nightsBetween('2026-11-04', '2026-11-04')).toBe(0);
    expect(nightsBetween('2026-11-05', '2026-11-04')).toBe(0);
  });
});

describe('hotelNightlyPrice', () => {
  it('uses the chosen rate plan', () => expect(hotelNightlyPrice(hotel, 'Deluxe', 1)).toBe(2900));
  it('falls back to base price for a room without plans', () => expect(hotelNightlyPrice(hotel, 'Standard', 0)).toBe(1800));
  it('falls back to price_min when no room is chosen', () => expect(hotelNightlyPrice(hotel, null, null)).toBe(1800));
  it('ignores an out-of-range plan index', () => expect(hotelNightlyPrice(hotel, 'Deluxe', 9)).toBe(2500));
  it('returns 0 when nothing is priced', () => expect(hotelNightlyPrice({ price_min: null, rooms: [] }, null, null)).toBe(0));
});

describe('quoteBooking', () => {
  it('prices a hotel stay from the database, not the client', () => {
    expect(quoteBooking('hotel', hotel, { num_guests: 2, check_in: '2026-11-01', check_out: '2026-11-03', room_name: 'Deluxe', plan_index: 0 }))
      .toEqual({ amount: 4800, commission_pct: 12 });
  });
  it('prices treks per person', () => {
    expect(quoteBooking('trek', { price_per_person: 1500, commission_pct: 10 }, { num_guests: 3 })).toEqual({ amount: 4500, commission_pct: 10 });
  });
  it('prices paragliding per person with default 15%', () => {
    expect(quoteBooking('paragliding', { price_per_person: 3500 }, { num_guests: 2 })).toEqual({ amount: 7000, commission_pct: 15 });
  });
  it('prices a fixed taxi route once, regardless of guests', () => {
    expect(quoteBooking('taxi', { price: 2200, price_type: 'fixed', commission_pct: 10 }, { num_guests: 4 })).toEqual({ amount: 2200, commission_pct: 10 });
  });
  it('returns 0 (quote needed) for a per-km taxi or unknown entity', () => {
    expect(quoteBooking('taxi', { price: 18, price_type: 'per_km' }, { num_guests: 1 }).amount).toBe(0);
    expect(quoteBooking('trek', null, { num_guests: 2 }).amount).toBe(0);
  });
  it('clamps guests to at least 1', () => {
    expect(quoteBooking('trek', { price_per_person: 1000 }, { num_guests: 0 }).amount).toBe(1000);
  });
});

describe('extra beds', () => {
  const bedHotel = {
    price_min: 3000, extra_bed_charge: 500,
    rooms: [
      { name: 'Deluxe', base_price: 3000, extra_beds_max: 2, extra_bed_price: 800 },
      { name: 'Cottage', base_price: 2000, extra_beds_max: 1 },
      { name: 'Standard', base_price: 1800, extra_beds_max: 0, extra_bed_price: 800 },
      { name: 'Plain', base_price: 1500 },
    ],
  };
  const stay = { num_guests: 2, check_in: '2026-11-01', check_out: '2026-11-03' };
  it('adds beds x price x nights', () => {
    expect(quoteBooking('hotel', bedHotel, { ...stay, room_name: 'Deluxe', extra_beds: 1 }).amount).toBe(7600);
  });
  it('uses the property extra_bed_charge when the room has no price', () => {
    expect(extraBedOption(bedHotel, 'Cottage')).toEqual({ max: 1, price: 500 });
    expect(quoteBooking('hotel', bedHotel, { ...stay, room_name: 'Cottage', extra_beds: 1 }).amount).toBe(5000);
  });
  it('allows no beds without extra_beds_max', () => {
    expect(extraBedOption(bedHotel, 'Plain').max).toBe(0);
    expect(extraBedOption(bedHotel, 'Standard').max).toBe(0);
    expect(extraBedOption(bedHotel, null).max).toBe(0);
  });
  it('refuses too many beds', () => {
    expect(extraBedProblem(bedHotel, 'Standard', 1)).toBe('This room allows at most 0 extra bed(s)');
    expect(extraBedProblem(bedHotel, 'Deluxe', 3)).toBe('This room allows at most 2 extra bed(s)');
    expect(extraBedProblem(bedHotel, 'Deluxe', 2)).toBeNull();
    expect(extraBedProblem(bedHotel, 'Deluxe', 0)).toBeNull();
  });
  it('never charges beds above the room maximum', () => {
    expect(quoteBooking('hotel', bedHotel, { ...stay, room_name: 'Deluxe', extra_beds: 9 }).amount).toBe(2 * (3000 + 1600));
  });
  it('ignores extra_beds for other categories', () => {
    expect(quoteBooking('trek', { price_per_person: 1000 }, { num_guests: 2, extra_beds: 2 }).amount).toBe(2000);
  });
});
