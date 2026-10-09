import { describe, it, expect } from 'vitest';
import { normalizeIndianPhone, waLink, bookingShareText } from '@/lib/whatsapp';

describe('normalizeIndianPhone', () => {
  it('handles common formats', () => {
    expect(normalizeIndianPhone('98160 00005')).toBe('919816000005');
    expect(normalizeIndianPhone('+91-98160-00005')).toBe('919816000005');
    expect(normalizeIndianPhone('09816000005')).toBe('919816000005');
    expect(normalizeIndianPhone('12345')).toBeNull();
    expect(normalizeIndianPhone(null)).toBeNull();
  });
});
describe('waLink', () => {
  it('encodes text', () => expect(waLink('9816000005', 'Hi & bye')).toBe('https://wa.me/919816000005?text=Hi%20%26%20bye'));
  it('null for bad phone', () => expect(waLink('x', 'Hi')).toBeNull());
});
describe('bookingShareText', () => {
  const b = { booking_ref: 'TXI-261010-ABCDE', category: 'taxi', item_name: 'Gaggal Airport to McLeod Ganj', date_text: '12 Oct 2026, 10:00', num_guests: 3, guest_name: 'Asha', guest_phone: '9816000005', amount: 2200, payment_text: 'Customer pays you directly', commission_amount: 440, assignee_text: 'Driver Sonu · HP39A1234' };
  it('partner message includes customer contact and commission', () => {
    const t = bookingShareText(b, 'partner');
    expect(t).toContain('TXI-261010-ABCDE');
    expect(t).toContain('Asha');
    expect(t).toContain('9816000005');
    expect(t).toContain('Rs.2,200');
    expect(t).toContain('Rs.440');
  });
  it('customer message omits commission and includes assignee', () => {
    const t = bookingShareText(b, 'customer');
    expect(t).not.toContain('440');
    expect(t).toContain('Driver Sonu');
  });
});
