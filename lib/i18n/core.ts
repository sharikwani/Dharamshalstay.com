/**
 * Bilingual site: English lives at the existing URLs (/hotels, /blog/x ...),
 * Hindi mirrors them under /hi (/hi/hotels, /hi/blog/x ...).
 * Only public content sections are mirrored; account/admin/legal pages stay English.
 */
export type Lang = 'en' | 'hi';
export const LANGS: Lang[] = ['en', 'hi'];
export const LANG_COOKIE = 'ds_lang';

/** Public sections that have a Hindi version. */
const HINDI_SECTIONS = ['/', '/hotels', '/destinations', '/treks', '/taxi', '/paragliding', '/blog', '/faq', '/essentials', '/about', '/contact'];

export function langFromPath(pathname: string | null | undefined): Lang {
  return pathname === '/hi' || pathname?.startsWith('/hi/') ? 'hi' : 'en';
}

/** '/hi/blog/x' -> '/blog/x', '/hi' -> '/' */
export function stripLang(pathname: string): string {
  if (pathname === '/hi') return '/';
  return pathname.startsWith('/hi/') ? pathname.slice(3) : pathname;
}

/** Does this English path have a Hindi counterpart? */
export function hasHindiVersion(enPath: string): boolean {
  const p = enPath.split(/[?#]/)[0];
  return HINDI_SECTIONS.some((s) => (s === '/' ? p === '/' : p === s || p.startsWith(s + '/')));
}

/** Map an English path to the given language (paths without a Hindi page stay English). */
export function localizePath(enPath: string, lang: Lang): string {
  if (lang === 'en' || !enPath.startsWith('/') || !hasHindiVersion(enPath)) return enPath;
  return enPath === '/' ? '/hi' : '/hi' + enPath;
}

/** Language switch target for the current page. */
export function switchLangPath(pathname: string, to: Lang): string {
  const en = stripLang(pathname);
  return to === 'en' ? en : localizePath(en, 'hi');
}

export const HTML_LANG: Record<Lang, string> = { en: 'en-IN', hi: 'hi-IN' };
