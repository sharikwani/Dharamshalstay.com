/**
 * What a page is about, for the lead tools: the "ask a local" box in guides, the WhatsApp button's
 * ready-made message and greeting, and the alert sign-ups on time-sensitive pages.
 * Works from the URL alone (no guide data), so it is cheap enough for the client bundle.
 */
export type LeadForm = 'trek' | 'taxi' | 'hotel' | 'paragliding' | 'general';

export type LeadAlert = {
  /** Stored in contacts.interests (max 30 chars) so a mailing can go to exactly these people. */
  interest: string;
  title: string;
  sub: string;
};

export type LeadTopic = {
  /** Short id for analytics and the enquiry note. */
  key: string;
  form: LeadForm;
  /** Lead box heading and line under it. */
  title: string;
  sub: string;
  /** WhatsApp greeting bubble text. */
  greet: string;
  /** Ready-made first WhatsApp message. */
  wa: string;
  alert?: LeadAlert;
};

export const ALERTS = {
  skyway: { interest: 'alert-skyway', title: 'Get an email when the Skyway reopens', sub: 'One short email when the Dharamshala Skyway ropeway timings or fares change. Nothing else.' },
  snow: { interest: 'alert-snow', title: 'Get an email when it snows', sub: 'A short alert when fresh snow is reported in McLeod Ganj, Naddi or Triund, with road conditions.' },
  rohtang: { interest: 'alert-rohtang', title: 'Get an email when Rohtang opens or closes', sub: 'A short alert when the Rohtang Pass or Atal Tunnel road status changes, with permit news.' },
  events: { interest: 'alert-events', title: 'Get festival dates as they are announced', sub: 'Carnival programmes, festival dates and New Year nights in Dharamshala, by email as soon as they are out.' },
  treks: { interest: 'alert-trek-rules', title: 'Get an email when trekking rules change', sub: 'Winter trekking orders, permits and closures for Triund and other Kangra treks.' },
  updates: { interest: 'alert-travel-updates', title: 'Get new travel updates by email', sub: 'A short email when a closure, trekking rule, fee or road status in Dharamshala changes.' },
  nye: { interest: 'alert-nye', title: 'Tell me the DJ and the last tickets', sub: 'An email when the NYE Gala Night DJ is announced and before tickets run out.' },
} satisfies Record<string, LeadAlert>;

const DEFAULT: LeadTopic = {
  key: 'trip', form: 'general',
  title: 'Get a free plan for your Dharamshala trip',
  sub: 'Tell us your date and group size. A local from our team sends a day-by-day plan with current hotel and taxi prices on WhatsApp.',
  greet: 'Namaste! Planning a trip? Ask our local team about stays, treks or taxis.',
  wa: 'Hi! Help me plan my Dharamshala trip.',
};

/** First matching rule wins, so the more specific topics come first. */
const RULES: [RegExp, Omit<LeadTopic, 'key'> & { key: string }][] = [
  [/new-year-part/, {
    key: 'nye', form: 'general', title: 'Questions about the NYE Gala Night?', sub: 'Ask us about tickets, rooms or the night itself and we reply on WhatsApp.',
    greet: 'Namaste! Questions about the NYE Gala Night tickets or rooms? Ask us here.', wa: 'Hi! I want to know more about the NYE Gala Night tickets at Panchvati Cottages.', alert: ALERTS.nye,
  }],
  [/skyway|ropeway/, {
    key: 'skyway', form: 'general', title: 'Plan your Skyway day with a local', sub: 'Tell us your date and group size. We send the current Skyway status, a plan for the day and taxi prices on WhatsApp.',
    greet: 'Visiting the Skyway? Ask us for today’s status and the best time to go.', wa: 'Hi! I am planning to ride the Dharamshala Skyway. Is it running, and can you help me plan the day?', alert: ALERTS.skyway,
  }],
  [/rohtang|atal-tunnel|manali|sissu|solang/, {
    key: 'manali', form: 'taxi', title: 'Planning Manali or Rohtang from Dharamshala?', sub: 'Tell us your date and group size. We send the current road status and a fixed taxi price on WhatsApp.',
    greet: 'Going to Manali or Rohtang? Ask us for the road status and a taxi price.', wa: 'Hi! I am planning a trip to Manali or Rohtang from Dharamshala. Can you share the road status and a taxi price?', alert: ALERTS.rohtang,
  }],
  [/triund|trek|kareri|indrahar|minkiani|adi-himani|hike|camping|guna-devi/, {
    key: 'trek', form: 'trek', title: 'Trek with a local guide', sub: 'Tell us your date and group size. We send the current trail conditions, rules and a guided trek price on WhatsApp.',
    greet: 'Planning a trek? Ask us about trail conditions, rules and guides.', wa: 'Hi! I am planning a trek near Dharamshala. Can you share trail conditions and a guided trek price?', alert: ALERTS.treks,
  }],
  [/snow|winter/, {
    key: 'snow', form: 'general', title: 'Planning a snow trip?', sub: 'Tell us your dates. We tell you where the snow is, which roads are open and the best stays, on WhatsApp.',
    greet: 'Looking for snow? Ask us where it is snowing right now.', wa: 'Hi! I am planning a snow trip to Dharamshala / McLeod Ganj. Where is the snow right now?', alert: ALERTS.snow,
  }],
  [/carnival|dussehra|losar|diwali|christmas|new-year|holi|festival|teaching|events?(\/|$)|film-festival/, {
    key: 'events', form: 'general', title: 'Coming for the festival?', sub: 'Tell us your dates and group size. We help with stays near the venue, taxis and the programme, on WhatsApp.',
    greet: 'Coming for a festival or event? Ask us about dates, stays and taxis.', wa: 'Hi! I am coming to Dharamshala for a festival or event. Can you help me plan?', alert: ALERTS.events,
  }],
  [/paragliding|(^|[/-])bir([/-]|$)|billing/, {
    key: 'paragliding', form: 'paragliding', title: 'Book a paragliding flight with a local', sub: 'Tell us your date and group size. We confirm the pilot, slot and price on WhatsApp.',
    greet: 'Thinking of paragliding? Ask us for a slot and today’s price.', wa: 'Hi! I want to book paragliding. Can you share slots and the price?',
  }],
  [/taxi|how-to-reach|airport|gaggal|railway|train|(^|[/-])bus([/-]|$)|distance|road-trip|(delhi|amritsar|chandigarh|pathankot|jammu|shimla|dalhousie|palampur|kangra|dharamshala|mcleod-ganj)-to-|-to-(dharamshala|mcleod|delhi|amritsar|chandigarh|pathankot|shimla|dalhousie|palampur|kangra)/, {
    key: 'taxi', form: 'taxi', title: 'Get a fixed taxi price', sub: 'Tell us your date and group size. We send a fixed fare with a local driver on WhatsApp, no surge.',
    greet: 'Need a taxi? Ask us for a fixed fare with a local driver.', wa: 'Hi! I need a taxi for my Dharamshala trip. Can you share a fixed fare?',
  }],
  [/hotel|stay|homestay|hostel|resort|cottage|where-to|accommodation|workation/, {
    key: 'stay', form: 'hotel', title: 'Find the right stay with a local', sub: 'Tell us your dates and group size. We send 3 stays that fit, with direct prices, on WhatsApp.',
    greet: 'Looking for a stay? Ask us for 3 options that fit your dates.', wa: 'Hi! I am looking for a stay in Dharamshala / McLeod Ganj. Can you suggest a few options?',
  }],
  [/monaster|temple|meditation|tibet|dalai|norbulingka|gompa|tushita|vipassana|church|museum/, {
    key: 'culture', form: 'general', title: 'See it with a local', sub: 'Tell us your date and group size. We plan the visits, timings and a local guide if you want one, on WhatsApp.',
    greet: 'Visiting the temples and monasteries? Ask us for timings and a local guide.', wa: 'Hi! I want to visit the monasteries and temples around McLeod Ganj. Can you help me plan?',
  }],
];

/** Topic for a page path (English or /hi), e.g. /blog/triund-trek-complete-guide or /taxi. */
export function topicForPath(path: string): LeadTopic {
  const p = (path || '/').toLowerCase().replace(/^\/hi(?=\/|$)/, '') || '/';
  for (const [re, t] of RULES) if (re.test(p)) return t;
  return DEFAULT;
}

/** Topic for a guide slug. */
export function topicForSlug(slug: string): LeadTopic {
  return topicForPath('/blog/' + slug);
}

/** Where the free trip plan offer may appear: reading pages, never booking, account, game or ticket pages. */
export const TRIP_PLAN_PAGES = /^\/(hi\/)?($|blog(\/|$)|destinations(\/|$)|facts$|faq$|travel-updates$|essentials(\/|$)|events$|monasteries-meditation$|treks$|paragliding$|taxi$|stories$)/;
