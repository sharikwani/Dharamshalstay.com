import { Destination, UNSPLASH_IMAGES } from '@/types';

export const destinations: Destination[] = [
  {
    id: 'dest-1', slug: 'dharamshala', name: 'Dharamshala', tagline: 'Gateway to the Kangra Valley',
    description: 'Dharamshala is a charming hill station nestled in the Kangra Valley at the foot of the Dhauladhar range. Known for its pleasant climate, colonial-era architecture, and proximity to the Dalai Lama\'s residence, it blends Tibetan culture with Himachali heritage.',
    long_description: 'Dharamshala sits at roughly 1,475 metres and serves as the district headquarters of Kangra. The town is split into lower Dharamshala—home to commercial markets, the cricket stadium, and government offices—and upper Dharamshala, which stretches up towards McLeod Ganj.\n\nWhether you\'re looking for a quiet retreat, a base for Himalayan treks, or a cultural deep-dive into Tibetan Buddhism, Dharamshala is the ideal starting point.',
    altitude: '1,475 m', best_time: 'March to June, September to November',
    how_to_reach: 'Gaggal Airport (13 km) has flights from Delhi. Pathankot railway station (85 km) connects to major Indian cities. Regular Volvo buses run from Delhi, Chandigarh, and Manali.',
    things_to_do: ['Visit Kangra Fort & Museum', 'Explore Norbulingka Institute', 'Stroll through Tea Gardens', 'Watch cricket at HPCA Stadium', 'Day trip to Kangra Valley temples', 'Shop in Lower Dharamshala market'],
    image: UNSPLASH_IMAGES.dharamshala, image_alt: 'Panoramic view of Dharamshala with Dhauladhar mountains', hotel_count: 42,
    faqs: [
      { question: 'Is Dharamshala and McLeod Ganj the same place?', answer: 'They are separate but connected. Dharamshala is the main town at a lower elevation, while McLeod Ganj sits about 5 km uphill.' },
      { question: 'How far is Dharamshala from Delhi?', answer: 'Approximately 480 km by road. Overnight Volvo buses take 10–12 hours. Flights to Gaggal Airport take 1.5 hours.' },
      { question: 'What is the best time to visit?', answer: 'March through June for spring/summer weather, September through November for clear post-monsoon skies.' },
    ],
    meta_title: 'Dharamshala Travel Guide – Hotels, Things to Do & Tips | Dharamshala Stay',
    meta_description: 'Plan your Dharamshala trip with our local travel guide. Best hotels, top things to do, weather tips, and how to reach Dharamshala.',
  },
  {
    id: 'dest-2', slug: 'mcleod-ganj', name: 'McLeod Ganj', tagline: 'Little Lhasa of India',
    description: 'McLeod Ganj is the vibrant hilltop suburb of Dharamshala and the seat of the Tibetan government-in-exile. Perched at 1,770 metres, it buzzes with backpackers, monks, and spiritual seekers.',
    long_description: 'The heart of McLeod Ganj is the Tsuglagkhang Complex, housing the Dalai Lama\'s temple, a museum, and a peaceful prayer hall. The town\'s energy is a unique blend of Tibetan exile culture, Indian hospitality, and an international backpacker scene.\n\nFrom here you can walk to Bhagsu waterfall, hike to Triund, attend meditation retreats, or sip chai at a rooftop café while watching clouds drift below snow-capped peaks.',
    altitude: '1,770 m', best_time: 'March to June, September to November',
    how_to_reach: 'Shared taxis from Dharamshala bus stand (5 km, 20 min). Direct buses from Delhi drop at McLeod Ganj bus stand.',
    things_to_do: ['Visit Dalai Lama Temple', 'Hike to Triund', 'Explore Bhagsu Waterfall', 'Take a Tibetan cooking class', 'Join a meditation retreat', 'Shop for Tibetan handicrafts', 'Eat at rooftop cafés on Jogiwara Road'],
    image: UNSPLASH_IMAGES.mcleodganj, image_alt: 'Colourful prayer flags and cafés in McLeod Ganj', hotel_count: 56,
    faqs: [
      { question: 'Is McLeod Ganj safe for solo travellers?', answer: 'Yes, very safe including for solo women. Friendly cosmopolitan atmosphere with good police presence.' },
      { question: 'How many days are enough?', answer: '3–5 days covers Triund trek, monastery visits, café hopping, and a day trip to Dharamkot or Naddi.' },
    ],
    meta_title: 'McLeod Ganj Guide – Best Hotels, Cafés & Things to Do | Dharamshala Stay',
    meta_description: 'Explore McLeod Ganj, the Little Lhasa of India. Top-rated hotels, must-visit cafés, Tibetan culture, and the best treks.',
  },
  {
    id: 'dest-3', slug: 'bhagsu', name: 'Bhagsu', tagline: 'Waterfalls, Temples & Tranquil Vibes',
    description: 'Bhagsunag (Bhagsu) is a peaceful village 2 km from McLeod Ganj, famous for its ancient Shiva temple and the cascading Bhagsu Waterfall. A favourite among budget travellers and digital nomads.',
    long_description: 'Bhagsu offers a slower pace than McLeod Ganj while remaining a pleasant walk away. The Bhagsunag Temple is believed to be over 5,000 years old. A short hike upstream leads to the Bhagsu Waterfall, especially impressive during monsoon.\n\nThe village has a growing number of cafés, yoga shalas, and guesthouses that cater to long-stay travellers.',
    altitude: '1,850 m', best_time: 'March to June, September to November',
    how_to_reach: 'A 20-minute walk or 5-minute auto ride from McLeod Ganj main square.',
    things_to_do: ['Visit Bhagsunag Temple', 'Hike to Bhagsu Waterfall', 'Enjoy a meal at Shiva Café', 'Attend a yoga class', 'Walk to Dharamkot through the forest'],
    image: UNSPLASH_IMAGES.bhagsu, image_alt: 'Bhagsu waterfall surrounded by green mountains', hotel_count: 28,
    faqs: [{ question: 'Is Bhagsu good for budget travellers?', answer: 'Absolutely. Guesthouses from ₹500–800/night. Many cafés serve filling meals under ₹200.' }],
    meta_title: 'Bhagsu Guide – Hotels, Waterfall & Cafés | Dharamshala Stay',
    meta_description: 'Discover Bhagsu near McLeod Ganj. Visit the ancient temple, hike to Bhagsu Waterfall, find budget stays, and enjoy the best cafés.',
  },
  {
    id: 'dest-4', slug: 'dharamkot', name: 'Dharamkot', tagline: 'The Yoga Village in the Clouds',
    description: 'Dharamkot is a tiny hilltop village above McLeod Ganj, a haven for yoga practitioners, meditators, and nature lovers surrounded by dense deodar forests with stunning valley views.',
    long_description: 'Perched at roughly 1,900 metres, Dharamkot is the starting point for the Triund trek and home to Tushita Meditation Centre. The village has a distinctly bohemian character with organic cafés, chai stalls, and guesthouses run by local families.',
    altitude: '1,900 m', best_time: 'March to June, September to November',
    how_to_reach: 'A 30-minute uphill walk or short auto ride from McLeod Ganj.',
    things_to_do: ['Start the Triund trek', 'Join a yoga retreat', 'Visit the Vipassana centre', 'Explore forest trails towards Gallu Devi', 'Enjoy sunset views from hilltop cafés'],
    image: UNSPLASH_IMAGES.dharamkot, image_alt: 'Dharamkot village perched on a hillside', hotel_count: 18,
    faqs: [{ question: 'Can I book a yoga retreat in Dharamkot?', answer: 'Yes — weekend workshops to month-long teacher training programmes. Tushita Meditation Centre is one of the most well-known.' }],
    meta_title: 'Dharamkot Guide – Yoga Retreats, Hostels & Triund Trek Base | Dharamshala Stay',
    meta_description: 'Plan your stay in Dharamkot, the yoga village above McLeod Ganj. Hostels, yoga retreats, cafés, and the Triund trailhead.',
  },
  {
    id: 'dest-5', slug: 'naddi', name: 'Naddi', tagline: 'Panoramic Sunrises & Untouched Calm',
    description: 'Naddi is a small unspoilt village 3 km from McLeod Ganj, perched on a ridge with some of the most spectacular sunrise views in the region.',
    long_description: 'Naddi is where locals go for a quiet escape. The Naddi View Point is famous for sunrise photography. Accommodation here tends to be slightly more upscale and view-focused. It\'s ideal for couples, writers, and anyone who wants mountain solitude.',
    altitude: '1,850 m', best_time: 'Year-round (spectacular in winter snow)',
    how_to_reach: 'A 10-minute drive from McLeod Ganj via Dal Lake road.',
    things_to_do: ['Catch sunrise at Naddi View Point', 'Walk to Dal Lake', 'Photograph the Dhauladhar panorama', 'Forest walks through pine and deodar', 'Relax at a view-facing café'],
    image: UNSPLASH_IMAGES.naddi, image_alt: 'Sunrise over the Dhauladhar range from Naddi', hotel_count: 12,
    faqs: [{ question: 'Is Naddi worth visiting?', answer: 'If you value views and quiet, absolutely. The sunrise over Dhauladhar from Naddi View Point is one of the most memorable sights in the region.' }],
    meta_title: 'Naddi Village Guide – Sunrise Point, Hotels & Peaceful Stays | Dharamshala Stay',
    meta_description: 'Escape to Naddi for breathtaking sunrise views, quiet homestays, and pine forest walks. A hidden gem near McLeod Ganj.',
  },
];

export function getDestinationBySlug(slug: string): Destination | undefined { return destinations.find((d) => d.slug === slug); }
export function getAllDestinationSlugs(): string[] { return destinations.map((d) => d.slug); }

