/** Expanded versions of the original short guides, keyed by slug (see README.md). */
import type { BlogPost } from '@/types';
import { override as bestHotelsInDharamshala } from './best-hotels-in-dharamshala';
import { override as bestHotelsInMcleodGanj } from './best-hotels-in-mcleod-ganj';
import { override as bestTimeToVisitDharamshala } from './best-time-to-visit-dharamshala';
import { override as birBillingParaglidingGuide } from './bir-billing-paragliding-guide';
import { override as dharamshalaForDigitalNomads } from './dharamshala-for-digital-nomads';
import { override as dharamshalaMonsoonTravelGuide } from './dharamshala-monsoon-travel-guide';
import { override as dharamshalaToDelhiTaxiGuide } from './dharamshala-to-delhi-taxi-guide';
import { override as dharamshalaWeekendItinerary } from './dharamshala-weekend-itinerary';
import { override as topCafesInMcleodGanj } from './top-cafes-in-mcleod-ganj';
import { override as triundTrekCompleteGuide } from './triund-trek-complete-guide';

export const coreOverrides: Record<string, Partial<BlogPost>> = {
  'best-hotels-in-dharamshala': bestHotelsInDharamshala,
  'best-hotels-in-mcleod-ganj': bestHotelsInMcleodGanj,
  'best-time-to-visit-dharamshala': bestTimeToVisitDharamshala,
  'bir-billing-paragliding-guide': birBillingParaglidingGuide,
  'dharamshala-for-digital-nomads': dharamshalaForDigitalNomads,
  'dharamshala-monsoon-travel-guide': dharamshalaMonsoonTravelGuide,
  'dharamshala-to-delhi-taxi-guide': dharamshalaToDelhiTaxiGuide,
  'dharamshala-weekend-itinerary': dharamshalaWeekendItinerary,
  'top-cafes-in-mcleod-ganj': topCafesInMcleodGanj,
  'triund-trek-complete-guide': triundTrekCompleteGuide,
};
