import { Poppins, Inter, Fraunces, IBM_Plex_Mono, Baloo_2 } from 'next/font/google';

// Self-hosted at build time: no render-blocking request to Google Fonts.
export const heading = Poppins({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--font-heading', display: 'swap' });
export const body = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body', display: 'swap' });
// Homepage only: editorial display serif for headlines, and a mono face for altitudes and labels.
export const display = Fraunces({ subsets: ['latin'], weight: ['400', '600', '700'], style: ['normal', 'italic'], variable: '--font-display', display: 'swap' });
export const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['500'], variable: '--font-mono', display: 'swap' });
// /play only: a round, friendly Indian display face for the party games.
export const party = Baloo_2({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-party', display: 'swap' });
