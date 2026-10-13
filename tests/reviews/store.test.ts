// tests/reviews/store.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  calls: [] as any[][],
  results: {} as Record<string, { data?: any; error?: any; count?: number }>,
  inserts: [] as any[][],
  updates: [] as any[][],
  storage: [] as any[][],
  throwOnClient: false,
  missing: '' as string,
}));

vi.mock('@/lib/server-auth', async (orig) => {
  const real = await orig<typeof import('@/lib/server-auth')>();
  const builder = (t: string) => {
    const b: any = {};
    for (const m of ['select', 'eq', 'in', 'ilike', 'gte', 'order', 'range', 'limit']) {
      b[m] = (...a: any[]) => { h.calls.push([t, m, ...a]); return b; };
    }
    b.insert = async (row: any) => { h.inserts.push([t, row]); return { error: h.results[t + ':insert']?.error ?? null }; };
    b.update = (row: any) => { h.updates.push([t, row]); return b; };
    b.maybeSingle = async () => ({ data: h.results[t]?.data ?? null, error: h.results[t]?.error ?? null });
    b.then = (res: any, rej: any) => Promise.resolve({
      data: h.results[t]?.data ?? [], error: h.results[t]?.error ?? null, count: h.results[t]?.count ?? null,
    }).then(res, rej);
    return b;
  };
  return {
    ...real,
    serviceClient: () => {
      if (h.throwOnClient) throw new Error('no db');
      return {
        from: builder,
        storage: {
          from: (bucket: string) => ({
            download: async (p: string) => {
              h.storage.push(['download', bucket, p]);
              return p === h.missing ? { data: null, error: { message: 'Object not found' } } : { data: new Blob(['img']), error: null };
            },
            upload: async (p: string, _b: unknown, o: any) => { h.storage.push(['upload', bucket, p, o?.contentType, o?.upsert]); return { error: null }; },
            remove: async (l: string[]) => { h.storage.push(['remove', bucket, l]); return { error: null }; },
            createSignedUrls: async (l: string[]) => ({ data: l.map((p) => ({ signedUrl: 'https://signed/' + p })), error: null }),
          }),
        },
      };
    },
  };
});

import {
  hadVerifiedStay, insertReview, listAdminReviews, loadApprovedPage, loadSummary,
  publishPhotos, recomputePropertyRating, unpublishPhotos,
} from '@/lib/reviews/store';

const rating = (r: number, c: number | null = null) => ({ rating: r, rating_cleanliness: c, rating_location: null, rating_staff: null, rating_value: null });

beforeEach(() => {
  h.calls = []; h.results = {}; h.inserts = []; h.updates = []; h.storage = []; h.throwOnClient = false; h.missing = '';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://sb.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('review store', () => {
  it('loadSummary reads approved ratings from the public view', async () => {
    h.results.public_hotel_reviews = { data: [rating(5, 5), rating(4, 4)] };
    const s = await loadSummary('p1');
    expect(s.count).toBe(2);
    expect(s.average).toBe(4.5);
    expect(s.categories.cleanliness).toBe(4.5);
    expect(h.calls).toContainEqual(['public_hotel_reviews', 'eq', 'property_id', 'p1']);
  });

  it('loadSummary returns an empty summary when the table is missing, the DB is down or Supabase is not configured', async () => {
    h.results.public_hotel_reviews = { error: { message: 'relation "public_hotel_reviews" does not exist' } };
    expect((await loadSummary('p1')).count).toBe(0);
    h.throwOnClient = true;
    expect((await loadSummary('p1')).count).toBe(0);
    h.throwOnClient = false;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    h.calls = [];
    expect((await loadSummary('p1')).count).toBe(0);
    expect(h.calls).toEqual([]);
  });

  it('loadApprovedPage pages through the public view and returns public photo URLs', async () => {
    h.results.public_hotel_reviews = { data: [{ id: 'r1', photos: ['p1/r1/1.jpg'], name: 'Ravi' }], count: 11 };
    const { reviews, total } = await loadApprovedPage('p1', 2);
    expect(total).toBe(11);
    expect(reviews[0].photos).toEqual(['https://sb.test/storage/v1/object/public/review-photos/p1/r1/1.jpg']);
    expect(h.calls).toContainEqual(['public_hotel_reviews', 'range', 10, 19]);
    expect(h.calls.some((c) => c[0] === 'hotel_reviews')).toBe(false);
  });

  it('loadApprovedPage is empty on error', async () => {
    h.results.public_hotel_reviews = { error: { message: 'boom' } };
    expect(await loadApprovedPage('p1')).toEqual({ reviews: [], total: 0 });
  });

  it('hadVerifiedStay narrows by the last 4 digits, then applies the stay rule', async () => {
    h.results.bookings = { data: [
      { guest_phone: '9811100665', status: 'completed', check_out: '2026-10-01' },
      { guest_phone: '+91 98057 00665', status: 'completed', check_out: '2026-10-01' },
    ] };
    expect(await hadVerifiedStay('p1', '9805700665', '2026-10-13')).toBe(true);
    expect(h.calls).toContainEqual(['bookings', 'ilike', 'guest_phone', '%0665']);
    expect(h.calls).toContainEqual(['bookings', 'eq', 'property_id', 'p1']);
  });

  it('insertReview stores a pending row and turns a duplicate phone into a 409', async () => {
    const row = {
      id: 'r1', property_id: 'p1', name: 'Ravi', phone: '9805700665', rating: 5,
      rating_cleanliness: null, rating_location: null, rating_staff: null, rating_value: null,
      title: 'Lovely stay', body: 'x'.repeat(40), stay_month: '2026-09', trip_type: 'couple' as const,
      photos: [], verified_stay: false, ip_hash: 'abc',
    };
    await insertReview(row);
    expect(h.inserts[0]).toEqual(['hotel_reviews', { ...row, status: 'pending' }]);
    h.results['hotel_reviews:insert'] = { error: { code: '23505', message: 'duplicate key' } };
    await expect(insertReview(row)).rejects.toMatchObject({ status: 409 });
  });

  it('recomputePropertyRating writes the approved average and count to the property', async () => {
    h.results.hotel_reviews = { data: [rating(5), rating(4)] };
    const s = await recomputePropertyRating('p1');
    expect(s.count).toBe(2);
    expect(h.calls).toContainEqual(['hotel_reviews', 'eq', 'status', 'approved']);
    expect(h.updates).toContainEqual(['properties', { rating: 4.5, review_count: 2 }]);
    expect(h.calls).toContainEqual(['properties', 'eq', 'id', 'p1']);
  });

  it('publishPhotos copies private uploads to the public bucket; unpublishPhotos removes them', async () => {
    await publishPhotos(['p1/r1/1.jpg', 'p1/r1/2.webp']);
    expect(h.storage).toEqual([
      ['download', 'review-uploads', 'p1/r1/1.jpg'], ['upload', 'review-photos', 'p1/r1/1.jpg', 'image/jpeg', true],
      ['download', 'review-uploads', 'p1/r1/2.webp'], ['upload', 'review-photos', 'p1/r1/2.webp', 'image/webp', true],
    ]);
    h.storage = [];
    await unpublishPhotos([]);
    expect(h.storage).toEqual([]);
    await unpublishPhotos(['p1/r1/1.jpg']);
    expect(h.storage).toEqual([['remove', 'review-photos', ['p1/r1/1.jpg']]]);
  });

  it('publishPhotos turns a missing upload into a 409 and copies nothing after it', async () => {
    h.missing = 'p1/r1/1.jpg';
    await expect(publishPhotos(['p1/r1/1.jpg', 'p1/r1/2.webp'])).rejects.toMatchObject({
      status: 409, message: 'A photo for this review is missing. Hide it or ask the guest to resend.',
    });
    expect(h.storage).toEqual([['download', 'review-uploads', 'p1/r1/1.jpg']]);
  });

  it('listAdminReviews shows pending photos through short-lived signed links', async () => {
    h.results.hotel_reviews = { data: [{ id: 'r1', phone: '9805700665', photos: ['p1/r1/1.jpg'], properties: { name: 'Snow View', slug: 'snow-view' } }] };
    const [r] = await listAdminReviews('pending');
    expect(r.property_name).toBe('Snow View');
    expect(r.property_slug).toBe('snow-view');
    expect(r.phone).toBe('9805700665');
    expect(r.photo_urls).toEqual(['https://signed/p1/r1/1.jpg']);
    expect((r as any).properties).toBeUndefined();
  });
});
