import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Every public page must be in the sitemap (owner rule: the sitemap is always complete).
 * Pages with [params] are listed from data in lib/sitemap-entries.ts; this checks the fixed pages.
 * A new page that should not be indexed goes in PRIVATE with a reason.
 */
const PRIVATE = [
  '/account', '/admin', '/auth', '/booking', '/claim', '/email', '/partner', '/remove-listing', // signed-in, one-off or tokens
  '/play/host', '/play/certificate', '/play/tv', // host screens, personal certificates and TV pairing (noindex)
  '/stories/share', '/stories/me', // forms and private links
];

function pages(dir: string, base = ''): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return pages(p, f.startsWith('(') ? base : base + '/' + f);
    return f === 'page.tsx' ? [base || '/'] : [];
  });
}

describe('sitemap', () => {
  it('lists every public fixed page', () => {
    const src = readFileSync('lib/sitemap-entries.ts', 'utf8');
    const fixed = pages('app/(site)').filter((p) => !p.includes('[') && !PRIVATE.some((x) => p === x || p.startsWith(x + '/')));
    // Hotel collections (/hotels/hostels...) come from COLLECTIONS.
    const collections = readFileSync('lib/hotels/collections.ts', 'utf8');
    const missing = fixed.filter((p) => p !== '/' && !src.includes(`B + '${p}'`) && !(p.startsWith('/hotels/') && collections.includes(`'${p.slice(8)}'`)));
    expect(missing).toEqual([]);
  });
});
