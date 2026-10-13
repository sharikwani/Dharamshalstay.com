import { describe, it, expect } from 'vitest';
import { canVerify } from '@/lib/partners/admin-actions';

const ok = { documents: [{ status: 'approved' }, { status: 'approved' }], agreements: [{}], missing: [] };
describe('canVerify', () => {
  it('passes when every document is approved and the agreement is signed', () => expect(canVerify(ok)).toBeNull());
  it('blocks pending or rejected documents', () => {
    expect(canVerify({ ...ok, documents: [{ status: 'approved' }, { status: 'pending' }] })).toMatch(/approve every document/i);
  });
  it('blocks a missing agreement or checklist items', () => {
    expect(canVerify({ ...ok, agreements: [] })).toMatch(/agreement/i);
    expect(canVerify({ ...ok, missing: [{ key: 'vehicle' }] })).toMatch(/incomplete/i);
  });
  it('needs a signature from the latest submission, not an older one', () => {
    const profile = { submitted_at: '2026-10-10T08:00:00.000Z' };
    // Re-sign interrupted: submitted_at moved on, but only the old signature exists.
    expect(canVerify({ ...ok, profile, agreements: [{ signed_at: '2026-10-01T08:00:00+00:00' }] })).toMatch(/latest submission/i);
    // The same instant written in the database's own format still counts.
    expect(canVerify({ ...ok, profile, agreements: [{ signed_at: '2026-10-01T08:00:00+00:00' }, { signed_at: '2026-10-10T08:00:00+00:00' }] })).toBeNull();
    expect(canVerify({ ...ok, profile: { submitted_at: null }, agreements: [{ signed_at: '2020-01-01T00:00:00Z' }] })).toBeNull();
  });
});
