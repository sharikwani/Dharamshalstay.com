import { Testimonial, FAQ } from '@/types';

export const testimonials: Testimonial[] = [
  { id: 'test-1', name: 'Priya Sharma', location: 'Delhi', rating: 5, text: 'Dharamshala Stay helped us find the perfect homestay in Bhagsu. Their local recommendations made our trip truly special.', date: '2024-12-15' },
  { id: 'test-2', name: 'Rahul Mehta', location: 'Mumbai', rating: 5, text: 'Booked our Triund trek and McLeod Ganj hotel through them. Everything was perfectly arranged -- airport pickup to trek guide.', date: '2024-11-20' },
  { id: 'test-3', name: 'Sarah Chen', location: 'Singapore', rating: 4, text: 'Quick WhatsApp responses and honest recommendations. They suggested Dharamkot instead of McLeod Ganj for my yoga retreat -- perfect choice.', date: '2025-01-05' },
  { id: 'test-4', name: 'Amit & Neha Gupta', location: 'Bangalore', rating: 5, text: 'Anniversary weekend through Dharamshala Stay. Mountain-view room at a better rate than booking sites, plus a bonfire dinner.', date: '2025-02-10' },
];

export const homepageFAQs: FAQ[] = [
  { question: 'How do I book a hotel through Dharamshala Stay?', answer: 'Browse our listings, pick a property, and submit an inquiry. You can also message us on WhatsApp. We confirm availability and handle the booking.' },
  { question: 'Are the prices the final rates?', answer: 'Prices are indicative. When you inquire, we share the exact rate for your dates -- often better than major booking platforms.' },
  { question: 'Do you charge any booking fee?', answer: 'No. Our service is free for travellers. We earn a small commission from properties.' },
  { question: 'Can you help plan a complete trip?', answer: 'Absolutely -- hotels, taxis, treks, sightseeing, restaurant tips. Send your dates and preferences and we\'ll build a plan.' },
  { question: 'Is Dharamshala safe for solo travellers?', answer: 'Yes, very safe including for solo women. Large international tourist community and friendly locals.' },
  { question: 'How do I reach Dharamshala?', answer: 'Fly to Gaggal Airport, train to Pathankot + drive 85 km, or overnight Volvo bus from Delhi/Chandigarh.' },
];
