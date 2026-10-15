import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const h = vi.hoisted(() => ({ inserted: [] as any[], insertError: null as any, alerts: [] as string[] }));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({ insert: (row: any) => {
      h.inserted.push(row);
      return { select: () => ({ single: async () => ({ data: h.insertError ? null : { id: row.id || 'new-id' }, error: h.insertError }) }) };
    } }),
  }),
}));
vi.mock('@/lib/background', () => ({ inBackground: (_l: string, work: () => unknown) => { work(); } }));
vi.mock('@/lib/listings/enquiry-alert', () => ({ alertHotelOfEnquiry: async (id: string) => { h.alerts.push(id); return { sent: true }; } }));

import { POST } from '@/app/api/inquiries/route';

const ID = '88888888-8888-4888-8888-888888888888';
const body = (over: Record<string, any> = {}) => ({ type: 'general', name: 'Asha Rao', phone: '9876543210', message: 'Hi', ...over });
const post = (b: unknown) => POST(new Request('http://x/api/inquiries', { method: 'POST', body: JSON.stringify(b) }) as any);

beforeEach(() => {
  h.inserted = []; h.insertError = null; h.alerts = [];
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://supabase.test');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('POST /api/inquiries', () => {
  it('saves the enquiry under the id the form sent', async () => {
    const res = await post(body({ id: ID }));
    expect(res.status).toBe(200);
    expect(h.inserted[0]).toMatchObject({ id: ID, name: 'Asha Rao', status: 'new' });
  });

  it('works without an id too', async () => {
    expect((await post(body())).status).toBe(200);
    expect(h.inserted[0]).not.toHaveProperty('id');
  });

  it('rejects an id that is not a uuid', async () => {
    expect((await post(body({ id: 'abc' }))).status).toBe(400);
    expect(h.inserted).toEqual([]);
  });

  it('a failed insert is a 500, not a false success', async () => {
    h.insertError = { code: '08006', message: 'connection lost' };
    const res = await post(body({ id: ID }));
    expect(res.status).toBe(500);
  });

  it('a retry of an enquiry that already saved (same id) is a success', async () => {
    h.insertError = { code: '23505', message: 'duplicate key value violates unique constraint "inquiries_pkey"' };
    const res = await post(body({ id: ID }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it('a hotel enquiry alerts the hotel; other enquiries do not', async () => {
    const PROP = '77777777-7777-4777-8777-777777777777';
    await post(body({ id: ID, type: 'hotel', property_id: PROP }));
    expect(h.alerts).toEqual([ID]);
    await post(body({ type: 'general' }));
    expect(h.alerts).toEqual([ID]);
  });

  it('a unique violation without an id is still a failure', async () => {
    h.insertError = { code: '23505', message: 'duplicate' };
    expect((await post(body())).status).toBe(500);
  });
});
