import '@/app/globals.css';
import type { Metadata } from 'next';
import { heading, body } from '@/lib/fonts';
import Analytics from '@/components/seo/Analytics';

/** TV screens (/tv, /tv/<code>): the whole screen is the game, so no site header, footer or chat button. */
export const metadata: Metadata = {
  title: { absolute: 'Party games on your TV | Dharamshala Stay' },
  robots: { index: false, follow: false },
};

export default function TvLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={[heading.variable, body.variable].join(' ')}>
      <head><meta name="theme-color" content="#1e3a5f" /></head>
      <body className="min-h-screen bg-brand-950">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
