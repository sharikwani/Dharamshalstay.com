import { describe, expect, it, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({ role: 'admin', conv: null as any, sent: [] as any[], out: [] as any[], statuses: [] as any[], settingsUpdate: null as any }));
vi.mock('@/lib/server-auth', async (orig) => {
  const real = await orig<any>();
  return {
    ...real,
    requireCaller: async (_req: Request, roles: string[]) => {
      if (!roles.includes(h.role)) throw new real.HttpError(403, 'Forbidden');
      return { user: { id: 'admin1' }, profile: { id: 'admin1', role: h.role } };
    },
    serviceClient: () => ({
      from: (t: string) => {
        const b: any = {
          select: () => b, eq: () => b, order: () => b, limit: () => b, in: () => b,
          maybeSingle: async () => ({ data: t === 'whatsapp_conversations' ? h.conv : { ai_mode: 'test', test_numbers: [] }, error: null }),
          update: (row: any) => { if (t === 'whatsapp_settings') h.settingsUpdate = row; return { eq: async () => ({ error: null }) }; },
          then: (res: any) => res({ data: [], error: null }),
        };
        return b;
      },
    }),
  };
});
vi.mock('@/lib/whatsapp-cloud', () => ({ sendText: async (to: string, b: string) => { h.sent.push([to, b]); return { ok: true, id: 'w9' }; } }));
vi.mock('@/lib/wa-chat/store', () => ({
  saveOutbound: async (...a: any[]) => { h.out.push(a); }, setStatus: async (...a: any[]) => { h.statuses.push(a); }, history: async () => [],
}));

import { POST as sendMsg } from '@/app/api/admin/whatsapp/conversations/[id]/messages/route';
import { PATCH as patchSettings } from '@/app/api/admin/whatsapp/settings/route';
import { PATCH as patchConv } from '@/app/api/admin/whatsapp/conversations/[id]/route';

const id = '11111111-1111-4111-8111-111111111111';
const req = (body: any) => new Request('http://x', { method: 'POST', body: JSON.stringify(body), headers: { Authorization: 'Bearer t' } });
beforeEach(() => {
  h.role = 'admin'; h.sent = []; h.out = []; h.statuses = []; h.settingsUpdate = null;
  h.conv = { id, phone: '919800000001', status: 'needs_human', last_customer_at: new Date().toISOString() };
});

describe('admin whatsapp api', () => {
  it('only admins may send', async () => {
    h.role = 'partner';
    expect((await sendMsg(req({ text: 'Hi' }), { params: { id } })).status).toBe(403);
    expect(h.sent).toEqual([]);
  });
  it('sends a reply and takes over the chat', async () => {
    const res = await sendMsg(req({ text: 'Hi, Sharik here' }), { params: { id } });
    expect(res.status).toBe(200);
    expect(h.sent).toEqual([['919800000001', 'Hi, Sharik here']]);
    expect(h.out[0]).toEqual([id, 'admin', 'Hi, Sharik here', 'w9', undefined, 'admin1']);
    expect(h.statuses[0]).toEqual([id, 'human', null]);
  });
  it('refuses outside the 24-hour window', async () => {
    h.conv.last_customer_at = new Date(Date.now() - 25 * 3600e3).toISOString();
    expect((await sendMsg(req({ text: 'Hi' }), { params: { id } })).status).toBe(409);
    expect(h.sent).toEqual([]);
  });
  it('rejects empty messages', async () => {
    expect((await sendMsg(req({ text: '   ' }), { params: { id } })).status).toBe(400);
  });
  it('hands a chat back to the AI', async () => {
    expect((await patchConv(req({ status: 'ai' }), { params: { id } })).status).toBe(200);
    expect(h.statuses[0]).toEqual([id, 'ai', null]);
    expect((await patchConv(req({ status: 'needs_human' }), { params: { id } })).status).toBe(400);
  });
  it('normalises test numbers and rejects bad ones', async () => {
    expect((await patchSettings(req({ ai_mode: 'test', test_numbers: ['98057 00665'] }))).status).toBe(200);
    expect(h.settingsUpdate).toMatchObject({ ai_mode: 'test', test_numbers: ['919805700665'] });
    expect((await patchSettings(req({ ai_mode: 'test', test_numbers: ['123'] }))).status).toBe(400);
  });
});
