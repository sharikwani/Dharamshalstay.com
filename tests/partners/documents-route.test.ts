import { describe, it, expect, vi, beforeEach } from 'vitest';

const remove = vi.fn(async () => ({ error: null }));
const upload = vi.fn(async () => ({ error: null }));
let deleteError: any = null;
let docRow: any = null;

// Minimal chainable stand-in: .eq('partner_id', x) filters like the real query; .single() resolves to the row or null.
let ownerMismatch = false;
const builder: any = {
  select: () => builder,
  delete: () => ({ eq: async () => ({ error: deleteError }) }),
  eq: (col: string, val: string) => {
    if (col === 'partner_id' && docRow && docRow.partner_id !== val) ownerMismatch = true;
    return builder;
  },
  single: async () => {
    const miss = ownerMismatch;
    ownerMismatch = false;
    return { data: miss ? null : docRow, error: null };
  },
};
const sb = { from: () => builder, storage: { from: () => ({ remove, upload }) } };

vi.mock('@/lib/server-auth', async (orig) => {
  const actual = await orig<typeof import('@/lib/server-auth')>();
  return {
    ...actual,
    serviceClient: () => sb,
    requireCaller: async () => ({ user: {}, profile: { id: 'partner-A', partner_type: 'taxi', partner_status: 'onboarding' } }),
  };
});

import { DELETE } from '@/app/api/partner/documents/[id]/route';
import { POST } from '@/app/api/partner/documents/route';

beforeEach(() => { remove.mockClear(); upload.mockClear(); docRow = null; ownerMismatch = false; deleteError = null; });

describe('partner documents routes', () => {
  it('returns 404 and removes nothing when the document belongs to another partner', async () => {
    docRow = { id: 'doc-1', partner_id: 'partner-B', storage_path: 'partner-B/x.pdf', status: 'pending' };
    const res = await DELETE(new Request('http://x', { method: 'DELETE' }), { params: { id: 'doc-1' } });
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('Document not found.');
    expect(remove).not.toHaveBeenCalled();
  });

  it('rejects a 9 MB upload with the size message', async () => {
    const form = new FormData();
    form.set('doc_type', 'pan');
    form.set('file', new File([new Uint8Array(9 * 1024 * 1024)], 'big.pdf', { type: 'application/pdf' }));
    const res = await POST(new Request('http://x', { method: 'POST', body: form }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('File is too big. The limit is 8 MB.');
  });

  it('returns 500 and keeps the stored file when the row delete fails', async () => {
    docRow = { id: 'doc-1', partner_id: 'partner-A', storage_path: 'partner-A/x.pdf', status: 'pending' };
    deleteError = { message: 'db down' };
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await DELETE(new Request('http://x', { method: 'DELETE' }), { params: { id: 'doc-1' } });
    log.mockRestore();
    expect(res.status).toBe(500);
    expect(remove).not.toHaveBeenCalled();
  });

  it('rejects an impossible expiry date before uploading anything', async () => {
    const form = new FormData();
    form.set('doc_type', 'pan');
    form.set('expires_on', '2026-13-45');
    form.set('file', new File([new Uint8Array(10)], 'ok.pdf', { type: 'application/pdf' }));
    const res = await POST(new Request('http://x', { method: 'POST', body: form }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Expiry date is not valid.');
    expect(upload).not.toHaveBeenCalled();
  });
});
