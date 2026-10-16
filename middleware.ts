import { NextResponse, type NextRequest } from 'next/server';
import { LANG_COOKIE, hasHindiVersion, localizePath } from '@/lib/i18n/core';

/**
 * Language routing. The site opens in English unless:
 * - the visitor chose Hindi with the EN | हिं toggle (the only thing that sets the cookie), or
 * - their browser / phone's main language is Hindi (first entry in Accept-Language).
 * Landing on a /hi URL (e.g. from a Hindi search result) shows that Hindi page, but does
 * not save a preference, so the next visit to an English URL is English again.
 * Crawlers are never redirected (Google indexes both versions via hreflang).
 */
const BOT = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|lighthouse|pagespeed|headless|chatgpt|claude|anthropic|perplexity|google-extended|googleother|cohere|meta-external|mistral|ccbot/i;

/** True only when Hindi is the visitor's main language: the highest-priority tag in Accept-Language. */
export function prefersHindi(acceptLanguage: string | null): boolean {
  if (!acceptLanguage) return false;
  let best = '', bestQ = -1;
  acceptLanguage.split(',').forEach((part, i) => {
    const [tag, qPart] = part.trim().toLowerCase().split(';');
    const q = qPart?.trim().startsWith('q=') ? parseFloat(qPart.trim().slice(2)) : 1 - i * 0.001;
    if (tag && q > bestQ) { best = tag; bestQ = q; }
  });
  return best === 'hi' || best.startsWith('hi-');
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Hindi pages are served as they are; visiting one does not change the saved preference.
  if (pathname === '/hi' || pathname.startsWith('/hi/')) return NextResponse.next();

  if (!hasHindiVersion(pathname) || BOT.test(req.headers.get('user-agent') || '')) return NextResponse.next();

  const chosen = req.cookies.get(LANG_COOKIE)?.value;
  if (chosen === 'en') return NextResponse.next();
  if (chosen === 'hi' || (!chosen && prefersHindi(req.headers.get('accept-language')))) {
    const url = req.nextUrl.clone();
    url.pathname = localizePath(pathname, 'hi');
    url.search = search;
    return NextResponse.redirect(url, 307);
  }
  return NextResponse.next();
}

export const config = {
  // Public pages only: skip assets, API, private sections and files with extensions.
  matcher: ['/((?!_next|api|admin|partner|auth|account|booking|images|.*\\..*).*)'],
};
