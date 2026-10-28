/**
 * Christmas and New Year parties we sell tickets for (category 'event' bookings, migration v51).
 * Prices are in rupees per ticket; a ticket admits `admits` people. A party takes bookings only when
 * bookingOpen is true and it has at least one ticket type (the owner sends prices and timings).
 */
export type TicketType = {
  id: string;
  name: string;
  /** Rupees per ticket. */
  price: number;
  /** People one ticket lets in (couple = 2). */
  admits: number;
  includes?: string;
};

export type Party = {
  slug: string;
  name: string;
  kind: 'christmas' | 'new-year';
  venue: string;
  /** Slug of the property page, when the venue is a listed property. */
  propertySlug?: string;
  area: string;
  /** YYYY-MM-DD */
  date: string;
  /** "8:00 pm"; empty until announced. */
  startTime: string;
  endTime: string;
  summary: string;
  highlights: string[];
  ticketTypes: TicketType[];
  bookingOpen: boolean;
  /** Last day tickets are sold online (YYYY-MM-DD). */
  salesEnd?: string;
  /** Room offers for party guests who stay over (booked on the property page). */
  rooms?: { name: string; price: number; note: string }[];
  /** Percent off every ticket type; customers see the full price struck through. */
  discountPct?: number;
  image: string;
};

export const PARTIES: Party[] = [
  {
    slug: 'panchvati-new-year-eve-2026',
    name: 'New Year Eve Party 2026 at Panchvati Cottages',
    kind: 'new-year',
    venue: 'Panchvati Cottages',
    propertySlug: 'panchvati-cottages',
    area: 'Khaniara, Dharamshala',
    date: '2026-12-31',
    // Owner's poster (27 Oct 2026): gates open 7 pm; closing time not announced.
    startTime: '7:00 pm',
    endTime: '',
    summary: 'NYE Gala Night at Panchvati Cottages, our own property in Khaniara, Dharamshala: a DJ, a bonfire, starters and a main-course dinner, soft drinks and IMFL drinks, and the countdown to 2027 under the Dhauladhar sky.',
    highlights: [
      'Gates open at 7 pm',
      'DJ and bonfire',
      '3 vegetarian and 3 non-vegetarian starters',
      'Variety of main course dishes',
      'Soft beverages and IMFL beverages',
    ],
    ticketTypes: [
      { id: 'couple', name: 'Couple', price: 3999, admits: 2, includes: 'entry for two with all package inclusions' },
      { id: 'stag', name: 'Stag (with a couple)', price: 2499, admits: 1, includes: 'one adult, only together with a couple booking' },
      { id: 'child', name: 'Child, 12 to 18 years', price: 1499, admits: 1 },
      { id: 'kid', name: 'Kid, 6 to 12 years', price: 999, admits: 1 },
    ],
    bookingOpen: true,
    discountPct: 5, // owner, 29 Oct 2026: 5% off all ticket plans
    rooms: [
      { name: 'Super Deluxe Room', price: 4999, note: 'double sharing, with breakfast' },
      { name: 'Family Suite', price: 6999, note: 'four people sharing, with breakfast' },
    ],
    image: '/images/places/dharamshala-town.jpg',
  },
];

export const partyBySlug = (slug: string) => PARTIES.find((p) => p.slug === slug);

/** What a customer pays for one ticket after the party discount (whole rupees). */
export function ticketPrice(price: number, discountPct = 0): number {
  return discountPct > 0 ? Math.round((price * (100 - discountPct)) / 100) : price;
}

/** Bookable now: open, priced, and not past its sales end or the party date (India time). */
export function partyOnSale(p: Party, now = new Date()): boolean {
  if (!p.bookingOpen || !p.ticketTypes.length) return false;
  const today = new Date(now.getTime() + 5.5 * 3600e3).toISOString().slice(0, 10);
  return today <= (p.salesEnd || p.date);
}

export function partyDateLabel(p: Party): string {
  const d = new Date(p.date + 'T00:00:00Z').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  return [d, p.startTime && p.endTime ? `${p.startTime} to ${p.endTime}` : p.startTime].filter(Boolean).join(', ');
}
