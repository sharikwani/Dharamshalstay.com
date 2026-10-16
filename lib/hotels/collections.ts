/**
 * Hotel collection pages (/hotels/near-dalai-lama-temple, /hotels/hostels, /hotels/mountain-view):
 * landing pages for searches the main finder can't rank for, built only from listings we hold.
 * English only for now (see EN_ONLY_PATHS in lib/i18n/core.ts).
 */
import { km, LANDMARKS, stayFacts } from './discover';

/** Straight-line km × 1.4 for hill lanes, at an easy 4 km/h. Shown as "about", never exact. */
export function walkMinutes(straightKm: number): number {
  return Math.max(3, Math.round(((straightKm * 1.4) / 4) * 60));
}

/** Within this straight-line distance of the temple gate counts as "walking distance". */
export const TEMPLE_RADIUS_KM = 0.85;

export type CollectionRow = { hotel: any; km: number | null };

export type Collection = {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  lede: string;
  intro: string[];
  /** Column header for the distance column, or null when the page has none. */
  distanceLabel: string | null;
  pick: (hotels: any[]) => CollectionRow[];
  notesTitle: string;
  notes: string[];
  faqs: { question: string; answer: string }[];
  links: { href: string; label: string }[];
};

const pin = (h: any) => stayFacts(h).pin;

export const COLLECTIONS: Collection[] = [
  {
    slug: 'near-dalai-lama-temple',
    title: 'Hotels Near the Dalai Lama Temple',
    metaTitle: 'Hotels Near Dalai Lama Temple, McLeod Ganj (Walkable)',
    metaDescription: 'Stays within walking distance of the Dalai Lama Temple (Tsuglagkhang) in McLeod Ganj: Temple Road and Jogiwara Road hotels, walk times, price levels and tips.',
    h1: 'Hotels Near the Dalai Lama Temple, McLeod Ganj',
    lede: 'Every stay we list within roughly a 20-minute walk of the Tsuglagkhang complex, nearest first.',
    intro: [
      'The Dalai Lama Temple (the Tsuglagkhang complex) sits at the bottom of Temple Road, below McLeod Ganj Main Square. Staying close means you can walk the kora at dawn, drop in on the monks\' debates in the afternoon and get to a public teaching early without a taxi.',
      'Most stays near the temple are on Temple Road, Jogiwara Road and the lanes off the Main Square. Distances below are straight-line from each stay\'s map pin to the temple gate, turned into a rough walking time. McLeod Ganj is steep, so the walk back up always takes longer than the walk down.',
    ],
    distanceLabel: 'Walk to the temple',
    pick: (hotels) => hotels
      .map((h) => { const p = pin(h); return { hotel: h, km: p ? km(p, LANDMARKS.temple) : null }; })
      .filter((r): r is { hotel: any; km: number } => r.km !== null && r.km <= TEMPLE_RADIUS_KM)
      .sort((a, b) => a.km - b.km),
    notesTitle: 'Before you book near the temple',
    notes: [
      'The lanes are steep and many buildings have stairs and no lift. Ask for a lower floor if anyone in your group finds climbing hard.',
      'Roads lined with cafés, like Jogiwara Road, stay busy into the evening. If you sleep lightly, ask for a room away from the street.',
      'Cars can reach most of these stays but parking is scarce. If you are driving, confirm parking before you book.',
      'Rooms near the temple fill up first around public teachings, the Dalai Lama\'s birthday on 6 July and Losar (February or March). Book early for those dates.',
      'No official visiting hours are published for the temple; it is usually open from early morning to early evening. Check at the gate on the day.',
    ],
    faqs: [
      { question: 'Which hotels are closest to the Dalai Lama Temple?', answer: 'The stays on Temple Road are the closest, a few minutes\' walk from the gate. The list on this page is sorted nearest first, using each stay\'s map pin.' },
      { question: 'Can I walk from McLeod Ganj Main Square to the Dalai Lama Temple?', answer: 'Yes. It is a short walk downhill along Temple Road, roughly 10 to 15 minutes. The return is uphill and feels longer.' },
      { question: 'Is it worth staying near the temple?', answer: 'If you plan to walk the kora early, attend a teaching or spend time at the monasteries, yes. If you want views and quiet, Naddi or upper Dharamkot suit better.' },
      { question: 'Do hotels near the temple have parking?', answer: 'Some do, but space is tight on these lanes. Check the parking note on each listing, or ask us when you enquire.' },
      { question: 'When should I book early?', answer: 'Around public teachings, the Dalai Lama\'s birthday on 6 July, Losar in February or March, and Indian long weekends.' },
    ],
    links: [
      { href: '/blog/dalai-lama-temple-guide', label: 'Dalai Lama Temple visitor guide' },
      { href: '/monasteries-meditation', label: 'Monasteries & meditation in McLeod Ganj' },
      { href: '/destinations/mcleod-ganj', label: 'All stays in McLeod Ganj' },
      { href: '/blog/where-to-stay-in-dharamshala', label: 'Where to stay: area by area' },
    ],
  },
  {
    slug: 'hostels',
    title: 'Hostels in McLeod Ganj, Bhagsu & Dharamkot',
    metaTitle: 'Hostels in McLeod Ganj, Bhagsu & Dharamkot',
    metaDescription: 'Backpacker hostels around Dharamshala: dorms and private rooms in McLeod Ganj, Upper Bhagsu and Dharamkot, which area suits whom, and tips for Triund trekkers.',
    h1: 'Hostels in McLeod Ganj, Bhagsu & Dharamkot',
    lede: 'Every hostel we list around Dharamshala, grouped by area.',
    intro: [
      'Hostels around Dharamshala cluster in two places. Upper Bhagsu and Dharamkot are the social, green end: cafés, yoga, the forest path to the Triund trail and a lot of long-stay travellers. McLeod Ganj itself has hostels on Jogiwara Road, a few minutes from the Main Square, the temple and the bus stand.',
      'Hostels here usually offer mixed dorms, often a female-only dorm, and a few private rooms. Prices change with the season and the day of the week, so ask for your dates rather than trusting an old rate.',
    ],
    distanceLabel: 'To Main Square',
    pick: (hotels) => hotels
      .filter((h) => h.type === 'hostel')
      .map((h) => { const p = pin(h); return { hotel: h, km: p ? km(p, LANDMARKS.square) : null }; })
      .sort((a, b) => (a.km ?? 99) - (b.km ?? 99)),
    notesTitle: 'Choosing a hostel',
    notes: [
      'Trekking to Triund? Upper Bhagsu and Dharamkot hostels are closest to the trail start at Gallu Devi. Many keep your big bag while you camp overnight; ask first.',
      'Arriving late by bus? A McLeod Ganj hostel saves a dark uphill walk with luggage, because taxis cannot reach every lane in upper Dharamkot.',
      'Working remotely? Ask about the work area, power backup and the current Wi-Fi before you book a long stay. Winter power cuts happen.',
      'Winters are cold and hostels are rarely heated. Ask about blankets and hot water from December to February.',
    ],
    faqs: [
      { question: 'Which area is best for hostels near Dharamshala?', answer: 'Upper Bhagsu and Dharamkot for a social, outdoorsy stay close to the Triund trail; McLeod Ganj for easy access to the bus stand, the temple and the market.' },
      { question: 'Are there female-only dorms?', answer: 'Many hostels here have one. Check the room list on each hostel\'s page or ask us when you enquire.' },
      { question: 'Can I leave my luggage while I trek to Triund?', answer: 'Many hostels will store a bag for guests. Confirm it when you book, especially if you are checking out before the trek.' },
      { question: 'Can a taxi reach hostels in Dharamkot?', answer: 'Taxis reach the road heads, but some hostels in upper Dharamkot are a short walk up from where the road ends. Pack light or ask the hostel where to be dropped.' },
    ],
    links: [
      { href: '/blog/triund-trek-complete-guide', label: 'Triund trek guide' },
      { href: '/blog/dharamkot-travel-guide', label: 'Dharamkot travel guide' },
      { href: '/blog/bhagsu-travel-guide', label: 'Bhagsu travel guide' },
      { href: '/blog/budget-hotels-in-dharamshala', label: 'Budget stays in Dharamshala' },
    ],
  },
  {
    slug: 'mountain-view',
    title: 'Hotels with Mountain Views in Dharamshala',
    metaTitle: 'Hotels with Mountain View in Dharamshala & McLeod Ganj',
    metaDescription: 'Stays around Dharamshala that list Dhauladhar or valley views: McLeod Ganj, Naddi, Dharamkot and Bhagsu, with tips on which rooms actually face the mountains.',
    h1: 'Hotels with Mountain Views in Dharamshala',
    lede: 'Stays that list mountain or valley views, grouped by area.',
    intro: [
      'The snow-capped Dhauladhar range rises straight behind Dharamshala, so a room with a view is the thing most guests ask for. The closest roadside views are from Naddi, on the ridge above McLeod Ganj; Dharamkot and upper Bhagsu look across forest to the range, and many McLeod Ganj hotels face out over the Kangra Valley instead.',
      'This page lists every stay whose own details mention a mountain or valley view. Not every room in a hotel faces the same way, so ask for a mountain-facing room when you enquire.',
    ],
    distanceLabel: null,
    pick: (hotels) => hotels
      .filter((h) => stayFacts(h).view)
      .map((h) => ({ hotel: h, km: null }))
      .sort((a, b) => AREA_ORDER.indexOf(a.hotel.destination_slug) - AREA_ORDER.indexOf(b.hotel.destination_slug)),
    notesTitle: 'Getting the view you want',
    notes: [
      '"Valley view" usually means looking south over the Kangra Valley; "mountain view" means facing north to the Dhauladhar. Both are lovely, but they are different.',
      'The clearest mountain days are from October to early December and after winter rain. In the monsoon (July to September) cloud often hides the range for days.',
      'Naddi has the closest views of the range; it is a short drive above McLeod Ganj and quieter at night.',
      'Higher floors see more. Ask for one, and check whether there are stairs and no lift.',
    ],
    faqs: [
      { question: 'Where can I see the Dhauladhar range from my hotel room?', answer: 'Naddi, upper Dharamkot and parts of upper Bhagsu face the range most directly. Many McLeod Ganj rooms face the Kangra Valley instead, so ask which way the room looks.' },
      { question: 'When is the mountain view clearest?', answer: 'October to early December, and clear days after winter rain or snow. The monsoon months often hide the peaks.' },
      { question: 'Is snow visible from Dharamshala hotels in winter?', answer: 'The high Dhauladhar peaks usually carry snow through winter and into spring, and you can see it from view-facing rooms on clear days.' },
    ],
    links: [
      { href: '/destinations/naddi', label: 'Stays in Naddi' },
      { href: '/blog/naddi-dal-lake-guide', label: 'Naddi sunrise point & Dal Lake' },
      { href: '/blog/best-time-to-visit-dharamshala', label: 'Best time to visit Dharamshala' },
      { href: '/blog/where-to-stay-in-dharamshala', label: 'Where to stay: area by area' },
    ],
  },
];

export const AREA_ORDER = ['mcleod-ganj', 'bhagsu', 'dharamkot', 'naddi', 'dharamshala'];

export function getCollection(slug: string): Collection | undefined {
  return COLLECTIONS.find((c) => c.slug === slug);
}
