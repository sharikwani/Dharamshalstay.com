import { NextResponse, type NextRequest } from 'next/server';
import { LANG_COOKIE, hasHindiVersion, localizePath } from '@/lib/i18n/core';

/**
 * Language routing:
 * - A visitor who chose a language (toggle sets the cookie) always gets it.
 * - First-time visitors whose browser prefers Hindi over English are sent to
 *   the Hindi page once; we remember that in the cookie.
 * - Crawlers are never redirected (Google indexes both versions via hreflang).
 */
const BOT = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|lighthouse|pagespeed|headless/i;

function prefersHindi(acceptLanguage: string | null): boolean {
  if (!acceptLanguage) return false;
  let hi = 0, en = 0;
  acceptLanguage.split(',').forEach((part, i) => {
    const [tag, qPart] = part.trim().toLowerCase().split(';');
    const q = qPart?.startsWith('q=') ? parseFloat(qPart.slice(2)) : 1 - i * 0.001;
    if (tag.startsWith('hi')) hi = Math.max(hi, q);
    if (tag.startsWith('en')) en = Math.max(en, q);
  });
  return hi > 0 && hi >= en;
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Hindi pages: remember the choice for next time.
  if (pathname === '/hi' || pathname.startsWith('/hi/')) {
    const res = NextResponse.next();
    if (req.cookies.get(LANG_COOKIE)?.value !== 'hi') res.cookies.set(LANG_COOKIE, 'hi', { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
    return res;
  }

  if (!hasHindiVersion(pathname) || BOT.test(req.headers.get('user-agent') || '')) return NextResponse.next();

  const chosen = req.cookies.get(LANG_COOKIE)?.value;
  if (chosen === 'en') return NextResponse.next();
  if (chosen === 'hi' || (!chosen && prefersHindi(req.headers.get('accept-language')))) {
    const url = req.nextUrl.clone();
    url.pathname = localizePath(pathname, 'hi');
    url.search = search;
    const res = NextResponse.redirect(url, 307);
    res.cookies.set(LANG_COOKIE, 'hi', { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
    return res;
  }
  return NextResponse.next();
}

export const config = {
  // Public pages only: skip assets, API, private sections and files with extensions.
  matcher: ['/((?!_next|api|admin|partner|auth|account|booking|images|.*\\..*).*)'],
};
