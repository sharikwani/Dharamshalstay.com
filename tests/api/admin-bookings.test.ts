import { describe, it, expect, vi, beforeEach } from 'vitest';

let role = 'admin';
let fixtures: Record<string, any> = {};
let insertError: any = null;
const inserts: any[] = [];
let updateError: any = null;
let listError: any = null;
let recordInsertError: any = null;
const updates: any[] = [];
let requestLookups: any[] = [];
const recordOps: any[] = [];
const sendManualBookingEmails = vi.fn(async (..._a: unknown[]) => {});
const sendCancellationEmails = vi.fn(async (..._a: unknown[]) => {});
const sendReassignedAwayEmail = vi.fn(async (..._a: unknown[]) => {});
const whatsappNewBooking = vi.fn(async (..._a: unknown[]) => {});
const whatsappCancelled = vi.fn(async (..._a: unknown[]) => {});
const whatsappReassignedAway = vi.fn(async (..._a: unknown[]) => {});
const loadBookingView = vi.fn(async (id: string) => ({ id, item_name: 'x' }));

function builder(table: string) {
  let inserting = false;
  let byRequestId = false;
  const b: any = {
    select: () => b, eq: (col: string) => { if (col === 'client_request_id') byRequestId = true; return b; }, in: () => b,
    // List query (WhatsApp messages): sort the fixture rows the way the database would.
    order: (col: string, opts: { ascending?: boolean } = {}) => {
      const rows = [...(fixtures[table + '_list'] || [])].sort((x: any, y: any) =>
        (x[col] < y[col] ? -1 : x[col] > y[col] ? 1 : 0) * (opts.ascending === false ? -1 : 1));
      return { then: (res: any) => res(listError ? { data: null, error: listError } : { data: rows, error: null }) };
    },
    update: (row: any) => {
      if (table === 'commission_records') {
        recordOps.push({ op: 'update', row });
        const c: any = { eq: () => c, in: () => c, then: (res: any) => res({ error: null }) };
        return c;
      }
      updates.push({ table, row });
      // Plain updates are awaited after .eq(); the cancel update adds .neq() and reads back the changed rows.
      const u: any = { eq: () => u, neq: () => u, or: () => u, select: async () => ({ data: updateError ? null : [{ id: 'b1' }], error: updateError }), then: (res: any) => res({ error: updateError }) };
      return u;
    },
    delete: () => { recordOps.push({ op: 'delete' }); const c: any = { eq: () => c, in: () => c, then: (res: any) => res({ error: null }) }; return c; },
    limit: () => b,
    insert: (row: any) => {
      if (table === 'commission_records') { recordOps.push({ op: 'insert', row }); return { then: (res: any) => res({ error: recordInsertError }) }; }
      inserting = true; inserts.push({ table, row }); return b;
    },
    // Lookups by form request id answer from their own queue (the pre-insert check, then the 23505 re-read).
    maybeSingle: async () => (byRequestId ? { data: requestLookups.shift() ?? null, error: null } : { data: fixtures[table] ?? null, error: null }),
    single: async () => inserting
      ? (insertError ? { data: null, error: insertError } : { data: { id: 'b1', booking_ref: 'TRK-1' }, error: null })
      : { data: fixtures[table] ?? null, error: null },
  };
  return b;
}
const sb = { from: (t: string) => builder(t) };

vi.mock('@/lib/server-auth', async (orig) => {
  const actual = await orig<typeof import('@/lib/server-auth')>();
  return {
    ...actual,
    serviceClient: () => sb,
    requireCaller: async (_req: Request, roles?: string[]) => {
      if (roles && !roles.includes(role)) throw new actual.HttpError(403, 'You do not have access to this');
      return { user: {}, profile: { id: 'admin1', role } };
    },
  };
});
vi.mock('@/lib/manual-booking-emails', () => ({
  sendManualBookingEmails: (...a: unknown[]) => sendManualBookingEmails(...a),
  sendCancellationEmails: (...a: unknown[]) => sendCancellationEmails(...a),
  sendReassignedAwayEmail: (...a: unknown[]) => sendReassignedAwayEmail(...a),
  loadBookingView: (id: string) => loadBookingView(id),
}));

vi.mock('@/lib/booking-whatsapp', () => ({
  whatsappNewBooking: (...a: unknown[]) => whatsappNewBooking(...a),
  whatsappCancelled: (...a: unknown[]) => whatsappCancelled(...a),
  whatsappReassignedAway: (...a: unknown[]) => whatsappReassignedAway(...a),
}));

// The confirm path itself is tested in tests/bookings/confirm.test.ts.
const confirmBooking = vi.fn(async (..._a: unknown[]): Promise<any> => ({ ok: true, already: false }));
vi.mock('@/lib/bookings/confirm', () => ({ confirmBooking: (...a: unknown[]) => confirmBooking(...a) }));

// Cancelling releases any WhatsApp offer code; that store is not under test here.
const offer = vi.hoisted(() => ({ result: 'none' as string, calls: [] as string[], emails: [] as any[] }));
vi.mock('@/lib/offers/store', () => ({
  releaseForBooking: async () => {},
  attachPaidOffer: async (id: string) => { offer.calls.push(id); if (offer.result === 'throw') throw new Error('db down'); return offer.result; },
}));
vi.mock('@/lib/email', () => ({ adminEmail: () => 'owner@x', sendEmail: async (m: any) => { offer.emails.push(m); } }));

// Notices run after the response (waitUntil); tests wait for them so assertions stay deterministic.
const bg = vi.hoisted(() => ({ waited: [] as Promise<unknown>[] }));
vi.mock('@vercel/functions', () => ({ waitUntil: (p: Promise<unknown>) => { bg.waited.push(p); } }));
const settle = async () => { while (bg.waited.length) await bg.waited.shift(); };

import { POST } from '@/app/api/admin/bookings/route';
import { GET, PATCH } from '@/app/api/admin/bookings/[id]/route';

const base = {
  category: 'trek', item_id: '11111111-1111-4111-8111-111111111111', activity_date: '2099-01-10',
  num_guests: 3, guest_name: 'Asha Rao', guest_phone: '9876543210', guest_email: 'a@x.com',
  payment: { choice: 'partner_collects' },
  partner_id: '22222222-2222-4222-8222-222222222222',
};
const RID_ADMIN = '66666666-6666-4666-8666-666666666666';
/** The row an earlier submit of `base` saved. */
const earlierAdminRow = (over: Record<string, any> = {}) => ({
  id: 'b0', booking_ref: 'TRK-0', amount: 4500, payment_method: 'offline', status: 'confirmed', guest_phone: '9876543210',
  category: 'trek', property_id: null, taxi_route_id: null, trek_id: '11111111-1111-4111-8111-111111111111', paragliding_id: null, guide_id: null,
  check_in: null, check_out: null, activity_date: '2099-01-10', room_name: null, num_guests: 3, ...over,
});
const post = async (body: unknown) => { const r = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify(body) })); await settle(); return r; };

beforeEach(() => {
  bg.waited.length = 0;
  requestLookups = [];
  role = 'admin'; insertError = null; updateError = null; listError = null; recordInsertError = null; inserts.length = 0; updates.length = 0; recordOps.length = 0;
  sendManualBookingEmails.mockClear(); sendCancellationEmails.mockClear(); sendReassignedAwayEmail.mockClear();
  whatsappNewBooking.mockClear(); whatsappCancelled.mockClear(); whatsappReassignedAway.mockClear();
  fixtures = {
    treks: { id: 't1', status: 'published', price_per_person: 1500, commission_pct: null },
    profiles: { id: 'p1', role: 'partner', partner_type: 'trek', partner_status: 'verified', commission_pct: 20 },
    bookings: { id: 'b1', category: 'trek', status: 'confirmed', amount: 4500, commission_status: 'pending', commission_pct: 20, partner_id: null },
  };
});

describe('POST /api/admin/bookings', () => {
  it('rejects a non-admin with 403', async () => {
    role = 'partner';
    expect((await post(base)).status).toBe(403);
  });

  it('creates a trek booking with server-side pricing and commission', async () => {
    const res = await post(base);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 'b1', booking_ref: 'TRK-1' });
    const row = inserts[0].row;
    expect(inserts[0].table).toBe('bookings');
    expect(row).toMatchObject({
      amount: 4500, list_amount: 4500, price_overridden: false, commission_pct: 20, commission_amount: 900,
      partner_share_amount: 3600, booking_source: 'admin', status: 'confirmed', partner_id: 'p1', created_by: 'admin1',
      collected_by: 'partner',
    });
    expect(sendManualBookingEmails).toHaveBeenCalledWith('b1', { customer: true, partner: true });
  });

  describe('hotel room_key', () => {
    const hotel = (room_name?: string) => ({
      category: 'hotel', item_id: '33333333-3333-4333-8333-333333333333', check_in: '2099-01-10', check_out: '2099-01-12',
      num_guests: 2, guest_name: 'Asha Rao', guest_phone: '9876543210', payment: { choice: 'unpaid' }, final_amount: 6000,
      ...(room_name ? { room_name, plan_name: 'Breakfast' } : {}),
    });
    beforeEach(() => {
      fixtures.properties = { id: 'h1', status: 'published', commission_pct: null, rooms: [
        { name: 'Deluxe', base_price: 3000, total_inventory: 1, is_active: true },
        { name: 'Suite', base_price: 5000, is_active: true },
      ] };
    });
    it('is the room type when the name matches exactly (tracked or not), without an availability check', async () => {
      expect((await post(hotel('Deluxe'))).status).toBe(200);
      expect(inserts[0].row).toMatchObject({ room_name: 'Deluxe - Breakfast', room_key: 'Deluxe' });
      expect((await post(hotel('Suite'))).status).toBe(200);
      expect(inserts[1].row.room_key).toBe('Suite');
    });
    it('is null when the name matches no room type or no room is given', async () => {
      expect((await post(hotel('deluxe'))).status).toBe(200);
      expect(inserts[0].row.room_key).toBeNull();
      expect((await post(hotel())).status).toBe(200);
      expect(inserts[1].row.room_key).toBeNull();
    });
  });

  it('passes notify_partner to the WhatsApp alert so partners are not alerted when it is off', async () => {
    await post({ ...base, notify_partner: false, notify_customer_whatsapp: true });
    expect(whatsappNewBooking).toHaveBeenCalledWith('b1', { customer: true, partners: false });
    whatsappNewBooking.mockClear();
    await post({ ...base, notify_partner: false });
    expect(whatsappNewBooking).not.toHaveBeenCalled();
    await post(base);
    expect(whatsappNewBooking).toHaveBeenCalledWith('b1', { customer: false, partners: true });
  });

  it('records a price override', async () => {
    const res = await post({ ...base, final_amount: 4000, price_override_reason: 'group' });
    expect(res.status).toBe(200);
    expect(inserts[0].row).toMatchObject({ amount: 4000, list_amount: 4500, price_overridden: true, commission_amount: 800 });
  });

  it('rejects an unverified partner', async () => {
    fixtures.profiles = { ...fixtures.profiles, partner_status: 'pending_verification' };
    const res = await post(base);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/approved/);
    expect(inserts).toHaveLength(0);
  });

  it("rejects a driver of another partner", async () => {
    fixtures.partner_staff = { id: 's1', partner_id: 'other', role: 'guide', active: true };
    const res = await post({ ...base, staff_id: '33333333-3333-4333-8333-333333333333' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/does not belong/);
  });

  it('requires a price for a custom taxi trip', async () => {
    const res = await post({ category: 'taxi', item_id: null, activity_date: '2099-01-10', pickup_location: 'A', drop_location: 'B',
      num_guests: 2, guest_name: 'Asha Rao', guest_phone: '9876543210', payment: { choice: 'unpaid' } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Enter the price for a custom trip.');
  });

  it('rejects a past date unless allowed', async () => {
    const past = { ...base, activity_date: '2020-01-01' };
    const res = await post(past);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/past/);
    expect((await post({ ...past, allow_past_date: true })).status).toBe(200);
  });

  it('returns 500 and sends no email when the insert fails', async () => {
    insertError = { message: 'db down' };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await post(base);
    expect(res.status).toBe(500);
    expect(sendManualBookingEmails).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('stores the form request id and answers a repeated submit with the booking it already made, sending nothing', async () => {
    const rid = '55555555-5555-4555-8555-555555555555';
    insertError = { code: '23505', message: 'duplicate key value violates unique constraint "uq_bookings_client_request_id"' };
    requestLookups = [null, earlierAdminRow()];
    const res = await post({ ...base, client_request_id: rid });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 'b0', booking_ref: 'TRK-0', duplicate: true });
    expect(inserts[0].row.client_request_id).toBe(rid);
    expect(sendManualBookingEmails).not.toHaveBeenCalled();
    expect(whatsappNewBooking).not.toHaveBeenCalled();
  });

  it('a repeated submit found before saving returns that booking without inserting again', async () => {
    requestLookups = [earlierAdminRow()];
    const res = await post({ ...base, client_request_id: RID_ADMIN });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 'b0', booking_ref: 'TRK-0', duplicate: true });
    expect(inserts).toEqual([]);
    expect(sendManualBookingEmails).not.toHaveBeenCalled();
  });

  it('the same form id with different details is refused and points the admin to the bookings list', async () => {
    for (const over of [{ guest_phone: '9000000000' }, { activity_date: '2099-01-11' }, { num_guests: 4 }]) {
      requestLookups = [earlierAdminRow(over)];
      const res = await post({ ...base, client_request_id: RID_ADMIN });
      expect(res.status).toBe(409);
      expect((await res.json()).error).toMatch(/TRK-0.*bookings list/);
    }
    expect(inserts).toEqual([]);
  });

  it('the same form id whose booking was cancelled is refused', async () => {
    requestLookups = [earlierAdminRow({ status: 'cancelled' })];
    const res = await post({ ...base, client_request_id: RID_ADMIN });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/TRK-0.*cancelled/);
    expect(inserts).toEqual([]);
  });

  it('a concurrent duplicate with different details is refused, not returned', async () => {
    insertError = { code: '23505', message: 'duplicate key' };
    requestLookups = [null, earlierAdminRow({ num_guests: 5 })];
    const res = await post({ ...base, client_request_id: RID_ADMIN });
    expect(res.status).toBe(409);
    expect(sendManualBookingEmails).not.toHaveBeenCalled();
  });

  it('leaves the request id out when the form sends none', async () => {
    await post(base);
    expect(inserts[0].row).not.toHaveProperty('client_request_id');
  });

  it('sends the notices after the response, and a failing notice never fails the saved booking', async () => {
    sendManualBookingEmails.mockImplementationOnce(async () => { throw new Error('smtp down'); });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify(base) }));
    expect(res.status).toBe(200);
    expect(bg.waited).toHaveLength(1);
    await settle();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('rejects an unpublished item', async () => {
    fixtures.treks = { ...fixtures.treks, status: 'draft' };
    const res = await post(base);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('This item is not available for booking.');
    expect(inserts).toHaveLength(0);
  });

  it('requires a price when the catalogue price is 0', async () => {
    fixtures.treks = { ...fixtures.treks, price_per_person: 0 };
    const res = await post(base);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Enter the price for this booking.');
    expect((await post({ ...base, final_amount: 3000 })).status).toBe(200);
  });
});

const ID = '44444444-4444-4444-8444-444444444444';
const ctx = { params: { id: ID } };
const patch = (body: unknown) => PATCH(new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) }), ctx);

describe('GET/PATCH /api/admin/bookings/:id', () => {
  it('GET returns the booking view, 404 when missing, 403 for non-admin', async () => {
    const res = await GET(new Request('http://x'), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      booking: { id: ID, item_name: 'x', partner_response: null, partner_responded_at: null },
      whatsapp_messages: [],
    });
    loadBookingView.mockResolvedValueOnce(null as any);
    expect((await GET(new Request('http://x'), ctx)).status).toBe(404);
    role = 'partner';
    expect((await GET(new Request('http://x'), ctx)).status).toBe(403);
  });

  it('GET returns the partner response and WhatsApp messages newest first with masked numbers', async () => {
    loadBookingView.mockResolvedValueOnce({ id: ID, item_name: 'x', partner_response: 'accepted', partner_responded_at: '2026-10-10T10:00:00Z' } as any);
    const row = (id: string, created_at: string, status: string) => ({
      id, recipient_kind: 'partner', to_phone: '919816001234', template: 'booking_new_partner', status, error: null, created_at,
    });
    fixtures.whatsapp_messages_list = [row('m1', '2026-10-10T09:00:00Z', 'read'), row('m3', '2026-10-10T11:00:00Z', 'sent'), row('m2', '2026-10-10T10:00:00Z', 'failed')];
    const res = await GET(new Request('http://x'), ctx);
    const body = await res.json();
    expect(body.booking).toEqual({ id: ID, item_name: 'x', partner_response: 'accepted', partner_responded_at: '2026-10-10T10:00:00Z' });
    expect(body.whatsapp_messages.map((m: any) => m.id)).toEqual(['m3', 'm2', 'm1']);
    expect(body.whatsapp_messages[0]).toEqual({
      id: 'm3', recipient_kind: 'partner', to_last4: '1234', template: 'booking_new_partner', status: 'sent', error: null, created_at: '2026-10-10T11:00:00Z',
    });
    expect(JSON.stringify(body)).not.toContain('919816001234');
  });

  it('GET still returns the booking and logs when the messages query fails', async () => {
    listError = { message: 'db down' };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await GET(new Request('http://x'), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ booking: { id: ID, item_name: 'x', partner_response: null, partner_responded_at: null }, whatsapp_messages: [] });
    expect(spy).toHaveBeenCalledWith('Could not load WhatsApp messages:', listError);
    spy.mockRestore();
  });

  it('rejects a non-admin PATCH with 403', async () => {
    role = 'partner';
    expect((await patch({ action: 'cancel', reason: 'because' })).status).toBe(403);
  });

  it('assign rejects a driver of another partner', async () => {
    fixtures.partner_staff = { id: 's1', partner_id: 'other', role: 'guide', active: true };
    const res = await patch({ action: 'assign', partner_id: '22222222-2222-4222-8222-222222222222', staff_id: '33333333-3333-4333-8333-333333333333' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/does not belong/);
    expect(updates).toHaveLength(0);
  });

  it('assign recomputes commission from the new partner and emails with Updated prefix', async () => {
    fixtures.profiles = { ...fixtures.profiles, commission_pct: 10 };
    const res = await patch({ action: 'assign', partner_id: '22222222-2222-4222-8222-222222222222' });
    expect(res.status).toBe(200);
    expect(updates[0].row).toMatchObject({ partner_id: 'p1', staff_id: null, vehicle_id: null, commission_pct: 10, commission_amount: 450, partner_share_amount: 4050 });
    expect(sendManualBookingEmails).toHaveBeenCalledWith(ID, { customer: false, partner: true, subjectPrefix: 'Updated: ' });
  });

  it('assign on a hotel booking is rejected', async () => {
    fixtures.bookings = { ...fixtures.bookings, category: 'hotel' };
    const res = await patch({ action: 'assign', partner_id: '22222222-2222-4222-8222-222222222222' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Hotel and local guide bookings cannot be reassigned here.');
  });

  it('payment platform_paid via upi marks it paid to the platform', async () => {
    const res = await patch({ action: 'payment', choice: 'platform_paid', channel: 'upi', reference: 'U1' });
    expect(res.status).toBe(200);
    expect(updates[0].row).toMatchObject({ payment_status: 'paid', collected_by: 'platform', payment_channel: 'upi', paid_amount: 4500 });
  });

  it('assign that keeps the same partner, person and vehicle sends no notices', async () => {
    fixtures.bookings = { ...fixtures.bookings, partner_id: 'p1', staff_id: null, vehicle_id: null };
    const res = await patch({ action: 'assign', partner_id: '22222222-2222-4222-8222-222222222222' });
    expect(res.status).toBe(200);
    expect(sendManualBookingEmails).not.toHaveBeenCalled();
    expect(whatsappNewBooking).not.toHaveBeenCalled();
    expect(whatsappReassignedAway).not.toHaveBeenCalled();
    expect(sendReassignedAwayEmail).not.toHaveBeenCalled();
  });

  it('payment that changes nothing sends no Updated email, a real change does', async () => {
    const paid = { payment_method: 'offline', payment_status: 'paid', collected_by: 'platform', commission_status: 'not_applicable', paid_amount: 4500, payment_channel: 'upi', payment_reference: 'U1' };
    fixtures.bookings = { ...fixtures.bookings, ...paid };
    expect((await patch({ action: 'payment', choice: 'platform_paid', channel: 'upi', reference: 'U1', notify: true })).status).toBe(200);
    expect(sendManualBookingEmails).not.toHaveBeenCalled();
    await patch({ action: 'payment', choice: 'platform_paid', channel: 'upi', reference: 'U2', notify: true });
    expect(sendManualBookingEmails).toHaveBeenCalledWith(ID, { customer: true, partner: false, subjectPrefix: 'Updated: ' });
  });

  it('payment that changes nothing compares numbers as numbers (database "4500.00" equals 4500)', async () => {
    fixtures.bookings = { ...fixtures.bookings, payment_method: 'offline', payment_status: 'paid', collected_by: 'platform', commission_status: 'not_applicable', paid_amount: '4500.00', payment_channel: 'upi', payment_reference: null };
    await patch({ action: 'payment', choice: 'platform_paid', channel: 'upi', notify: true });
    expect(sendManualBookingEmails).not.toHaveBeenCalled();
  });

  it('payment platform_paid on an offer booking ties the offer code back, or emails the owner', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    Object.assign(offer, { result: 'attached', calls: [], emails: [] });
    fixtures.bookings = { ...fixtures.bookings, category: 'hotel', booking_ref: 'HTL-5', offer_code: 'PNV-7K3Q9' };
    expect((await patch({ action: 'payment', choice: 'platform_paid', channel: 'upi' })).status).toBe(200);
    expect(offer.calls).toEqual(['44444444-4444-4444-8444-444444444444']);
    expect(offer.emails).toEqual([]);
    offer.result = 'conflict';
    expect((await patch({ action: 'payment', choice: 'platform_paid', channel: 'upi' })).status).toBe(200);
    expect(offer.emails[0]).toMatchObject({ to: 'owner@x', subject: 'Offer code conflict on paid booking HTL-5' });
    offer.result = 'throw';
    expect((await patch({ action: 'payment', choice: 'platform_paid', channel: 'upi' })).status).toBe(200);
    expect(offer.emails[1]).toMatchObject({ subject: 'Offer code check failed for paid booking HTL-5' });
    spy.mockRestore();
  });

  it('payment without an offer code or not platform_paid leaves offer codes alone', async () => {
    Object.assign(offer, { result: 'attached', calls: [], emails: [] });
    await patch({ action: 'payment', choice: 'platform_paid', channel: 'upi' });
    fixtures.bookings = { ...fixtures.bookings, offer_code: 'PNV-7K3Q9' };
    await patch({ action: 'payment', choice: 'unpaid' });
    expect(offer.calls).toEqual([]);
  });

  it('cancel sets status, reason and waives commission, then emails', async () => {
    const res = await patch({ action: 'cancel', reason: 'Customer changed plans' });
    expect(res.status).toBe(200);
    expect(updates[0].row).toEqual({ status: 'cancelled', cancelled_reason: 'Customer changed plans', commission_status: 'waived' });
    expect(sendCancellationEmails).toHaveBeenCalledWith(ID, 'Customer changed plans');
  });

  it('cancel waives open commission records', async () => {
    await patch({ action: 'cancel', reason: 'Customer changed plans', notify: false });
    expect(recordOps).toEqual([{ op: 'update', row: { status: 'waived' } }]);
  });

  it('cancel leaves commission records alone when commission is paid', async () => {
    fixtures.bookings = { ...fixtures.bookings, commission_status: 'paid' };
    await patch({ action: 'cancel', reason: 'Customer changed plans', notify: false });
    expect(recordOps).toHaveLength(0);
  });

  it('assign updates open commission records', async () => {
    fixtures.profiles = { ...fixtures.profiles, commission_pct: 10 };
    fixtures.commission_records = { id: 'cr1' };
    await patch({ action: 'assign', partner_id: '22222222-2222-4222-8222-222222222222', notify: false });
    expect(recordOps).toEqual([{ op: 'update', row: { commission_amount: 450, commission_pct: 10 } }]);
  });

  it('payment platform_paid deletes pending commission records (not_applicable)', async () => {
    await patch({ action: 'payment', choice: 'platform_paid', channel: 'upi' });
    expect(recordOps).toEqual([{ op: 'delete' }]);
  });

  it('payment back to partner_collects inserts a commission record when none exists', async () => {
    fixtures.bookings = { ...fixtures.bookings, commission_amount: 900, partner_share_amount: 3600, property_id: null };
    await patch({ action: 'payment', choice: 'partner_collects' });
    expect(recordOps).toHaveLength(1);
    expect(recordOps[0].op).toBe('insert');
    expect(recordOps[0].row).toMatchObject({ booking_id: 'b1', provider_type: 'trek', booking_amount: 4500, commission_amount: 900, status: 'pending' });
  });

  it('a commission record added at the same moment elsewhere (unique booking_id) is not an error', async () => {
    fixtures.bookings = { ...fixtures.bookings, commission_amount: 900, partner_share_amount: 3600, property_id: null };
    recordInsertError = { code: '23505', message: 'duplicate key value violates unique constraint "uq_commission_records_booking"' };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await patch({ action: 'payment', choice: 'partner_collects' })).status).toBe(200);
    expect(spy).not.toHaveBeenCalled();
    recordInsertError = { code: '42P01', message: 'boom' };
    await patch({ action: 'payment', choice: 'partner_collects' });
    expect(spy).toHaveBeenCalledWith('Commission record insert failed:', recordInsertError);
    spy.mockRestore();
  });

  it('payment does not duplicate an existing commission record', async () => {
    fixtures.bookings = { ...fixtures.bookings, commission_amount: 900, partner_share_amount: 3600 };
    fixtures.commission_records = { id: 'cr1' };
    await patch({ action: 'payment', choice: 'partner_collects' });
    expect(recordOps).toHaveLength(0);
  });

  it('payment fills missing commission and partner share on a website booking', async () => {
    fixtures.bookings = { ...fixtures.bookings, commission_amount: null, partner_share_amount: null, commission_pct: 20 };
    await patch({ action: 'payment', choice: 'platform_paid', channel: 'upi' });
    expect(updates[0].row).toMatchObject({ commission_amount: 900, partner_share_amount: 3600 });
  });

  it('payment with zero commission is not_applicable', async () => {
    fixtures.bookings = { ...fixtures.bookings, commission_amount: 0, partner_share_amount: 4500 };
    await patch({ action: 'payment', choice: 'partner_collects' });
    expect(updates[0].row).toMatchObject({ commission_status: 'not_applicable' });
  });

  it('refuses to mark an online-paid booking unpaid or partner-collected', async () => {
    for (const stripe of [{ stripe_payment_intent: 'pi_1' }, { payment_status: 'paid', payment_method: 'online' }]) {
      fixtures.bookings = { ...fixtures.bookings, ...stripe };
      for (const choice of ['unpaid', 'partner_collects']) {
        const res = await patch({ action: 'payment', choice });
        expect(res.status).toBe(409);
        expect((await res.json()).error).toBe('This booking was paid online; record a refund in Stripe first.');
      }
    }
    expect(updates).toHaveLength(0);
    fixtures.bookings = { ...fixtures.bookings, stripe_payment_intent: 'pi_1' };
    expect((await patch({ action: 'payment', choice: 'platform_paid', channel: 'stripe' })).status).toBe(200);
  });

  it('cancel keeps a paid commission', async () => {
    fixtures.bookings = { ...fixtures.bookings, commission_status: 'paid' };
    await patch({ action: 'cancel', reason: 'Customer changed plans', notify: false });
    expect(updates[0].row).toEqual({ status: 'cancelled', cancelled_reason: 'Customer changed plans' });
    expect(sendCancellationEmails).not.toHaveBeenCalled();
  });

  it('returns 409 for any change to a cancelled booking', async () => {
    fixtures.bookings = { ...fixtures.bookings, status: 'cancelled' };
    for (const body of [
      { action: 'cancel', reason: 'again please' },
      { action: 'payment', choice: 'unpaid' },
      { action: 'assign', partner_id: null },
    ]) {
      const res = await patch(body);
      expect(res.status).toBe(409);
      expect((await res.json()).error).toBe('This booking is cancelled.');
    }
    expect(updates).toHaveLength(0);
  });

  it('returns 500 and sends no email when the update fails', async () => {
    updateError = { message: 'db down' };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await patch({ action: 'cancel', reason: 'Customer changed plans' });
    expect(res.status).toBe(500);
    expect(sendCancellationEmails).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('assign refuses a booking whose commission is already paid', async () => {
    fixtures.bookings = { ...fixtures.bookings, commission_status: 'paid' };
    const res = await patch({ action: 'assign', partner_id: '22222222-2222-4222-8222-222222222222' });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/already settled/);
    expect(updates).toHaveLength(0);
  });

  it('assign to a different partner clears the previous partner response', async () => {
    fixtures.bookings = { ...fixtures.bookings, partner_id: 'old', partner_response: 'declined', partner_responded_at: '2026-10-10T09:00:00Z' };
    await patch({ action: 'assign', partner_id: '22222222-2222-4222-8222-222222222222' });
    expect(updates[0].row).toMatchObject({ partner_id: 'p1', partner_response: null, partner_responded_at: null });
    expect(whatsappNewBooking).toHaveBeenCalledWith(ID, { customer: false, partners: true });
    expect(whatsappReassignedAway).toHaveBeenCalledWith(ID, { partner_id: 'old', staff_id: null });
  });

  it('assign to the same partner keeps their response', async () => {
    fixtures.bookings = { ...fixtures.bookings, partner_id: 'p1', partner_response: 'accepted' };
    await patch({ action: 'assign', partner_id: '22222222-2222-4222-8222-222222222222' });
    expect(updates[0].row).not.toHaveProperty('partner_response');
    expect(whatsappReassignedAway).not.toHaveBeenCalled();
  });

  it('assign to a new driver of the same partner tells the old driver', async () => {
    fixtures.bookings = { ...fixtures.bookings, partner_id: 'p1', staff_id: 'olds' };
    fixtures.partner_staff = { id: 's1', partner_id: 'p1', role: 'guide', active: true };
    await patch({ action: 'assign', partner_id: '22222222-2222-4222-8222-222222222222', staff_id: '33333333-3333-4333-8333-333333333333' });
    expect(whatsappReassignedAway).toHaveBeenCalledWith(ID, { partner_id: 'p1', staff_id: 'olds' });
    expect(sendReassignedAwayEmail).not.toHaveBeenCalled();
  });

  it('assign passes the previous driver when the partner changes', async () => {
    fixtures.bookings = { ...fixtures.bookings, partner_id: 'old', staff_id: 'olds' };
    await patch({ action: 'assign', partner_id: '22222222-2222-4222-8222-222222222222' });
    expect(whatsappReassignedAway).toHaveBeenCalledWith(ID, { partner_id: 'old', staff_id: 'olds' });
  });

  it('assign moves commission from not_applicable to pending and creates the record when commission becomes owed', async () => {
    fixtures.bookings = { ...fixtures.bookings, commission_status: 'not_applicable', commission_pct: 0, payment_method: 'offline', collected_by: 'partner', activity_date: '2099-01-10' };
    await patch({ action: 'assign', partner_id: '22222222-2222-4222-8222-222222222222', notify: false });
    expect(updates[0].row).toMatchObject({ commission_amount: 900, commission_status: 'pending' });
    expect(recordOps.map((o) => o.op)).toEqual(['update', 'insert']);
    expect(recordOps[1].row).toMatchObject({ booking_id: 'b1', provider_type: 'trek', booking_amount: 4500, commission_amount: 900, commission_pct: 20, status: 'pending', due_date: '2099-01-17' });
  });

  it('assign does not duplicate an existing commission record', async () => {
    fixtures.bookings = { ...fixtures.bookings, payment_method: 'offline', collected_by: 'partner' };
    fixtures.commission_records = { id: 'cr1' };
    await patch({ action: 'assign', partner_id: '22222222-2222-4222-8222-222222222222', notify: false });
    expect(recordOps.map((o) => o.op)).toEqual(['update']);
  });

  it('assign with zero commission marks it not_applicable and deletes open records', async () => {
    fixtures.profiles = { ...fixtures.profiles, commission_pct: 0 };
    fixtures.bookings = { ...fixtures.bookings, payment_method: 'offline', collected_by: 'partner' };
    await patch({ action: 'assign', partner_id: '22222222-2222-4222-8222-222222222222', notify: false });
    expect(updates[0].row).toMatchObject({ commission_amount: 0, commission_status: 'not_applicable' });
    expect(recordOps).toEqual([{ op: 'delete' }]);
  });

  it('assign never overwrites a waived commission or touches records for platform-collected bookings', async () => {
    fixtures.bookings = { ...fixtures.bookings, commission_status: 'waived', payment_method: 'offline', collected_by: 'partner' };
    await patch({ action: 'assign', partner_id: '22222222-2222-4222-8222-222222222222', notify: false });
    expect(updates[0].row).not.toHaveProperty('commission_status');
    expect(recordOps.map((o) => o.op)).not.toContain('insert');
    updates.length = 0; recordOps.length = 0;
    fixtures.bookings = { ...fixtures.bookings, commission_status: 'not_applicable', payment_status: 'paid', collected_by: 'platform' };
    await patch({ action: 'assign', partner_id: '22222222-2222-4222-8222-222222222222', notify: false });
    expect(updates[0].row).not.toHaveProperty('commission_status');
    expect(recordOps.map((o) => o.op)).not.toContain('insert');
  });

  it('assign emails the previous partner too', async () => {
    fixtures.bookings = { ...fixtures.bookings, partner_id: 'old' };
    await patch({ action: 'assign', partner_id: '22222222-2222-4222-8222-222222222222' });
    expect(sendReassignedAwayEmail).toHaveBeenCalledWith(ID, 'old');
  });

  it('payment leaves a paid commission_status alone', async () => {
    fixtures.bookings = { ...fixtures.bookings, commission_status: 'paid' };
    await patch({ action: 'payment', choice: 'partner_collects' });
    expect(updates[0].row).not.toHaveProperty('commission_status');
    expect(updates[0].row).toMatchObject({ payment_status: 'pending', collected_by: 'partner' });
  });

  it('returns 404 for a malformed id', async () => {
    const bad = { params: { id: 'nope' } };
    expect((await GET(new Request('http://x'), bad)).status).toBe(404);
    expect((await PATCH(new Request('http://x', { method: 'PATCH', body: JSON.stringify({ action: 'cancel', reason: 'abc' }) }), bad)).status).toBe(404);
  });
});

describe('PATCH /api/admin/bookings/:id action confirm', () => {
  beforeEach(() => { confirmBooking.mockClear(); });

  it('confirms a pending booking through the shared confirm path', async () => {
    fixtures.bookings = { ...fixtures.bookings, status: 'pending' };
    const res = await patch({ action: 'confirm' });
    expect(res.status).toBe(200);
    expect(confirmBooking).toHaveBeenCalledWith(ID, 'admin');
    expect(await res.json()).toEqual({ booking: { id: ID, item_name: 'x' }, already: false });
    expect(updates).toHaveLength(0);
  });

  it('reports an already confirmed booking', async () => {
    confirmBooking.mockResolvedValueOnce({ ok: true, already: true });
    const res = await patch({ action: 'confirm' });
    expect(res.status).toBe(200);
    expect((await res.json()).already).toBe(true);
  });

  it('a cancelled booking is refused with 409', async () => {
    fixtures.bookings = { ...fixtures.bookings, status: 'cancelled' };
    const res = await patch({ action: 'confirm' });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('This booking is cancelled.');
    expect(confirmBooking).not.toHaveBeenCalled();
  });

  it('passes on a refusal from the confirm path', async () => {
    fixtures.bookings = { ...fixtures.bookings, status: 'completed' };
    confirmBooking.mockResolvedValueOnce({ ok: false, status: 409, error: 'This booking is completed.' });
    const res = await patch({ action: 'confirm' });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('This booking is completed.');
  });

  it('is admin only', async () => {
    role = 'partner';
    expect((await patch({ action: 'confirm' })).status).toBe(403);
    expect(confirmBooking).not.toHaveBeenCalled();
  });
});
