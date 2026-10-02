'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LANG_COOKIE, HTML_LANG, hasHindiVersion, langFromPath, stripLang, switchLangPath, type Lang } from '@/lib/i18n/core';

function setLangCookie(lang: Lang) {
  document.cookie = LANG_COOKIE + '=' + lang + '; path=/; max-age=' + 60 * 60 * 24 * 365 + '; samesite=lax';
}

/** EN | हिं switch. Remembers the choice; pages without a Hindi version stay English. */
export default function LanguageToggle({ className = '' }: { className?: string }) {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const lang = langFromPath(pathname);
  const available = hasHindiVersion(stripLang(pathname));

  // Keep <html lang> correct for screen readers and translation tools.
  useEffect(() => { document.documentElement.lang = HTML_LANG[lang]; }, [lang]);

  const go = (to: Lang) => {
    setLangCookie(to);
    if (to !== lang) router.push(switchLangPath(pathname, to) + window.location.search);
  };

  const btn = (to: Lang, label: string, title: string) => (
    <button type="button" onClick={() => go(to)} aria-pressed={lang === to} title={title} lang={to === 'hi' ? 'hi' : 'en'}
      className={'px-2.5 py-1 rounded-md text-xs font-bold transition-colors ' + (lang === to ? 'bg-white text-brand-900' : 'text-blue-100 hover:text-white')}>
      {label}
    </button>
  );

  if (!available && lang === 'en') return null;
  return (
    <div className={'inline-flex items-center rounded-lg bg-white/10 p-0.5 ' + className} role="group" aria-label="Language / भाषा">
      {btn('en', 'EN', 'English')}
      {btn('hi', 'हिं', 'हिन्दी में पढ़ें')}
    </div>
  );
}
