import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  sendTemplate: vi.fn(), configured: vi.fn(), loadBookingView: vi.fn(),
  tables: {} as Record<string, any>, inserts: [] as any[],
}));
vi.mock('@/lib/whatsapp-cloud', async (orig) => ({ ...(await orig<any>()), sendTemplate: h.sendTemplate, isWhatsAppConfigured: h.configured }));
vi.mock('@/lib/manual-booking-emails', () => ({ loadBookingView: h.loadBookingView }));
vi.mock('@/lib/server-auth', () => ({
  serviceClient: () => ({
    from: (t: string) => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: h.tables[t] ?? null, error: null }) }) }),
      insert: async (row: any) => { h.inserts.push({ t, row }); return { error: null }; },
    }),
  }),
}));

import { cancelledParams, customerParams, newBookingParams, recipientsFor, whatsappCancelled, whatsappNewBooking, whatsappReassignedAway } from '@/lib/booking-whatsapp';

const view: any = {
  id: 'b1', booking_ref: 'DS-1', item_name: 'Hotel · Room', date_text: '1 Jan – 2 Jan 2027', num_guests: 2,
  guest_name: 'Asha\nK', guest_phone: '9816000001', amount: 12500, payment_text: 'Payment pending',
  assignee_text: 'Ravi, 98160', category: 'taxi', partner_id: 'p1', staff_id: 's1', property_id: null, guide_id: null,
};
const ok = { whatsapp_alerts: true };

beforeEach(() => {
  vi.clearAllMocks(); h.inserts = []; h.tables = {};
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
    expect(recipientsFor(view, { guide: { ...ok, phone: '9816000006' } })).toEqual([{ kind: 'guide', phone: '919816000006' }]);
    expect(recipientsFor(view, { guide: { whatsapp_alerts: false, phone: '9816000006' } })).toEqual([]);
  });
  it('drops invalid numbers and duplicates', () => {
    expect(recipientsFor(view, { partner: { ...ok, whatsapp_number: '123', phone: '9816000002' } })).toEqual([]);
    expect(recipientsFor(view, { partner: { ...ok, whatsapp_number: '9816000002', phone: null }, staff: { ...ok, phone: '+91 98160 00002' } })).toEqual([{ kind: 'partner', phone: '919816000002' }]);
  });
});

describe('params', () => {
  it('newBookingParams has 8 sanitised values in order', () => {
    expect(newBookingParams(view)).toEqual(['DS-1', 'Hotel · Room', '1 Jan – 2 Jan 2027', '2', 'Asha K', '9816000001', 'Rs.12,500', 'Payment pending']);
  });
  it('cancelledParams has 4 values', () => {
    expect(cancelledParams(view, 'Guest\nasked')).toEqual(['DS-1', 'Hotel · Room', '1 Jan – 2 Jan 2027', 'Guest asked']);
  });
  it('customerParams has 7 values with driver/pilot/guide line', () => {
    expect(customerParams(view)).toEqual(['DS-1', 'Hotel · Room', '1 Jan – 2 Jan 2027', '2', 'Your driver: Ravi, 98160', 'Rs.12,500', 'Payment pending']);
    expect(customerParams({ ...view, category: 'paragliding' })[4]).toBe('Your pilot: Ravi, 98160');
    expect(customerParams({ ...view, category: 'guide' })[4]).toBe('Your guide: Ravi, 98160');
    expect(customerParams({ ...view, assignee_text: null })[4]).toBe('-');
  });
});

describe('notifiers', () => {
  const partnerRow = { whatsapp_alerts: true, whatsapp_number: '9816000002', phone: null };
  it('logs sent and failed attempts and never throws', async () => {
    h.tables = { profiles: partnerRow, partner_staff: { whatsapp_alerts: true, phone: '9816000004' } };
    h.sendTemplate.mockResolvedValueOnce({ ok: true, id: 'wamid.1' }).mockResolvedValueOnce({ ok: false, error: 'Template paused' });
    await expect(whatsappNewBooking('b1', { customer: false })).resolves.toBeUndefined();
    expect(h.sendTemplate).toHaveBeenCalledWith({ to: '919816000002', template: 'booking_new_partner', params: newBookingParams(view) });
    expect(h.inserts.map((i) => i.row)).toEqual([
      expect.objectContaining({ booking_id: 'b1', recipient_kind: 'partner', to_phone: '919816000002', template: 'booking_new_partner', status: 'sent', wa_message_id: 'wamid.1' }),
      expect.objectContaining({ recipient_kind: 'staff', status: 'failed', error: 'Template paused' }),
    ]);
  });
  it('sends the customer message when asked and the number is valid', async () => {
    h.sendTemplate.mockResolvedValue({ ok: true, id: 'wamid.c' });
    await whatsappNewBooking('b1', { customer: true });
    expect(h.sendTemplate).toHaveBeenCalledWith({ to: '919816000001', template: 'booking_confirmed_customer', params: customerParams(view) });
    expect(h.inserts[0].row).toMatchObject({ recipient_kind: 'customer', status: 'sent' });
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
    expect(h.inserts).toEqual([]);
    h.loadBookingView.mockRejectedValue(new Error('db down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(whatsappCancelled('b1', 'x')).resolves.toBeUndefined();
  });
  it('tells the previous partner about a reassignment', async () => {
    h.tables = { profiles: partnerRow };
    h.sendTemplate.mockResolvedValue({ ok: true, id: 'wamid.r' });
    await whatsappReassignedAway('b1', 'oldp');
    expect(h.sendTemplate).toHaveBeenCalledWith(expect.objectContaining({ to: '919816000002', template: 'booking_cancelled_partner' }));
    expect(h.sendTemplate.mock.calls[0][0].params[3]).toMatch(/reassigned/i);
    expect(h.inserts[0].row).toMatchObject({ recipient_kind: 'partner', status: 'sent' });
  });
});
