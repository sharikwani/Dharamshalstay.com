import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('resend', () => ({ Resend: class { emails = { send: h.send }; } }));

import { confirmedPaymentText, sendBookingConfirmation, sendBookingRequestReceived } from '@/lib/email';

const base = { guest_name: 'Asha', guest_email: 'a@x.com', booking_ref: 'DS-1', amount: 5000, category: 'hotel', check_in: '2026-10-12', check_out: '2026-10-14' };

beforeEach(() => {
  process.env.RESEND_API_KEY = 'test';
  h.send.mockReset().mockResolvedValue({ data: { id: 'e1' }, error: null });
});

describe('booking emails', () => {
  it('request-received: subject, heading, honest not-confirmed note, pay at property, escaped values', async () => {
    await sendBookingRequestReceived({ ...base, guest_name: '<b>', property_name: 'A & B', room_name: '<i>Deluxe</i>', paid_amount: 100 });
    const m = h.send.mock.calls[0][0];
    expect(m.subject).toBe('Booking request received – DS-1 | Dharamshala Stay');
    expect(m.html).toContain('Not confirmed yet');
    expect(m.html).toContain('The hotel will confirm it shortly');
    expect(m.html).toContain('Pay at property');
    expect(m.html).toContain('&lt;b&gt;');
    expect(m.html).not.toContain('<b>');
    expect(m.html).toContain('A &amp; B');
    expect(m.html).toContain('&lt;i&gt;Deluxe');
    expect(m.text).toContain('DS-1');
    expect(m.replyTo).toBe('support@dharamshalastay.com');
  });
  it('request-received for non-hotel bookings says our team', async () => {
    await sendBookingRequestReceived({ ...base, category: 'taxi' });
    expect(h.send.mock.calls[0][0].html).toContain('Our team will confirm it shortly');
  });
  it('confirmation keeps its subject', async () => {
    await sendBookingConfirmation(base);
    const m = h.send.mock.calls[0][0];
    expect(m.subject).toBe('Booking confirmed – DS-1 | Dharamshala Stay');
    expect(m.html).toContain('Booking confirmed');
    expect(m.html).toContain('What to bring');
  });
  it('confirmation of an unpaid online booking says online payment pending', async () => {
    await sendBookingConfirmation({ ...base, payment_method: 'online', payment_status: 'pending' });
    const html = h.send.mock.calls[0][0].html;
    expect(html).toContain('Online payment pending');
    expect(html).not.toContain('Pay at property');
  });
  it('payment row text', () => {
    expect(confirmedPaymentText({ amount: 5000, payment_method: 'online', payment_status: 'pending' })).toBe('Online payment pending');
    expect(confirmedPaymentText({ amount: 5000, payment_method: 'online', payment_status: null })).toBe('Online payment pending');
    expect(confirmedPaymentText({ amount: 5000, payment_method: 'online', payment_status: 'paid' })).toBe('Paid Rs.5,000');
    expect(confirmedPaymentText({ amount: 5000, paid_amount: 5000, payment_method: 'online', payment_status: 'paid' })).toBe('Paid Rs.5,000');
    expect(confirmedPaymentText({ amount: 5000, payment_method: 'pay_at_hotel', payment_status: 'pending' })).toBe('Pay at property');
    expect(confirmedPaymentText({ amount: 5000, payment_method: 'offline' })).toBe('Pay at property');
    expect(confirmedPaymentText({ amount: 5000 })).toBe('Pay at property');
  });
});
