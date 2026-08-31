import { Metadata } from 'next';
import { siteConfig } from '@/lib/config';

interface SEOProps {
  title: string;
  description: string;
  path: string;
  image?: string;
  keywords?: string[];
  type?: 'website' | 'article';
  noIndex?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
}

/**
 * Generates consistent SEO metadata for a page.
 *
 * Fixes applied:
 * 1. Title uses `absolute` so the layout's title template can never append
 *    the site name a second time (was producing "X | Dharamshala Stay | Dharamshala Stay").
 * 2. Canonical URLs use siteConfig.url which must match the serving domain (www).
 * 3. metadataBase set so all relative URLs resolve correctly.
 */
export function generateSEO({
  title,
  description,
  path,
  image,
  keywords,
  type = 'website',
  noIndex = false,
  publishedTime,
  modifiedTime,
}: SEOProps): Metadata {
  // Strip a trailing site-name suffix if a caller already added one,
  // then append exactly once.
  const suffix = ' | ' + siteConfig.name;
  const baseTitle = title.endsWith(suffix) ? title.slice(0, -suffix.length) : title;
  const fullTitle = baseTitle + suffix;

  const url = siteConfig.url + (path === '/' ? '' : path);
  const ogImage = image || siteConfig.url + '/images/og-default.jpg';

  return {
    metadataBase: new URL(siteConfig.url),
    title: { absolute: fullTitle },
    description,
    keywords: keywords?.join(', '),
    authors: [{ name: siteConfig.name }],
    creator: siteConfig.name,
    publisher: siteConfig.name,
    robots: noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        },
    alternates: {
      canonical: url,
    },
    openGraph: {
      type,
      url,
      title: fullTitle,
      description,
      siteName: siteConfig.name,
      locale: 'en_IN',
      images: [{ url: ogImage, width: 1200, height: 630, alt: baseTitle }],
      ...(type === 'article' && publishedTime ? { publishedTime } : {}),
      ...(type === 'article' && modifiedTime ? { modifiedTime } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [ogImage],
    },
  };
}
