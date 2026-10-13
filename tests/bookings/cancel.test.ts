import { describe, expect, it, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({ updates: [] as any[], recordUpdates: [] as any[], updateError: null as any, emails: [] as any[], wa: [] as any[] }));
vi.mock('@/lib/server-auth', () => ({
  serviceClient: () => ({
    from: (t: string) => ({
      update: (row: any) => {
        if (t === 'commission_records') { h.recordUpdates.push(row); const c: any = { eq: () => c, in: async () => ({ error: null }) }; return c; }
        h.updates.push(row); return { eq: async () => ({ error: h.updateError }) };
      },
    }),
  }),
}));
vi.mock('@/lib/manual-booking-emails', () => ({ sendCancellationEmails: async (...a: any[]) => { h.emails.push(a); } }));
vi.mock('@/lib/booking-whatsapp', () => ({ whatsappCancelled: async (...a: any[]) => { h.wa.push(a); } }));
const off = vi.hoisted(() => ({ released: [] as string[] }));
vi.mock('@/lib/offers/store', () => ({ releaseForBooking: async (id: string) => { off.released.push(id); } }));

import { cancelBooking } from '@/lib/bookings/cancel';

beforeEach(() => { Object.assign(h, { updates: [], recordUpdates: [], updateError: null, emails: [], wa: [] }); off.released = []; });

describe('cancelBooking', () => {
  it('cancels, waives open commission and notifies', async () => {
    expect(await cancelBooking({ id: 'b1', commission_status: 'pending' }, 'Sick', { notify: true })).toEqual({ ok: true });
    expect(h.updates[0]).toEqual({ status: 'cancelled', cancelled_reason: 'Sick', commission_status: 'waived' });
    expect(h.recordUpdates[0]).toEqual({ status: 'waived' });
    expect(h.emails[0]).toEqual(['b1', 'Sick']);
    expect(h.wa[0]).toEqual(['b1', 'Sick']);
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
});
