/** Shapes for Hindi translations of site content (English is the source). */
export interface HindiFAQ { question: string; answer: string }

/** A translated guide, keyed by the English slug (URL stays the same under /hi). */
export interface HindiPost {
  title: string;
  excerpt: string;
  content: string;
  meta_title: string;
  meta_description: string;
  image_alt?: string;
  faqs?: HindiFAQ[];
}

export interface HindiDestination {
  name: string;
  tagline: string;
  description: string;
  long_description: string;
  best_time: string;
  how_to_reach: string;
  things_to_do: string[];
  faqs: HindiFAQ[];
  meta_title: string;
  meta_description: string;
}

export interface HindiHotel {
  short_description: string;
  description: string;
  highlights?: string[];
  good_for?: string[];
  nearby?: string[];
  room_types?: { name: string; description?: string }[];
  faqs?: HindiFAQ[];
}

export interface HindiTrek {
  name: string;
  short_description: string;
  description: string;
  best_season: string;
  duration: string;
  distance: string;
  itinerary: { day: number; title: string; description: string }[];
  includes: string[];
  excludes: string[];
  things_to_carry: string[];
  faqs: HindiFAQ[];
  meta_title: string;
  meta_description: string;
}
