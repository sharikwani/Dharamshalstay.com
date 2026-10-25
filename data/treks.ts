import { Trek, UNSPLASH_IMAGES } from '@/types';

export const treks: Trek[] = [
  {
    id: 'trek-1', slug: 'triund-trek', name: 'Triund Trek', destination_slug: 'dharamkot', difficulty: 'moderate', duration: '1-2 Days', distance: '9 km from McLeod Ganj (6-7 km from Gallu Devi)', max_altitude: '2,850 m', best_season: 'March-June, Sep-Dec', price_per_person: 1500,
    short_description: 'The most popular trek near Dharamshala -- a rewarding overnight hike to a grassy ridge with 360° views of the Dhauladhar range and Kangra Valley.',
    description: 'Triund is the crown jewel of Dharamshala treks. Starting from Dharamkot, the trail winds through oak and rhododendron forests before opening up to a dramatic alpine meadow.\n\nThe summit ridge offers a staggering panorama: snow-capped Dhauladhar peaks on one side, the Kangra Valley below on the other. Camping overnight to watch sunset turn the peaks golden is quintessential Dharamshala.',
    itinerary: [
      { day: 1, title: 'Dharamkot to Triund', description: 'Start 9 AM from Gallu Devi above Dharamkot. Trek through oak and rhododendron forest to Magic View Cafe, then tackle the steep final switchbacks to Triund (about 6-7 km in total). Camp, sunset, dinner.' },
      { day: 2, title: 'Sunrise & Descent', description: 'Wake early for sunrise over Dhauladhar. Breakfast, then descend 3-4 hours back to Dharamkot.' },
    ],
    includes: ['Professional guide', 'Camping tent & sleeping bag', 'Meals (dinner + breakfast)', 'Forest permits', 'First aid'],
    excludes: ['Transport to Dharamkot', 'Personal gear', 'Tips', 'Insurance'],
    things_to_carry: ['Sturdy trekking shoes', 'Warm layers', 'Rain poncho', '2L water', 'Headlamp', 'Sunscreen'],
    images: [UNSPLASH_IMAGES.trek1, UNSPLASH_IMAGES.trek2], featured: true,
    faqs: [{ question: 'What does the Triund trek package include?', answer: 'A local guide, forest permits, first aid and, if you camp, a tent with sleeping bag plus dinner and breakfast. Transport to Dharamkot, personal gear, tips and insurance are not included. Prices start at ₹1,500 per person; we confirm the exact price for your date, group size and whether you stay overnight.' }, { question: 'Is Triund safe for beginners?', answer: 'Yes. It is a moderate trek on one main, well-used trail, and most reasonably fit beginners manage it. The last stretch after Magic View is steep and rocky, so go slowly; a guide helps on the descent and in bad weather.' }, { question: 'How long is the Triund trek?', answer: 'About 6-7 km one way from Gallu Devi temple above Dharamkot, or about 9 km if you walk from McLeod Ganj. Most people take 3-5 hours up and 2-3 hours down from Gallu Devi.' }, { question: 'Can I do Triund in one day?', answer: 'Yes. Fit walkers leave Gallu Devi by about 8 am and are back before dark. Staying overnight gives you sunset, stars and sunrise over the Dhauladhar, which is why most people camp.' }, { question: 'What fees do I pay at the checkpost?', answer: 'A forest entry fee of ₹100 per person per day (2024 revision) and, since 11 August 2026, a refundable ₹500 waste deposit that is returned when you bring your rubbish back down. Camping is about ₹550 per two-person tent. Permits are included when you book with us; carry photo ID.' }, { question: 'When is the best time to trek Triund?', answer: 'October and November for the clearest views, and April to June for rhododendrons and warm days. July to September brings monsoon rain, and from December to February there can be snow and ice above Magic View.' }, { question: 'Is Triund open in winter?', answer: 'Sometimes. After heavy snow or weather warnings the administration closes the trail or cancels permissions, and a January 2026 district order restricts trekking above 3,000 m. Triund itself is about 2,850 m. Ask us before you plan a winter trek; we confirm the current position for your date.' }, { question: 'Where does the trek start and how do I get there?', answer: 'At Gallu Devi temple above Dharamkot. Take a taxi from McLeod Ganj to Dharamkot and walk 20-30 minutes up, or walk the whole way from McLeod Ganj, which adds 1-1.5 hours.' }, { question: 'Can children do the Triund trek?', answer: 'Active children of around 8 or older often complete it with breaks. The steep section after Magic View is the test, so plan plenty of time and turn back if the weather changes.' }, { question: 'What should I carry?', answer: 'Good walking shoes, 2 litres of water, a warm layer and rain jacket, sun protection, snacks, a torch and cash for small purchases. Nights at the top are cold in every season, so add a down or fleece jacket if you camp.' }],
    status: 'published', meta_title: 'Triund Trek Package from ₹1,500: Guided Day or Camping', meta_description: 'Guided Triund trek from ₹1,500 per person: day trek or overnight camp with tent, meals and guide, from Gallu Devi or McLeod Ganj. Itinerary and inclusions.',
    created_at: '2024-01-01', updated_at: '2025-03-01',
  },
  {
    id: 'trek-2', slug: 'kareri-lake-trek', name: 'Kareri Lake Trek', destination_slug: 'dharamshala', difficulty: 'moderate', duration: '1 Day 1 Night', distance: '26 km round trip', max_altitude: '2,934 m', best_season: 'Apr-Jun, Sep-Nov', price_per_person: 3000,
    short_description: 'A scenic overnight trek through dense forests to a pristine glacial lake nestled in the Dhauladhar range.',
    description: 'Kareri Lake is a hidden gem for trekkers who want to go beyond Triund. The trail passes through forests of oak, pine, and walnut before reaching the stunning blue-green glacial lake at 2,934 metres.',
    itinerary: [
      { day: 1, title: 'Drive to Ghera, trek to Kareri Lake', description: 'Drive to Ghera, trek through Kareri village and forest to the lake. Camp overnight by the water.' },
      { day: 2, title: 'Walk back down', description: 'Wake up at the lake, then walk back down to the roadhead and drive to Dharamshala. Extra days at the lake are Rs 3,000 per person per day.' },
    ],
    includes: ['Guide & support staff', 'Camping equipment', 'All meals', 'Transport to trailhead', 'Permits'],
    excludes: ['Personal gear', 'Insurance', 'Tips'],
    things_to_carry: ['Good trekking boots', 'Warm clothing', 'Rain gear', 'Water purification', 'Trekking poles'],
    images: [UNSPLASH_IMAGES.mountains], featured: true,
    faqs: [{ question: 'How difficult is it?', answer: 'Moderately challenging. Suitable for anyone with basic trekking fitness.' }],
    status: 'published', meta_title: 'Kareri Lake Trek - Guide, Itinerary & Booking', meta_description: 'Trek to Kareri Lake from Dharamshala. Overnight glacial lake trek: Rs 3,000 with taxi, Rs 2,000 without.',
    created_at: '2024-01-01', updated_at: '2025-03-01',
  },
];

export function getTrekBySlug(slug: string) { return treks.find((t) => t.slug === slug); }
export function getFeaturedTreks() { return treks.filter((t) => t.featured); }
export function getAllTrekSlugs() { return treks.map((t) => t.slug); }
