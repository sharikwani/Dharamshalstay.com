import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppButton from '@/components/layout/WhatsAppButton';
import JsonLd from '@/components/seo/JsonLd';
import { siteConfig } from '@/lib/config';
import { organizationSchema, websiteSchema, localBusinessSchema } from '@/lib/seo';

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: 'Dharamshala Stay - Hotels, Treks & Travel in Dharamshala & McLeod Ganj',
    template: '%s | Dharamshala Stay',
  },
  description: 'Book verified hotels, homestays, Triund treks, Bir Billing paragliding, and taxis in Dharamshala, McLeod Ganj & Kangra Valley. Rs.500 less than MakeMyTrip. Local team, direct support.',
  keywords: [
    'Dharamshala hotels', 'McLeod Ganj hotels', 'Dharamshala stay', 'Triund trek',
    'Bir Billing paragliding', 'Dharamshala taxi', 'McLeod Ganj homestay',
    'Dharamshala travel', 'Kangra Valley hotels', 'Dharamshala booking',
    'hotels near Dalai Lama temple', 'Bhagsu hotels', 'Dharamkot stay',
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
    locale: 'en_IN',
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: 'Dharamshala Stay - Hotels, Treks & Travel in Dharamshala',
    description: 'Book verified hotels, treks, taxis in Dharamshala & McLeod Ganj. Rs.500 less than MakeMyTrip.',
    images: [{
      url: siteConfig.url + '/images/og-default.jpg',
      width: 1200,
      height: 630,
      alt: 'Dharamshala Stay - Hotels, Treks & Travel',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dharamshala Stay - Hotels, Treks & Travel',
    description: 'Book verified hotels, treks, taxis in Dharamshala & McLeod Ganj.',
    images: [siteConfig.url + '/images/og-default.jpg'],
  },
  alternates: {
    canonical: siteConfig.url,
  },
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
  verification: {},
  category: 'travel',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#1e3a5f" />
        <meta name="msapplication-TileColor" content="#1e3a5f" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <JsonLd data={[organizationSchema(), websiteSchema(), localBusinessSchema()]} />
      </head>
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <WhatsAppButton />
      </body>
    </html>
  );
}
