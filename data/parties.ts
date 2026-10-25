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
  image: string;
};

export const PARTIES: Party[] = [
  {
    slug: 'panchvati-new-year-eve-2026',
    name: 'New Year Eve Party 2026 at Panchvati Cottages',
    kind: 'new-year',
    venue: 'Panchvati Cottages',
    propertySlug: 'panchvati-cottages',
    area: 'Dharamshala',
    date: '2026-12-31',
    startTime: '',
    endTime: '',
    summary: 'Ring in 2027 at Panchvati Cottages, our own property in Dharamshala, with music, food and a countdown under the Dhauladhar sky.',
    highlights: [],
    ticketTypes: [],
    bookingOpen: false,
    image: '/images/places/dharamshala-town.jpg',
  },
];

export const partyBySlug = (slug: string) => PARTIES.find((p) => p.slug === slug);

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
