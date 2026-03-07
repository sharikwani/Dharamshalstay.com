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
  title: { default: 'Dharamshala Stay – Hotels, Treks & Travel in Dharamshala & McLeod Ganj', template: '%s | Dharamshala Stay' },
  description: siteConfig.description,
  openGraph: { type: 'website', locale: 'en_IN', url: siteConfig.url, siteName: siteConfig.name },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><JsonLd data={[organizationSchema(), websiteSchema(), localBusinessSchema()]} /></head>
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <WhatsAppButton />
      </body>
    </html>
  );
}

