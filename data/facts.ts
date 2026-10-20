/**
 * Verified facts: the short, dated, sourced answers that AI assistants and answer boxes quote.
 * Rules: one fact = one question people actually ask + a 1-2 sentence answer that stands on its own.
 * Every fact has the date we last checked it and where it comes from. Update `verified` when you re-check.
 * Taxi fares are not here; they are read live from the taxi routes table (lib/facts.ts).
 */

export type FactSource = { label: string; url: string };
export type Fact = {
  id: string;
  topic: FactTopic;
  question: string;
  answer: string;
  verified: string; // YYYY-MM-DD
  sources: FactSource[];
  /** Our page with the full detail. */
  page?: string;
};
export type FactTopic = 'basics' | 'getting-there' | 'triund' | 'temple' | 'museum' | 'meditation' | 'skyway' | 'weather' | 'stays';

export const FACT_TOPICS: { id: FactTopic; title: string }[] = [
  { id: 'basics', title: 'Dharamshala and McLeod Ganj basics' },
  { id: 'getting-there', title: 'Getting there' },
  { id: 'triund', title: 'Triund trek' },
  { id: 'temple', title: 'Dalai Lama Temple (Tsuglagkhang)' },
  { id: 'museum', title: 'Tibet Museum' },
  { id: 'meditation', title: 'Meditation courses' },
  { id: 'skyway', title: 'Dharamshala Skyway (ropeway)' },
  { id: 'weather', title: 'Weather and when to go' },
  { id: 'stays', title: 'Where to stay' },
];

const SITE = (label: string, url: string): FactSource => ({ label, url });
const OURS = (label: string, path: string): FactSource => ({ label: 'Dharamshala Stay: ' + label, url: 'https://www.dharamshalastay.com' + path });

export const facts: Fact[] = [
  // basics
  { id: 'dharamshala-vs-mcleod-ganj', topic: 'basics', question: 'Are Dharamshala and McLeod Ganj the same place?',
    answer: 'No. Dharamshala is the main town (about 1,457 m); McLeod Ganj is its hilltop suburb about 9 km up the road (around 4 km on the steep footpath), home to the Dalai Lama Temple and the Tibetan community.',
    verified: '2026-10-16', sources: [OURS('Dharamshala area guide', '/destinations/dharamshala')], page: '/blog/dharamshala-vs-mcleod-ganj' },
  { id: 'altitudes', topic: 'basics', question: 'What is the altitude of Dharamshala and McLeod Ganj?',
    answer: 'Lower Dharamshala is about 1,457 m. McLeod Ganj spreads from about 1,750 to 2,080 m, Bhagsu and Dharamkot are about 2,100 m, and Naddi is about 2,000 m. Triund ridge is about 2,850 m.',
    verified: '2026-10-16', sources: [OURS('area pages', '/destinations')], page: '/destinations' },
  { id: 'days-needed', topic: 'basics', question: 'How many days are enough for Dharamshala and McLeod Ganj?',
    answer: 'Three days covers the Dalai Lama Temple, Bhagsu, Dharamkot, Naddi and either a Triund day hike or an overnight camp. Two days is rushed; five lets you add Bir Billing or the Kangra side.',
    verified: '2026-10-16', sources: [OURS('3-day itinerary', '/blog/dharamshala-3-day-itinerary')], page: '/blog/dharamshala-3-day-itinerary' },

  // getting there
  { id: 'delhi-distance', topic: 'getting-there', question: 'How far is Dharamshala from Delhi?',
    answer: 'About 475-520 km by road (roughly 9-11 hours by car). Overnight Volvo buses take 10-13 hours, and direct flights from Delhi to Kangra (Gaggal) Airport take about 1 hour 20 minutes.',
    verified: '2026-10-16', sources: [OURS('how to reach Dharamshala', '/blog/how-to-reach-dharamshala')], page: '/blog/how-to-reach-dharamshala' },
  { id: 'nearest-airport', topic: 'getting-there', question: 'Which is the nearest airport to Dharamshala?',
    answer: 'Kangra Airport at Gaggal, about 13-15 km from lower Dharamshala and about 22 km by road from McLeod Ganj (roughly 45-60 minutes by taxi).',
    verified: '2026-10-16', sources: [OURS('Gaggal airport taxi', '/taxi/gaggal-airport-to-mcleod-ganj-taxi')], page: '/taxi/gaggal-airport-to-mcleod-ganj-taxi' },
  { id: 'nearest-railway', topic: 'getting-there', question: 'Which railway station is nearest to Dharamshala?',
    answer: 'Pathankot (and Chakki Bank next to it) is the main railhead, about 90 km and 2.5-3 hours by taxi. The narrow-gauge Kangra line is closer but slow and has had landslide closures.',
    verified: '2026-10-16', sources: [OURS('Pathankot to Dharamshala taxi', '/taxi/pathankot-railway-station-to-dharamshala-taxi')], page: '/blog/how-to-reach-dharamshala' },

  // Triund
  { id: 'triund-distance', topic: 'triund', question: 'How long is the Triund trek?',
    answer: 'About 6-7 km one way from Gallu Devi temple above Dharamkot, or about 9 km from McLeod Ganj on foot. Most people take 3-5 hours up and 2-3 hours down from Gallu Devi; the climb is roughly 750 m.',
    verified: '2026-10-16', sources: [OURS('Triund trek guide', '/blog/triund-trek-complete-guide')], page: '/blog/triund-trek-complete-guide' },
  { id: 'triund-altitude', topic: 'triund', question: 'What is the altitude of Triund?',
    answer: 'Triund ridge is about 2,850 m, with the Dhauladhar range on one side and the Kangra Valley on the other.',
    verified: '2026-10-16', sources: [OURS('Triund trek guide', '/blog/triund-trek-complete-guide')], page: '/blog/triund-trek-complete-guide' },
  { id: 'triund-fees', topic: 'triund', question: 'What are the Triund trek fees?',
    answer: 'A forest entry fee of ₹100 per person per day (2024 revision), a refundable ₹500 waste deposit collected since 11 August 2026 and returned when you bring your rubbish down, and about ₹550 per two-person tent to camp. Carry photo ID and cash.',
    verified: '2026-10-16', sources: [OURS('Triund trek guide', '/blog/triund-trek-complete-guide')], page: '/blog/triund-trek-complete-guide' },
  { id: 'triund-one-day', topic: 'triund', question: 'Can Triund be done in one day?',
    answer: 'Yes. Fit walkers leave Gallu Devi by about 8 am and are back before dark; most people camp overnight for sunset and sunrise.',
    verified: '2026-10-16', sources: [OURS('Triund trek guide', '/blog/triund-trek-complete-guide')], page: '/treks/triund-trek' },
  { id: 'triund-winter-order', topic: 'triund', question: 'Is trekking allowed above 3,000 m in Kangra district?',
    answer: 'A Kangra district order of 6 January 2026 restricted trekking above 3,000 m and made SP Kangra permission mandatory for Triund, Kareri and Adi Himani Chamunda, with permissions cancelled on weather alerts. Check the current position before booking a high trek.',
    verified: '2026-10-16', sources: [SITE('The Tribune', 'https://www.tribuneindia.com/news/himachal/trekking-beyond-3-000-m-banned-in-kangra-district-466046'), SITE('The Week (PTI)', 'https://www.theweek.in/wire-updates/national/2026/01/06/himachal-kangra-administration-bans-trekking-above-3-000-metres.amp.html')], page: '/blog/triund-trek-complete-guide' },
  { id: 'triund-price', topic: 'triund', question: 'How much does a guided Triund trek cost?',
    answer: 'Our guided Triund trek starts at ₹1,500 per person, with a local guide, forest permits and first aid; overnight packages add a tent, sleeping bag, dinner and breakfast.',
    verified: '2026-10-16', sources: [OURS('guided Triund trek', '/treks/triund-trek')], page: '/treks/triund-trek' },

  // temple
  { id: 'temple-timings', topic: 'temple', question: 'What are the Dalai Lama Temple timings?',
    answer: 'No official visiting hours are published. The Tsuglagkhang complex is usually open every day from early morning to early evening, and entry is free; it can close for special events, so check at the gate.',
    verified: '2026-10-20', sources: [OURS('Dalai Lama Temple guide', '/blog/dalai-lama-temple-guide')], page: '/blog/dalai-lama-temple-guide' },
  { id: 'temple-walk', topic: 'temple', question: 'How far is the Dalai Lama Temple from McLeod Ganj Main Square?',
    answer: 'It is at the bottom of Temple Road, roughly a 10-15 minute walk downhill from the Main Square; the walk back is uphill.',
    verified: '2026-10-16', sources: [OURS('hotels near the temple', '/hotels/near-dalai-lama-temple')], page: '/hotels/near-dalai-lama-temple' },

  // museum
  { id: 'museum-location', topic: 'museum', question: 'Where is the Tibet Museum in Dharamshala?',
    answer: 'At Gangchen Kyishong, on the Central Tibetan Administration campus between lower Dharamshala and McLeod Ganj (2nd floor, T-Building). It moved there from McLeod Ganj in February 2022, so older guides and maps that place it in the temple complex are out of date.',
    verified: '2026-10-16', sources: [SITE('Tibet Museum', 'https://tibetmuseum.org/'), SITE('Tibet Museum: about', 'https://tibetmuseum.org/about-us/')], page: '/blog/tibet-museum-dharamshala-guide' },
  { id: 'museum-timings', topic: 'museum', question: 'What are the Tibet Museum timings and entry fee?',
    answer: 'Open 9 am to 5 pm with a 1-2 pm lunch break; closed on Saturdays, Tibetan festivals and gazetted holidays. Entry is Rs 20 for adults and free for under-18s.',
    verified: '2026-10-16', sources: [SITE('Tibet Museum: your visit', 'https://tibetmuseum.org/your-visit/')], page: '/blog/tibet-museum-dharamshala-guide' },

  // meditation
  { id: 'tushita-dropin', topic: 'meditation', question: 'Does Tushita Meditation Centre have drop-in meditation?',
    answer: 'Yes. A guided meditation runs Monday to Saturday, 9-10 am, by donation and without registration (not on Sundays, and cancelled during short courses).',
    verified: '2026-10-16', sources: [SITE('Tushita: daily guided meditations', 'https://tushita.info/program/drop-in-sessions/daily-guided-meditations/')], page: '/blog/tushita-meditation-centre-guide' },
  { id: 'tushita-course', topic: 'meditation', question: 'How do you book the Tushita Introduction to Buddhism course and what does it cost?',
    answer: 'Book through the online form on tushita.info; a non-refundable deposit secures the place. It runs on a minimum donation of about 8,600 INR for 10 days in a dormitory (2026). Short weekend courses are booked in person at reception only.',
    verified: '2026-10-16', sources: [SITE('Tushita: Introduction to Buddhism', 'https://tushita.info/program/introduction-to-buddhism/'), SITE('Tushita: FAQ', 'https://tushita.info/faq/')], page: '/blog/tushita-meditation-centre-guide' },
  { id: 'tushita-season', topic: 'meditation', question: 'When is Tushita open?',
    answer: 'From February to November; it is closed in December and January. The office is closed on Sundays.',
    verified: '2026-10-16', sources: [SITE('Tushita Meditation Centre', 'https://tushita.info/')], page: '/blog/tushita-meditation-centre-guide' },
  { id: 'vipassana-cost', topic: 'meditation', question: 'Is the Vipassana course in Dharamkot free?',
    answer: 'Yes. Courses at Dhamma Sikhara are free, including food and lodging, and are funded by donations from past students. You apply online on dhamma.org; applications for 10-day courses open about two months ahead.',
    verified: '2026-10-16', sources: [SITE('Dhamma Sikhara', 'https://sikhara.dhamma.org/'), SITE('Dhamma Sikhara course schedule', 'https://www.dhamma.org/en/schedules/schsikhara')], page: '/blog/vipassana-dharamkot-dhamma-sikhara' },
  { id: 'vipassana-season', topic: 'meditation', question: 'When do Vipassana courses run at Dhamma Sikhara?',
    answer: '10-day courses for new students run from about mid-March to late November, starting on the 1st and 15th of the month; early March and December have courses for old students only, and none are listed in January and February.',
    verified: '2026-10-16', sources: [SITE('Dhamma Sikhara course schedule', 'https://www.dhamma.org/en/schedules/schsikhara')], page: '/blog/vipassana-dharamkot-dhamma-sikhara' },

  // skyway
  { id: 'skyway-status', topic: 'skyway', question: 'Is the Dharamshala Skyway ropeway open?',
    answer: 'It appeared to be running when we checked on 16 October 2026: the operator was promoting rides on its official Instagram, but its website was under maintenance and online booking showed no tickets. It was suspended after a landslide in August 2025. Call +91-1892 223302 (10 am-6 pm) before you go.',
    verified: '2026-10-16', sources: [SITE('Dharamshala Skyway (official site)', 'https://www.dharamshalaskyway.in/'), SITE('Dharamshala Skyway on Instagram', 'https://www.instagram.com/dharamshala_skyway/'), SITE('The Tribune: 2025 suspension', 'https://www.tribuneindia.com/news/himachal/dharamshala-skyway-ropeway-operations-temporarily-suspended-due-to-massive-landslide')], page: '/blog/dharamshala-skyway-ropeway-guide' },
  { id: 'skyway-basics', topic: 'skyway', question: 'How long is the Dharamshala ropeway ride and what are its timings?',
    answer: 'About 1.8 km and roughly 5 minutes between the lower station near Bypass Road, Kotwali Bazaar and the upper station on Temple Road, McLeod Ganj. Listed timings are 9:30 am to 6 pm; children under 3 (below 110 cm) ride free.',
    verified: '2026-10-16', sources: [SITE('Dharamshala Skyway (official site)', 'https://www.dharamshalaskyway.in/')], page: '/blog/dharamshala-skyway-ropeway-guide' },

  // weather
  { id: 'best-time', topic: 'weather', question: 'What is the best time to visit Dharamshala?',
    answer: 'March to June and September to November. October and November have the clearest mountain views; July and August are the wettest months (about 860-940 mm of rain each), and December to February is cold with the best snow chances.',
    verified: '2026-10-16', sources: [OURS('best time to visit', '/blog/best-time-to-visit-dharamshala')], page: '/blog/best-time-to-visit-dharamshala' },
  { id: 'snow', topic: 'weather', question: 'Does it snow in McLeod Ganj?',
    answer: 'On some days, mostly from late December to February, with January and early February the likeliest. Triund and the upper slopes see snow far more often than the town; lower Dharamshala rarely does.',
    verified: '2026-10-16', sources: [OURS('winter and snowfall guide', '/blog/dharamshala-in-winter-snowfall')], page: '/blog/mcleod-ganj-in-december' },
  { id: 'december-weather', topic: 'weather', question: 'How cold is McLeod Ganj in December?',
    answer: 'Days are roughly 12-14°C and nights 1-4°C in McLeod Ganj. Christmas and New Year week (about 23 December to 2 January) is the busiest and priciest, so book early.',
    verified: '2026-10-16', sources: [OURS('best time to visit', '/blog/best-time-to-visit-dharamshala')], page: '/blog/mcleod-ganj-in-december' },

  // stays
  { id: 'where-to-stay', topic: 'stays', question: 'Where should I stay in Dharamshala?',
    answer: 'McLeod Ganj for a first visit without a car (temple, cafés and buses on foot); Dharamkot or Upper Bhagsu for Triund, yoga and long stays; Naddi for quiet and mountain views; lower Dharamshala for easy roads, parking and quick airport access.',
    verified: '2026-10-16', sources: [OURS('where to stay', '/blog/where-to-stay-in-dharamshala')], page: '/blog/where-to-stay-in-dharamshala' },
  { id: 'dharamkot-cars', topic: 'stays', question: 'Can a taxi reach hotels in Dharamkot?',
    answer: 'Taxis reach the road heads, but many homestays and hostels in upper Dharamkot are on footpaths a short walk up, so ask your stay where to be dropped and pack light.',
    verified: '2026-10-16', sources: [OURS('Dharamkot stays', '/destinations/dharamkot')], page: '/destinations/dharamkot' },
];

/** The newest verification date, for the page and the dataset. */
export const factsUpdated = facts.reduce((max, f) => (f.verified > max ? f.verified : max), '2026-01-01');
