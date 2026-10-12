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

import { cancelBooking } from '@/lib/bookings/cancel';

beforeEach(() => { Object.assign(h, { updates: [], recordUpdates: [], updateError: null, emails: [], wa: [] }); });

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
});
