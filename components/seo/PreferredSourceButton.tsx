import Script from 'next/script';
import type { Lang } from '@/lib/i18n/core';

/**
 * Google's official "Add as a preferred source" button
 * (developers.google.com/search/docs/appearance/preferred-sources).
 * Google only shows it once the domain appears in its source-preferences tool.
 */
export default function PreferredSourceButton({ lang = 'en', theme = 'light' }: { lang?: Lang; theme?: 'light' | 'dark' }) {
  return (
    <>
      <Script src="https://news.google.com/swg/js/v1/publisher.js" strategy="lazyOnload" />
      <div {...{ 'google-add-preferred-source-btn': '' }} data-theme={theme} data-lang={lang} />
    </>
  );
}
