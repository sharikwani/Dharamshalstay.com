import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const h = vi.hoisted(() => ({ ops: [] as any[], deleteError: null as any }));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'admin1' } }, error: null }) },
    from: (table: string) => {
      const b: any = {
        select: () => b, eq: () => b,
        single: async () => ({ data: table === 'profiles' ? { role: 'admin' } : { id: 'prop1', name: 'Hill View' }, error: null }),
        update: (row: any) => { h.ops.push({ table, op: 'update', row }); return b; },
        delete: () => { h.ops.push({ table, op: 'delete' }); return { eq: async () => ({ error: h.deleteError }) }; },
        then: (res: any) => res({ error: null }),
      };
      return b;
    },
  }),
}));

import { DELETE } from '@/app/api/admin/properties/[id]/route';

const del = () => DELETE(new Request('http://x', { method: 'DELETE', headers: { authorization: 'Bearer t' } }) as any, { params: { id: 'prop1' } });

beforeEach(() => {
  h.ops = []; h.deleteError = null;
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://supabase.test');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon');
});
afterEach(() => { vi.unstubAllEnvs(); });

describe('DELETE /api/admin/properties/[id]', () => {
  it('deletes in one statement and leaves the references to the database (ON DELETE SET NULL)', async () => {
    const res = await del();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, deleted: 'Hill View' });
    expect(h.ops).toEqual([{ table: 'properties', op: 'delete' }]);
  });

  it('a reference the database still blocks is a 409 and nothing was changed', async () => {
    h.deleteError = { code: '23503', message: 'update or delete on table "properties" violates foreign key constraint "testimonials_property_id_fkey"' };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await del();
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/still linked/);
    expect(h.ops.filter((o) => o.op === 'update')).toEqual([]);
    spy.mockRestore();
  });
});
