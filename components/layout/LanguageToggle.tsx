'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { LANG_COOKIE, HTML_LANG, hasHindiVersion, langFromPath, stripLang, switchLangPath, type Lang } from '@/lib/i18n/core';

function setLangCookie(lang: Lang) {
  document.cookie = LANG_COOKIE + '=' + lang + '; path=/; max-age=' + 60 * 60 * 24 * 365 + '; samesite=lax';
}

/** EN | हिं switch. Real links, so search engines can follow them to the other language. Remembers the choice; pages without a Hindi version stay English. */
export default function LanguageToggle({ className = '' }: { className?: string }) {
  const pathname = usePathname() || '/';
  const lang = langFromPath(pathname);
  const available = hasHindiVersion(stripLang(pathname));

  // Keep <html lang> correct for screen readers and translation tools.
  useEffect(() => { document.documentElement.lang = HTML_LANG[lang]; }, [lang]);

  const link = (to: Lang, label: string, title: string) => (
    <Link href={to === lang ? pathname : switchLangPath(pathname, to)} hrefLang={to === 'hi' ? 'hi-IN' : 'en-IN'}
      onClick={(e) => {
        setLangCookie(to);
        if (to === lang) e.preventDefault();
        else if (window.location.search) { e.preventDefault(); window.location.assign(switchLangPath(pathname, to) + window.location.search); }
      }}
      aria-current={lang === to ? 'true' : undefined} title={title} lang={to === 'hi' ? 'hi' : 'en'}
      className={'px-2.5 py-1 rounded-md text-xs font-bold transition-colors ' + (lang === to ? 'bg-white text-brand-900' : 'text-brand-100 hover:text-white')}>
      {label}
    </Link>
  );

  if (!available && lang === 'en') return null;
  return (
    <div className={'inline-flex items-center rounded-lg bg-white/10 p-0.5 ' + className} role="group" aria-label="Language / भाषा">
      {link('en', 'EN', 'English')}
      {link('hi', 'हिं', 'हिन्दी में पढ़ें')}
    </div>
  );
}
