/**
 * Every public URL for /sitemap.xml (app/sitemap.xml/route.ts). Next 14's
 * built-in sitemap.ts drops `images`, so we write the XML ourselves to get a
 * real image sitemap (Google Images) alongside the hreflang alternates.
 */
import { getPublishedProperties, getDestinations, getPublishedTreks } from '@/lib/db';
import { blogPosts, NOINDEX_POSTS } from '@/data/blog';
import { COLLECTIONS } from '@/lib/hotels/collections';
import { factsUpdated } from '@/data/facts';
import { updatesChecked } from '@/data/travel-updates';
import { eventsChecked } from '@/data/events';
import { siteConfig } from '@/lib/config';
import { getTaxiRouteGroups } from '@/lib/taxi';
import { hasHindiVersion, localizePath } from '@/lib/i18n/core';
import { hasHindiPost } from '@/lib/i18n/content';
import { normalizeImages, roomImageUrls } from '@/lib/images';
import { placeImage, isStockImage } from '@/lib/place-images';
import { monasteryPhotos } from '@/data/monastery-photos';
import { listPublicStories } from '@/lib/stories/store';

// Must be the canonical (www) origin -- the bare domain 301s to www, and a
// sitemap full of redirecting URLs is largely ignored by Google.
const B = siteConfig.url;

export interface SitemapEntry {
  url: string;
  lastModified?: Date;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  images?: string[];
  alternates?: { languages: Record<string, string> };
}

const abs = (src: string) => (src.startsWith('http') ? src : B + src);
/** Photos we host: our own files and partner uploads. Copies hotlinked from booking sites stay out of the image sitemap. */
const isOwnImage = (u: string) => !u.startsWith('http') || u.startsWith(B + '/') || /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\//.test(u);
/** Image-sitemap entries so every photo we own can show up in Google Images. */
const imgs = (list: (string | undefined | null)[]) => {
  const out = Array.from(new Set(list.filter((u): u is string => !!u && !isStockImage(u) && isOwnImage(u)).map(abs)));
  return out.length ? out.slice(0, 50) : undefined;
};

function date(value?: string | null, fallback = new Date()): Date {
  const d = value ? new Date(value) : fallback;
  return isNaN(d.getTime()) ? fallback : d;
}

export async function sitemapEntries(): Promise<SitemapEntry[]> {
  const [hotels, destinations, treks, taxiRoutes, stories] = await Promise.all([
    getPublishedProperties(),
    getDestinations(),
    getPublishedTreks(),
    getTaxiRouteGroups(),
    listPublicStories(1000).catch(() => []),
  ]);

  const latestPost = blogPosts.reduce((max, b) => (b.updated_at > max ? b.updated_at : max), '2026-01-01');
  const contentDate = date(latestPost);
  const latestHotel = hotels.reduce((max: string, h: any) => { const d = h.updated_at || h.created_at || ''; return d > max ? d : max; }, '');
  const hotelsDate = date(latestHotel, contentDate);

  const entries: SitemapEntry[] = [
    { url: B, lastModified: contentDate, changeFrequency: 'weekly', priority: 1.0 },
    { url: B + '/hotels', lastModified: hotelsDate, changeFrequency: 'daily', priority: 0.9 },
    { url: B + '/facts', lastModified: date(factsUpdated), changeFrequency: 'weekly', priority: 0.8 },
    { url: B + '/travel-updates', lastModified: date(updatesChecked), changeFrequency: 'daily', priority: 0.8 },
    { url: B + '/stories', lastModified: date(stories[0]?.approved_at, contentDate), changeFrequency: 'daily', priority: 0.7 },
    ...stories.map((s) => ({ url: B + '/stories/' + s.slug, lastModified: date(s.approved_at || s.created_at), changeFrequency: 'weekly' as const, priority: 0.5, images: imgs(s.photos) })),
    ...COLLECTIONS.map((c) => ({ url: B + '/hotels/' + c.slug, lastModified: hotelsDate, changeFrequency: 'weekly' as const, priority: 0.8 })),
    { url: B + '/blog', lastModified: contentDate, changeFrequency: 'weekly', priority: 0.9 },
    { url: B + '/faq', lastModified: contentDate, changeFrequency: 'monthly', priority: 0.8 },
    { url: B + '/essentials', lastModified: contentDate, changeFrequency: 'monthly', priority: 0.8 },
    { url: B + '/monasteries-meditation', lastModified: date('2026-10-16'), changeFrequency: 'monthly', priority: 0.8, images: imgs(monasteryPhotos.map((p) => '/images/monasteries/' + p.file + '.jpg')) },
    { url: B + '/events', lastModified: date(eventsChecked), changeFrequency: 'weekly', priority: 0.8 },
    { url: B + '/groups', lastModified: date('2026-10-20'), changeFrequency: 'monthly', priority: 0.7 },
    { url: B + '/workation', lastModified: date('2026-10-20'), changeFrequency: 'monthly', priority: 0.7 },
    { url: B + '/play', lastModified: date('2026-10-22'), changeFrequency: 'monthly', priority: 0.6 },
    { url: B + '/for-hotels', lastModified: date('2026-10-20'), changeFrequency: 'monthly', priority: 0.4 },
    { url: B + '/destinations', lastModified: contentDate, changeFrequency: 'monthly', priority: 0.8 },
    { url: B + '/treks', lastModified: contentDate, changeFrequency: 'weekly', priority: 0.8 },
    { url: B + '/paragliding', lastModified: contentDate, changeFrequency: 'monthly', priority: 0.8, images: imgs([placeImage('bir-paragliding'), placeImage('beas-rafting-kullu'), placeImage('rajgundha')]) },
    { url: B + '/taxi', lastModified: contentDate, changeFrequency: 'monthly', priority: 0.7 },
    { url: B + '/about', lastModified: contentDate, changeFrequency: 'yearly', priority: 0.5 },
    { url: B + '/contact', lastModified: contentDate, changeFrequency: 'yearly', priority: 0.6 },
    { url: B + '/sitemap-html', lastModified: contentDate, changeFrequency: 'weekly', priority: 0.3 },
    { url: B + '/photo-credits', lastModified: contentDate, changeFrequency: 'yearly', priority: 0.2 },

    { url: B + '/privacy', changeFrequency: 'yearly', priority: 0.2 },
    { url: B + '/terms', changeFrequency: 'yearly', priority: 0.2 },
    { url: B + '/disclaimer', changeFrequency: 'yearly', priority: 0.2 },
    { url: B + '/cancellation-policy', changeFrequency: 'yearly', priority: 0.3 },

    ...destinations.map((d: any) => ({
      url: B + '/destinations/' + d.slug,
      lastModified: date(d.updated_at, contentDate),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
      images: imgs([d.image]),
    })),

    ...blogPosts.filter((b) => !NOINDEX_POSTS.includes(b.slug)).map(b => ({
      url: B + '/blog/' + b.slug,
      lastModified: date(b.updated_at),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
      images: imgs([b.image]),
    })),

    ...hotels.map((h: any) => ({
      url: B + '/hotels/' + h.slug,
      lastModified: date(h.updated_at || h.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
      images: imgs([
        ...normalizeImages(h.images).map((i) => i.url),
        ...(h.rooms || []).filter((r: any) => r?.is_active !== false).flatMap(roomImageUrls),
      ]),
    })),

    ...taxiRoutes.map(g => ({
      url: B + '/taxi/' + g.slug,
      lastModified: date(g.updatedAt, contentDate),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
      images: imgs([placeImage('mountain-road')]),
    })),

    ...treks.map((t: any) => ({
      url: B + '/treks/' + t.slug,
      lastModified: date(t.updated_at || t.created_at),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
      images: imgs((t.images || []).map(String)),
    })),
  ];
  return withHindi(entries);
}

/**
 * Add the Hindi twin of every page that has one, and cross-reference both via
 * hreflang alternates (guides only when a real translation exists).
 */
function withHindi(entries: SitemapEntry[]): SitemapEntry[] {
  const out: SitemapEntry[] = [];
  for (const e of entries) {
    const path = e.url.slice(B.length) || '/';
    const blogSlug = path.startsWith('/blog/') ? path.slice(6) : null;
    // Hotel detail pages: the Hindi page canonicalises to English (lib/seo.ts), so it is not listed.
    const hotelDetail = path.startsWith('/hotels/') && !COLLECTIONS.some((c) => path === '/hotels/' + c.slug);
    const hindi = !hotelDetail && hasHindiVersion(path) && (!blogSlug || hasHindiPost(blogSlug));
    if (!hindi) { out.push(e); continue; }
    const enUrl = e.url;
    const hiUrl = B + localizePath(path, 'hi');
    const alternates = { languages: { 'en-IN': enUrl, 'hi-IN': hiUrl, 'x-default': enUrl } };
    out.push({ ...e, alternates });
    out.push({ ...e, url: hiUrl, priority: Math.max(0.1, (e.priority ?? 0.5) - 0.1), alternates });
  }
  return out;
}
