import { describe, it, expect, vi } from 'vitest';

const h = vi.hoisted(() => ({ profile: {} as Record<string, unknown> }));
vi.mock('@/lib/server-auth', async (orig) => ({
  ...(await orig<typeof import('@/lib/server-auth')>()),
  requireCaller: async () => ({ user: {}, profile: h.profile }),
}));

import { assertActive, assertEditable, requireActivityPartner } from '@/lib/partners/load';
import { HttpError } from '@/lib/server-auth';

describe('assertEditable', () => {
  it('allows onboarding and changes_requested', () => {
    expect(() => assertEditable('onboarding')).not.toThrow();
    expect(() => assertEditable('changes_requested')).not.toThrow();
  });
  it('blocks edits while under review or after verification', () => {
    for (const s of ['pending_verification', 'verified', 'suspended', 'rejected', null]) {
      try { assertEditable(s); throw new Error('no throw'); }
      catch (e) { expect(e).toBeInstanceOf(HttpError); expect((e as HttpError).status).toBe(409); }
    }
  });
});

describe('assertActive', () => {
  it('lets every other status through', () => {
    for (const s of ['onboarding', 'pending_verification', 'verified', 'changes_requested', null]) expect(() => assertActive(s)).not.toThrow();
  });
  it('blocks suspended and rejected partners with 403', () => {
    for (const [s, msg] of [['suspended', /suspended/], ['rejected', /not approved/]] as const) {
      try { assertActive(s); throw new Error('no throw'); }
      catch (e) { expect(e).toBeInstanceOf(HttpError); expect((e as HttpError).status).toBe(403); expect((e as HttpError).message).toMatch(msg); }
    }
  });
  it('requireActivityPartner applies it only when asked', async () => {
    h.profile = { id: 'p1', partner_type: 'taxi', partner_status: 'suspended' };
    await expect(requireActivityPartner(new Request('http://x'))).resolves.toBeTruthy();
    await expect(requireActivityPartner(new Request('http://x'), { active: true })).rejects.toMatchObject({ status: 403 });
  });
});
