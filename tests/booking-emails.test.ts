import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  confirmation: vi.fn(), requestReceived: vi.fn(), admin: vi.fn(), whatsapp: vi.fn(),
}));
vi.mock('@/lib/email', () => ({
  sendBookingConfirmation: h.confirmation, sendBookingRequestReceived: h.requestReceived, sendAdminNotification: h.admin,
}));
vi.mock('@/lib/booking-whatsapp', () => ({ whatsappNewBooking: h.whatsapp }));
vi.mock('@/lib/server-auth', () => ({
  serviceClient: () => ({
    from: (t: string) => ({
      select: () => ({ eq: () => ({ single: async () => ({
        data: t === 'properties' ? { name: 'Snow View' } : {
          id: 'b1', property_id: 'p1', guest_name: 'Asha', guest_email: 'a@x.com', guest_phone: '9816000001', booking_ref: 'DS-1',
          check_in: '2026-10-12', check_out: '2026-10-14', amount: 5000, category: 'hotel', room_name: 'Deluxe', paid_amount: 0,
        },
      }) }) }),
    }),
  }),
}));

import { sendBookingEmails } from '@/lib/booking-emails';

beforeEach(() => { vi.clearAllMocks(); });

describe('sendBookingEmails', () => {
  it("'confirmed' sends the confirmation email and the customer + partner WhatsApp", async () => {
    await sendBookingEmails('b1', 'confirmed');
    expect(h.confirmation).toHaveBeenCalledWith(expect.objectContaining({ booking_ref: 'DS-1', property_name: 'Snow View' }));
    expect(h.requestReceived).not.toHaveBeenCalled();
    expect(h.whatsapp).toHaveBeenCalledWith('b1', { customer: true, partners: true });
  });
  it("'requested' (the default) sends the request-received email and no customer WhatsApp", async () => {
    await sendBookingEmails('b1');
    expect(h.requestReceived).toHaveBeenCalledWith(expect.objectContaining({ booking_ref: 'DS-1', property_name: 'Snow View' }));
    expect(h.confirmation).not.toHaveBeenCalled();
    expect(h.whatsapp).toHaveBeenCalledWith('b1', { customer: false, partners: true });
    expect(h.admin).toHaveBeenCalledTimes(1);
  });
});
