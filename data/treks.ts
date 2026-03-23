import { Trek, UNSPLASH_IMAGES } from '@/types';

export const treks: Trek[] = [
  {
    id: 'trek-1', slug: 'triund-trek', name: 'Triund Trek', destination_slug: 'dharamkot', difficulty: 'moderate', duration: '1-2 Days', distance: '9 km one way', max_altitude: '2,828 m', best_season: 'March-June, Sep-Dec', price_per_person: 1500,
    short_description: 'The most popular trek near Dharamshala -- a rewarding overnight hike to a grassy ridge with 360° views of the Dhauladhar range and Kangra Valley.',
    description: 'Triund is the crown jewel of Dharamshala treks. Starting from Dharamkot, the trail winds through oak and rhododendron forests before opening up to a dramatic alpine meadow.\n\nThe summit ridge offers a staggering panorama: snow-capped Dhauladhar peaks on one side, the Kangra Valley below on the other. Camping overnight to watch sunset turn the peaks golden is quintessential Dharamshala.',
    itinerary: [
      { day: 1, title: 'Dharamkot to Triund', description: 'Start 9 AM. Trek through dense forest 6 km to Snowline Cafe. Push through steep 3 km switchbacks to Triund. Camp, sunset, bonfire dinner.' },
      { day: 2, title: 'Sunrise & Descent', description: 'Wake early for sunrise over Dhauladhar. Breakfast, then descend 3-4 hours back to Dharamkot.' },
    ],
    includes: ['Professional guide', 'Camping tent & sleeping bag', 'Meals (dinner + breakfast)', 'Forest permits', 'First aid'],
    excludes: ['Transport to Dharamkot', 'Personal gear', 'Tips', 'Insurance'],
    things_to_carry: ['Sturdy trekking shoes', 'Warm layers', 'Rain poncho', '2L water', 'Headlamp', 'Sunscreen'],
    images: [UNSPLASH_IMAGES.trek1, UNSPLASH_IMAGES.trek2], featured: true,
    faqs: [
      { question: 'Is Triund safe for beginners?', answer: 'Yes, considered beginner-friendly though moderately strenuous. Well-marked trail, guides available.' },
      { question: 'Do I need a permit?', answer: 'Yes, forest permit ₹150/person at Dharamkot check post. We handle this when you book through us.' },
    ],
    status: 'published', meta_title: 'Triund Trek - Complete Guide, Booking & Tips | Dharamshala Stay', meta_description: 'Book the Triund Trek. Complete guide with itinerary, permits & camping info. Guided treks from ₹1,500/person.',
    created_at: '2024-01-01', updated_at: '2025-03-01',
  },
  {
    id: 'trek-2', slug: 'kareri-lake-trek', name: 'Kareri Lake Trek', destination_slug: 'dharamshala', difficulty: 'moderate', duration: '3-4 Days', distance: '26 km round trip', max_altitude: '2,934 m', best_season: 'Apr-Jun, Sep-Nov', price_per_person: 4500,
    short_description: 'A scenic multi-day trek through dense forests to a pristine glacial lake nestled in the Dhauladhar range.',
    description: 'Kareri Lake is a hidden gem for trekkers who want to go beyond Triund. The trail passes through forests of oak, pine, and walnut before reaching the stunning blue-green glacial lake at 2,934 metres.',
    itinerary: [
      { day: 1, title: 'Dharamshala to Kareri Village', description: 'Drive to Ghera, trek 6 km to Kareri Village.' },
      { day: 2, title: 'Kareri Village to Lake', description: 'Trek 7 km through forest to the lake. Camp by the water.' },
      { day: 3, title: 'Lake exploration & return', description: 'Explore the lake, descend after lunch.' },
    ],
    includes: ['Guide & support staff', 'Camping equipment', 'All meals', 'Transport to trailhead', 'Permits'],
    excludes: ['Personal gear', 'Insurance', 'Tips'],
    things_to_carry: ['Good trekking boots', 'Warm clothing', 'Rain gear', 'Water purification', 'Trekking poles'],
    images: [UNSPLASH_IMAGES.mountains], featured: true,
    faqs: [{ question: 'How difficult is it?', answer: 'Moderately challenging. Suitable for anyone with basic trekking fitness.' }],
    status: 'published', meta_title: 'Kareri Lake Trek - Guide, Itinerary & Booking', meta_description: 'Trek to Kareri Lake from Dharamshala. 3-day glacial lake trek. Guided packages from ₹4,500.',
    created_at: '2024-01-01', updated_at: '2025-03-01',
  },
];

export function getTrekBySlug(slug: string) { return treks.find((t) => t.slug === slug); }
export function getFeaturedTreks() { return treks.filter((t) => t.featured); }
export function getAllTrekSlugs() { return treks.map((t) => t.slug); }
