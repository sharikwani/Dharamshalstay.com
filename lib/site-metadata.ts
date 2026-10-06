import type { Metadata } from 'next';
import { siteConfig } from '@/lib/config';
import type { Lang } from '@/lib/i18n/core';
import { ogImageUrl } from '@/lib/seo';

/** Site-wide metadata shared by the English and Hindi root layouts. */
export function rootMetadata(lang: Lang): Metadata {
  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: 'Dharamshala Stay - Hotels, Treks & Travel in Dharamshala & McLeod Ganj',
      template: '%s | Dharamshala Stay',
    },
    description: 'Book verified hotels, homestays, Triund treks, Bir Billing paragliding and taxis in Dharamshala, McLeod Ganj & the Kangra Valley. Local team, direct rates, free trip planning.',
    keywords: [
      'Dharamshala hotels', 'McLeod Ganj hotels', 'Dharamshala stay', 'Triund trek',
      'Bir Billing paragliding', 'Dharamshala taxi', 'McLeod Ganj homestay',
      'Dharamshala travel', 'Kangra Valley hotels', 'Dharamshala booking',
      'hotels near Dalai Lama temple', 'Bhagsu hotels', 'Dharamkot stay',
      'places to visit in Dharamshala', 'Palampur', 'Kangra', 'Himachal travel guide',
    ],
    authors: [{ name: 'Dharamshala Stay', url: siteConfig.url }],
    creator: 'Dharamshala Stay',
    publisher: 'Dharamshala Stay',
    formatDetection: { email: false, telephone: false },
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: '32x32' },
        { url: '/favicon.svg', type: 'image/svg+xml' },
        { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
        { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      ],
      apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
    },
    manifest: '/manifest.json',
    openGraph: {
      type: 'website',
      locale: lang === 'hi' ? 'hi_IN' : 'en_IN',
      alternateLocale: lang === 'hi' ? ['en_IN'] : ['hi_IN'],
      url: siteConfig.url,
      siteName: siteConfig.name,
      title: 'Dharamshala Stay - Hotels, Treks & Travel in Dharamshala',
      description: 'Book hotels, treks and taxis in Dharamshala & McLeod Ganj. Up to Rs.500 off every booking.',
      images: [{
        url: ogImageUrl('Hotels, Treks & Travel in Dharamshala & McLeod Ganj'),
        width: 1200,
        height: 630,
        alt: 'Dharamshala Stay - Hotels, Treks & Travel',
        type: 'image/jpeg',
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Dharamshala Stay - Hotels, Treks & Travel',
      description: 'Book verified hotels, treks, taxis in Dharamshala & McLeod Ganj.',
      images: [ogImageUrl('Hotels, Treks & Travel in Dharamshala & McLeod Ganj')],
    },
    // No canonical here: it would be inherited by every page that doesn't set
    // its own, telling Google those pages are duplicates of the homepage.
    robots: {
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
    verification: {
      ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION && { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }),
      ...(process.env.NEXT_PUBLIC_YANDEX_VERIFICATION && { yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION }),
      ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION && { other: { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION } }),
    },
    category: 'travel',
  };
}
