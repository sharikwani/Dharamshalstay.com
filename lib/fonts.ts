import { Poppins, Inter } from 'next/font/google';

// Self-hosted at build time: no render-blocking request to Google Fonts.
export const heading = Poppins({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--font-heading', display: 'swap' });
export const body = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body', display: 'swap' });
