import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ approved: true, recent: 0, views: [] as any[], comments: [] as any[], flags: [] as any[], moderation: 'visible' as 'visible' | 'held' }));
vi.mock('@/lib/stories/store', () => ({
  isApproved: async () => h.approved,
  countRecent: async () => h.recent,
  recordView: async (...a: any[]) => { h.views.push(a); return true; },
  setLike: async () => 7,
  addComment: async (r: any) => { h.comments.push(r); return { id: 'c1', created_at: '2026-10-17T00:00:00Z' }; },
  addFlag: async (r: any) => { h.flags.push(r); return { id: 'f1', created_at: '2026-10-17T00:00:00Z' }; },
  liveData: async () => null,
}));
vi.mock('@/lib/stories/ai', () => ({ moderateShort: async () => h.moderation }));

import { POST } from '@/app/api/stories/[id]/route';

const ID = '11111111-1111-4111-8111-111111111111';
const V = '22222222-2222-4222-8222-222222222222';
const call = (body: Record<string, unknown>, headers: Record<string, string> = {}) =>
  POST(new Request('http://x/api/stories/' + ID, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify({ visitor: V, ...body }) }), { params: { id: ID } });

beforeEach(() => Object.assign(h, { approved: true, recent: 0, views: [], comments: [], flags: [], moderation: 'visible' }));

describe('reader actions on a story', () => {
  it('counts a read once with the reader city, but not for bots', async () => {
    await call({ action: 'view' }, { 'x-vercel-ip-city': 'S%C3%A3o%20Paulo', 'x-vercel-ip-country': 'br' });
    expect(h.views[0]).toEqual([ID, V, 'São Paulo', 'BR']);
    const r = await (await call({ action: 'view' }, { 'user-agent': 'Googlebot/2.1' })).json();
    expect(r.counted).toBe(false);
    expect(h.views).toHaveLength(1);
  });
  it('likes return the new total', async () => {
    expect(await (await call({ action: 'like', on: true })).json()).toMatchObject({ likes: 7 });
  });
  it('a prayer flag needs a colour and goes live when it is clean', async () => {
    expect((await call({ action: 'flag', name: 'Ravi', text: 'Safe travels' })).status).toBe(400);
    const r = await (await call({ action: 'flag', name: 'Ravi', text: 'Safe travels', color: 'green' })).json();
    expect(r).toMatchObject({ status: 'visible', item: { color: 'green', text: 'Safe travels' } });
    expect(h.flags[0]).toMatchObject({ story_id: ID, color: 'green', status: 'visible' });
  });
  it('comments the safety check flags wait for the owner', async () => {
    h.moderation = 'held';
    expect(await (await call({ action: 'comment', name: 'Xavi', text: 'something rude' })).json()).toMatchObject({ status: 'held' });
    expect(h.comments[0].status).toBe('held');
  });
  it('rate limits, ignores bots in the honeypot and hides unapproved stories', async () => {
    h.recent = 10;
    expect((await call({ action: 'comment', name: 'Asha', text: 'Lovely' })).status).toBe(429);
    h.recent = 0;
    expect(await (await call({ action: 'comment', name: 'Bot', text: 'spam', website: 'x' })).json()).toMatchObject({ ok: true });
    expect(h.comments).toHaveLength(0);
    h.approved = false;
    expect((await call({ action: 'like' })).status).toBe(404);
  });
});
