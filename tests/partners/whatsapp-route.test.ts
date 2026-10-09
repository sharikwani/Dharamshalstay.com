import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  updates: [] as any[],
  current: {} as Record<string, unknown>,
  requireActivityPartner: vi.fn(),
}));

vi.mock('@/lib/server-auth', async (orig) => {
  const actual = await orig<typeof import('@/lib/server-auth')>();
  return {
    ...actual,
    serviceClient: () => ({
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: h.current, error: null }) }) }),
        update: (row: unknown) => { h.updates.push(row); return { eq: async () => ({ error: null }) }; },
      }),
    }),
  };
});
vi.mock('@/lib/partners/load', () => ({ requireActivityPartner: (...a: unknown[]) => h.requireActivityPartner(...a) }));

import { HttpError } from '@/lib/server-auth';
import { GET, PATCH } from '@/app/api/partner/whatsapp/route';

const patch = (body: unknown) => PATCH(new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) }));

beforeEach(() => {
  h.updates.length = 0;
  h.current = { phone: '9876543210', whatsapp_number: null, whatsapp_alerts: false };
  h.requireActivityPartner.mockReset().mockResolvedValue({ profile: { id: 'p1', partner_status: 'verified' } });
});

describe('/api/partner/whatsapp', () => {
  it('works for a verified partner (no editable check)', async () => {
    const res = await patch({ whatsapp_number: '98765 43210', whatsapp_alerts: true });
    expect(res.status).toBe(200);
    expect(h.requireActivityPartner).toHaveBeenCalledTimes(1);
    expect(h.requireActivityPartner.mock.calls[0][1]?.editable).toBeFalsy();
    expect(await res.json()).toEqual({ whatsapp_number: '919876543210', whatsapp_alerts: true, phone: '9876543210' });
  });

  it('stamps opt-in time and source on off → on only', async () => {
    await patch({ whatsapp_number: '9876543210', whatsapp_alerts: true });
    expect(h.updates[0]).toMatchObject({ whatsapp_number: '919876543210', whatsapp_alerts: true, whatsapp_opt_in_by: 'partner' });
    expect(typeof h.updates[0].whatsapp_opt_in_at).toBe('string');
    h.current = { ...h.current, whatsapp_alerts: true, whatsapp_number: '919876543210' };
    await patch({ whatsapp_alerts: true });
    expect(h.updates[1]).not.toHaveProperty('whatsapp_opt_in_at');
    expect(h.updates[1]).not.toHaveProperty('whatsapp_opt_in_by');
  });

  it('requires a valid number to switch alerts on', async () => {
    h.current = { phone: null, whatsapp_number: null, whatsapp_alerts: false };
    const res = await patch({ whatsapp_number: '12345', whatsapp_alerts: true });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Enter a valid Indian mobile number for WhatsApp.');
    expect(h.updates).toHaveLength(0);
  });

  it('switching off never needs a valid number', async () => {
    h.current = { phone: null, whatsapp_number: '919876543210', whatsapp_alerts: true };
    const res = await patch({ whatsapp_number: '12345', whatsapp_alerts: false });
    expect(res.status).toBe(200);
    expect(h.updates[0]).toMatchObject({ whatsapp_number: null, whatsapp_alerts: false });
  });

  it('keeps the saved number when none is sent', async () => {
    h.current = { phone: '9123456780', whatsapp_number: '919876543210', whatsapp_alerts: true };
    await patch({ whatsapp_alerts: false });
    expect(h.updates[0]).toMatchObject({ whatsapp_number: '919876543210', whatsapp_alerts: false });
  });

  it('rejects a bad body', async () => {
    expect((await patch({ whatsapp_alerts: 'yes' })).status).toBe(400);
  });

  it('returns the access error for non-activity partners', async () => {
    h.requireActivityPartner.mockRejectedValue(new HttpError(403, 'This page is for paragliding, taxi and trek partners'));
    expect((await patch({ whatsapp_alerts: true })).status).toBe(403);
    expect((await GET(new Request('http://x'))).status).toBe(403);
  });

  it('GET returns the current settings', async () => {
    h.current = { phone: '9876543210', whatsapp_number: '919876543210', whatsapp_alerts: true };
    const res = await GET(new Request('http://x'));
    expect(await res.json()).toEqual({ whatsapp_number: '919876543210', whatsapp_alerts: true, phone: '9876543210' });
  });
});
