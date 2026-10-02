/** Helpers for server components: they receive `lang` as a prop. */
import { getDict } from './dict';
import { localizePath, type Lang } from './core';

export function serverT(lang: Lang) {
  return { lang, t: getDict(lang), href: (p: string) => localizePath(p, lang) };
}
