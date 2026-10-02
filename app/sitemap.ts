import { MetadataRoute } from 'next';
import { getPublishedProperties, getDestinations, getPublishedTreks } from '@/lib/db';
import { blogPosts } from '@/data/blog';
import { siteConfig } from '@/lib/config';

// Must be the canonical (www) origin -- the bare domain 301s to www, and a
// sitemap full of redirecting URLs is largely ignored by Google.
const B = siteConfig.url;

export const revalidate = 3600;

function date(value?: string | null, fallback = new Date()): Date {
  const d = value ? new Date(value) : fallback;
  return isNaN(d.getTime()) ? fallback : d;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [hotels, destinations, treks] = await Promise.all([
    getPublishedProperties(),
    getDestinations(),
    getPublishedTreks(),
  ]);

  const latestPost = blogPosts.reduce((max, b) => (b.updated_at > max ? b.updated_at : max), '2026-01-01');
  const contentDate = date(latestPost);

  return [
    { url: B, lastModified: contentDate, changeFrequency: 'weekly', priority: 1.0 },
    { url: B + '/hotels', lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: B + '/blog', lastModified: contentDate, changeFrequency: 'weekly', priority: 0.9 },
    { url: B + '/faq', lastModified: contentDate, changeFrequency: 'monthly', priority: 0.8 },
    { url: B + '/destinations', lastModified: contentDate, changeFrequency: 'monthly', priority: 0.8 },
    { url: B + '/treks', lastModified: contentDate, changeFrequency: 'weekly', priority: 0.8 },
    { url: B + '/paragliding', lastModified: contentDate, changeFrequency: 'monthly', priority: 0.8 },
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
      images: d.image ? [d.image.startsWith('http') ? d.image : B + d.image] : undefined,
    })),

    ...blogPosts.map(b => ({
      url: B + '/blog/' + b.slug,
      lastModified: date(b.updated_at),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
      images: [b.image.startsWith('http') ? b.image : B + b.image],
    })),

    ...hotels.map((h: any) => ({
      url: B + '/hotels/' + h.slug,
      lastModified: date(h.updated_at || h.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),

    ...treks.map((t: any) => ({
      url: B + '/treks/' + t.slug,
      lastModified: date(t.updated_at || t.created_at),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
      images: t.images?.[0] ? [String(t.images[0]).startsWith('http') ? t.images[0] : B + t.images[0]] : undefined,
    })),
  ];
}
