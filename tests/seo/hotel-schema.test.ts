import { describe, expect, it } from 'vitest';
import { hotelImageUrls, hotelSchemaFull } from '@/lib/seo';
import { siteConfig } from '@/lib/config';
import { safeJson } from '@/components/seo/JsonLd';
import { emptySummary, type PublicReview, type ReviewSummary } from '@/lib/reviews/types';

const B = siteConfig.url;
const hotel = (over: Record<string, unknown> = {}) => ({
  name: 'Snow View', slug: 'snow-view', destination_slug: 'mcleod-ganj',
  rating: 4.2, review_count: 150, // legacy imported numbers: must never reach JSON-LD
  total_rooms: 12, check_in_time: '12:00', check_out_time: '11:00',
  images: [{ url: 'https://cdn.test/a.jpg', alt: 'Front' }, { url: '/images/b.jpg', alt: 'Lobby' }],
  rooms: [
    { name: 'Deluxe', description: 'Valley view', base_price: 2500, max_occupancy: 3, bed_type: 'King', images: ['https://cdn.test/r1.jpg', { url: 'https://cdn.test/a.jpg' }], is_active: true },
    { name: 'Old wing', base_price: 1500, is_active: false, images: ['https://cdn.test/old.jpg'] },
    { name: 'Dorm bed', base_price: 0, images: [] },
  ],
  ...over,
});
const review = (i: number, body = 'Great stay number ' + i + ' with lovely mountain views.'): PublicReview => ({
  id: 'r' + i, property_id: 'p1', name: 'Guest ' + i, rating: 5 - (i % 2),
  rating_cleanliness: null, rating_location: null, rating_staff: null, rating_value: null,
  title: 'Title ' + i, body, stay_month: '2026-09', trip_type: 'family', photos: [], verified_stay: false,
  owner_reply: null, owner_reply_at: null, partner_reply: null, partner_reply_at: null,
  created_at: '2026-10-0' + ((i % 9) + 1) + 'T10:00:00Z',
});
const summary = (count: number, average: number): ReviewSummary => ({ ...emptySummary(), count, average });

describe('hotelSchemaFull', () => {
  it('never shows a rating without approved reviews, whatever properties.rating says', () => {
    const plain: any = hotelSchemaFull(hotel());
    expect(plain.aggregateRating).toBeUndefined();
    expect(plain.review).toBeUndefined();
    const empty: any = hotelSchemaFull(hotel(), { summary: emptySummary(), latest: [] });
    expect(empty.aggregateRating).toBeUndefined();
    expect(empty.review).toBeUndefined();
  });

  it('uses the approved-review summary for aggregateRating', () => {
    const ld: any = hotelSchemaFull(hotel(), { summary: summary(2, 4.5), latest: [review(1), review(2)] });
    expect(ld.aggregateRating).toEqual({ '@type': 'AggregateRating', ratingValue: 4.5, ratingCount: 2, reviewCount: 2, bestRating: 5, worstRating: 1 });
  });

  it('lists at most the 5 latest reviews with bodies cut to 500 characters', () => {
    const latest = [review(0, 'x'.repeat(800)), review(1), review(2), review(3), review(4), review(5), review(6)];
    const ld: any = hotelSchemaFull(hotel(), { summary: summary(7, 4.6), latest });
    expect(ld.review).toHaveLength(5);
    expect(ld.review[0]).toEqual({
      '@type': 'Review', author: { '@type': 'Person', name: 'Guest 0' }, datePublished: '2026-10-01', name: 'Title 0',
      reviewRating: { '@type': 'Rating', ratingValue: 5, bestRating: 5, worstRating: 1 }, reviewBody: 'x'.repeat(499) + '…',
    });
    expect(ld.review[0].reviewBody).toHaveLength(500);
    expect(ld.review[1].reviewBody).toBe('Great stay number 1 with lovely mountain views.');
  });

  it('gives absolute photo URLs, property photos first, then active room photos, max 10', () => {
    const ld: any = hotelSchemaFull(hotel());
    // R3: the inactive "Old wing" room's photo is left out
    expect(ld.image).toEqual(['https://cdn.test/a.jpg', B + '/images/b.jpg', 'https://cdn.test/r1.jpg']);
    const many = Array.from({ length: 15 }, (_, i) => ({ url: 'https://cdn.test/' + i + '.jpg' }));
    expect(hotelImageUrls({ images: many })).toHaveLength(10);
    expect(hotelSchemaFull(hotel({ images: [], rooms: [] })) as any).not.toHaveProperty('image');
  });

  it('describes each active room as a HotelRoom with occupancy, bed and price', () => {
    const ld: any = hotelSchemaFull(hotel());
    expect(ld.containsPlace).toEqual([
      {
        '@type': 'HotelRoom', name: 'Deluxe', description: 'Valley view', image: 'https://cdn.test/r1.jpg',
        occupancy: { '@type': 'QuantitativeValue', maxValue: 3, unitCode: 'C62' },
        bed: { '@type': 'BedDetails', typeOfBed: 'King' },
        offers: { '@type': 'Offer', price: 2500, priceCurrency: 'INR', availability: 'https://schema.org/InStock' },
      },
      { '@type': 'HotelRoom', name: 'Dorm bed' },
    ]);
  });

  it('still marks inactive rooms SoldOut in makesOffer', () => {
    const ld: any = hotelSchemaFull(hotel());
    const old = ld.makesOffer.find((o: any) => o.name === 'Old wing');
    expect(old.availability).toBe('https://schema.org/SoldOut');
  });

  it('adds numberOfRooms and check-in/out times when known', () => {
    const ld: any = hotelSchemaFull(hotel());
    expect(ld.numberOfRooms).toBe(12);
    expect(ld.checkinTime).toBe('12:00');
    expect(ld.checkoutTime).toBe('11:00');
    expect(hotelSchemaFull(hotel({ total_rooms: 0 })) as any).not.toHaveProperty('numberOfRooms');
  });

  it('keeps review text containing </script> intact through safeJson', () => {
    const body = '</script><script>alert(1)</script> and a long enough body';
    const ld = hotelSchemaFull(hotel(), { summary: summary(1, 5), latest: [review(1, body)] });
    const out = safeJson(ld);
    expect(out).not.toContain('</script>');
    expect(JSON.parse(out).review[0].reviewBody).toBe(body);
  });
});
