import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'node:crypto';

const h = vi.hoisted(() => ({
  sendBookingEmails: vi.fn(async (_id: string, _stage?: string) => {}),
  sendEmail: vi.fn(async (_m: any) => {}),
  calls: [] as { table: string; op: string; args: unknown[] }[],
  byLink: { data: null as any, error: null as any },
  byId: { data: null as any, error: null as any },
  result: { data: null as any, error: null as any },
  reread: { data: null as any, error: null as any },
}));

vi.mock('@/lib/booking-emails', () => ({ sendBookingEmails: (id: string, stage?: string) => h.sendBookingEmails(id, stage) }));
vi.mock('@/lib/availability/store', () => ({ availabilityFor: async () => ({}) }));
vi.mock('@/lib/email', () => ({ adminEmail: () => 'owner@x', sendEmail: (m: any) => h.sendEmail(m) }));
vi.mock('@/lib/offers/store', () => ({ attachPaidOffer: async () => 'none' }));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      const ops: { op: string; args: unknown[] }[] = [];
      const b: any = {};
      for (const op of ['update', 'eq', 'or', 'select', 'in', 'not']) b[op] = (...args: unknown[]) => { ops.push({ op, args }); h.calls.push({ table, op, args }); return b; };
      b.maybeSingle = async () => {
        if (ops.some((o) => o.op === 'update')) return h.result;
        if (ops.some((o) => o.op === 'select' && String(o.args[0]).includes('razorpay_payment_id'))) return h.reread;
        return ops.some((o) => o.op === 'eq' && o.args[0] === 'razorpay_link_id') ? h.byLink : h.byId;
      };
      b.then = (res: any) => res({ error: null });
      return b;
    },
  }),
}));

import { POST } from '@/app/api/webhooks/razorpay/route';

const SECRET = 'whsec_rzp';
const paid = (over: any = {}) => ({
  event: 'payment_link.paid',
  payload: {
    payment_link: { entity: { id: 'plink_1', amount_paid: 450000, status: 'paid', notes: { booking_id: 'b1', booking_ref: 'DS-1' }, ...over } },
    payment: { entity: { id: 'pay_1', amount: 450000, status: 'captured' } },
  },
});
const send = (event: any = paid(), sig?: string) => {
  const body = JSON.stringify(event);
  const signature = sig ?? createHmac('sha256', SECRET).update(body).digest('hex');
  return POST(new Request('http://x', { method: 'POST', body, headers: { 'x-razorpay-signature': signature } }) as any);
};
const bookingUpdate = () => h.calls.find((c) => c.table === 'bookings' && c.op === 'update')?.args[0] as any;
const open = (over: any = {}) => ({ id: 'b1', booking_ref: 'DS-1', status: 'pending', payment_status: 'pending', commission_status: 'pending', ...over });

beforeEach(() => {
  vi.stubEnv('RAZORPAY_WEBHOOK_SECRET', SECRET);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://sb');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'key');
  h.calls.length = 0;
  h.byLink = { data: open(), error: null };
  h.byId = { data: null, error: null };
  h.result = { data: { id: 'b1', booking_ref: 'DS-1' }, error: null };
  h.reread = { data: null, error: null };
  h.sendBookingEmails.mockClear();
  h.sendEmail.mockClear();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('POST /api/webhooks/razorpay', () => {
  it('confirms the booking paid by the link and sends the confirmation', async () => {
    const res = await send();
    expect(res.status).toBe(200);
    expect(h.calls).toContainEqual({ table: 'bookings', op: 'eq', args: ['razorpay_link_id', 'plink_1'] });
    expect(bookingUpdate()).toMatchObject({
      payment_status: 'paid', paid_amount: 4500, status: 'confirmed', razorpay_payment_id: 'pay_1', transaction_id: 'pay_1',
      payment_method: 'online', collected_by: 'platform', payment_channel: 'razorpay', commission_status: 'not_applicable',
    });
    expect(bookingUpdate()).not.toHaveProperty('razorpay_link_id');
    expect(h.sendBookingEmails).toHaveBeenCalledWith('b1', 'confirmed');
  });

  it('rejects a bad or missing signature and changes nothing', async () => {
    expect((await send(paid(), 'deadbeef')).status).toBe(400);
    expect((await POST(new Request('http://x', { method: 'POST', body: JSON.stringify(paid()) }) as any)).status).toBe(400);
    vi.stubEnv('RAZORPAY_WEBHOOK_SECRET', '');
    expect((await send()).status).toBe(400);
    expect(bookingUpdate()).toBeUndefined();
  });

  it('finds the booking by its notes when a newer link replaced this one', async () => {
    h.byLink = { data: null, error: null };
    h.byId = { data: open(), error: null };
    await send();
    expect(bookingUpdate()).toMatchObject({ payment_status: 'paid', razorpay_link_id: 'plink_1' });
  });

  it('ignores other events', async () => {
    expect((await send({ event: 'payment.captured', payload: {} })).status).toBe(200);
    expect(bookingUpdate()).toBeUndefined();
  });

  it('asks the owner to refund a payment for a cancelled booking, in Razorpay', async () => {
    h.byLink = { data: open({ status: 'cancelled' }), error: null };
    h.result = { data: { id: 'b1', booking_ref: 'DS-1', status: 'cancelled' }, error: null };
    await send();
    expect(bookingUpdate()).not.toHaveProperty('status');
    expect(h.sendBookingEmails).not.toHaveBeenCalled();
    expect(h.sendEmail.mock.calls[0][0].subject).toBe('Payment received for cancelled booking DS-1 — refund needed in Razorpay');
  });

  it('stays silent on a redelivery, and flags a different second payment', async () => {
    h.result = { data: null, error: null };
    h.reread = { data: open({ payment_status: 'paid', razorpay_payment_id: 'pay_1' }), error: null };
    await send();
    expect(h.sendEmail).not.toHaveBeenCalled();
    h.reread = { data: open({ payment_status: 'paid', razorpay_payment_id: 'pay_0' }), error: null };
    await send();
    expect(h.sendEmail.mock.calls[0][0].subject).toBe('Second payment received for DS-1 – refund one in Razorpay');
  });

  it('answers 500 so Razorpay retries when the database fails', async () => {
    h.byLink = { data: null, error: { message: 'db down' } };
    expect((await send()).status).toBe(500);
  });
});
