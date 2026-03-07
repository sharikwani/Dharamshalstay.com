import { MetadataRoute } from 'next';
import { hotels } from '@/data/hotels';
import { destinations } from '@/data/destinations';
import { treks } from '@/data/treks';
import { blogPosts } from '@/data/blog';
const B = 'https://dharamshalastay.com';
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: B, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${B}/hotels`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${B}/treks`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${B}/taxi`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${B}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${B}/paragliding`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${B}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${B}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    ...hotels.map(h => ({ url: `${B}/hotels/${h.slug}`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...destinations.map(d => ({ url: `${B}/destinations/${d.slug}`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.8 })),
    ...treks.map(t => ({ url: `${B}/treks/${t.slug}`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.7 })),
    ...blogPosts.map(b => ({ url: `${B}/blog/${b.slug}`, lastModified: new Date(b.updated_at), changeFrequency: 'monthly' as const, priority: 0.7 })),
  ];
}
