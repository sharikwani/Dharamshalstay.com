import { Poppins, Inter, Fraunces, IBM_Plex_Mono } from 'next/font/google';

// Self-hosted at build time: no render-blocking request to Google Fonts.
export const heading = Poppins({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--font-heading', display: 'swap' });
export const body = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body', display: 'swap' });
// Homepage only: editorial display serif for headlines, and a mono face for altitudes and labels.
export const display = Fraunces({ subsets: ['latin'], weight: ['400', '600', '700'], style: ['normal', 'italic'], variable: '--font-display', display: 'swap' });
export const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['500'], variable: '--font-mono', display: 'swap' });
