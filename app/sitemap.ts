import { MetadataRoute } from 'next';
import { getPublishedProperties, getDestinations, getPublishedTreks } from '@/lib/db';
import { blogPosts } from '@/data/blog';

const B = 'https://dharamshalastay.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [hotels, destinations, treks] = await Promise.all([
    getPublishedProperties(),
    getDestinations(),
    getPublishedTreks(),
  ]);

  return [
    { url: B, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${B}/hotels`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${B}/treks`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${B}/taxi`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${B}/paragliding`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${B}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${B}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${B}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    ...hotels.map((h: any) => ({ url: `${B}/hotels/${h.slug}`, lastModified: new Date(h.updated_at || h.created_at), changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...destinations.map((d: any) => ({ url: `${B}/destinations/${d.slug}`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.8 })),
    ...treks.map((t: any) => ({ url: `${B}/treks/${t.slug}`, lastModified: new Date(t.updated_at || t.created_at), changeFrequency: 'monthly' as const, priority: 0.7 })),
    ...blogPosts.map(b => ({ url: `${B}/blog/${b.slug}`, lastModified: new Date(b.updated_at), changeFrequency: 'monthly' as const, priority: 0.7 })),
  ];
}

