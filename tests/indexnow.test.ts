import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ role: 'admin' }));
vi.mock('@/lib/server-auth', async (orig) => {
  const real = await orig<typeof import('@/lib/server-auth')>();
  return {
    ...real,
    requireCaller: async (_req: Request, roles?: string[]) => {
      if (roles && !roles.includes(h.role)) throw new real.HttpError(403, 'You do not have access to this');
      return { user: { id: 'admin1' }, profile: { id: 'admin1', role: h.role } };
    },
  };
});

import { siteConfig } from '@/lib/config';
import { hotelUrls, pingIndexNow } from '@/lib/indexnow';
import { GET as keyFile } from '@/app/indexnow-key/[key]/route';
import { POST as pingRoute } from '@/app/api/admin/indexnow/route';

const KEY = '0123456789abcdef0123456789abcdef';
beforeEach(() => { h.role = 'admin'; vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { delete process.env.INDEXNOW_KEY; vi.restoreAllMocks(); });

describe('IndexNow', () => {
  it('hotelUrls gives the English and Hindi page', () => {
    expect(hotelUrls('snow-view')).toEqual([siteConfig.url + '/hotels/snow-view', siteConfig.url + '/hi/hotels/snow-view']);
  });

  it('skips without a valid key', async () => {
    const f = vi.fn();
    expect(await pingIndexNow(['https://x'], f as any)).toBe(false);
    process.env.INDEXNOW_KEY = 'short';
    expect(await pingIndexNow(['https://x'], f as any)).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });

  it('posts the IndexNow payload', async () => {
    process.env.INDEXNOW_KEY = KEY;
    const f = vi.fn(async () => new Response(null, { status: 202 }));
    expect(await pingIndexNow(['https://a', 'https://b'], f as any)).toBe(true);
    const [url, init] = f.mock.calls[0] as any[];
    expect(url).toBe('https://api.indexnow.org/indexnow');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      host: new URL(siteConfig.url).host, key: KEY, keyLocation: siteConfig.url + '/' + KEY + '.txt', urlList: ['https://a', 'https://b'],
    });
  });

  it('never throws on a network error or a bad status', async () => {
    process.env.INDEXNOW_KEY = KEY;
    expect(await pingIndexNow(['https://a'], (async () => { throw new Error('offline'); }) as any)).toBe(false);
    expect(await pingIndexNow(['https://a'], (async () => new Response('no', { status: 422 })) as any)).toBe(false);
  });

  it('serves the key file only under its own name', async () => {
    process.env.INDEXNOW_KEY = KEY;
    const ok = keyFile(new Request('http://x'), { params: { key: KEY } });
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe(KEY);
    expect(keyFile(new Request('http://x'), { params: { key: 'f'.repeat(32) } }).status).toBe(404);
    delete process.env.INDEXNOW_KEY;
    expect(keyFile(new Request('http://x'), { params: { key: KEY } }).status).toBe(404);
  });
});

describe('POST /api/admin/indexnow', () => {
  const post = (body: unknown) => pingRoute(new Request('http://x', { method: 'POST', body: JSON.stringify(body), headers: { Authorization: 'Bearer t' } }));

  it('is admin only', async () => {
    h.role = 'partner';
    expect((await post({ slug: 'snow-view' })).status).toBe(403);
  });
  it('rejects a bad slug', async () => {
    expect((await post({ slug: '../etc' })).status).toBe(400);
  });
  it('answers ok even when no key is configured', async () => {
    const res = await post({ slug: 'snow-view' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, sent: false });
  });
});
