import { describe, expect, it } from 'vitest';
import { COLLECTIONS, getCollection, walkMinutes, TEMPLE_RADIUS_KM } from '@/lib/hotels/collections';
import { LANDMARKS, km } from '@/lib/hotels/discover';
import { hasHindiVersion, localizePath } from '@/lib/i18n/core';
import { TITLE_MAX } from '@/lib/seo';

const stay = (o: any) => ({ id: o.slug, name: o.slug, type: 'hotel', destination_slug: 'mcleod-ganj', amenities: [], highlights: [], ...o });

describe('hotel collections', () => {
  it('lists stays within walking distance of the temple, nearest first, and skips stays without a pin', () => {
    const hotels = [
      stay({ slug: 'far', latitude: 32.2465, longitude: 76.3225 }),
      stay({ slug: 'next-door', latitude: 32.2338, longitude: 76.3244 }),
      stay({ slug: 'square', latitude: 32.23862, longitude: 76.32361 }),
      stay({ slug: 'no-pin' }),
    ];
    const rows = getCollection('near-dalai-lama-temple')!.pick(hotels);
    expect(rows.map((r) => r.hotel.slug)).toEqual(['next-door', 'square']);
    expect(rows.every((r) => r.km! <= TEMPLE_RADIUS_KM)).toBe(true);
    expect(km({ lat: 32.2465, lng: 76.3225 }, LANDMARKS.temple)).toBeGreaterThan(TEMPLE_RADIUS_KM);
  });

  it('hostels page lists only hostels', () => {
    const rows = getCollection('hostels')!.pick([stay({ slug: 'h', type: 'hostel' }), stay({ slug: 'x', type: 'hotel' })]);
    expect(rows.map((r) => r.hotel.slug)).toEqual(['h']);
  });

  it('mountain-view page uses the same view test as the finder', () => {
    const rows = getCollection('mountain-view')!.pick([stay({ slug: 'v', amenities: ['Mountain view'] }), stay({ slug: 'n' })]);
    expect(rows.map((r) => r.hotel.slug)).toEqual(['v']);
  });

  it('turns straight-line km into a rough walk, never under 3 minutes', () => {
    expect(walkMinutes(0)).toBe(3);
    expect(walkMinutes(0.5)).toBe(11);
  });

  it('titles fit search results and the pages stay English-only', () => {
    for (const c of COLLECTIONS) {
      expect(c.metaTitle.length).toBeLessThanOrEqual(TITLE_MAX);
      expect(c.metaDescription.length).toBeLessThanOrEqual(160);
      expect(hasHindiVersion('/hotels/' + c.slug)).toBe(false);
      expect(localizePath('/hotels/' + c.slug, 'hi')).toBe('/hotels/' + c.slug);
    }
    expect(hasHindiVersion('/hotels/zostel-mcleodganj-jogiwara-road')).toBe(true);
  });
});
