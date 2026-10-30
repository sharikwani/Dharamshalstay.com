/**
 * Events in and around Dharamshala that bring visitors, each with a stay package we can quote.
 * Only dates we have checked: "confirmed" = announced by the organiser, "expected" = from a calendar, not yet
 * announced, "usual" = a fixed or seasonal date with no programme yet. Past events drop off the page by themselves.
 * Re-check before each season; keep `checked` current.
 */
import type { PlaceImageKey } from '@/lib/place-images';

export type EventStatus = 'confirmed' | 'expected' | 'usual';

export type DharamshalaEvent = {
  id: string;
  name: string;
  /** ISO dates. For seasons, the first and last day of the usual window. */
  start: string;
  end?: string;
  status: EventStatus;
  venue: string;
  /** Where the venue is, for people who know McLeod Ganj or Kotwali Bazaar. */
  where: string;
  summary: string;
  /** What the stay package covers (quoted on request, no fixed price). */
  pack: { title: string; nights: string; includes: string[] };
  note?: string;
  sources: { label: string; url: string }[];
  /** Our related guide. */
  page?: string;
  image: PlaceImageKey;
  /** Who runs it, only when a source names them (Google Events: organizer). */
  organizer?: string;
  /** The organizer's official website (Google Events: organizer.url). */
  organizerUrl?: string;
  /** Open to the public without a ticket (Google Events: a free offer). */
  free?: boolean;
};

export const eventsChecked = '2026-10-20';

export const EVENTS: DharamshalaEvent[] = [
  {
    id: 'diff-2026', name: 'Dharamshala International Film Festival (DIFF) 2026', start: '2026-10-29', end: '2026-11-01', status: 'confirmed',
    venue: 'Tibetan Children’s Village (TCV), Upper Dharamshala', where: 'About 2 km from McLeod Ganj; four screening venues on the TCV campus',
    summary: 'The 15th edition of the independent film festival in the hills: Indian and international films, talks and filmmaker Q&As over four days.',
    pack: { title: 'Film festival stay', nights: '3-4 nights', includes: ['Hotel near TCV or McLeod Ganj', 'Pickup from Gaggal airport or the Dharamshala bus stand', 'Daily taxi to TCV on request', 'Help with festival passes (bought on the DIFF site)'] },
    sources: [{ label: 'Time Out India: DIFF 2026 passes on sale', url: 'https://www.timeout.com/india/news/tickets-for-diff-go-live-on-september-22-a-film-festival-in-the-hills-092126' }],
    page: '/blog/dharamshala-film-festival-diff-2026', image: 'tibet-museum', organizer: 'Dharamshala International Film Festival', organizerUrl: 'https://diff.co.in/',
  },
  {
    id: 'kangra-valley-carnival-2026', name: 'Kangra Valley Carnival 2026', start: '2026-12-24', end: '2026-12-31', status: 'expected',
    venue: 'Dharamshala (opening concert proposed at HPCA Stadium)', where: 'HPCA Stadium is in Dharamshala town, about 1.5-2 km below Kotwali Bazaar and 8-10 km by road from McLeod Ganj',
    summary: 'A week of music, food and culture across Dharamshala over Christmas and New Year, announced by the Kangra district administration.',
    pack: { title: 'Christmas and New Year week', nights: '3-7 nights', includes: ['Hotel in McLeod Ganj, Dharamkot or Dharamshala town', 'Airport or bus stand pickup and drop', 'A local sightseeing day by taxi', 'Optional Triund trek or paragliding'] },
    note: 'Dates from one news report; the final programme is not out yet. Hotels fill early for 24-31 December, so ask soon.',
    sources: [{ label: 'UNI: Kangra Valley Carnival plans', url: 'https://www.uniindia.com/north-india/culture-himachal-kangra-valley-carnival/198184' }],
    page: '/blog/kangra-valley-carnival-2026', image: 'mcleod-ganj', organizer: 'Kangra district administration', organizerUrl: 'https://hpkangra.nic.in/',
  },
  {
    id: 'snow-season-2027', name: 'Snow season in McLeod Ganj, Naddi and Triund', start: '2027-01-01', end: '2027-02-28', status: 'usual',
    venue: 'McLeod Ganj, Dharamkot, Naddi, Triund', where: 'Snow usually reaches McLeod Ganj and Naddi a few days each winter; Triund and the Dhauladhar get it every year',
    summary: 'January and February give the best chance of snow at McLeod Ganj and Naddi; the Dhauladhar range above stays white all winter.',
    pack: { title: 'Snow weekend', nights: '2-3 nights', includes: ['Heated room with a valley or mountain view', 'Taxi that knows the winter roads (4x4 on request)', 'Snow alert: we message you when snow is forecast', 'Flexible dates where the hotel allows'] },
    note: 'Snow is never guaranteed. See our dated snowfall log before you book.',
    sources: [{ label: 'Dharamshala Stay snowfall log', url: '/blog/dharamshala-in-winter-snowfall' }],
    page: '/blog/dharamshala-in-winter-snowfall', image: 'dharamshala-snow',
  },
  {
    id: 'losar-2027', name: 'Losar (Tibetan New Year) 2027', start: '2027-02-07', status: 'expected',
    venue: 'Tsuglagkhang (Main Tibetan Temple), McLeod Ganj', where: 'Temple Road, a 5-minute walk down from McLeod Ganj main square',
    summary: 'Tibetan New Year: prayers at the main temple, families visiting monasteries and homes, and the Tibetan community at its most festive.',
    pack: { title: 'Losar in McLeod Ganj', nights: '3 nights', includes: ['Hotel walking distance from the temple', 'Pickup and drop', 'A monastery day: Tsuglagkhang, Norbulingka and Gyuto by taxi', 'Tibetan food tips from our team'] },
    note: 'Expected date from published calendars; the Men-Tsee-Khang Tibetan calendar fixes it. Some shops and restaurants close for the first days.',
    sources: [{ label: 'Office Holidays: Losar dates', url: 'https://www.officeholidays.com/holidays/losar' }],
    page: '/monasteries-meditation', image: 'prayer-flags', free: true,
  },
  {
    id: 'long-life-prayer-2027-02', name: 'Long Life Prayer for the Dalai Lama', start: '2027-02-24', status: 'confirmed',
    venue: 'Tsuglagkhang (Main Tibetan Temple), McLeod Ganj', where: 'Temple Road, McLeod Ganj',
    summary: 'A morning Long Life Prayer offered to His Holiness the Dalai Lama at the main temple, listed on his official schedule.',
    pack: { title: 'Temple visit stay', nights: '2-3 nights', includes: ['Hotel near Temple Road', 'Pickup and drop', 'Early-morning taxi to the temple if you stay further away', 'Advice on security checks and what to carry'] },
    note: 'His official schedule says events are subject to change. Phones and bags are usually not allowed inside; plan to queue early.',
    sources: [{ label: 'dalailama.com schedule', url: 'https://www.dalailama.com/schedule' }],
    page: '/blog/dalai-lama-temple-guide', image: 'tsuglagkhang', free: true,
  },
  {
    id: 'chaitra-navratri-2027', name: 'Chaitra Navratri 2027 at Chamunda Devi and Jwalaji', start: '2027-04-07', end: '2027-04-15', status: 'expected',
    venue: 'Chamunda Devi, Kangra Devi (Brajeshwari) and Jwalamukhi temples', where: 'Chamunda Devi about 15 km, Kangra about 20 km and Jwalaji about 55 km from Dharamshala',
    summary: 'Nine nights of Navratri bring large crowds of pilgrims to the Kangra Valley’s Shakti temples.',
    pack: { title: 'Navratri temple circuit', nights: '2-3 nights', includes: ['Hotel in Dharamshala town (closest to the temples)', 'Full-day taxi: Chamunda Devi, Kangra Devi and Jwalaji', 'Early start to beat the queues', 'Pickup from Gaggal airport or Pathankot station'] },
    note: 'Start date from a published panchang; temple timings change during Navratri.',
    sources: [{ label: 'Dekho Panchang: Chaitra Navratri 2027', url: 'https://dekhopanchang.com/en/festivals/chaitra-navratri/2027' }],
    image: 'chamunda-devi', free: true,
  },
  {
    id: 'saga-dawa-2027', name: 'Saga Dawa Duchen 2027', start: '2027-05-20', status: 'expected',
    venue: 'Tsuglagkhang and the Lingkor kora path, McLeod Ganj', where: 'The kora circles the temple complex below McLeod Ganj',
    summary: 'The holiest day of the Tibetan Buddhist year, marking the Buddha’s birth, enlightenment and passing. Many walk the kora with prayers and offerings.',
    pack: { title: 'Saga Dawa stay', nights: '2 nights', includes: ['Hotel near the temple and kora', 'Pickup and drop', 'A quiet monastery day by taxi'] },
    note: 'Expected date from published calendars; confirm with the Tibetan calendar nearer the time.',
    sources: [{ label: 'Office Holidays: Buddha Purnima / Saga Dawa', url: 'https://www.officeholidays.com/holidays/india/sikkim/buddha-purnima' }],
    page: '/monasteries-meditation', image: 'tibetan-monks-ceremony', free: true,
  },
  {
    id: 'dalai-lama-birthday-2027', name: 'Dalai Lama’s birthday (6 July)', start: '2027-07-06', status: 'usual',
    venue: 'Tsuglagkhang (Main Tibetan Temple), McLeod Ganj', where: 'Temple Road, McLeod Ganj',
    summary: 'Celebrated every year on 6 July at the main temple with prayers, cultural programmes and the Tibetan community out in force.',
    pack: { title: 'Birthday celebrations', nights: '2-3 nights', includes: ['Hotel near Temple Road', 'Pickup and drop', 'Monsoon-safe taxi'] },
    note: 'The 2027 programme is not announced, and His Holiness is not always in Dharamshala on the day. July is monsoon season.',
    sources: [{ label: 'Daily Pioneer: 91st birthday in Himachal (2026)', url: 'https://dailypioneer.com/news/dalai-lama---s-91st-birthday-celebrated-across-himachal-pradesh' }],
    image: 'tsuglagkhang', free: true,
  },
];

/** Events still to come (or on now), in date order. */
export function upcomingEvents(today = new Date().toISOString().slice(0, 10)): DharamshalaEvent[] {
  return EVENTS.filter((e) => (e.end || e.start) >= today).sort((a, b) => a.start.localeCompare(b.start));
}

export const EVENT_STATUS: Record<EventStatus, { label: string; cls: string }> = {
  confirmed: { label: 'Confirmed', cls: 'bg-green-100 text-green-800' },
  expected: { label: 'Expected date', cls: 'bg-amber-100 text-amber-800' },
  usual: { label: 'Every year', cls: 'bg-sky-100 text-sky-800' },
};
