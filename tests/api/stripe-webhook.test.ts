import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  sendBookingEmails: vi.fn(async (_id: string) => {}),
  constructEvent: vi.fn(),
  calls: [] as { op: string; args: unknown[] }[],
  result: { data: null as any, error: null as any },
}));

vi.mock('@/lib/stripe', () => ({ getStripe: () => ({ webhooks: { constructEvent: h.constructEvent } }) }));
vi.mock('@/lib/booking-emails', () => ({ sendBookingEmails: (id: string) => h.sendBookingEmails(id) }));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      h.calls.push({ op: 'from', args: [table] });
      const b: any = {};
      for (const op of ['update', 'eq', 'or', 'select']) b[op] = (...args: unknown[]) => { h.calls.push({ op, args }); return b; };
      b.maybeSingle = async () => h.result;
      return b;
    },
  }),
}));

import { POST } from '@/app/api/webhooks/stripe/route';

const event = { type: 'checkout.session.completed', data: { object: { id: 'cs_1', amount_total: 450000, payment_intent: 'pi_1' } } };
const send = () => POST(new Request('http://x', { method: 'POST', body: '{}', headers: { 'stripe-signature': 'sig' } }) as any);

beforeEach(() => {
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://sb');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'key');
  h.calls.length = 0; h.result = { data: null, error: null };
  h.sendBookingEmails.mockClear();
  h.constructEvent.mockReset().mockReturnValue(event);
});

describe('POST /api/webhooks/stripe', () => {
  it('marks only a not-yet-paid booking paid and sends the alerts once', async () => {
    h.result = { data: { id: 'b1', booking_ref: 'DS-1' }, error: null };
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const res = await send();
    expect(res.status).toBe(200);
    expect(h.calls).toContainEqual({ op: 'update', args: [expect.objectContaining({ payment_status: 'paid', paid_amount: 4500, status: 'confirmed' })] });
    expect(h.calls).toContainEqual({ op: 'eq', args: ['stripe_session_id', 'cs_1'] });
    expect(h.calls).toContainEqual({ op: 'or', args: ['payment_status.is.null,payment_status.neq.paid'] });
    expect(h.sendBookingEmails).toHaveBeenCalledWith('b1');
  });

  it('a retried event for an already-paid booking updates nothing and sends nothing', async () => {
    h.result = { data: null, error: null };
    const res = await send();
    expect(res.status).toBe(200);
    expect(h.sendBookingEmails).not.toHaveBeenCalled();
  });

  it('returns 500 so Stripe retries when the update fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.result = { data: null, error: { message: 'db down' } };
    const res = await send();
    expect(res.status).toBe(500);
    expect(h.sendBookingEmails).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('rejects a bad signature', async () => {
    h.constructEvent.mockImplementation(() => { throw new Error('bad sig'); });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await send()).status).toBe(400);
    expect(h.calls).toHaveLength(0);
  });
});
