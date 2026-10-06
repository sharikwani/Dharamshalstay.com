import '@/app/globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppButton from '@/components/layout/WhatsAppButton';
import JsonLd from '@/components/seo/JsonLd';
import { heading, body } from '@/lib/fonts';
import { organizationSchema, websiteSchema, localBusinessSchema } from '@/lib/seo';
import { HTML_LANG, type Lang } from '@/lib/i18n/core';

/**
 * The <html> shell. English and Hindi have separate root layouts so the
 * server-rendered lang attribute is right on every page (screen readers pick
 * their voice from it) without making pages dynamic.
 */
export default function RootDocument({ lang, fontClassName = '', children }: { lang: Lang; fontClassName?: string; children: React.ReactNode }) {
  return (
    <html lang={HTML_LANG[lang]} className={[heading.variable, body.variable, fontClassName].join(' ').trim()}>
      <head>
        <meta name="theme-color" content="#1e3a5f" />
        <meta name="msapplication-TileColor" content="#1e3a5f" />
        <link rel="alternate" type="application/rss+xml" title="Dharamshala Stay Travel Guides" href="/feed.xml" />
        <JsonLd data={[organizationSchema(), websiteSchema(), localBusinessSchema()]} />
      </head>
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer lang={lang} />
        <WhatsAppButton lang={lang} />
      </body>
    </html>
  );
}
