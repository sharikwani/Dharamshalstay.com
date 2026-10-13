// tests/reviews/moderate.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ review: null as any, prop: null as any, publishFail: false, calls: [] as any[][] }));
vi.mock('@/lib/reviews/store', () => ({
  getReview: async (id: string) => { h.calls.push(['getReview', id]); return h.review; },
  propertyRef: async () => h.prop,
  publishPhotos: async (p: string[]) => { h.calls.push(['publishPhotos', p]); if (h.publishFail) throw new Error('storage down'); },
  unpublishPhotos: async (p: string[]) => { h.calls.push(['unpublishPhotos', p]); },
  updateReview: async (id: string, patch: any) => { h.calls.push(['updateReview', id, patch]); },
  recomputePropertyRating: async (pid: string) => {
    h.calls.push(['recompute', pid]);
    return { count: 1, average: 5, categories: { cleanliness: null, location: null, staff: null, value: null }, distribution: [0, 0, 0, 0, 1] };
  },
}));
vi.mock('@/lib/indexnow', () => ({
  hotelUrls: (s: string) => ['https://x/hotels/' + s],
  pingIndexNow: async (u: string[]) => { h.calls.push(['ping', u]); return true; },
}));
vi.mock('next/cache', () => ({ revalidatePath: (p: string) => { h.calls.push(['revalidate', p]); } }));

import { setReply, setReviewStatus } from '@/lib/reviews/moderate';

const names = () => h.calls.map((c) => c[0]);
beforeEach(() => {
  h.review = { id: 'r1', property_id: 'p1', status: 'pending', photos: ['p1/r1/1.jpg'] };
  h.prop = { id: 'p1', name: 'Snow View', slug: 'snow-view', owner_id: 'owner1', status: 'published' };
  h.calls = []; h.publishFail = false;
});

describe('setReviewStatus', () => {
  it('approving copies photos, saves, recomputes, refreshes both pages and pings IndexNow', async () => {
    const s = await setReviewStatus('r1', 'approved', 'admin1');
    expect(s.count).toBe(1);
    expect(names()).toEqual(['getReview', 'publishPhotos', 'updateReview', 'recompute', 'revalidate', 'revalidate', 'ping']);
    expect(h.calls[2]).toEqual(['updateReview', 'r1', { status: 'approved', moderated_by: 'admin1', moderated_at: expect.any(String) }]);
    expect(h.calls.filter((c) => c[0] === 'revalidate').map((c) => c[1])).toEqual(['/hotels/snow-view', '/hi/hotels/snow-view']);
    expect(h.calls).toContainEqual(['ping', ['https://x/hotels/snow-view']]);
  });

  it('hiding an approved review removes its public photos and recomputes, without pinging', async () => {
    h.review.status = 'approved';
    await setReviewStatus('r1', 'hidden', 'admin1');
    expect(h.calls).toContainEqual(['unpublishPhotos', ['p1/r1/1.jpg']]);
    expect(names()).not.toContain('publishPhotos');
    expect(names()).toContain('recompute');
    expect(names()).not.toContain('ping');
  });

  it('rejecting a pending review touches no public photos', async () => {
    await setReviewStatus('r1', 'rejected', 'admin1');
    expect(names()).not.toContain('publishPhotos');
    expect(names()).not.toContain('unpublishPhotos');
    expect(names()).toContain('recompute');
  });

  it('does not ping for an unpublished property', async () => {
    h.prop.status = 'draft';
    await setReviewStatus('r1', 'approved', 'admin1');
    expect(names()).not.toContain('ping');
  });

  it('404s for an unknown review', async () => {
    h.review = null;
    await expect(setReviewStatus('nope', 'approved', 'admin1')).rejects.toMatchObject({ status: 404 });
  });

  it('leaves the review pending when copying photos fails', async () => {
    h.publishFail = true;
    await expect(setReviewStatus('r1', 'approved', 'admin1')).rejects.toThrow('storage down');
    expect(names()).not.toContain('updateReview');
    expect(names()).not.toContain('recompute');
  });
});

describe('setReply', () => {
  it('saves a trimmed partner reply on an approved review of their own property', async () => {
    h.review.status = 'approved';
    await setReply('r1', { by: 'partner', partnerId: 'owner1' }, '  Thank you for staying with us!  ');
    expect(h.calls).toContainEqual(['updateReview', 'r1', { partner_reply: 'Thank you for staying with us!', partner_reply_at: expect.any(String) }]);
    expect(names()).toContain('revalidate');
  });

  it("404s for another owner's property and writes nothing", async () => {
    h.review.status = 'approved';
    await expect(setReply('r1', { by: 'partner', partnerId: 'someone-else' }, 'Thanks a lot')).rejects.toMatchObject({ status: 404 });
    expect(names()).not.toContain('updateReview');
  });

  it('404s when a partner replies to a pending review', async () => {
    await expect(setReply('r1', { by: 'partner', partnerId: 'owner1' }, 'Thanks a lot')).rejects.toMatchObject({ status: 404 });
    expect(names()).not.toContain('updateReview');
  });

  it('lets the owner reply to any review', async () => {
    await setReply('r1', { by: 'owner' }, 'Thanks, we have passed this on.');
    expect(h.calls).toContainEqual(['updateReview', 'r1', { owner_reply: 'Thanks, we have passed this on.', owner_reply_at: expect.any(String) }]);
  });

  it('rejects too short and too long replies', async () => {
    h.review.status = 'approved';
    await expect(setReply('r1', { by: 'owner' }, ' x ')).rejects.toMatchObject({ status: 400 });
    await expect(setReply('r1', { by: 'owner' }, 'x'.repeat(1001))).rejects.toMatchObject({ status: 400 });
    expect(names()).not.toContain('updateReview');
  });
});
