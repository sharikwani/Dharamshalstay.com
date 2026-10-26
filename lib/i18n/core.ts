/**
 * Bilingual site: English lives at the existing URLs (/hotels, /blog/x ...),
 * Hindi mirrors them under /hi (/hi/hotels, /hi/blog/x ...).
 * Only public content sections are mirrored; account/admin/legal pages stay English.
 */
export type Lang = 'en' | 'hi';
export const LANGS: Lang[] = ['en', 'hi'];
// Set only by the language toggle. Renamed from 'ds_lang', which was also set automatically on any Hindi page view.
export const LANG_COOKIE = 'ds_lang_choice';

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

/** Guides not yet translated: their /hi URL redirects to English. Kept in sync with data/hi by tests/seo/hindi-links.test.ts. */
export const EN_ONLY_POSTS = [
  'budget-hotels-in-dharamshala', 'eating-out-dharamshala-what-it-costs', 'accessibility-dharamshala-limited-mobility',
  'groceries-daily-essentials-dharamshala', 'laundry-luggage-storage-water-dharamshala', 'where-to-stay-in-dharamshala', 'dharamshala-3-day-itinerary', 'mcleod-ganj-in-december', 'tushita-meditation-centre-guide', 'vipassana-dharamkot-dhamma-sikhara', 'dharamshala-skyway-ropeway-guide', 'tibet-museum-dharamshala-guide', 'new-year-in-mcleod-ganj',
  'ramlila-in-dharamshala', 'dharamshala-dussehra-police-ground', 'melas-fairs-dharamshala-kangra',
  'live-music-restaurants-mcleod-ganj',
  'kangra-slate-dharamshala',
  'kullu-dussehra-mela-2026',
  'dharamshala-film-festival-diff-2026',
  'kangra-valley-carnival-2026', 'himachal-snowfall-tracker', 'manali-in-december-january', 'rohtang-pass-atal-tunnel-status',
  'shimla-in-december-christmas-new-year', 'best-places-to-visit-in-himachal-in-winter', 'spiti-valley-in-winter', 'masroor-rock-cut-temple-guide',
  'dharamshala-to-bir', 'pathankot-to-dharamshala', 'baijnath-temple-guide',
];

/** English-only pages inside otherwise bilingual sections. */
export const EN_ONLY_PATHS = ['/hotels/near-dalai-lama-temple', '/hotels/hostels', '/hotels/mountain-view'];

/** Does this English path have a Hindi counterpart? */
export function hasHindiVersion(enPath: string): boolean {
  const p = enPath.split(/[?#]/)[0];
  if (p.startsWith('/blog/') && EN_ONLY_POSTS.includes(p.slice(6))) return false;
  if (EN_ONLY_PATHS.includes(p)) return false;
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
