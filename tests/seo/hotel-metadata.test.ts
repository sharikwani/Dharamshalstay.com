import { describe, expect, it } from 'vitest';
import { generateHotelSEO, generateSEO, ratedPhrase } from '@/lib/seo';
import { listingTitle } from '@/lib/listing';

const base = {
  name: 'Snow View', slug: 'snow-view', destination_slug: 'bhagsu', type: 'hotel', price_min: 2500,
  short_description: 'Quiet rooms near the waterfall.', rating: 4.2, review_count: 150,
};
const title = (m: any) => m.title.absolute as string;

describe('generateHotelSEO', () => {
  it('puts the approved rating and the lowest price in the title', () => {
    const m = generateHotelSEO(base, 'en', { count: 3, average: 4.7 });
    expect(title(m)).toBe('Snow View, Bhagsu · Rated 4.7/5 by 3 guests · Rooms from ₹2,500');
    expect(m.description).toBe('Snow View, Bhagsu · Rated 4.7/5 by 3 guests · Rooms from ₹2,500. Quiet rooms near the waterfall. Direct booking, best prices, local support.');
  });

  it('says "guest" for a single review', () => {
    expect(title(generateHotelSEO(base, 'en', { count: 1, average: 5 }))).toBe('Snow View, Bhagsu · Rated 5/5 by 1 guest · Rooms from ₹2,500');
  });

  it('leaves the rating out without approved reviews, ignoring legacy properties.rating', () => {
    const m = generateHotelSEO(base);
    expect(title(m)).toBe('Snow View, Bhagsu · Rooms from ₹2,500 | Dharamshala Stay');
    expect(m.description).not.toMatch(/Rated/);
    expect(title(generateHotelSEO(base, 'en', { count: 0, average: 0 }))).toBe('Snow View, Bhagsu · Rooms from ₹2,500 | Dharamshala Stay');
  });

  it('keeps the current text when there is neither a rating nor a price', () => {
    const m = generateHotelSEO({ ...base, price_min: 0 });
    expect(title(m)).toBe('Snow View – Hotel in Bhagsu | Dharamshala Stay');
    expect(m.description).toBe('Book Snow View, a hotel in Bhagsu. Quiet rooms near the waterfall. Direct booking, best prices, local support.');
  });

  it('lets meta_title and meta_description win', () => {
    const m = generateHotelSEO({ ...base, meta_title: 'Custom title', meta_description: 'Custom description' }, 'en', { count: 3, average: 4.7 });
    expect(title(m)).toBe('Custom title | Dharamshala Stay');
    expect(m.description).toBe('Custom description');
  });

  it('adds the approved rating to the Hindi title only when there are reviews', () => {
    expect(title(generateHotelSEO(base, 'hi', { count: 3, average: 4.7 }))).toContain('4.7/5 रेटिंग (3 मेहमान)');
    expect(title(generateHotelSEO(base, 'hi'))).not.toContain('/5');
  });
});

describe('area and ratedPhrase', () => {
  it('uses the proper area name in the title', () => {
    expect(title(generateHotelSEO({ ...base, destination_slug: 'mcleod-ganj' }))).toContain('Snow View, McLeod Ganj');
  });

  it('ratedPhrase is empty without reviews and pluralises guests', () => {
    expect(ratedPhrase()).toBe('');
    expect(ratedPhrase({ count: 0, average: 0 })).toBe('');
    expect(ratedPhrase({ count: 1, average: 5 })).toBe('Rated 5/5 by 1 guest');
    expect(ratedPhrase({ count: 3, average: 4.7 })).toBe('Rated 4.7/5 by 3 guests');
  });
});

describe('title length', () => {
  it('adds the brand only when the title stays within 60 characters', () => {
    expect((generateSEO({ title: 'Triund Trek', description: 'x', path: '/treks/triund-trek' }).title as any).absolute).toBe('Triund Trek | Dharamshala Stay');
    const long = 'Dharamshala to Delhi Taxi: Fares, Route and Tips';
    expect((generateSEO({ title: long, description: 'x', path: '/taxi' }).title as any).absolute).toBe(long);
  });

  it('does not repeat the area in directory titles', () => {
    expect(listingTitle('HillOra McLeodganj', 'McLeod Ganj', 'Hotel')).toBe('HillOra McLeodganj – Hotel in Dharamshala');
    expect(listingTitle('Zostel', 'McLeod Ganj', 'Hostel')).toBe('Zostel, McLeod Ganj – Hostel');
  });
});
