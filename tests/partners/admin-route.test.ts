import { describe, it, expect, vi, beforeEach } from 'vitest';

let role = 'partner';
const emailPartnerDecision = vi.fn(async () => {});
const update = vi.fn();
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
    profile: { id: 'p1', email: 'p@x.com', legal_name: 'Partner One', partner_status: 'pending_verification' },
    documents: [{ id: 'd1', status: 'approved' }, { id: 'd2', status: 'pending' }],
    agreements: [{ id: 'a1' }],
    missing: [],
  }),
}));
vi.mock('@/lib/partners/emails', () => ({ emailPartnerDecision: (...a: unknown[]) => emailPartnerDecision(...(a as [])) }));

import { GET } from '@/app/api/admin/partners/route';
import { POST } from '@/app/api/admin/partners/[id]/route';

beforeEach(() => { role = 'partner'; emailPartnerDecision.mockClear(); update.mockClear(); });

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
});
