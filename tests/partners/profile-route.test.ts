import { describe, it, expect, vi, beforeEach } from 'vitest';

const updates: any[] = [];
let currentAlerts = false;
const sb = {
  from: () => ({
    select: () => ({ eq: () => ({ single: async () => ({ data: { whatsapp_alerts: currentAlerts }, error: null }) }) }),
    update: (row: unknown) => { updates.push(row); return { eq: async () => ({ error: null }) }; },
  }),
};

vi.mock('@/lib/server-auth', async (orig) => {
  const actual = await orig<typeof import('@/lib/server-auth')>();
  return { ...actual, serviceClient: () => sb };
});
vi.mock('@/lib/partners/load', () => ({ requireActivityPartner: async () => ({ profile: { id: 'p1' } }) }));

import { PATCH } from '@/app/api/partner/profile/route';

const base = {
  legal_name: 'Ravi Kumar', phone: '9876543210', pan_number: 'ABCDE1234F', payout_method: 'upi',
  account_holder: 'Ravi Kumar', upi_id: 'ravi@okbank',
};
const patch = (extra: Record<string, unknown>) =>
  PATCH(new Request('http://x', { method: 'PATCH', body: JSON.stringify({ ...base, ...extra }) }));

beforeEach(() => { updates.length = 0; currentAlerts = false; });

describe('PATCH /api/partner/profile WhatsApp consent', () => {
  it('rejects an invalid number when alerts are turned on', async () => {
    const res = await patch({ whatsapp_number: '12345', whatsapp_alerts: true });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Enter a valid Indian mobile number for WhatsApp.');
    expect(updates).toHaveLength(0);
  });

  it('normalises the number and records opt-in time when alerts turn on', async () => {
    const res = await patch({ whatsapp_number: '98765 43210', whatsapp_alerts: true });
    expect(res.status).toBe(200);
    expect(updates[0]).toMatchObject({ whatsapp_number: '919876543210', whatsapp_alerts: true });
    expect(typeof updates[0].whatsapp_opt_in_at).toBe('string');
  });

  it('keeps the original opt-in time when alerts were already on', async () => {
    currentAlerts = true;
    await patch({ whatsapp_number: '9876543210', whatsapp_alerts: true });
    expect(updates[0]).not.toHaveProperty('whatsapp_opt_in_at');
  });

  it('turning alerts off keeps the opt-in timestamp', async () => {
    currentAlerts = true;
    const res = await patch({ whatsapp_alerts: false });
    expect(res.status).toBe(200);
    expect(updates[0].whatsapp_alerts).toBe(false);
    expect(updates[0]).not.toHaveProperty('whatsapp_opt_in_at');
  });
});
