// tests/reviews/resize.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ result: null as Blob | Error | null, calls: [] as any[][] }));
vi.mock('@/lib/client-image', async (orig) => ({
  ...(await orig<typeof import('@/lib/client-image')>()),
  shrinkImage: async (...a: any[]) => {
    h.calls.push(a);
    if (h.result instanceof Error) throw h.result;
    return h.result ?? a[0];
  },
}));

import { shrinkPhoto } from '@/lib/reviews/resize';

const photo = () => new File([new Uint8Array(1000)], 'IMG_0042.JPG', { type: 'image/jpeg' });

beforeEach(() => { h.result = null; h.calls = []; vi.stubGlobal('createImageBitmap', () => {}); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('shrinkPhoto', () => {
  it('sends the re-encoded photo even when it is not smaller, so EXIF is stripped', async () => {
    h.result = new Blob([new Uint8Array(5000)], { type: 'image/webp' });
    const out = await shrinkPhoto(photo());
    expect(out.name).toBe('IMG_0042.webp');
    expect(out.type).toBe('image/webp');
    expect(out.size).toBe(5000);
    expect(h.calls[0][3]).toBe(true); // always re-encode, even a small photo
  });

  it('sends the original when the browser cannot decode the photo', async () => {
    const f = photo();
    h.result = new Error('decode failed');
    expect(await shrinkPhoto(f)).toBe(f);
  });

  it('sends the original when the browser has no image decoding at all', async () => {
    vi.unstubAllGlobals();
    vi.stubGlobal('createImageBitmap', undefined);
    const f = photo();
    expect(await shrinkPhoto(f)).toBe(f);
    expect(h.calls).toEqual([]);
  });
});
