/**
 * IndexNow (Bing, Yandex, Seznam, Naver...): tell search engines a page changed so they recrawl it
 * quickly. Key file: /<INDEXNOW_KEY>.txt (next.config.js rewrites it to app/indexnow-key).
 */
import { siteConfig } from './config';
import { localizePath } from './i18n/core';

const KEY_RE = /^[a-f0-9]{32}$/;
export const indexNowKey = () => (process.env.INDEXNOW_KEY || '').trim();

export function hotelUrls(slug: string): string[] {
  const p = '/hotels/' + slug;
  return [siteConfig.url + p, siteConfig.url + localizePath(p, 'hi')];
}

/** Never throws. False when no valid key is configured or the ping failed. */
export async function pingIndexNow(urls: string[], fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const key = indexNowKey();
  if (!KEY_RE.test(key) || !urls.length) return false;
  try {
    const res = await fetchImpl('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: new URL(siteConfig.url).host, key, keyLocation: siteConfig.url + '/' + key + '.txt', urlList: urls }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error('IndexNow ping failed:', res.status);
    return res.ok;
  } catch (e) {
    console.error('IndexNow ping failed:', e);
    return false;
  }
}
