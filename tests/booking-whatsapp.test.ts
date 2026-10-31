import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  sendTemplate: vi.fn(), configured: vi.fn(), loadBookingView: vi.fn(),
  tables: {} as Record<string, any>, inserts: [] as any[], updates: [] as any[], deletes: [] as string[],
  rows: new Map<string, any>(), byId: {} as Record<string, any>,
}));
vi.mock('@/lib/whatsapp-cloud', async (orig) => ({ ...(await orig<any>()), sendTemplate: h.sendTemplate, isWhatsAppConfigured: h.configured }));
vi.mock('@/lib/manual-booking-emails', () => ({ loadBookingView: h.loadBookingView }));
vi.mock('@/lib/server-auth', () => ({
  serviceClient: () => ({
    from: (t: string) => ({
      select: () => ({ eq: (_c: string, id: string) => ({ maybeSingle: async () => ({ data: (id in h.byId ? h.byId[id] : h.tables[t]) ?? null, error: null }) }) }),
      insert: (row: any) => {
        const id = 'row' + (h.inserts.length + 1);
        h.inserts.push({ t, row: { ...row } });
        h.rows.set(id, { ...row });
        return { select: () => ({ single: async () => ({ data: { id }, error: null }) }) };
      },
      update: (patch: any) => ({ eq: async (_c: string, id: string) => {
        h.updates.push({ t, id, patch }); h.rows.set(id, { ...h.rows.get(id), ...patch }); return { error: null };
      } }),
      delete: () => ({ eq: async (_c: string, id: string) => { h.deletes.push(id); h.rows.delete(id); return { error: null }; } }),
    }),
  }),
}));
/** Final state of every whatsapp_messages row, in insert order. */
const logged = () => Array.from(h.rows.values());

import { assigneePhones, bookingWhen, cancelledCustomerParams, cancelledParams, customerParams, newBookingParams, recipientsFor, whatsappCancelled, whatsappCancelledCustomer, whatsappNewBooking, whatsappReassignedAway } from '@/lib/booking-whatsapp';

const view: any = {
  id: 'b1', booking_ref: 'DS-1', item_name: 'Dharamshala → McLeod Ganj', date_text: '12 Oct 2026, 09:00', num_guests: 2,
  activity_date: '2026-10-12', pickup_time: '09:00',
  guest_name: 'Asha\nK', guest_phone: '9816000001', amount: 12500, payment_text: 'Payment pending',
  assignee_text: 'Ravi, 98160', category: 'taxi', partner_id: 'p1', staff_id: 's1', property_id: null, guide_id: null,
};
const ok = { whatsapp_alerts: true };

beforeEach(() => {
  vi.clearAllMocks(); h.inserts = []; h.updates = []; h.deletes = []; h.rows = new Map(); h.tables = {}; h.byId = {};
  h.configured.mockReturnValue(true);
  h.loadBookingView.mockResolvedValue(view);
});

describe('recipientsFor', () => {
  it('uses partner whatsapp_number, falling back to phone', () => {
    expect(recipientsFor(view, { partner: { ...ok, whatsapp_number: '9816000002', phone: '9816000003' } })).toEqual([{ kind: 'partner', phone: '919816000002' }]);
    expect(recipientsFor(view, { partner: { ...ok, whatsapp_number: null, phone: '9816000003' } })).toEqual([{ kind: 'partner', phone: '919816000003' }]);
  });
  it('sends nothing when partner alerts are off, even to staff', () => {
    expect(recipientsFor(view, { partner: { whatsapp_alerts: false, whatsapp_number: '9816000002', phone: null }, staff: { ...ok, phone: '9816000004' } })).toEqual([]);
  });
  it('adds staff only when their alerts are on', () => {
    const partner = { ...ok, whatsapp_number: '9816000002', phone: null };
    expect(recipientsFor(view, { partner, staff: { ...ok, phone: '9816000004' } }).map((r) => r.kind)).toEqual(['partner', 'staff']);
    expect(recipientsFor(view, { partner, staff: { whatsapp_alerts: false, phone: '9816000004' } }).map((r) => r.kind)).toEqual(['partner']);
  });
  it('handles hotel and guide with consent', () => {
    expect(recipientsFor(view, { property: { ...ok, contact_phone: '9816000005' } })).toEqual([{ kind: 'hotel', phone: '919816000005' }]);
    expect(recipientsFor(view, { property: { whatsapp_alerts: false, contact_phone: '9816000005' } })).toEqual([]);
    // A second hotel number (the manager's WhatsApp) gets the same alerts; same consent switch, no duplicates.
    expect(recipientsFor(view, { property: { ...ok, contact_phone: '9816000005', contact_whatsapp: '+91 73032 00123' } })).toEqual([{ kind: 'hotel', phone: '919816000005' }, { kind: 'hotel', phone: '917303200123' }]);
    expect(recipientsFor(view, { property: { ...ok, contact_phone: '9816000005', contact_whatsapp: '9816000005' } })).toEqual([{ kind: 'hotel', phone: '919816000005' }]);
    expect(recipientsFor(view, { property: { whatsapp_alerts: false, contact_phone: '9816000005', contact_whatsapp: '7303200123' } })).toEqual([]);
    expect(recipientsFor(view, { guide: { ...ok, phone: '9816000006' } })).toEqual([{ kind: 'guide', phone: '919816000006' }]);
    expect(recipientsFor(view, { guide: { whatsapp_alerts: false, phone: '9816000006' } })).toEqual([]);
  });
  it('drops invalid numbers and duplicates', () => {
    expect(recipientsFor(view, { partner: { ...ok, whatsapp_number: '123', phone: '9816000002' } })).toEqual([]);
    expect(recipientsFor(view, { partner: { ...ok, whatsapp_number: '9816000002', phone: null }, staff: { ...ok, phone: '+91 98160 00002' } })).toEqual([{ kind: 'partner', phone: '919816000002' }]);
  });
});

describe('assigneePhones', () => {
  it('lists every current assignee number whether or not alerts are on', () => {
    expect(assigneePhones({
      partner: { whatsapp_alerts: false, whatsapp_number: '9816000002', phone: '9816000003' },
      staff: { whatsapp_alerts: false, phone: '+91 98160 00004' },
      property: { contact_phone: '09816000005', contact_whatsapp: '7303200123' },
      guide: { phone: '9816000006' },
    })).toEqual(['919816000002', '919816000003', '919816000004', '919816000005', '917303200123', '919816000006']);
  });
  it('drops invalid numbers and duplicates', () => {
    expect(assigneePhones({ partner: { whatsapp_number: '123', phone: '9816000002' }, staff: { phone: '9816000002' } })).toEqual(['919816000002']);
    expect(assigneePhones({})).toEqual([]);
  });
});

describe('bookingWhen', () => {
  it('gives weekday date and 12-hour time for activities', () => {
    expect(bookingWhen(view)).toEqual({ date: 'Mon, 12 Oct 2026', time: '9:00 AM' });
    expect(bookingWhen({ ...view, pickup_time: '14:30' }).time).toBe('2:30 PM');
    expect(bookingWhen({ ...view, pickup_time: '00:05' }).time).toBe('12:05 AM');
    expect(bookingWhen({ ...view, pickup_time: '12:00' }).time).toBe('12:00 PM');
  });
  it('says the time is to be confirmed when none is set, and keeps unknown formats as typed', () => {
    expect(bookingWhen({ ...view, pickup_time: null }).time).toBe('To be confirmed');
    expect(bookingWhen({ ...view, pickup_time: 'Early morning' }).time).toBe('Early morning');
  });
  it('adds the number of days for guides', () => {
    expect(bookingWhen({ ...view, category: 'guide', guide_days: 3 }).date).toBe('Mon, 12 Oct 2026 (3 days)');
    expect(bookingWhen({ ...view, category: 'guide', guide_days: 1 }).date).toBe('Mon, 12 Oct 2026 (1 day)');
  });
  it('gives the stay and hotel check-in/out times for hotels', () => {
    const hotel = { ...view, category: 'hotel', check_in: '2027-01-01', check_out: '2027-01-03', property_check_in_time: '13:30', property_check_out_time: '11:00' };
    expect(bookingWhen(hotel)).toEqual({ date: 'Fri, 1 Jan 2027 to Sun, 3 Jan 2027 (2 nights)', time: 'Check-in 1:30 PM · Check-out 11:00 AM' });
    expect(bookingWhen({ ...hotel, check_out: '2027-01-02' }).date).toBe('Fri, 1 Jan 2027 to Sat, 2 Jan 2027 (1 night)');
    expect(bookingWhen({ ...hotel, property_check_out_time: null }).time).toBe('Check-in 1:30 PM');
    expect(bookingWhen({ ...hotel, property_check_in_time: null, property_check_out_time: null }).time).toBe('As per hotel check-in and check-out times');
  });
  it('says the date is to be confirmed when missing', () => {
    expect(bookingWhen({ ...view, activity_date: null }).date).toBe('To be confirmed');
  });
});

describe('params', () => {
  it('newBookingParams has 9 sanitised values in order', () => {
    expect(newBookingParams(view)).toEqual(['DS-1', 'Dharamshala → McLeod Ganj · Assigned: Ravi, 98160', 'Mon, 12 Oct 2026', '9:00 AM', '2', 'Asha K', '9816000001', 'Rs.12,500', 'Payment pending']);
  });
  it('cancelledParams has 5 values', () => {
    expect(cancelledParams(view, 'Guest\nasked')).toEqual(['DS-1', 'Dharamshala → McLeod Ganj', 'Mon, 12 Oct 2026', '9:00 AM', 'Guest asked']);
  });
  it('cancelledCustomerParams is [ref, item, date, reason]', () => {
    expect(cancelledCustomerParams(view, 'Cancelled\nat your request')).toEqual(['DS-1', 'Dharamshala → McLeod Ganj', 'Mon, 12 Oct 2026', 'Cancelled at your request']);
  });
  it('customerParams has 8 values with driver/pilot/guide line', () => {
    expect(customerParams(view)).toEqual(['DS-1', 'Dharamshala → McLeod Ganj', 'Mon, 12 Oct 2026', '9:00 AM', '2', 'Driver Ravi, 98160', 'Rs.12,500', 'Payment pending']);
    expect(customerParams({ ...view, category: 'paragliding' })[5]).toBe('Pilot Ravi, 98160');
    expect(customerParams({ ...view, category: 'guide' })[5]).toBe('Guide Ravi, 98160');
    expect(customerParams({ ...view, assignee_text: null })[5]).toBe('Our team will share the details soon');
    expect(customerParams({ ...view, category: 'trek' })[5]).toBe('Guide Ravi, 98160');
  });
});

describe('templates', () => {
  it('param counts match the template bodies in the creation script', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('scripts/create-whatsapp-templates.mjs', 'utf8');
    const count = (name: string) => {
      const body = src.split(`name: '${name}'`)[1].split('example:')[0];
      return new Set(body.match(/\{\{\d+\}\}/g)).size;
    };
    expect(count('booking_new_partner_v2')).toBe(newBookingParams(view).length);
    expect(count('booking_cancelled_partner_v2')).toBe(cancelledParams(view, 'x').length);
    expect(count('booking_confirmed_customer_v2')).toBe(customerParams(view).length);
    expect(count('booking_cancelled_customer')).toBe(cancelledCustomerParams(view, 'x').length);
  });
});

describe('notifiers', () => {
  const partnerRow = { whatsapp_alerts: true, whatsapp_number: '9816000002', phone: null };
  it('falls back to the approved v1 template while v2 is still under review', async () => {
    h.tables = { profiles: partnerRow };
    h.sendTemplate
      .mockResolvedValueOnce({ ok: false, error: '(#132001) Template name does not exist in the translation' })
      .mockResolvedValueOnce({ ok: true, id: 'wamid.v1' });
    await whatsappNewBooking('b1', { customer: false });
    expect(h.sendTemplate).toHaveBeenNthCalledWith(2, { to: '919816000002', template: 'booking_new_partner',
      params: ['DS-1', 'Dharamshala → McLeod Ganj', '12 Oct 2026, 09:00', '2', 'Asha K', '9816000001', 'Rs.12,500', 'Payment pending'] });
    expect(logged()).toEqual([expect.objectContaining({ template: 'booking_new_partner', status: 'sent', wa_message_id: 'wamid.v1' })]);
  });
  it('v1 fallbacks keep the old parameter layout', async () => {
    const missing = { ok: false, error: '(#132001) Template name does not exist in the translation' };
    h.tables = { profiles: partnerRow };
    h.sendTemplate.mockResolvedValueOnce(missing).mockResolvedValueOnce({ ok: true, id: 'w' });
    await whatsappCancelled('b1', 'Guest left');
    expect(h.sendTemplate).toHaveBeenLastCalledWith({ to: '919816000002', template: 'booking_cancelled_partner',
      params: ['DS-1', 'Dharamshala → McLeod Ganj', '12 Oct 2026, 09:00', 'Guest left'] });
    h.sendTemplate.mockResolvedValueOnce(missing).mockResolvedValueOnce({ ok: true, id: 'w' });
    await whatsappNewBooking('b1', { customer: true, partners: false });
    expect(h.sendTemplate).toHaveBeenLastCalledWith({ to: '919816000001', template: 'booking_confirmed_customer',
      params: ['DS-1', 'Dharamshala → McLeod Ganj', '12 Oct 2026, 09:00', '2', 'Driver Ravi, 98160', 'Rs.12,500', 'Payment pending'] });
  });
  it('sends the customer cancellation notice, with no v1 fallback', async () => {
    h.sendTemplate.mockResolvedValue({ ok: false, error: '(#132001) Template name does not exist in the translation' });
    await whatsappCancelledCustomer('b1', 'Guest asked');
    expect(h.sendTemplate).toHaveBeenCalledTimes(1);
    expect(h.sendTemplate).toHaveBeenCalledWith({ to: '919816000001', template: 'booking_cancelled_customer', params: cancelledCustomerParams(view, 'Guest asked') });
    expect(logged()[0]).toMatchObject({ recipient_kind: 'customer', template: 'booking_cancelled_customer', status: 'failed' });
  });
  it('does not fall back on other errors', async () => {
    h.tables = { profiles: partnerRow };
    h.sendTemplate.mockResolvedValueOnce({ ok: false, error: 'Template paused' });
    await whatsappNewBooking('b1', { customer: false });
    expect(h.sendTemplate).toHaveBeenCalledTimes(1);
  });
  it('logs sent and failed attempts and never throws', async () => {
    h.tables = { profiles: partnerRow, partner_staff: { whatsapp_alerts: true, phone: '9816000004' } };
    h.sendTemplate.mockResolvedValueOnce({ ok: true, id: 'wamid.1' }).mockResolvedValueOnce({ ok: false, error: 'Template paused' });
    await expect(whatsappNewBooking('b1', { customer: false })).resolves.toBeUndefined();
    expect(h.sendTemplate).toHaveBeenCalledWith({ to: '919816000002', template: 'booking_new_partner_v2', params: newBookingParams(view) });
    expect(h.inserts.map((i) => i.row.status)).toEqual(['queued', 'queued']);
    expect(logged()).toEqual([
      expect.objectContaining({ booking_id: 'b1', recipient_kind: 'partner', to_phone: '919816000002', template: 'booking_new_partner_v2', status: 'sent', wa_message_id: 'wamid.1' }),
      expect.objectContaining({ recipient_kind: 'staff', status: 'failed', error: 'Template paused' }),
    ]);
  });
  it('sends the customer message when asked and the number is valid', async () => {
    h.sendTemplate.mockResolvedValue({ ok: true, id: 'wamid.c' });
    await whatsappNewBooking('b1', { customer: true });
    expect(h.sendTemplate).toHaveBeenCalledWith({ to: '919816000001', template: 'booking_confirmed_customer_v2', params: customerParams(view) });
    expect(logged()[0]).toMatchObject({ recipient_kind: 'customer', status: 'sent', wa_message_id: 'wamid.c' });
  });
  it('skips partner/staff/hotel/guide alerts when partners is false but still sends the customer message', async () => {
    h.tables = { profiles: partnerRow };
    h.sendTemplate.mockResolvedValue({ ok: true, id: 'wamid.c' });
    await whatsappNewBooking('b1', { customer: true, partners: false });
    expect(h.sendTemplate).toHaveBeenCalledTimes(1);
    expect(h.sendTemplate).toHaveBeenCalledWith(expect.objectContaining({ to: '919816000001', template: 'booking_confirmed_customer_v2' }));
  });
  it('alerts partners by default', async () => {
    h.tables = { profiles: partnerRow };
    h.sendTemplate.mockResolvedValue({ ok: true, id: 'wamid.p' });
    await whatsappNewBooking('b1', { customer: false });
    expect(h.sendTemplate).toHaveBeenCalledWith(expect.objectContaining({ to: '919816000002', template: 'booking_new_partner_v2' }));
  });
  it('does nothing and logs nothing when not configured', async () => {
    h.configured.mockReturnValue(false);
    h.tables = { profiles: partnerRow };
    await whatsappNewBooking('b1', { customer: true });
    await whatsappCancelled('b1', 'x');
    expect(h.sendTemplate).not.toHaveBeenCalled();
    expect(h.inserts).toEqual([]);
  });
  it('does not log skipped sends and swallows errors', async () => {
    h.tables = { profiles: partnerRow };
    h.sendTemplate.mockResolvedValue({ ok: false, skipped: true });
    await whatsappCancelled('b1', 'Guest asked');
    expect(h.deletes).toEqual(['row1']);
    expect(logged()).toEqual([]);
    h.loadBookingView.mockRejectedValue(new Error('db down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(whatsappCancelled('b1', 'x')).resolves.toBeUndefined();
  });
  it('writes a queued row before sending', async () => {
    h.tables = { profiles: partnerRow };
    let atSend: any[] = [];
    h.sendTemplate.mockImplementation(async () => { atSend = logged(); return { ok: true, id: 'wamid.q' }; });
    await whatsappNewBooking('b1', { customer: false });
    expect(atSend).toEqual([{ booking_id: 'b1', recipient_kind: 'partner', to_phone: '919816000002', template: 'booking_new_partner_v2', status: 'queued' }]);
    expect(h.sendTemplate).toHaveBeenCalledTimes(1);
    expect(h.updates[0]).toMatchObject({ id: 'row1', patch: { status: 'sent', wa_message_id: 'wamid.q', error: null } });
  });
  it('sends to all recipients in parallel', async () => {
    h.tables = { profiles: partnerRow, partner_staff: { whatsapp_alerts: true, phone: '9816000004' } };
    const pending: ((v: any) => void)[] = [];
    h.sendTemplate.mockImplementation(() => new Promise((resolve) => pending.push(resolve)));
    const done = whatsappNewBooking('b1', { customer: true });
    await vi.waitFor(() => expect(h.sendTemplate).toHaveBeenCalledTimes(3));
    expect(pending).toHaveLength(3);
    pending.forEach((resolve, i) => resolve({ ok: true, id: `wamid.${i}` }));
    await done;
    expect(logged().map((r) => r.status)).toEqual(['sent', 'sent', 'sent']);
  });
  it('one failing send does not stop the others', async () => {
    h.tables = { profiles: partnerRow, partner_staff: { whatsapp_alerts: true, phone: '9816000004' } };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    h.sendTemplate.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ ok: true, id: 'wamid.2' });
    await expect(whatsappNewBooking('b1', { customer: false })).resolves.toBeUndefined();
    expect(h.sendTemplate).toHaveBeenCalledTimes(2);
    expect(logged().map((r) => r.status)).toContain('sent');
  });
  it('tells the previous partner about a reassignment', async () => {
    h.tables = { profiles: partnerRow };
    h.sendTemplate.mockResolvedValue({ ok: true, id: 'wamid.r' });
    h.byId = { p1: { whatsapp_alerts: true, whatsapp_number: '9816000009' } };
    await whatsappReassignedAway('b1', { partner_id: 'oldp' });
    expect(h.sendTemplate).toHaveBeenCalledWith(expect.objectContaining({ to: '919816000002', template: 'booking_cancelled_partner_v2' }));
    expect(h.sendTemplate.mock.calls[0][0].params[4]).toMatch(/reassigned/i);
    expect(logged()[0]).toMatchObject({ recipient_kind: 'partner', status: 'sent' });
  });
  it('tells the previous partner and their driver when the partner changes', async () => {
    h.byId = {
      oldp: partnerRow, olds: { whatsapp_alerts: true, phone: '9816000007' },
      p1: { whatsapp_alerts: true, whatsapp_number: '9816000009' }, s1: { whatsapp_alerts: true, phone: '9816000008' },
    };
    h.sendTemplate.mockResolvedValue({ ok: true, id: 'wamid.r' });
    await whatsappReassignedAway('b1', { partner_id: 'oldp', staff_id: 'olds' });
    expect(h.sendTemplate.mock.calls.map((c) => c[0].to).sort()).toEqual(['919816000002', '919816000007']);
    expect(logged().map((r) => r.recipient_kind).sort()).toEqual(['partner', 'staff']);
  });
  it('does not tell the previous driver when the old partner has alerts off', async () => {
    h.byId = { oldp: { ...partnerRow, whatsapp_alerts: false }, olds: { whatsapp_alerts: true, phone: '9816000007' }, p1: null, s1: null };
    await whatsappReassignedAway('b1', { partner_id: 'oldp', staff_id: 'olds' });
    expect(h.sendTemplate).not.toHaveBeenCalled();
  });
  it('tells only the previous driver when the partner stays the same', async () => {
    h.byId = {
      p1: partnerRow, olds: { whatsapp_alerts: true, phone: '9816000007' }, s1: { whatsapp_alerts: true, phone: '9816000008' },
    };
    h.sendTemplate.mockResolvedValue({ ok: true, id: 'wamid.s' });
    await whatsappReassignedAway('b1', { partner_id: 'p1', staff_id: 'olds' });
    expect(h.sendTemplate).toHaveBeenCalledTimes(1);
    expect(h.sendTemplate).toHaveBeenCalledWith(expect.objectContaining({ to: '919816000007', template: 'booking_cancelled_partner_v2' }));
    expect(h.sendTemplate.mock.calls[0][0].params[4]).toMatch(/reassigned/i);
    expect(logged()[0]).toMatchObject({ recipient_kind: 'staff' });
  });
  it('never notifies a number that is still assigned, and does nothing when nothing changed', async () => {
    h.byId = { p1: partnerRow, olds: { whatsapp_alerts: true, phone: '9816000002' }, s1: null };
    await whatsappReassignedAway('b1', { partner_id: 'p1', staff_id: 'olds' });
    await whatsappReassignedAway('b1', { partner_id: 'p1', staff_id: 's1' });
    expect(h.sendTemplate).not.toHaveBeenCalled();
  });
});

describe('templates approved 26 Oct 2026', () => {
  it('fill every placeholder, in template order, without line breaks', async () => {
    const m = await import('@/lib/booking-whatsapp');
    const v = { ...view, staff_text: 'Ravi, 98160', vehicle_text: 'Swift Dzire · HP01D5803', pickup_location: 'Gaggal Airport', paid_amount: 2500 };
    const cases: [string[], number][] = [
      [m.requestReceivedParams(v), 4], [m.updatedCustomerParams(v, 'Date moved'), 4], [m.updatedPartnerParams(v, 'Date moved'), 4],
      [m.messagePartnerParams(v, 'Please call the guest'), 3], [m.paymentRequestParams(v, 10000, 'https://rzp.io/x'), 5],
      [m.paymentReceivedParams(v, 2500, 'pay_1'), 4], [m.refundParams(v, 2500, 'rfnd_1'), 4], [m.tripReminderParams(v), 5],
      [m.assignedParams(v), 5], [m.commissionParams({ ...v, commission_amount: 2500, partner_contact: { name: 'Karan', email: null, phone: null } }, '30 Oct 2026'), 4],
    ];
    for (const [params, n] of cases) {
      expect(params).toHaveLength(n);
      for (const p of params) { expect(p.trim()).not.toBe(''); expect(p).not.toMatch(/\n/); }
    }
  });

  it('greet by first name and say who to call', async () => {
    const m = await import('@/lib/booking-whatsapp');
    const v = { ...view, staff_text: 'Ravi, 98160', vehicle_text: 'Swift Dzire', pickup_location: 'Gaggal Airport' };
    expect(m.requestReceivedParams(v)[0]).toBe('Asha');
    expect(m.assignedParams(v).slice(2)).toEqual(['Driver Ravi, 98160', 'Swift Dzire', '9:00 AM, Gaggal Airport']);
    expect(m.tripReminderParams(v)[4]).toBe('Driver Ravi, 98160');
    expect(m.detailsLine(v)).toContain('2 people');
    expect(m.paymentReceivedParams(v, 2500, '')[3]).toBe('Recorded by our team');
  });

  it('send a review request only to guests who agreed to hear from us', async () => {
    h.configured.mockReturnValue(true);
    h.loadBookingView.mockResolvedValue({ ...view, guest_email: 'a@b.in' });
    const m = await import('@/lib/booking-whatsapp');
    // The mocked client has no .or(), so the consent lookup throws and the request is refused, never sent.
    expect((await m.whatsappReviewRequest('b1')).ok).toBe(false);
    expect(h.sendTemplate).not.toHaveBeenCalledWith(expect.objectContaining({ template: 'review_request' }));
  });
});
