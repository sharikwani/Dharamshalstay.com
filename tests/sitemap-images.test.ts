import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  getPublishedProperties: async () => [{
    slug: 'snow-view', updated_at: '2026-10-01',
    images: [{ url: '/images/hotels/front.jpg', alt: 'Front' }, { url: 'https://ak-d.tripcdn.com/images/ota.jpg', alt: 'OTA copy' }],
    rooms: [
      { name: 'Deluxe', images: ['https://abc.supabase.co/storage/v1/object/public/rooms/r1.jpg', { url: 'https://abc.supabase.co/storage/v1/object/public/rooms/r2.jpg' }] },
      { name: 'Twin' },
      { name: 'Closed', is_active: false, images: ['https://abc.supabase.co/storage/v1/object/public/rooms/closed.jpg'] },
    ],
  }],
  getDestinations: async () => [],
  getPublishedTreks: async () => [],
}));
vi.mock('@/lib/taxi', () => ({ getTaxiRouteGroups: async () => [] }));

import { sitemapEntries } from '@/lib/sitemap-entries';
import { siteConfig } from '@/lib/config';

describe('hotel image sitemap', () => {
  it('lists our own hotel and room photos (string or object) as absolute URLs, not booking-site copies', async () => {
    const entries = await sitemapEntries();
    const en = entries.find((e) => e.url === siteConfig.url + '/hotels/snow-view')!;
    expect(en.images).toEqual([siteConfig.url + '/images/hotels/front.jpg', 'https://abc.supabase.co/storage/v1/object/public/rooms/r1.jpg', 'https://abc.supabase.co/storage/v1/object/public/rooms/r2.jpg']);
    // Hindi hotel pages only translate labels and canonicalise to English, so they are not listed.
    expect(entries.find((e) => e.url === siteConfig.url + '/hi/hotels/snow-view')).toBeUndefined();
    expect(en.alternates).toBeUndefined();
  });
});
