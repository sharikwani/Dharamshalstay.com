// tests/api/partner-reviews.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ role: 'partner', partnerType: 'hotel' as string | null, partnerStatus: 'verified', calls: [] as any[][] }));
vi.mock('@/lib/server-auth', async (orig) => {
  const real = await orig<typeof import('@/lib/server-auth')>();
  return {
    ...real,
    requireCaller: async (_req: Request, roles?: string[]) => {
      if (roles && !roles.includes(h.role)) throw new real.HttpError(403, 'You do not have access to this');
      return { user: { id: 'p1' }, profile: { id: 'p1', role: h.role, partner_type: h.partnerType, partner_status: h.partnerStatus } };
    },
  };
});
vi.mock('@/lib/reviews/store', () => ({
  listPartnerReviews: async (ownerId: string) => { h.calls.push(['list', ownerId]); return [{ id: 'r1', property_name: 'Snow View' }]; },
}));
vi.mock('@/lib/reviews/moderate', async () => {
  const { HttpError } = await import('@/lib/server-auth');
  return {
    setReply: async (id: string, who: any, text: string) => {
      h.calls.push(['reply', id, who, text]);
      if (id === '22222222-2222-4222-8222-222222222222') throw new HttpError(404, 'Review not found.');
    },
  };
});

import { GET, POST } from '@/app/api/partner/reviews/route';

const ID = '11111111-1111-4111-8111-111111111111';
const get = () => GET(new Request('http://x'));
const post = (body: unknown) => POST(new Request('http://x', { method: 'POST', body: JSON.stringify(body) }));

beforeEach(() => { h.role = 'partner'; h.partnerType = 'hotel'; h.partnerStatus = 'verified'; h.calls = []; });

describe('partner reviews API', () => {
  it('is for partners only, and not for suspended partners', async () => {
    h.role = 'customer';
    expect((await get()).status).toBe(403);
    h.role = 'partner'; h.partnerStatus = 'suspended';
    expect((await get()).status).toBe(403);
    expect((await post({ review_id: ID, reply: 'Thanks!' })).status).toBe(403);
    expect(h.calls).toEqual([]);
  });

  it("lists reviews of the caller's own properties", async () => {
    const body = await (await get()).json();
    expect(body.reviews).toEqual([{ id: 'r1', property_name: 'Snow View' }]);
    expect(h.calls).toEqual([['list', 'p1']]);
  });

  it('treats a partner without a type as a property owner, and gives activity partners nothing', async () => {
    h.partnerType = null;
    await get();
    expect(h.calls).toEqual([['list', 'p1']]);
    h.calls = []; h.partnerType = 'trek';
    expect((await (await get()).json()).reviews).toEqual([]);
    expect(h.calls).toEqual([]);
  });

  it('replies as the calling partner', async () => {
    expect((await post({ review_id: ID, reply: 'Thanks for staying!' })).status).toBe(200);
    expect(h.calls).toEqual([['reply', ID, { by: 'partner', partnerId: 'p1' }, 'Thanks for staying!']]);
  });

  it("404s for someone else's review and 400s for a bad body", async () => {
    expect((await post({ review_id: '22222222-2222-4222-8222-222222222222', reply: 'Thanks!' })).status).toBe(404);
    expect((await post({ review_id: 'abc', reply: 'Thanks!' })).status).toBe(400);
    expect((await post({ review_id: ID })).status).toBe(400);
  });
});
