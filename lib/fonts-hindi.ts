import { Hind } from 'next/font/google';

// Poppins and Inter have no Devanagari glyphs, so Hindi text falls through to
// Hind (same foundry as Poppins, drawn to pair with it). Kept in its own module
// and imported only by the Hindi layout: Next preloads every font a layout's
// imports declare, and English pages shouldn't download this one.
export const deva = Hind({ subsets: ['devanagari'], weight: ['400', '500', '600', '700'], variable: '--font-deva', display: 'swap' });
