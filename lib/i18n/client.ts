'use client';
import { usePathname } from 'next/navigation';
import { langFromPath, localizePath, type Lang } from './core';
import { getDict } from './dict';

/** Current language for client components, derived from the URL (/hi/... = Hindi). */
export function useLang(): Lang {
  return langFromPath(usePathname());
}

/** Dictionary + path helper for client components. */
export function useT() {
  const lang = useLang();
  return { lang, t: getDict(lang), href: (p: string) => localizePath(p, lang) };
}
