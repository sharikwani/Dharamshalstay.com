/**
 * All Hindi content translations, aggregated. Anything missing here falls
 * back to English (see lib/i18n/content.ts).
 */
import type { HindiPost, HindiDestination, HindiHotel, HindiTrek } from './types';
import type { FAQCategory } from '../faqs';
import { hiBlogG1 } from './blog-g1';
import { hiBlogG2 } from './blog-g2';
import { hiBlogG3 } from './blog-g3';
import { hiBlogG4 } from './blog-g4';
import { hiBlogG5 } from './blog-g5';
import { hiBlogG6 } from './blog-g6';
import { hiBlogG7 } from './blog-g7';
import { hiBlogG8 } from './blog-g8';
import { hiFaqs1, hiFaqsExtra1 } from './faqs-1';
import { hiFaqsExtra2 } from './faqs-2';
import { hiHomepageFAQs, hiDestinations, hiHotels } from './misc';
import { hiTreks } from './treks';

export const hiPosts: Record<string, HindiPost> = {
  ...hiBlogG1, ...hiBlogG2, ...hiBlogG3, ...hiBlogG4, ...hiBlogG5, ...hiBlogG6, ...hiBlogG7, ...hiBlogG8,
};
/** Same order as the English: original set, then expansion 1, then expansion 2. */
export const hiFaqCategories: FAQCategory[][] = [hiFaqs1, hiFaqsExtra1, hiFaqsExtra2];
export const hiHomepageFAQsData: { question: string; answer: string }[] = hiHomepageFAQs;
export const hiDestinationsData: Record<string, HindiDestination> = hiDestinations;
export const hiHotelsData: Record<string, HindiHotel> = hiHotels;
export const hiTreksData: Record<string, HindiTrek> = hiTreks;
