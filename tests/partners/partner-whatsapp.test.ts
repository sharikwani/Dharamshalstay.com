import { describe, expect, it } from 'vitest';
import { newBookingParams, partnerServiceLine } from '@/lib/booking-whatsapp';

const base: any = {
  booking_ref: 'TXI-261101-AB12', category: 'taxi', item_name: 'Gaggal Airport → McLeod Ganj', activity_date: '2026-11-01', pickup_time: '14:30',
  num_guests: 3, guest_name: 'Riya Sharma', guest_phone: '+919800000000', amount: 1800, payment_text: 'Customer pays the driver',
  pickup_location: 'Gaggal Airport', drop_location: 'Hotel Tibet, Temple Road', vehicle_type: 'sedan', assignee_text: 'Raju, +919811111111 · HP01D5803',
  special_requests: 'Flight SG 2345 lands 2:10 pm.\nTwo big bags.',
};

describe('partner booking WhatsApp', () => {
  it('gives a taxi partner the exact drop, car, driver and guest note on one line', () => {
    const line = partnerServiceLine(base);
    expect(line).toBe('Gaggal Airport → McLeod Ganj · Drop: Hotel Tibet, Temple Road · Car asked for: sedan · Assigned: Raju, +919811111111 · HP01D5803 · Guest note: Flight SG 2345 lands 2:10 pm. Two big bags.');
    expect(line).not.toContain('Pickup:');
  });
  it('fills all 9 template values with the date and time spelled out', () => {
    const p = newBookingParams(base);
    expect(p).toHaveLength(9);
    expect(p[0]).toBe('TXI-261101-AB12');
    expect(p[2]).toBe('Sun, 1 Nov 2026');
    expect(p[3]).toBe('2:30 PM');
    expect(p[5]).toBe('Riya Sharma');
    expect(p[6]).toBe('+919800000000');
    expect(p[7]).toBe('Rs.1,800');
    expect(p.join(' ')).not.toMatch(/\n/);
  });
  it('keeps trek and paragliding lines short when there is nothing extra', () => {
    expect(partnerServiceLine({ ...base, category: 'trek', item_name: 'Triund Trek', pickup_location: null, drop_location: null, vehicle_type: null, assignee_text: null, special_requests: null })).toBe('Triund Trek');
  });
});
