import { describe, expect, it } from 'vitest';
import { partyOnSale, partyDateLabel, type Party } from '@/data/parties';
import { newTicketCode, ticketLine } from '@/lib/parties/tickets';

const base: Party = {
  slug: 'x', name: 'NYE', kind: 'new-year', venue: 'Panchvati Cottages', area: 'Dharamshala', date: '2026-12-31',
  startTime: '8:00 pm', endTime: '1:00 am', summary: '', highlights: [], image: '',
  ticketTypes: [{ id: 'couple', name: 'Couple pass', price: 3000, admits: 2 }], bookingOpen: true,
};

describe('party tickets', () => {
  it('sells only when open, priced and before the party (India time)', () => {
    expect(partyOnSale(base, new Date('2026-11-01T10:00:00Z'))).toBe(true);
    expect(partyOnSale({ ...base, bookingOpen: false }, new Date('2026-11-01T10:00:00Z'))).toBe(false);
    expect(partyOnSale({ ...base, ticketTypes: [] }, new Date('2026-11-01T10:00:00Z'))).toBe(false);
    // 1 Jan 2027 00:30 in India is still 31 Dec in UTC: sales are over.
    expect(partyOnSale(base, new Date('2026-12-31T19:00:00Z'))).toBe(false);
  });
  it('makes readable ticket codes and lines', () => {
    expect(newTicketCode()).toMatch(/^NYE-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
    expect(ticketLine(base.ticketTypes[0], 2)).toBe('Couple pass × 2 (admits 4)');
    expect(partyDateLabel(base)).toBe('Thursday, 31 December 2026, 8:00 pm to 1:00 am');
  });
});
