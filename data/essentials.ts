/**
 * data/essentials.ts -- the "know before you go" hub (/essentials).
 *
 * Each item answers one real pre-trip worry in a sentence or two, then points
 * at the guide that covers it in full. The short answer is WRITTEN FOR THIS
 * PAGE, not lifted from the guide body -- the hub has to stand on its own for
 * someone who won't open a 3,000-word article, and the two pages must not
 * compete for the same search.
 *
 * Content rules (keep these when editing):
 *   - No business names, no phone numbers. They change; we'd go stale.
 *   - Price bands, never point prices, and always "as of 2026".
 *   - Say what changes in winter and monsoon. That's most of the complaints.
 */

export type EssentialIcon = 'money' | 'daily' | 'food' | 'health' | 'around' | 'weather' | 'rules';

export interface EssentialItem {
  /** The question a visitor would actually ask, phrased their way. */
  q: string;
  /** Direct answer in 1-2 sentences. Lead with yes/no where there is one. */
  a: string;
  /** Path to the guide that covers it in full. */
  href: string;
}

export interface EssentialGroup {
  id: string;
  title: string;
  blurb: string;
  icon: EssentialIcon;
  items: EssentialItem[];
}

export const essentialGroups: EssentialGroup[] = [
  {
    id: 'money',
    title: 'Money, SIM & Internet',
    blurb: 'Cash is still king above McLeod Ganj. Plan for patchy signal.',
    icon: 'money',
    items: [
      {
        q: 'Are there ATMs in McLeod Ganj?',
        a: 'Yes, several around Temple Road, Jogiwara Road and the main square. They do run empty on weekends, holidays and during big Tibetan events, so draw cash in Dharamshala town before heading up rather than relying on finding a working machine.',
        href: '/blog/atm-mobile-network-internet-dharamshala',
      },
      {
        q: 'Do cards and UPI work, or do I need cash?',
        a: 'UPI is widely accepted now, even by small shops and taxi drivers. Cards are hit and miss outside hotels and larger restaurants, and almost nothing above Dharamkot takes them -- carry cash for Bhagsu, Dharamkot and anything on a trek.',
        href: '/blog/atm-mobile-network-internet-dharamshala',
      },
      {
        q: 'Which mobile network actually gets signal?',
        a: 'Jio and Airtel are the two that hold up across McLeod Ganj, Bhagsu and Dharamkot. Coverage thins fast once you climb towards Triund, and drops entirely in parts of the forest trail.',
        href: '/blog/atm-mobile-network-internet-dharamshala',
      },
      {
        q: 'Can foreigners buy an Indian SIM here?',
        a: 'Yes, but it is slower than in a metro: you need your passport, visa copy, photos and a local reference address, and activation can take a day or two. Buying at Delhi airport on arrival is far less hassle.',
        href: '/blog/atm-mobile-network-internet-dharamshala',
      },
      {
        q: 'Is the WiFi good enough to work remotely?',
        a: 'In cafes and co-working spots, usually yes for calls and normal work. Expect power cuts and evening slowdowns, and treat a charged laptop plus mobile data as your backup rather than an afterthought.',
        href: '/blog/dharamshala-for-digital-nomads',
      },
    ],
  },
  {
    id: 'daily',
    title: 'Groceries & Daily Needs',
    blurb: 'Where to buy food, get washing done and leave your bags.',
    icon: 'daily',
    items: [
      {
        q: 'Where do I buy groceries, water and toiletries?',
        a: 'Small general stores all over McLeod Ganj, Bhagsu and Dharamkot cover snacks, toiletries, bottled water and basics. For fresh vegetables, fruit and anything cheaper or in bulk, the markets down in Dharamshala town and Kotwali Bazaar are much better stocked.',
        href: '/blog/groceries-daily-essentials-dharamshala',
      },
      {
        q: 'Where can I get laundry done?',
        a: 'Laundry shops are easy to find in McLeod Ganj, Bhagsu and Dharamkot, and most guesthouses will arrange it. Expect per-kilo pricing, same-day only if you drop it in the morning, and much slower drying during monsoon.',
        href: '/blog/laundry-luggage-storage-water-dharamshala',
      },
      {
        q: 'Can I leave my bags somewhere before a trek or night bus?',
        a: 'Yes. Almost every guesthouse will hold luggage for free or a token fee if you have stayed with them, and trek operators routinely store bags for clients. Lock your bag and keep your passport, cash and electronics with you.',
        href: '/blog/laundry-luggage-storage-water-dharamshala',
      },
      {
        q: 'Can I refill a bottle instead of buying plastic?',
        a: 'Yes, and you should -- Himachal is strict about plastic and the hills show the damage. Refill points, filtered water at cafes and guesthouse RO units are common; carry your own bottle and ask, most places top it up free or for a few rupees.',
        href: '/blog/laundry-luggage-storage-water-dharamshala',
      },
    ],
  },
  {
    id: 'food',
    title: 'Eating & Drinking',
    blurb: 'What you will actually find on a menu, and what it costs.',
    icon: 'food',
    items: [
      {
        q: 'What kind of food will I find?',
        a: 'Far more variety than a town this size suggests: Tibetan, North Indian, Himachali, Israeli, Italian and Korean all have a real presence, thanks to decades of travellers and the Tibetan community. Local Himachali food is the one you have to go looking for.',
        href: '/blog/eating-out-dharamshala-what-it-costs',
      },
      {
        q: 'What does a meal cost?',
        a: 'Roughly three tiers as of 2026: a local dhaba thali at the bottom, a traveller cafe main course in the middle, and hotel restaurants at the top. Budget travellers eat well here; the cafes with the views charge for the view.',
        href: '/blog/eating-out-dharamshala-what-it-costs',
      },
      {
        q: 'Is it easy to eat vegetarian, vegan or Jain?',
        a: 'Vegetarian is effortless -- most menus are majority vegetarian. Vegan is well understood in McLeod Ganj and Dharamkot cafes. Jain food needs you to ask specifically about onion and garlic, and is easier at Indian places than Tibetan ones.',
        href: '/blog/eating-out-dharamshala-what-it-costs',
      },
      {
        q: 'Which are the best cafes?',
        a: 'The cafe scene concentrates on Bhagsu Road, Jogiwara Road and the Dharamkot ridge, with the view terraces clustered above Bhagsu. Many of the smaller Dharamkot places shut through the coldest months.',
        href: '/blog/top-cafes-in-mcleod-ganj',
      },
      {
        q: 'Can I buy alcohol?',
        a: 'Yes. Himachal licenses liquor shops and many restaurants serve beer and spirits, though the area immediately around the Dalai Lama temple is more restrained. Drinking in public spaces and on treks is both frowned on and risky at altitude.',
        href: '/blog/nightlife-bars-mcleod-ganj',
      },
    ],
  },
  {
    id: 'health',
    title: 'Health & Safety',
    blurb: 'Water, hospitals, animals, altitude -- the honest version.',
    icon: 'health',
    items: [
      {
        q: 'Is the tap water safe to drink?',
        a: 'No -- stick to filtered, boiled or bottled water. Stomach upsets are the single most common thing that ruins a Dharamshala trip, and most of them trace back to water or ice.',
        href: '/blog/health-medical-help-dharamshala',
      },
      {
        q: 'Where do I go if I get ill?',
        a: 'Pharmacies are plentiful and pharmacists here are used to advising travellers. For anything serious there is a hospital in Dharamshala and a larger medical college down at Tanda; McLeod Ganj itself has clinics rather than full hospitals.',
        href: '/blog/health-medical-help-dharamshala',
      },
      {
        q: 'Will I get altitude sickness?',
        a: 'Unlikely in McLeod Ganj itself -- it sits around 2,000 m, which most people handle fine. Triund and anything higher is where it starts to matter, especially if you go up fast on day one.',
        href: '/blog/health-medical-help-dharamshala',
      },
      {
        q: 'Are the monkeys and street dogs a problem?',
        a: 'The monkeys are genuine opportunists: never carry food openly, never make eye contact, keep windows shut. Street dogs are mostly placid by day and more territorial after dark, so carry a torch and avoid walking alone on unlit paths.',
        href: '/blog/health-medical-help-dharamshala',
      },
      {
        q: 'Is it safe for solo female travellers?',
        a: 'It is one of the more comfortable destinations in North India for solo women, with a long traveller presence and a visible international community. The usual caution applies after dark on the unlit stretches between McLeod Ganj, Bhagsu and Dharamkot.',
        href: '/blog/solo-female-travel-dharamshala',
      },
    ],
  },
  {
    id: 'around',
    title: 'Getting Here & Getting Around',
    blurb: 'Arrival options, local transport, and how steep it really is.',
    icon: 'around',
    items: [
      {
        q: 'What is the easiest way to get here?',
        a: 'Flying into Kangra (Gaggal) airport is quickest but the flights are few and weather-dependent. Overnight buses from Delhi are the workhorse option, and the Pathankot rail route plus a taxi is the reliable compromise.',
        href: '/blog/how-to-reach-dharamshala',
      },
      {
        q: 'How do I get around locally?',
        a: 'Shared and private taxis cover the McLeod Ganj–Dharamshala–Bhagsu–Dharamkot circuit, plus local buses on the main road. Distances look short on a map and take far longer in practice because of gradient and traffic.',
        href: '/blog/local-transport-dharamshala',
      },
      {
        q: 'How steep is it really? I have knee trouble / a stroller / a wheelchair.',
        a: 'Steeper than photos suggest. McLeod Ganj is built on a slope with stairs, broken pavement and narrow roads without footpaths, so a wheelchair or stroller is genuinely hard going -- but door-to-door taxis and a well-chosen hotel location make a trip very doable.',
        href: '/blog/accessibility-dharamshala-limited-mobility',
      },
      {
        q: 'Is it suitable for elderly parents?',
        a: 'Yes, with planning. Pick accommodation on the flat near the main road rather than charming places up a staircase, use taxis freely, and treat the temple and monastery circuit as the itinerary rather than trying to add treks.',
        href: '/blog/dharamshala-for-senior-citizens',
      },
      {
        q: 'Is it a good trip with young kids?',
        a: 'It works well if you slow the itinerary down. The waterfall, the temple complex, the cricket stadium and short forest walks carry most of it; long winding drives and steep stair-climbs are what tire children out here.',
        href: '/blog/dharamshala-with-kids-family-guide',
      },
    ],
  },
  {
    id: 'weather',
    title: 'Weather & Packing',
    blurb: 'It is colder, wetter and more seasonal than people expect.',
    icon: 'weather',
    items: [
      {
        q: 'When is the best time to visit?',
        a: 'March to June and September to November are the reliable windows -- clear Dhauladhar views and walkable weather. July and August are heavy monsoon; December to February is cold, quiet and the only time you might get snow.',
        href: '/blog/best-time-to-visit-dharamshala',
      },
      {
        q: 'What should I pack?',
        a: 'Layers, always, whatever the month -- evenings drop sharply even in summer because of the altitude. Add a rain shell for monsoon, proper grippy shoes for the wet stone, and a serious warm layer from December.',
        href: '/blog/dharamshala-weather-what-to-pack',
      },
      {
        q: 'Will I see snow?',
        a: 'Possible in McLeod Ganj in January and February, but never guaranteed and it rarely settles for long. The peaks stay snow-capped and visible far longer than the town does.',
        href: '/blog/dharamshala-in-winter-snowfall',
      },
      {
        q: 'Is monsoon worth risking?',
        a: 'It is the cheapest, greenest and emptiest season, and the waterfalls are at their best. The real cost is landslide and road-closure risk plus days of solid rain, so build slack into your travel days.',
        href: '/blog/dharamshala-monsoon-travel-guide',
      },
    ],
  },
  {
    id: 'rules',
    title: 'Rules, Etiquette & Permits',
    blurb: 'A Tibetan religious centre as well as a hill station. It matters.',
    icon: 'rules',
    items: [
      {
        q: 'Do I need any permits?',
        a: 'Not for Dharamshala, McLeod Ganj or the usual sightseeing. Trekking into the Dhauladhar, including Triund camping, does involve forest department fees and registration, which trek operators normally handle for you.',
        href: '/blog/rules-permits-dos-donts-dharamshala',
      },
      {
        q: 'How should I behave at the temple and monasteries?',
        a: 'Cover shoulders and knees, remove shoes where indicated, walk clockwise around shrines and stupas, and ask before photographing monks or ceremonies. Security at the Dalai Lama temple complex restricts bags and cameras in parts.',
        href: '/blog/tibetan-culture-etiquette-guide',
      },
      {
        q: 'Is plastic really banned?',
        a: 'Himachal enforces plastic rules more seriously than most Indian states, and single-use plastic is restricted. Bring a refillable bottle and a cloth bag -- it is practical here, not just virtuous.',
        href: '/blog/rules-permits-dos-donts-dharamshala',
      },
      {
        q: 'Can I bring my pet?',
        a: 'Yes, and a growing number of guesthouses are genuinely pet-friendly, but confirm before booking rather than assuming. Street dogs and monkeys are the real complication on walks.',
        href: '/blog/travelling-with-pets-dharamshala',
      },
      {
        q: 'Can I just turn up at the cricket stadium?',
        a: 'Usually yes -- on a normal day you walk up, pay a modest fee at the gate and sit in the stands, with no booking and no online ticket. The catch is that it is a working ground, so it shuts to visitors for matches, practice, maintenance and official visits, often without notice. Check the same morning rather than driving down on spec.',
        href: '/blog/hpca-cricket-stadium-guide',
      },
      {
        q: 'What do first-timers usually get wrong?',
        a: 'Underestimating the cold, over-packing the itinerary, assuming Dharamshala and McLeod Ganj are the same place, and booking a hotel up a hill they then have to climb with luggage four times a day.',
        href: '/blog/first-time-visitor-tips-mistakes',
      },
    ],
  },
];

/** Flat list -- used for the FAQPage schema and the item count in the intro. */
export const essentialItems: EssentialItem[] = essentialGroups.flatMap((g) => g.items);

/** FAQPage schema wants {question, answer}, our data says {q, a}. */
export const essentialFaqs = essentialItems.map((i) => ({ question: i.q, answer: i.a }));
