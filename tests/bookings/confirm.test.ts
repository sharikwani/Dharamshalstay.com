import { describe, expect, it, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  status: 'pending' as string | null, // the booking's stored status (null = no such booking)
  updates: [] as any[], filters: [] as any[], selects: [] as string[], updateError: null as any,
  booking: null as any, property: null as any,
  emails: [] as any[], wa: [] as any[], emailThrows: false,
}));

/** A fake bookings table: the conditional update only matches while the stored status is still pending. */
const fakeSb: any = {
  from: (t: string) => ({
    update: (row: any) => {
      h.updates.push(row);
      const conds: any[] = [];
      const c: any = {};
      c.eq = (...a: any[]) => { conds.push(a); h.filters.push(['eq', ...a]); return c; };
      c.select = async (cols: string) => {
        h.selects.push(cols);
        if (h.updateError) return { data: null, error: h.updateError };
        const wantPending = conds.some(([col, v]) => col === 'status' && v === 'pending');
        if (h.status === null || (wantPending && h.status !== 'pending')) return { data: [], error: null };
        h.status = row.status;
        return { data: [{ id: 'b1' }], error: null };
      };
      return c;
    },
    select: (cols: string) => ({
      eq: () => {
        const r = async () => {
          if (t === 'properties') return { data: h.property, error: null };
          if (cols === '*') return { data: h.booking, error: null };
          return { data: h.status === null ? null : { status: h.status }, error: null };
        };
        return { maybeSingle: r, single: r };
      },
    }),
  }),
};

vi.mock('@/lib/server-auth', () => ({ serviceClient: () => fakeSb }));
vi.mock('@/lib/email', () => ({
  sendBookingConfirmation: async (b: any) => { h.emails.push(b); if (h.emailThrows) throw new Error('mail down'); },
}));
vi.mock('@/lib/booking-whatsapp', () => ({ whatsappNewBooking: async (...a: any[]) => { h.wa.push(a); } }));

import { confirmBooking, sendConfirmedNotices } from '@/lib/bookings/confirm';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  Object.assign(h, {
    status: 'pending', updates: [], filters: [], selects: [], updateError: null, emails: [], wa: [], emailThrows: false,
    booking: {
      id: 'b1', guest_name: 'Asha', guest_email: 'a@x.com', booking_ref: 'HTL-1', check_in: '2099-01-10', check_out: '2099-01-12',
      activity_date: null, amount: 5000, category: 'hotel', room_name: 'Deluxe', property_id: 'h1', paid_amount: 0,
      payment_method: 'online', payment_status: 'pending',
    },
    property: { name: 'Hotel Snow View' },
  });
});

describe('confirmBooking', () => {
  it('confirms a pending booking with a conditional update and tells the customer once', async () => {
    expect(await confirmBooking('b1', 'admin')).toEqual({ ok: true, already: false });
    expect(h.updates).toHaveLength(1);
    expect(h.updates[0]).toEqual({ status: 'confirmed', updated_at: expect.any(String) });
    expect(h.filters).toEqual([['eq', 'id', 'b1'], ['eq', 'status', 'pending']]);
    expect(h.selects[0]).toBe('id');
    expect(h.emails).toHaveLength(1);
    expect(h.emails[0]).toMatchObject({ guest_email: 'a@x.com', booking_ref: 'HTL-1', property_name: 'Hotel Snow View', room_name: 'Deluxe', payment_method: 'online', payment_status: 'pending' });
    expect(h.wa).toEqual([['b1', { customer: true, partners: false }]]);
  });

  it('uses the client it is given', async () => {
    const from = vi.fn(fakeSb.from);
    expect(await confirmBooking('b1', 'partner', { from } as any)).toEqual({ ok: true, already: false });
    expect(from).toHaveBeenCalledWith('bookings');
  });

  it('an already confirmed booking is a no-op with no second notice', async () => {
    h.status = 'confirmed';
    expect(await confirmBooking('b1', 'partner')).toEqual({ ok: true, already: true });
    expect(h.emails).toEqual([]);
    expect(h.wa).toEqual([]);
  });

  it('admin and WhatsApp Accept confirming at the same moment: the customer is told exactly once', async () => {
    const [a, b] = await Promise.all([confirmBooking('b1', 'admin'), confirmBooking('b1', 'partner')]);
    expect([a, b]).toEqual(expect.arrayContaining([{ ok: true, already: false }, { ok: true, already: true }]));
    expect(h.emails).toHaveLength(1);
    expect(h.wa).toHaveLength(1);
  });

  it.each(['cancelled', 'failed', 'completed'])('a %s booking cannot be confirmed (409)', async (s) => {
    h.status = s;
    expect(await confirmBooking('b1', 'admin')).toEqual({ ok: false, status: 409, error: `This booking is ${s}.` });
    expect(h.emails).toEqual([]);
    expect(h.wa).toEqual([]);
  });

  it('a missing booking is 404', async () => {
    h.status = null;
    expect(await confirmBooking('b1', 'admin')).toEqual({ ok: false, status: 404, error: 'Booking not found.' });
  });

  it('a failed save is 500 and sends nothing', async () => {
    h.updateError = { message: 'boom' };
    expect(await confirmBooking('b1', 'admin')).toEqual({ ok: false, status: 500, error: 'Could not confirm the booking. Please try again.' });
    expect(h.emails).toEqual([]);
    expect(h.wa).toEqual([]);
  });

  it('a throwing email does not change the result and the WhatsApp still goes', async () => {
    h.emailThrows = true;
    expect(await confirmBooking('b1', 'admin')).toEqual({ ok: true, already: false });
    expect(h.wa).toHaveLength(1);
  });
});

describe('sendConfirmedNotices', () => {
  it('skips the email when the customer gave no address but still sends WhatsApp', async () => {
    h.booking = { ...h.booking, guest_email: null };
    await sendConfirmedNotices('b1');
    expect(h.emails).toEqual([]);
    expect(h.wa).toEqual([['b1', { customer: true, partners: false }]]);
  });

  it('sends nothing for a missing booking and never throws', async () => {
    h.booking = null;
    await expect(sendConfirmedNotices('b1')).resolves.toBeUndefined();
    expect(h.emails).toEqual([]);
    expect(h.wa).toEqual([]);
  });
});
