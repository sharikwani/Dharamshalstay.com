import { describe, it, expect, vi, beforeEach } from 'vitest';

let role = 'partner';
const emailPartnerDecision = vi.fn(async () => {});
let updateError: any = null;
let partnerType = 'taxi';
let docStatuses = ['approved', 'pending'];
let partnerStatus = 'pending_verification';
// Conditional updates: .eq() filters are recorded; .select('id') returns the rows that changed.
let changedRows: any[] = [{ id: 'p1' }];
const updateFilters: unknown[][] = [];
const update = vi.fn((_patch: unknown) => {
  const c: any = {
    eq: (...a: unknown[]) => { updateFilters.push(a); return c; },
    select: async () => ({ data: updateError ? null : changedRows, error: updateError }),
    then: (res: any) => res({ error: updateError }),
  };
  return c;
});
// Each loadOnboarding call takes the next status from this queue (the last one repeats); 'throw' fails the load.
let statusQueue: string[] = [];
let emailWaits: Promise<unknown>[] = [];
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
  loadOnboarding: async () => {
    const next = statusQueue.length > 1 ? statusQueue.shift()! : statusQueue[0];
    if (next === 'throw') throw new Error('slow database');
    return {
    profile: { id: 'p1', email: 'p@x.com', legal_name: 'Partner One', partner_status: next ?? partnerStatus, partner_type: partnerType },
    documents: docStatuses.map((status, i) => ({ id: 'd' + i, status })),
    agreements: [{ id: 'a1' }],
    missing: [],
    };
  },
}));
vi.mock('@vercel/functions', () => ({ waitUntil: (p: Promise<unknown>) => { emailWaits.push(p); } }));
vi.mock('@/lib/partners/emails', () => ({ emailPartnerDecision: (...a: unknown[]) => emailPartnerDecision(...(a as [])) }));

import { GET } from '@/app/api/admin/partners/route';
import { POST } from '@/app/api/admin/partners/[id]/route';

beforeEach(() => { changedRows = [{ id: 'p1' }]; updateFilters.length = 0; statusQueue = []; emailWaits = []; role = 'partner'; updateError = null; partnerType = 'taxi'; docStatuses = ['approved', 'pending']; partnerStatus = 'pending_verification'; emailPartnerDecision.mockClear(); update.mockClear(); });

const post = async (body: unknown) => {
  const r = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify(body) }), { params: { id: 'p1' } });
  await Promise.all(emailWaits);
  return r;
};

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

  it('only verifies partners waiting for review', async () => {
    role = 'admin';
    docStatuses = ['approved', 'approved'];
    for (const s of ['rejected', 'suspended', 'onboarding', 'changes_requested', 'verified']) {
      partnerStatus = s;
      const res = await post({ action: 'verify' });
      expect(res.status).toBe(409);
      expect((await res.json()).error).toMatch(/waiting for review/);
    }
    expect(update).not.toHaveBeenCalled();
    expect(emailPartnerDecision).not.toHaveBeenCalled();
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

  it('a decision only changes the status it was made on', async () => {
    role = 'admin';
    docStatuses = ['approved', 'approved'];
    await post({ action: 'verify' });
    expect(updateFilters).toContainEqual(['partner_status', 'pending_verification']);
  });

  it('a decision another admin already made is not an error and sends no second email', async () => {
    role = 'admin';
    docStatuses = ['approved', 'approved'];
    changedRows = [];
    statusQueue = ['pending_verification', 'verified'];
    const res = await post({ action: 'verify' });
    expect(res.status).toBe(200);
    expect((await res.json()).profile.partner_status).toBe('verified');
    expect(emailPartnerDecision).not.toHaveBeenCalled();
  });

  it('a status changed meanwhile to something else is a 409 and sends no email', async () => {
    role = 'admin';
    changedRows = [];
    statusQueue = ['pending_verification', 'suspended'];
    const res = await post({ action: 'reject', note: 'Not a real company' });
    expect(res.status).toBe(409);
    expect(emailPartnerDecision).not.toHaveBeenCalled();
  });

  it('repeating a decision already in place changes nothing and sends no email', async () => {
    role = 'admin';
    partnerStatus = 'changes_requested';
    const res = await post({ action: 'request_changes', note: 'Upload the RC again' });
    expect(res.status).toBe(200);
    expect(update).not.toHaveBeenCalled();
    expect(emailPartnerDecision).not.toHaveBeenCalled();
  });

  it('a failing email never turns a saved decision into an error', async () => {
    role = 'admin';
    emailPartnerDecision.mockImplementationOnce(async () => { throw new Error('smtp down'); });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await post({ action: 'suspend', note: 'Complaints from guests' });
    expect(res.status).toBe(200);
    expect(emailPartnerDecision).toHaveBeenCalledTimes(1);
    log.mockRestore();
  });

  it('a failing reload after a saved decision still answers success', async () => {
    role = 'admin';
    statusQueue = ['pending_verification', 'throw'];
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await post({ action: 'reject', note: 'Not a real company' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ saved: true, reload: true });
    expect(emailPartnerDecision).toHaveBeenCalledTimes(1);
    log.mockRestore();
  });

  it('set_whatsapp rejects an invalid number', async () => {
    role = 'admin';
    const res = await post({ action: 'set_whatsapp', whatsapp_number: '123', whatsapp_alerts: true });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Enter a valid Indian mobile number for WhatsApp.');
    expect(update).not.toHaveBeenCalled();
  });

  it('set_whatsapp saves a normalised number and sets the opt-in time', async () => {
    role = 'admin';
    const res = await post({ action: 'set_whatsapp', whatsapp_number: '98765 43210', whatsapp_alerts: true });
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      whatsapp_number: '919876543210', whatsapp_alerts: true, whatsapp_opt_in_at: expect.any(String), whatsapp_opt_in_by: 'admin',
    }));
  });

  it('set_whatsapp with alerts off saves without a valid number', async () => {
    role = 'admin';
    const res = await post({ action: 'set_whatsapp', whatsapp_number: '123', whatsapp_alerts: false });
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ whatsapp_number: null, whatsapp_alerts: false });
  });

  it('set_whatsapp requires an admin', async () => {
    const res = await post({ action: 'set_whatsapp', whatsapp_alerts: false });
    expect(res.status).toBe(403);
  });

  it('returns 404 for a profile that is not a partner type', async () => {
    role = 'admin';
    partnerType = 'hotel';
    const res = await post({ action: 'set_commission', commission_pct: 10 });
    expect(res.status).toBe(404);
    expect(update).not.toHaveBeenCalled();
  });
});
