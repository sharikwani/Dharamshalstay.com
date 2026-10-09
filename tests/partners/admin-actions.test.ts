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
});
