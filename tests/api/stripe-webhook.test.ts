import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  sendBookingEmails: vi.fn(async (_id: string, _stage?: string) => {}),
  availabilityFor: vi.fn(async (..._a: any[]): Promise<any> => ({})),
  sendEmail: vi.fn(async (_m: any) => {}),
  constructEvent: vi.fn(),
  calls: [] as { table: string; op: string; args: unknown[] }[],
  bySession: { data: null as any, error: null as any },
  byId: { data: null as any, error: null as any },
  result: { data: null as any, error: null as any },
  results: [] as { data: any; error: any }[],
  reread: { data: null as any, error: null as any },
  recordResult: { error: null as any },
}));

vi.mock('@/lib/stripe', () => ({ getStripe: () => ({ webhooks: { constructEvent: h.constructEvent } }) }));
vi.mock('@/lib/booking-emails', () => ({ sendBookingEmails: (id: string, stage?: string) => h.sendBookingEmails(id, stage) }));
vi.mock('@/lib/availability/store', () => ({ availabilityFor: (...a: any[]) => h.availabilityFor(...a) }));
vi.mock('@/lib/email', () => ({ adminEmail: () => 'owner@x', sendEmail: (m: any) => h.sendEmail(m) }));
const o = vi.hoisted(() => ({ result: 'none' as 'none' | 'attached' | 'conflict' | 'throw', calls: [] as string[] }));
vi.mock('@/lib/offers/store', () => ({ attachPaidOffer: async (id: string) => { o.calls.push(id); if (o.result === 'throw') throw new Error('db down'); return o.result; } }));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      h.calls.push({ table, op: 'from', args: [table] });
      const ops: { op: string; args: unknown[] }[] = [];
      const b: any = {};
      for (const op of ['update', 'eq', 'or', 'select', 'in', 'not']) b[op] = (...args: unknown[]) => { ops.push({ op, args }); h.calls.push({ table, op, args }); return b; };
      b.maybeSingle = async () => {
        if (ops.some((o) => o.op === 'update')) return h.results.length ? h.results.shift()! : h.result;
        if (ops.some((o) => o.op === 'select' && String(o.args[0]).includes('stripe_payment_intent'))) return h.reread;
        return ops.some((o) => o.op === 'eq' && o.args[0] === 'stripe_session_id') ? h.bySession : h.byId;
      };
      b.then = (res: any) => res(h.recordResult);
      return b;
    },
  }),
}));

import { POST } from '@/app/api/webhooks/stripe/route';

const event = (meta: any = { booking_id: 'b1', booking_ref: 'DS-1' }, over: any = {}, type = 'checkout.session.completed') =>
  ({ type, data: { object: { id: 'cs_1', amount_total: 450000, payment_intent: 'pi_1', payment_status: 'paid', metadata: meta, ...over } } });
const send = () => POST(new Request('http://x', { method: 'POST', body: '{}', headers: { 'stripe-signature': 'sig' } }) as any);
const bookingUpdate = () => h.calls.find((c) => c.table === 'bookings' && c.op === 'update')?.args[0] as any;
const recordUpdate = () => h.calls.find((c) => c.table === 'commission_records' && c.op === 'update');
const open = (over: any = {}) => ({ id: 'b1', booking_ref: 'DS-1', status: 'pending', payment_status: 'pending', commission_status: 'pending', ...over });

beforeEach(() => {
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://sb');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'key');
  h.calls.length = 0;
  h.bySession = { data: open(), error: null };
  h.byId = { data: null, error: null };
  h.result = { data: null, error: null };
  h.results = [];
  h.reread = { data: null, error: null };
  h.recordResult = { error: null };
  h.sendBookingEmails.mockClear();
  h.sendEmail.mockClear();
  h.availabilityFor.mockReset().mockResolvedValue({});
  h.constructEvent.mockReset().mockReturnValue(event());
  vi.spyOn(console, 'log').mockImplementation(() => {});
  o.result = 'none';
  o.calls.length = 0;
});

describe('POST /api/webhooks/stripe', () => {
  it('marks only a not-yet-paid booking paid and sends the alerts once', async () => {
    h.result = { data: { id: 'b1', booking_ref: 'DS-1' }, error: null };
    const res = await send();
    expect(res.status).toBe(200);
    expect(bookingUpdate()).toMatchObject({ payment_status: 'paid', paid_amount: 4500, status: 'confirmed', stripe_payment_intent: 'pi_1' });
    expect(h.calls).toContainEqual({ table: 'bookings', op: 'eq', args: ['stripe_session_id', 'cs_1'] });
    expect(h.calls).toContainEqual({ table: 'bookings', op: 'eq', args: ['id', 'b1'] });
    expect(h.calls).toContainEqual({ table: 'bookings', op: 'or', args: ['payment_status.is.null,payment_status.neq.paid'] });
    expect(h.sendBookingEmails).toHaveBeenCalledWith('b1', 'confirmed');
    expect(h.sendEmail).not.toHaveBeenCalled();
  });

  it('records an online platform payment and waives the commission', async () => {
    h.result = { data: { id: 'b1', booking_ref: 'DS-1' }, error: null };
    await send();
    expect(bookingUpdate()).toMatchObject({ payment_method: 'online', collected_by: 'platform', payment_channel: 'stripe', commission_status: 'not_applicable' });
    expect(bookingUpdate()).not.toHaveProperty('stripe_session_id');
    expect(recordUpdate()?.args).toEqual([{ status: 'waived' }]);
    expect(h.calls).toContainEqual({ table: 'commission_records', op: 'eq', args: ['booking_id', 'b1'] });
    expect(h.calls).toContainEqual({ table: 'commission_records', op: 'in', args: ['status', ['pending', 'due', 'overdue']] });
  });

  it('leaves a settled commission status alone', async () => {
    for (const settled of ['paid', 'waived', 'disputed']) {
      h.calls.length = 0;
      h.bySession = { data: open({ commission_status: settled }), error: null };
      h.result = { data: { id: 'b1', booking_ref: 'DS-1' }, error: null };
      await send();
      expect(bookingUpdate()).not.toHaveProperty('commission_status');
      expect(bookingUpdate()).toMatchObject({ payment_method: 'online', collected_by: 'platform' });
    }
  });

  it('only logs when waiving commission records fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.result = { data: { id: 'b1', booking_ref: 'DS-1' }, error: null };
    h.recordResult = { error: { message: 'db' } };
    const res = await send();
    expect(res.status).toBe(200);
    expect(h.sendBookingEmails).toHaveBeenCalledWith('b1', 'confirmed');
    spy.mockRestore();
  });

  it('falls back to the metadata booking id when no booking has this session', async () => {
    h.bySession = { data: null, error: null };
    h.byId = { data: open(), error: null };
    h.result = { data: { id: 'b1', booking_ref: 'DS-1' }, error: null };
    const res = await send();
    expect(res.status).toBe(200);
    expect(bookingUpdate()).toMatchObject({ payment_status: 'paid', status: 'confirmed', stripe_session_id: 'cs_1' });
    expect(h.calls).toContainEqual({ table: 'bookings', op: 'eq', args: ['id', 'b1'] });
    expect(h.sendBookingEmails).toHaveBeenCalledWith('b1', 'confirmed');
  });

  it('does nothing when neither the session nor the metadata finds a booking', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.bySession = { data: null, error: null };
    h.constructEvent.mockReturnValue(event({}));
    const res = await send();
    expect(res.status).toBe(200);
    expect(bookingUpdate()).toBeUndefined();
    expect(h.sendBookingEmails).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('keeps a cancelled booking cancelled, records the money and emails the owner only', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.bySession = { data: open({ status: 'cancelled', commission_status: 'waived' }), error: null };
    h.result = { data: { id: 'b1', booking_ref: 'DS-1', status: 'cancelled' }, error: null };
    await send();
    const u = bookingUpdate();
    expect(u).toMatchObject({ payment_status: 'paid', paid_amount: 4500, stripe_payment_intent: 'pi_1', transaction_id: 'pi_1' });
    expect(u).not.toHaveProperty('status');
    expect(u).not.toHaveProperty('commission_status');
    expect(u).not.toHaveProperty('payment_method');
    expect(h.sendBookingEmails).not.toHaveBeenCalled();
    expect(recordUpdate()).toBeUndefined();
    expect(h.sendEmail).toHaveBeenCalledTimes(1);
    expect(h.sendEmail.mock.calls[0][0]).toMatchObject({ to: 'owner@x', subject: 'Payment received for cancelled booking DS-1 — refund needed in Stripe' });
    spy.mockRestore();
  });

  it('keeps a failed booking (lost the last room) failed, records the money and emails the owner only', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.bySession = { data: open({ status: 'failed' }), error: null };
    h.result = { data: { id: 'b1', booking_ref: 'DS-1', status: 'failed' }, error: null };
    await send();
    const u = bookingUpdate();
    expect(u).toMatchObject({ payment_status: 'paid', paid_amount: 4500, stripe_payment_intent: 'pi_1' });
    expect(u).not.toHaveProperty('status');
    expect(u).not.toHaveProperty('payment_method');
    expect(u).not.toHaveProperty('commission_status');
    expect(h.sendBookingEmails).not.toHaveBeenCalled();
    expect(recordUpdate()).toBeUndefined();
    expect(h.sendEmail).toHaveBeenCalledTimes(1);
    expect(h.sendEmail.mock.calls[0][0]).toMatchObject({ to: 'owner@x', subject: 'Payment received for failed booking DS-1 — refund needed in Stripe' });
    spy.mockRestore();
  });

  it('a retried event for an already-paid booking updates nothing and sends nothing', async () => {
    h.result = { data: null, error: null };
    const res = await send();
    expect(res.status).toBe(200);
    expect(h.sendBookingEmails).not.toHaveBeenCalled();
    expect(h.sendEmail).not.toHaveBeenCalled();
    expect(recordUpdate()).toBeUndefined();
  });

  it('returns 500 so Stripe retries when the update fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.result = { data: null, error: { message: 'db down' } };
    const res = await send();
    expect(res.status).toBe(500);
    expect(h.sendBookingEmails).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('returns 500 when the booking lookup fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.bySession = { data: null, error: { message: 'db down' } };
    expect((await send()).status).toBe(500);
    expect(bookingUpdate()).toBeUndefined();
    spy.mockRestore();
  });

  it('ties the offer code to the paid booking', async () => {
    h.result = { data: { id: 'b1', booking_ref: 'DS-1' }, error: null };
    o.result = 'attached';
    await send();
    expect(o.calls).toEqual(['b1']);
    expect(h.sendEmail).not.toHaveBeenCalled();
  });

  it('emails the owner when a paid booking\'s offer code was used elsewhere', async () => {
    h.result = { data: { id: 'b1', booking_ref: 'DS-1' }, error: null };
    o.result = 'conflict';
    const res = await send();
    expect(res.status).toBe(200);
    expect(h.sendEmail).toHaveBeenCalledTimes(1);
    expect(h.sendEmail.mock.calls[0][0]).toMatchObject({ to: 'owner@x', subject: 'Offer code conflict on paid booking DS-1' });
  });

  it('emails the owner when the offer code check itself fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.result = { data: { id: 'b1', booking_ref: 'DS-1' }, error: null };
    o.result = 'throw';
    const res = await send();
    expect(res.status).toBe(200);
    expect(h.sendEmail).toHaveBeenCalledTimes(1);
    expect(h.sendEmail.mock.calls[0][0]).toMatchObject({ to: 'owner@x', subject: 'Offer code check failed for paid booking DS-1' });
    expect(h.sendEmail.mock.calls[0][0].html).toContain('check the code in Admin → Offers');
    spy.mockRestore();
  });

  it('does not touch offer codes for a cancelled booking', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.bySession = { data: open({ status: 'cancelled', commission_status: 'waived' }), error: null };
    h.result = { data: { id: 'b1', booking_ref: 'DS-1', status: 'cancelled' }, error: null };
    await send();
    expect(o.calls).toEqual([]);
    spy.mockRestore();
  });

  it('does not touch offer codes for a failed booking (lost the last room)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.bySession = { data: open({ status: 'failed' }), error: null };
    h.result = { data: { id: 'b1', booking_ref: 'DS-1', status: 'failed' }, error: null };
    await send();
    expect(o.calls).toEqual([]);
    spy.mockRestore();
  });

  it('a retried event for an already-paid booking does not re-attach the offer code', async () => {
    h.result = { data: null, error: null };
    await send();
    expect(o.calls).toEqual([]);
  });

  it('rejects a bad signature', async () => {
    h.constructEvent.mockImplementation(() => { throw new Error('bad sig'); });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await send()).status).toBe(400);
    expect(h.calls).toHaveLength(0);
  });

  it('only confirms a booking that is not cancelled or failed at the moment of the update', async () => {
    h.result = { data: { id: 'b1', booking_ref: 'DS-1' }, error: null };
    await send();
    expect(h.calls).toContainEqual({ table: 'bookings', op: 'not', args: ['status', 'in', '(cancelled,failed)'] });
  });

  it('does not confirm a session that is not paid yet (delayed payment methods)', async () => {
    h.constructEvent.mockReturnValue(event(undefined, { payment_status: 'unpaid' }));
    const res = await send();
    expect(res.status).toBe(200);
    expect(bookingUpdate()).toBeUndefined();
    expect(h.sendBookingEmails).not.toHaveBeenCalled();
  });

  it('confirms a delayed payment when checkout.session.async_payment_succeeded arrives', async () => {
    h.constructEvent.mockReturnValue(event(undefined, {}, 'checkout.session.async_payment_succeeded'));
    h.result = { data: { id: 'b1', booking_ref: 'DS-1' }, error: null };
    await send();
    expect(bookingUpdate()).toMatchObject({ payment_status: 'paid', status: 'confirmed' });
    expect(h.sendBookingEmails).toHaveBeenCalledWith('b1', 'confirmed');
  });

  it('only logs checkout.session.async_payment_failed', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.constructEvent.mockReturnValue(event(undefined, { payment_status: 'unpaid' }, 'checkout.session.async_payment_failed'));
    const res = await send();
    expect(res.status).toBe(200);
    expect(h.calls).toHaveLength(0);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('emails the owner when a second, different payment arrives for an already-paid booking', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.reread = { data: open({ payment_status: 'paid', status: 'confirmed', stripe_payment_intent: 'pi_0' }), error: null };
    const res = await send();
    expect(res.status).toBe(200);
    expect(h.sendBookingEmails).not.toHaveBeenCalled();
    expect(h.sendEmail).toHaveBeenCalledTimes(1);
    expect(h.sendEmail.mock.calls[0][0]).toMatchObject({ to: 'owner@x', subject: 'Second payment received for DS-1 – refund one in Stripe' });
    expect(h.sendEmail.mock.calls[0][0].html).toContain('pi_1');
    expect(h.sendEmail.mock.calls[0][0].html).toContain('pi_0');
    spy.mockRestore();
  });

  it('stays silent when Stripe redelivers the event that already paid the booking', async () => {
    h.reread = { data: open({ payment_status: 'paid', status: 'confirmed', stripe_payment_intent: 'pi_1' }), error: null };
    await send();
    expect(h.sendEmail).not.toHaveBeenCalled();
    expect(h.sendBookingEmails).not.toHaveBeenCalled();
  });

  it('stays silent when the payment was already recorded under transaction_id or payment_reference', async () => {
    h.reread = { data: open({ payment_status: 'paid', status: 'confirmed', stripe_payment_intent: null, transaction_id: 'pi_1' }), error: null };
    await send();
    h.reread = { data: open({ payment_status: 'paid', status: 'confirmed', stripe_payment_intent: 'pi_0', payment_reference: 'pi_1' }), error: null };
    await send();
    expect(h.sendEmail).not.toHaveBeenCalled();
    const reread = h.calls.find((c) => c.op === 'select' && String(c.args[0]).includes('stripe_payment_intent'));
    expect(String(reread?.args[0])).toContain('transaction_id');
    expect(String(reread?.args[0])).toContain('payment_reference');
  });

  it('uses softer wording when the booking was marked paid by hand (no payment intent stored)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.reread = { data: open({ payment_status: 'paid', status: 'confirmed', stripe_payment_intent: null, transaction_id: 'UPI-77', payment_reference: null }), error: null };
    await send();
    expect(h.sendEmail).toHaveBeenCalledTimes(1);
    expect(h.sendEmail.mock.calls[0][0].subject).toBe('Possible second payment for DS-1 – check Stripe before refunding; it may be the payment already recorded by hand');
    spy.mockRestore();
  });

  it('a booking cancelled while the payment was processed keeps its status, records the money and asks for a refund', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.results = [{ data: null, error: null }, { data: { id: 'b1', booking_ref: 'DS-1', status: 'cancelled' }, error: null }];
    h.reread = { data: open({ status: 'cancelled' }), error: null };
    await send();
    const updates = h.calls.filter((c) => c.table === 'bookings' && c.op === 'update').map((c) => c.args[0] as any);
    expect(updates).toHaveLength(2);
    expect(updates[1]).toMatchObject({ payment_status: 'paid', paid_amount: 4500, stripe_payment_intent: 'pi_1' });
    expect(updates[1]).not.toHaveProperty('status');
    expect(updates[1]).not.toHaveProperty('payment_method');
    expect(h.sendBookingEmails).not.toHaveBeenCalled();
    expect(h.sendEmail).toHaveBeenCalledTimes(1);
    expect(h.sendEmail.mock.calls[0][0]).toMatchObject({ subject: 'Payment received for cancelled booking DS-1 — refund needed in Stripe' });
    spy.mockRestore();
  });

  describe('overbooking alert', () => {
    const hotel = { id: 'b1', booking_ref: 'DS-1', category: 'hotel', property_id: 'p1', room_key: 'deluxe', room_name: 'Deluxe', check_in: '2026-11-01', check_out: '2026-11-03' };
    beforeEach(() => { h.result = { data: hotel, error: null }; });
    const alerts = () => h.sendEmail.mock.calls.filter((c) => String(c[0].subject).startsWith('Possible overbooking'));

    it('emails the owner when the paid room is oversold', async () => {
      h.availabilityFor.mockResolvedValue({ deluxe: { tracked: true, left: -1 } });
      const res = await send();
      expect(res.status).toBe(200);
      expect(bookingUpdate()).toMatchObject({ payment_status: 'paid' });
      expect(alerts()).toHaveLength(1);
      expect(alerts()[0][0]).toMatchObject({ to: 'owner@x', subject: 'Possible overbooking: DS-1' });
      expect(h.availabilityFor.mock.calls[0].slice(0, 3)).toEqual(['p1', '2026-11-01', '2026-11-03']);
    });
    it('sends no alert when no room is over', async () => {
      h.availabilityFor.mockResolvedValue({ deluxe: { tracked: true, left: 0 } });
      expect((await send()).status).toBe(200);
      expect(alerts()).toHaveLength(0);
    });
    it('sends no alert for an untracked room', async () => {
      h.availabilityFor.mockResolvedValue({ deluxe: { tracked: false, left: null } });
      expect((await send()).status).toBe(200);
      expect(alerts()).toHaveLength(0);
    });
    it('still answers 200 with no alert when the availability check throws', async () => {
      h.availabilityFor.mockRejectedValue(new Error('db down'));
      const err = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect((await send()).status).toBe(200);
      expect(alerts()).toHaveLength(0);
      err.mockRestore();
    });
    it('does not check availability for a non-hotel booking', async () => {
      h.result = { data: { ...hotel, category: 'taxi' }, error: null };
      expect((await send()).status).toBe(200);
      expect(h.availabilityFor).not.toHaveBeenCalled();
    });
  });
});
