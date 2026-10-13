import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ role: 'admin', calls: [] as any[][], count: { count: 4 as number | null, error: null as any } }));
vi.mock('@/lib/server-auth', async (orig) => {
  const real = await orig<typeof import('@/lib/server-auth')>();
  return {
    ...real,
    requireCaller: async (_req: Request, roles?: string[]) => {
      if (roles && !roles.includes(h.role)) throw new real.HttpError(403, 'You do not have access to this');
      return { user: { id: 'admin1' }, profile: { id: 'admin1', role: h.role } };
    },
    serviceClient: () => ({
      from: (t: string) => {
        const b: any = {};
        b.select = (...a: any[]) => { h.calls.push(['count', t, 'select', ...a]); return b; };
        b.eq = (...a: any[]) => { h.calls.push(['count', t, 'eq', ...a]); return Promise.resolve(h.count); };
        return b;
      },
    }),
  };
});
vi.mock('@/lib/reviews/store', () => ({
  listAdminReviews: async (status: string) => { h.calls.push(['list', status]); return [{ id: 'r1', status }]; },
}));
vi.mock('@/lib/reviews/moderate', async () => {
  const { HttpError } = await import('@/lib/server-auth');
  return {
    setReviewStatus: async (id: string, status: string, adminId: string) => {
      h.calls.push(['status', id, status, adminId]);
      if (id === '22222222-2222-4222-8222-222222222222') throw new HttpError(404, 'Review not found.');
      return { count: 3, average: 4.7 };
    },
    setReply: async (id: string, who: any, text: string) => { h.calls.push(['reply', id, who, text]); },
  };
});

import { GET } from '@/app/api/admin/reviews/route';
import { PATCH } from '@/app/api/admin/reviews/[id]/route';
import { GET as COUNT } from '@/app/api/admin/reviews/count/route';

const ID = '11111111-1111-4111-8111-111111111111';
const patch = (id: string, body: unknown) =>
  PATCH(new Request('http://x', { method: 'PATCH', body: JSON.stringify(body), headers: { Authorization: 'Bearer t' } }), { params: { id } });

beforeEach(() => { h.role = 'admin'; h.calls = []; h.count = { count: 4, error: null }; });

describe('admin reviews API', () => {
  it('is admin only', async () => {
    h.role = 'partner';
    expect((await GET(new Request('http://x/api/admin/reviews'))).status).toBe(403);
    expect((await patch(ID, { status: 'approved' })).status).toBe(403);
    expect(h.calls).toEqual([]);
  });

  it('lists pending reviews by default and rejects an unknown status', async () => {
    const body = await (await GET(new Request('http://x/api/admin/reviews'))).json();
    expect(body.reviews).toEqual([{ id: 'r1', status: 'pending' }]);
    await GET(new Request('http://x/api/admin/reviews?status=hidden'));
    expect(h.calls).toContainEqual(['list', 'hidden']);
    expect((await GET(new Request('http://x/api/admin/reviews?status=deleted'))).status).toBe(400);
  });

  it('approves and hides as the signed-in admin', async () => {
    const res = await patch(ID, { status: 'approved' });
    expect(await res.json()).toEqual({ ok: true, summary: { count: 3, average: 4.7 } });
    expect(h.calls).toContainEqual(['status', ID, 'approved', 'admin1']);
    await patch(ID, { status: 'hidden' });
    expect(h.calls).toContainEqual(['status', ID, 'hidden', 'admin1']);
  });

  it('saves the owner reply', async () => {
    expect((await patch(ID, { owner_reply: 'Thank you!' })).status).toBe(200);
    expect(h.calls).toContainEqual(['reply', ID, { by: 'owner' }, 'Thank you!']);
  });

  it('rejects a bad id, an unknown status and a mixed body', async () => {
    expect((await patch('abc', { status: 'approved' })).status).toBe(400);
    expect((await patch(ID, { status: 'deleted' })).status).toBe(400);
    expect((await patch(ID, { status: 'approved', owner_reply: 'x' })).status).toBe(400);
    expect(h.calls).toEqual([]);
  });

  it('passes a 404 through', async () => {
    expect((await patch('22222222-2222-4222-8222-222222222222', { status: 'approved' })).status).toBe(404);
  });

  it('counts pending reviews for the nav badge, admin only', async () => {
    const res = await COUNT(new Request('http://x/api/admin/reviews/count'));
    expect(await res.json()).toEqual({ pending: 4 });
    expect(h.calls).toContainEqual(['count', 'hotel_reviews', 'select', 'id', { count: 'exact', head: true }]);
    expect(h.calls).toContainEqual(['count', 'hotel_reviews', 'eq', 'status', 'pending']);
    h.role = 'partner'; h.calls = [];
    expect((await COUNT(new Request('http://x/api/admin/reviews/count'))).status).toBe(403);
    expect(h.calls).toEqual([]);
  });

  it('reports 0 pending when the count fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    h.count = { count: null, error: { message: 'permission denied' } };
    const res = await COUNT(new Request('http://x/api/admin/reviews/count'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ pending: 0 });
  });
});
