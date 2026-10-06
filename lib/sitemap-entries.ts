/**
 * Every public URL for /sitemap.xml (app/sitemap.xml/route.ts). Next 14's
 * built-in sitemap.ts drops `images`, so we write the XML ourselves to get a
 * real image sitemap (Google Images) alongside the hreflang alternates.
 */
import { getPublishedProperties, getDestinations, getPublishedTreks } from '@/lib/db';
import { blogPosts } from '@/data/blog';
import { siteConfig } from '@/lib/config';
import { getTaxiRouteGroups } from '@/lib/taxi';
import { hasHindiVersion, localizePath } from '@/lib/i18n/core';
import { hasHindiPost } from '@/lib/i18n/content';
import { normalizeImages } from '@/lib/images';
import { placeImage, isStockImage } from '@/lib/place-images';

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
/** Image-sitemap entries so every photo can show up in Google Images. */
const imgs = (list: (string | undefined | null)[]) => {
  const out = Array.from(new Set(list.filter((u): u is string => !!u && !isStockImage(u)).map(abs)));
  return out.length ? out.slice(0, 50) : undefined;
};

function date(value?: string | null, fallback = new Date()): Date {
  const d = value ? new Date(value) : fallback;
  return isNaN(d.getTime()) ? fallback : d;
}

export async function sitemapEntries(): Promise<SitemapEntry[]> {
  const [hotels, destinations, treks, taxiRoutes] = await Promise.all([
    getPublishedProperties(),
    getDestinations(),
    getPublishedTreks(),
    getTaxiRouteGroups(),
  ]);

  const latestPost = blogPosts.reduce((max, b) => (b.updated_at > max ? b.updated_at : max), '2026-01-01');
  const contentDate = date(latestPost);

  const entries: SitemapEntry[] = [
    { url: B, lastModified: contentDate, changeFrequency: 'weekly', priority: 1.0 },
    { url: B + '/hotels', lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: B + '/blog', lastModified: contentDate, changeFrequency: 'weekly', priority: 0.9 },
    { url: B + '/faq', lastModified: contentDate, changeFrequency: 'monthly', priority: 0.8 },
    { url: B + '/essentials', lastModified: contentDate, changeFrequency: 'monthly', priority: 0.8 },
    { url: B + '/destinations', lastModified: contentDate, changeFrequency: 'monthly', priority: 0.8 },
    { url: B + '/treks', lastModified: contentDate, changeFrequency: 'weekly', priority: 0.8 },
    { url: B + '/paragliding', lastModified: contentDate, changeFrequency: 'monthly', priority: 0.8, images: imgs([placeImage('bir-paragliding')]) },
    { url: B + '/taxi', lastModified: contentDate, changeFrequency: 'monthly', priority: 0.7 },
    { url: B + '/about', lastModified: contentDate, changeFrequency: 'yearly', priority: 0.5 },
    { url: B + '/contact', lastModified: contentDate, changeFrequency: 'yearly', priority: 0.6 },
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

    ...blogPosts.map(b => ({
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
        ...(h.rooms || []).flatMap((r: any) => (Array.isArray(r.images) ? r.images : [])).filter((u: unknown) => typeof u === 'string'),
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
    const hindi = hasHindiVersion(path) && (!blogSlug || hasHindiPost(blogSlug));
    if (!hindi) { out.push(e); continue; }
    const enUrl = e.url;
    const hiUrl = B + localizePath(path, 'hi');
    const alternates = { languages: { 'en-IN': enUrl, 'hi-IN': hiUrl, 'x-default': enUrl } };
    out.push({ ...e, alternates });
    out.push({ ...e, url: hiUrl, priority: Math.max(0.1, (e.priority ?? 0.5) - 0.1), alternates });
  }
  return out;
}
