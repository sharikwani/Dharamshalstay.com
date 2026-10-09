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

  it('returns 404 for a profile that is not a partner type', async () => {
    role = 'admin';
    partnerType = 'hotel';
    const res = await post({ action: 'set_commission', commission_pct: 10 });
    expect(res.status).toBe(404);
    expect(update).not.toHaveBeenCalled();
  });
});
