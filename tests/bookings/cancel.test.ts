import { describe, expect, it, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  updates: [] as any[], filters: [] as any[], recordUpdates: [] as any[], updateError: null as any, changed: true,
  current: null as any, emails: [] as any[], wa: [] as any[], waCustomer: [] as any[],
}));
vi.mock('@/lib/server-auth', () => ({
  serviceClient: () => ({
    from: (t: string) => ({
      update: (row: any) => {
        if (t === 'commission_records') { h.recordUpdates.push(row); const c: any = { eq: () => c, in: async () => ({ error: null }) }; return c; }
        h.updates.push(row);
        const c: any = {};
        for (const op of ['eq', 'neq', 'or']) c[op] = (...a: any[]) => { h.filters.push([op, ...a]); return c; };
        c.select = async () => ({ data: h.updateError ? null : h.changed ? [{ id: 'b1' }] : [], error: h.updateError });
        return c;
      },
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: h.current, error: null }) }) }),
    }),
  }),
}));
vi.mock('@/lib/manual-booking-emails', () => ({ sendCancellationEmails: async (...a: any[]) => { h.emails.push(a); } }));
vi.mock('@/lib/booking-whatsapp', () => ({
  whatsappCancelled: async (...a: any[]) => { h.wa.push(a); },
  whatsappCancelledCustomer: async (...a: any[]) => { h.waCustomer.push(a); },
}));
const off = vi.hoisted(() => ({ released: [] as string[] }));
vi.mock('@/lib/offers/store', () => ({ releaseForBooking: async (id: string) => { off.released.push(id); } }));

import { cancelBooking } from '@/lib/bookings/cancel';

beforeEach(() => {
  Object.assign(h, { updates: [], filters: [], recordUpdates: [], updateError: null, changed: true, current: null, emails: [], wa: [], waCustomer: [] });
  off.released = [];
});

describe('cancelBooking', () => {
  it('cancels, waives open commission and notifies', async () => {
    expect(await cancelBooking({ id: 'b1', commission_status: 'pending' }, 'Sick', { notify: true })).toEqual({ ok: true });
    expect(h.updates[0]).toEqual({ status: 'cancelled', cancelled_reason: 'Sick', commission_status: 'waived' });
    expect(h.recordUpdates[0]).toEqual({ status: 'waived' });
    expect(h.emails[0]).toEqual(['b1', 'Sick']);
    expect(h.wa[0]).toEqual(['b1', 'Sick']);
    expect(h.waCustomer[0]).toEqual(['b1', 'Sick']);
  });
  it('skips the customer WhatsApp notice when customerWhatsApp is false', async () => {
    await cancelBooking({ id: 'b1', commission_status: 'pending' }, 'Sick', { notify: true, customerWhatsApp: false });
    expect(h.wa).toHaveLength(1);
    expect(h.waCustomer).toEqual([]);
  });
  it('sends no customer WhatsApp notice when notify is false', async () => {
    await cancelBooking({ id: 'b1', commission_status: 'pending' }, 'Sick', { notify: false });
    expect(h.waCustomer).toEqual([]);
  });
  it('keeps paid commission and can stay quiet', async () => {
    await cancelBooking({ id: 'b1', commission_status: 'paid' }, 'Sick', { notify: false });
    expect(h.updates[0]).toEqual({ status: 'cancelled', cancelled_reason: 'Sick' });
    expect(h.recordUpdates).toEqual([]);
    expect(h.emails).toEqual([]);
  });
  it('reports a failed save', async () => {
    h.updateError = { message: 'boom' };
    expect(await cancelBooking({ id: 'b1' }, 'Sick', { notify: true })).toEqual({ ok: false, error: 'Could not save the change. Please try again.' });
    expect(h.emails).toEqual([]);
  });
  it('gives the booking\'s offer code back after cancelling', async () => {
    await cancelBooking({ id: 'b1', commission_status: 'pending' }, 'Sick', { notify: false });
    expect(off.released).toEqual(['b1']);
  });
  it('keeps the offer code when the cancel could not be saved', async () => {
    h.updateError = { message: 'boom' };
    await cancelBooking({ id: 'b1' }, 'Sick', { notify: false });
    expect(off.released).toEqual([]);
  });

  it('only cancels a booking that is not cancelled yet; without requireUnpaid the payment is not checked', async () => {
    await cancelBooking({ id: 'b1', commission_status: 'pending' }, 'Sick', { notify: false });
    expect(h.filters).toEqual([['eq', 'id', 'b1'], ['neq', 'status', 'cancelled']]);
  });

  it('a second cancel of the same booking changes nothing and sends nothing', async () => {
    h.changed = false;
    h.current = { status: 'cancelled', payment_status: 'pending' };
    expect(await cancelBooking({ id: 'b1', commission_status: 'pending' }, 'Sick', { notify: true })).toEqual({ ok: true, already: true });
    expect(h.recordUpdates).toEqual([]);
    expect(off.released).toEqual([]);
    expect(h.emails).toEqual([]);
    expect(h.wa).toEqual([]);
  });

  it('with requireUnpaid, cancels only an unpaid booking', async () => {
    expect(await cancelBooking({ id: 'b1', commission_status: 'pending' }, 'Sick', { notify: true, requireUnpaid: true })).toEqual({ ok: true });
    expect(h.filters).toContainEqual(['or', 'payment_status.is.null,payment_status.not.in.(paid,partially_paid)']);
  });

  it('with requireUnpaid, refuses a booking that was paid meanwhile and sends nothing', async () => {
    h.changed = false;
    h.current = { status: 'pending', payment_status: 'paid' };
    expect(await cancelBooking({ id: 'b1', commission_status: 'pending' }, 'Sick', { notify: true, requireUnpaid: true }))
      .toEqual({ ok: false, error: 'This booking was paid meanwhile' });
    expect(h.recordUpdates).toEqual([]);
    expect(off.released).toEqual([]);
    expect(h.emails).toEqual([]);
    expect(h.wa).toEqual([]);
  });

  it('with requireUnpaid, an already-cancelled booking is reported as already cancelled', async () => {
    h.changed = false;
    h.current = { status: 'cancelled', payment_status: 'paid' };
    expect(await cancelBooking({ id: 'b1' }, 'Sick', { notify: true, requireUnpaid: true })).toEqual({ ok: true, already: true });
  });
});
