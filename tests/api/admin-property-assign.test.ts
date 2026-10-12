import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  pages: [] as any[][], updates: [] as any[], listCalls: [] as any[],
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: (_url: string, key: string) => {
    const b: any = {
      select: () => b, eq: () => b,
      single: async () => ({ data: { id: 'spoofed-profile', role: 'admin' }, error: null }),
      update: (row: any) => { h.updates.push(row); return b; },
    };
    return {
      from: () => b,
      auth: {
        getUser: async () => ({ data: { user: key === 'anon' ? { id: 'admin1' } : null } }),
        admin: {
          listUsers: async (p: { page: number; perPage: number }) => {
            h.listCalls.push(p);
            const users = h.pages[p.page - 1] ?? [];
            return { data: { users, nextPage: p.page < h.pages.length ? p.page + 1 : null, lastPage: h.pages.length }, error: null };
          },
        },
      },
    };
  },
}));

import { PATCH } from '@/app/api/admin/properties/[id]/assign/route';

const patch = (owner_email: string) => PATCH(
  new Request('http://x', { method: 'PATCH', headers: { authorization: 'Bearer t' }, body: JSON.stringify({ owner_email }) }) as any,
  { params: { id: 'prop1' } },
);

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://sb'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'service'; process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  h.pages = []; h.updates.length = 0; h.listCalls.length = 0;
});

describe('PATCH /api/admin/properties/:id/assign', () => {
  it('links the owner found by confirmed auth email, across pages', async () => {
    h.pages = [
      [{ id: 'u1', email: 'someone@x.com', email_confirmed_at: '2026-01-01' }],
      [{ id: 'u2', email: 'Owner@X.com', email_confirmed_at: '2026-01-01' }],
    ];
    const res = await patch(' owner@x.com ');
    expect(res.status).toBe(200);
    expect(h.updates[0]).toMatchObject({ owner_email: 'owner@x.com', owner_id: 'u2' });
    expect(h.listCalls.map((c) => c.page)).toEqual([1, 2]);
  });
  it('does not link an owner whose email is not confirmed', async () => {
    h.pages = [[{ id: 'u2', email: 'owner@x.com', email_confirmed_at: null }]];
    await patch('owner@x.com');
    expect(h.updates[0]).toMatchObject({ owner_email: 'owner@x.com' });
    expect(h.updates[0]).not.toHaveProperty('owner_id');
  });
  it('does not link when no auth user has that email', async () => {
    h.pages = [[{ id: 'u1', email: 'someone@x.com', email_confirmed_at: '2026-01-01' }]];
    await patch('owner@x.com');
    expect(h.updates[0]).not.toHaveProperty('owner_id');
  });
});
