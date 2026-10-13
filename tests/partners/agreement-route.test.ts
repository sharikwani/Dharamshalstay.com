import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  ops: [] as any[], claimRows: [{ id: 'p1' }] as any[], claimError: null as any, uploadError: null as any, insertError: null as any,
  emailFails: false, emails: [] as string[], waited: [] as Promise<unknown>[],
}));

vi.mock('@/lib/server-auth', async (orig) => {
  const actual = await orig<typeof import('@/lib/server-auth')>();
  const sb = {
    from: (table: string) => ({
      update: (row: any) => {
        const filters: any[] = [];
        const op = { table, op: 'update', row, filters };
        h.ops.push(op);
        const c: any = {
          eq: (...a: any[]) => { filters.push(['eq', ...a]); return c; },
          in: (...a: any[]) => { filters.push(['in', ...a]); return c; },
          select: async () => ({ data: h.claimError ? null : h.claimRows, error: h.claimError }),
          then: (res: any) => res({ error: null }),
        };
        return c;
      },
      insert: async (row: any) => { h.ops.push({ table, op: 'insert', row }); return { error: h.insertError }; },
    }),
    storage: { from: () => ({
      upload: async (path: string) => { h.ops.push({ op: 'upload', path }); return { error: h.uploadError }; },
      remove: async (paths: string[]) => { h.ops.push({ op: 'remove', paths }); return { error: null }; },
    }) },
  };
  return { ...actual, serviceClient: () => sb, clientIp: () => '1.2.3.4' };
});
vi.mock('@/lib/partners/load', () => ({
  KYC_BUCKET: 'partner-kyc',
  requireActivityPartner: async () => ({
    user: { email: 'r@x.com' },
    profile: { id: 'p1', email: 'r@x.com', legal_name: 'Ravi Kumar', partner_type: 'taxi', partner_status: 'changes_requested', phone: '9816000001' },
  }),
  loadOnboarding: async () => ({
    readyToSign: true, missing: [],
    profile: { id: 'p1', partner_status: 'changes_requested', submitted_at: '2026-10-01T00:00:00Z', verification_note: 'Upload the RC again' },
  }),
}));
vi.mock('@/lib/partners/agreement-pdf', () => ({ renderAgreementPdf: async () => new Uint8Array([37, 80, 68, 70]) }));
vi.mock('@/lib/partners/emails', () => ({
  emailAgreementCopy: async () => { if (h.emailFails) throw new Error('smtp down'); h.emails.push('copy'); },
  emailAdminPartnerSubmitted: async () => { if (h.emailFails) throw new Error('smtp down'); h.emails.push('admin'); },
}));
vi.mock('@vercel/functions', () => ({ waitUntil: (p: Promise<unknown>) => { h.waited.push(p); } }));

import { POST } from '@/app/api/partner/agreement/route';

const sign = async () => {
  const r = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ signed_name: 'Ravi Kumar', accepted: true }) }));
  await Promise.all(h.waited);
  return r;
};

beforeEach(() => {
  Object.assign(h, { ops: [], claimRows: [{ id: 'p1' }], claimError: null, uploadError: null, insertError: null, emailFails: false, emails: [], waited: [] });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('POST /api/partner/agreement', () => {
  it('claims the status change first, then stores the PDF and the signature, then emails', async () => {
    const res = await sign();
    expect(res.status).toBe(200);
    const order = h.ops.map((o) => o.op);
    expect(order).toEqual(['update', 'upload', 'insert']);
    const claim = h.ops[0];
    expect(claim.row).toMatchObject({ partner_status: 'pending_verification', verification_note: null });
    expect(claim.filters).toContainEqual(['in', 'partner_status', ['onboarding', 'changes_requested']]);
    expect(h.emails.sort()).toEqual(['admin', 'copy']);
  });

  it('a second sign while the first holds the claim stores nothing and sends nothing', async () => {
    h.claimRows = [];
    const res = await sign();
    expect(res.status).toBe(409);
    expect(h.ops.map((o) => o.op)).toEqual(['update']);
    expect(h.emails).toEqual([]);
  });

  it('a failed signature insert rolls the status back and removes the uploaded PDF', async () => {
    h.insertError = { message: 'db down' };
    const res = await sign();
    expect(res.status).toBe(500);
    const rollback = h.ops.filter((o) => o.op === 'update')[1];
    expect(rollback.row).toEqual({ partner_status: 'changes_requested', submitted_at: '2026-10-01T00:00:00Z', verification_note: 'Upload the RC again' });
    expect(rollback.filters).toContainEqual(['eq', 'partner_status', 'pending_verification']);
    expect(h.ops.some((o) => o.op === 'remove')).toBe(true);
    expect(h.emails).toEqual([]);
  });

  it('a failed upload rolls the status back', async () => {
    h.uploadError = { message: 'storage down' };
    const res = await sign();
    expect(res.status).toBe(500);
    expect(h.ops.filter((o) => o.op === 'update')).toHaveLength(2);
    expect(h.ops.some((o) => o.op === 'insert')).toBe(false);
  });

  it('failing emails never fail a saved signature', async () => {
    h.emailFails = true;
    const res = await sign();
    expect(res.status).toBe(200);
    expect(h.ops.filter((o) => o.op === 'update')).toHaveLength(1);
  });
});
