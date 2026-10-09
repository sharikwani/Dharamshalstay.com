import { describe, it, expect, vi, beforeEach } from 'vitest';

let role = 'partner';
const emailPartnerDecision = vi.fn(async () => {});
let updateError: any = null;
let partnerType = 'taxi';
let docStatuses = ['approved', 'pending'];
const update = vi.fn((_patch: unknown) => ({ eq: async () => ({ error: updateError }) }));
const sb = { from: () => ({ select: () => ({ in: () => ({ order: async () => ({ data: [], error: null }) }) }), update }) };

vi.mock('@/lib/server-auth', async (orig) => {
  const actual = await orig<typeof import('@/lib/server-auth')>();
  return {
    ...actual,
    serviceClient: () => sb,
    requireCaller: async (_req: Request, roles?: string[]) => {
      if (roles && !roles.includes(role)) throw new actual.HttpError(403, 'You do not have access to this');
      return { user: {}, profile: { id: 'admin-1', role } };
    },
  };
});
vi.mock('@/lib/partners/load', () => ({
  loadOnboarding: async () => ({
    profile: { id: 'p1', email: 'p@x.com', legal_name: 'Partner One', partner_status: 'pending_verification', partner_type: partnerType },
    documents: docStatuses.map((status, i) => ({ id: 'd' + i, status })),
    agreements: [{ id: 'a1' }],
    missing: [],
  }),
}));
vi.mock('@/lib/partners/emails', () => ({ emailPartnerDecision: (...a: unknown[]) => emailPartnerDecision(...(a as [])) }));

import { GET } from '@/app/api/admin/partners/route';
import { POST } from '@/app/api/admin/partners/[id]/route';

beforeEach(() => { role = 'partner'; updateError = null; partnerType = 'taxi'; docStatuses = ['approved', 'pending']; emailPartnerDecision.mockClear(); update.mockClear(); });

const post = (body: unknown) => POST(new Request('http://x', { method: 'POST', body: JSON.stringify(body) }), { params: { id: 'p1' } });

describe('admin partner routes', () => {
  it('returns 403 for a non-admin caller on GET /api/admin/partners', async () => {
    const res = await GET(new Request('http://x/api/admin/partners'));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('You do not have access to this');
  });

  it('refuses to verify while a document is pending, and sends no email', async () => {
    role = 'admin';
    const res = await POST(
      new Request('http://x', { method: 'POST', body: JSON.stringify({ action: 'verify' }) }),
      { params: { id: 'p1' } },
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('Approve every document before verifying.');
    expect(emailPartnerDecision).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('verifies a ready partner: saves the status, then emails', async () => {
    role = 'admin';
    docStatuses = ['approved', 'approved'];
    const res = await post({ action: 'verify' });
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ partner_status: 'verified' }));
    expect(emailPartnerDecision).toHaveBeenCalledWith('p@x.com', 'Partner One', 'verified');
  });

  it('returns 500 and sends no email when the save fails', async () => {
    role = 'admin';
    docStatuses = ['approved', 'approved'];
    updateError = { message: 'db down' };
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await post({ action: 'verify' });
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Could not save. Please try again.');
    expect(emailPartnerDecision).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it('set_whatsapp rejects an invalid number', async () => {
    role = 'admin';
    const res = await post({ action: 'set_whatsapp', whatsapp_number: '123', whatsapp_alerts: true });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Enter a valid Indian mobile number for WhatsApp.');
    expect(update).not.toHaveBeenCalled();
  });

  it('set_whatsapp saves a normalised number and sets the opt-in time', async () => {
    role = 'admin';
    const res = await post({ action: 'set_whatsapp', whatsapp_number: '98765 43210', whatsapp_alerts: true });
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      whatsapp_number: '919876543210', whatsapp_alerts: true, whatsapp_opt_in_at: expect.any(String), whatsapp_opt_in_by: 'admin',
    }));
  });

  it('set_whatsapp with alerts off saves without a valid number', async () => {
    role = 'admin';
    const res = await post({ action: 'set_whatsapp', whatsapp_number: '123', whatsapp_alerts: false });
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ whatsapp_number: null, whatsapp_alerts: false });
  });

  it('set_whatsapp requires an admin', async () => {
    const res = await post({ action: 'set_whatsapp', whatsapp_alerts: false });
    expect(res.status).toBe(403);
  });

  it('returns 404 for a profile that is not a partner type', async () => {
    role = 'admin';
    partnerType = 'hotel';
    const res = await post({ action: 'set_commission', commission_pct: 10 });
    expect(res.status).toBe(404);
    expect(update).not.toHaveBeenCalled();
  });
});
