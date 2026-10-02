import { Testimonial, FAQ } from '@/types';

// Placeholder testimonials were removed (Oct 2026): only publish reviews from
// real guests. Add them here, or link to Google reviews via
// NEXT_PUBLIC_GOOGLE_REVIEW_URL on the homepage.
export const testimonials: Testimonial[] = [];

export const homepageFAQs: FAQ[] = [
  { question: 'How do I book a hotel through Dharamshala Stay?', answer: 'Browse our listings, pick a property, and submit an inquiry. You can also message us on WhatsApp. We confirm availability and handle the booking.' },
  { question: 'Are the prices the final rates?', answer: 'Prices are indicative. When you inquire, we share the exact rate for your dates -- often better than major booking platforms.' },
  { question: 'Do you charge any booking fee?', answer: 'No. Our service is free for travellers. We earn a small commission from properties.' },
  { question: 'Can you help plan a complete trip?', answer: 'Absolutely -- hotels, taxis, treks, sightseeing, restaurant tips. Send your dates and preferences and we\'ll build a plan.' },
  { question: 'Is Dharamshala safe for solo travellers?', answer: 'Generally yes -- Dharamshala and McLeod Ganj are considered among the safer, more welcoming hill towns in India for solo travellers, including women. Take the usual precautions: avoid isolated trails after dark and trek with company.' },
  { question: 'How do I reach Dharamshala?', answer: 'Fly to Kangra (Gaggal) Airport, take a train to Pathankot and drive about 85 km, or take an overnight Volvo bus from Delhi or Chandigarh. See our full how-to-reach guide for options and costs.' },
];
