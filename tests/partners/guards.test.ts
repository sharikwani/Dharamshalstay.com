import { describe, it, expect } from 'vitest';
import { assertEditable } from '@/lib/partners/load';
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
