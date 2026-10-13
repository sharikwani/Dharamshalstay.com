import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  inserts: [] as any[], insertError: null as any, deleteError: null as any, row: { id: 'x1' } as any, remove: vi.fn(async () => ({ error: null })),
}));

vi.mock('@/lib/server-auth', async (orig) => {
  const actual = await orig<typeof import('@/lib/server-auth')>();
  const builder: any = {
    select: () => builder, eq: () => builder,
    single: async () => ({ data: h.row, error: null }),
    then: (res: any) => res({ data: [], error: null }),
    insert: (row: any) => { h.inserts.push(row); return { select: () => ({ single: async () => (h.insertError ? { data: null, error: h.insertError } : { data: { id: 'new1' }, error: null }) }) }; },
    delete: () => ({ eq: async () => ({ error: h.deleteError }) }),
  };
  return { ...actual, serviceClient: () => ({ from: () => builder, storage: { from: () => ({ remove: h.remove }) } }) };
});
vi.mock('@/lib/partners/load', () => ({
  KYC_BUCKET: 'partner-kyc',
  requireActivityPartner: async () => ({ user: {}, profile: { id: 'p1', partner_type: 'taxi', partner_status: 'onboarding' } }),
}));

import { POST } from '@/app/api/partner/staff/route';
import { DELETE as deleteStaff } from '@/app/api/partner/staff/[id]/route';
import { DELETE as deleteVehicle } from '@/app/api/partner/vehicles/[id]/route';

const post = (body: unknown) => POST(new Request('http://x', { method: 'POST', body: JSON.stringify(body) }));
const del = (fn: typeof deleteStaff) => fn(new Request('http://x', { method: 'DELETE' }), { params: { id: 'x1' } });

beforeEach(() => { h.inserts.length = 0; h.insertError = null; h.deleteError = null; h.row = { id: 'x1', role: 'driver' }; h.remove.mockClear(); });

describe('POST /api/partner/staff', () => {
  it('stores a normalised phone with WhatsApp alerts off', async () => {
    const res = await post({ role: 'driver', full_name: 'Ravi Kumar', phone: '+91 98160 00001' });
    expect(res.status).toBe(200);
    expect(h.inserts[0]).toMatchObject({ phone: '919816000001', whatsapp_alerts: false, partner_id: 'p1', role: 'driver' });
  });
  it('rejects a phone that is not a valid Indian mobile', async () => {
    for (const phone of ['1234567890', '98160000012345', 'abcdefghij']) {
      const res = await post({ role: 'driver', full_name: 'Ravi Kumar', phone });
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('Enter a valid 10-digit Indian mobile number for this person.');
    }
    expect(h.inserts).toHaveLength(0);
  });
  it('returns 409 when this person is already on the team (unique partner, role, phone)', async () => {
    h.insertError = { code: '23505', message: 'duplicate key value violates unique constraint "uq_partner_staff_partner_role_phone"' };
    const res = await post({ role: 'driver', full_name: 'Ravi Kumar', phone: '9816000001' });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('This person is already on your team');
  });
  it('ignores any attempt to switch WhatsApp alerts on', async () => {
    await post({ role: 'driver', full_name: 'Ravi Kumar', phone: '9816000001', whatsapp_alerts: true });
    expect(h.inserts[0].whatsapp_alerts).toBe(false);
  });
});

describe('DELETE staff / vehicle in use', () => {
  it('returns 409 for a driver assigned to a booking and removes no files', async () => {
    h.deleteError = { code: '23503', message: 'violates foreign key constraint' };
    const res = await del(deleteStaff);
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('This driver is assigned to a booking. Ask us to reassign the booking first.');
    expect(h.remove).not.toHaveBeenCalled();
  });
  it('returns 409 for a vehicle assigned to a booking', async () => {
    h.deleteError = { code: '23503', message: 'violates foreign key constraint' };
    const res = await del(deleteVehicle);
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('This vehicle is assigned to a booking. Ask us to reassign the booking first.');
  });
  it('other delete errors are still 500', async () => {
    h.deleteError = { code: 'XX000', message: 'db down' };
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await del(deleteStaff)).status).toBe(500);
    expect((await del(deleteVehicle)).status).toBe(500);
    log.mockRestore();
  });
  it('deletes an unused driver', async () => {
    expect((await del(deleteStaff)).status).toBe(200);
  });
});
