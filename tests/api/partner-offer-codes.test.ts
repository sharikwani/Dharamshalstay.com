import { describe, expect, it, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  role: 'partner', status: 'verified' as string | null, calls: [] as any[],
  check: { valid: true, code: 'PNV-7K3Q9' } as any, redeem: { ok: true, result: { status: 'redeemed' } } as any,
}));
vi.mock('@/lib/server-auth', async (orig) => {
  const real = await orig<any>();
  return {
    ...real,
    requireCaller: async (_req: Request, roles: string[]) => {
      if (!roles.includes(h.role)) throw new real.HttpError(403, 'You do not have access to this');
      return { user: { id: 'p1' }, profile: { id: 'p1', role: h.role, partner_status: h.status } };
    },
  };
});
vi.mock('@/lib/offers/verify', () => ({
  checkCode: async (...a: any[]) => { h.calls.push(['check', ...a]); return h.check; },
  redeemCode: async (...a: any[]) => { h.calls.push(['redeem', ...a]); return h.redeem; },
}));

import { POST } from '@/app/api/partner/offer-codes/route';

const post = (body: unknown) => POST(new Request('http://x', { method: 'POST', body: JSON.stringify(body), headers: { Authorization: 'Bearer t' } }));

beforeEach(() => { h.role = 'partner'; h.status = 'verified'; h.calls = []; h.redeem = { ok: true, result: { status: 'redeemed' } }; });

describe('POST /api/partner/offer-codes', () => {
  it('rejects non-partners and suspended partners', async () => {
    h.role = 'customer';
    expect((await post({ action: 'check', code: 'PNV-7K3Q9' })).status).toBe(403);
    h.role = 'partner'; h.status = 'suspended';
    expect((await post({ action: 'check', code: 'PNV-7K3Q9' })).status).toBe(403);
    expect(h.calls).toEqual([]);
  });
  it('checks as this partner, so only their own hotels match', async () => {
    const res = await post({ action: 'check', code: 'pnv-7k3q9' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ result: h.check });
    expect(h.calls[0]).toEqual(['check', 'pnv-7k3q9', { viewer: { id: 'p1', role: 'partner' } }]);
  });
  it('marks a code used and passes refusals on', async () => {
    expect((await post({ action: 'redeem', code: 'PNV-7K3Q9' })).status).toBe(200);
    expect(h.calls[0]).toEqual(['redeem', 'PNV-7K3Q9', { id: 'p1', role: 'partner' }]);
    h.redeem = { ok: false, error: 'This code has expired', status: 409, result: { reason: 'expired' } };
    const res = await post({ action: 'redeem', code: 'PNV-7K3Q9' });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'This code has expired', result: { reason: 'expired' } });
  });
  it('does not let partners cancel codes', async () => {
    expect((await post({ action: 'cancel', code: 'PNV-7K3Q9' })).status).toBe(400);
    expect(h.calls).toEqual([]);
  });
});
