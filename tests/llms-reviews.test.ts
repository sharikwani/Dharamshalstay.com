import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ hotels: [] as any[], bundle: null as any }));
vi.mock('@/lib/db', () => ({
  getPublishedProperties: async () => h.hotels,
  getPropertyBySlug: async (s: string) => h.hotels.find((x) => x.slug === s) || null,
  getDestinations: async () => [], getDestinationBySlug: async () => null,
  getPublishedTreks: async () => [], getTrekBySlug: async () => null, getParaglidingPackages: async () => [],
}));
vi.mock('@/lib/taxi', () => ({ getTaxiRouteGroups: async () => [] }));
vi.mock('@/lib/reviews/store', () => ({ loadReviewBundle: async () => h.bundle }));

import { hotelMarkdown, llmsIndex, pageMarkdown } from '@/lib/llms';
import { siteConfig } from '@/lib/config';
import { emptySummary } from '@/lib/reviews/types';

const hotel: any = {
  id: 'p1', slug: 'snow-view', name: 'Snow View', type: 'hotel', destination_slug: 'bhagsu',
  price_min: 2500, price_max: 4000, rating: 4.5, review_count: 2, short_description: 'Quiet rooms.',
  images: [], amenities: [], faqs: [],
  rooms: [{ name: 'Deluxe', base_price: 2500, bed_type: 'King', max_occupancy: 3, images: ['/images/r1.jpg'], is_active: true }],
};
const quote = 'Spotless rooms and the staff arranged a taxi to Triund at 6 am for us.';
const feed = {
  summary: { count: 2, average: 4.5, categories: { cleanliness: 4, location: 5, staff: null, value: null }, distribution: [0, 0, 0, 1, 1] },
  latest: [{
    id: 'r1', property_id: 'p1', name: 'ravi kumar', rating: 5, rating_cleanliness: 4, rating_location: 5, rating_staff: null, rating_value: null,
    title: 'Great', body: quote, stay_month: '2026-09', trip_type: 'family', photos: [], verified_stay: true,
    owner_reply: null, owner_reply_at: null, partner_reply: null, partner_reply_at: null, created_at: '2026-10-01T00:00:00Z',
  }],
};

beforeEach(() => { h.hotels = [hotel]; h.bundle = { summary: feed.summary, reviews: feed.latest, total: 2 }; });

describe('hotel Markdown with reviews', () => {
  it('adds the rating summary, category averages and short quotes', () => {
    const md = hotelMarkdown(hotel, feed as any);
    expect(md).toContain('- **Guest rating:** 4.5/5 from 2 reviews');
    expect(md).toContain('## Guest reviews');
    expect(md).toContain('Rated 4.5/5 from 2 approved reviews on Dharamshala Stay.');
    expect(md).toContain('- Cleanliness: 4.0/5');
    expect(md).toContain('- Location: 5.0/5');
    expect(md).not.toContain('- Staff:');
    expect(md).toContain('> "' + quote + '" -- R., Sep 2026 (verified stay)');
  });

  it('lists rooms with price and a described photo', () => {
    expect(hotelMarkdown(hotel)).toContain('- **Deluxe** -- from Rs.2,500/night, King bed, sleeps 3. Photo: ' + siteConfig.url + '/images/r1.jpg -- Deluxe at Snow View');
  });

  it('shows no rating and no reviews section without approved reviews', () => {
    const md = hotelMarkdown(hotel, { summary: emptySummary(), latest: [] });
    expect(md).not.toContain('Guest rating');
    expect(md).not.toContain('## Guest reviews');
    expect(hotelMarkdown({ ...hotel, rating: 0, review_count: 0 })).not.toContain('Guest rating');
  });

  it('the .md page loads the approved reviews', async () => {
    expect(await pageMarkdown('/hotels/snow-view')).toContain('-- R., Sep 2026 (verified stay)');
  });

  it('llms.txt hotel lines carry the rating', async () => {
    expect(await llmsIndex()).toContain('rated 4.5/5 (2 reviews)');
    h.hotels = [{ ...hotel, rating: 0, review_count: 0 }];
    expect(await llmsIndex()).not.toMatch(/rated \d/);
  });
});
