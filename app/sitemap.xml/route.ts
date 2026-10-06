import { sitemapEntries } from '@/lib/sitemap-entries';

// /sitemap.xml with image and hreflang extensions (see lib/sitemap-entries.ts).
export const revalidate = 3600;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export async function GET() {
  const urls = (await sitemapEntries()).map((e) => [
    '<url>',
    '<loc>' + esc(e.url) + '</loc>',
    e.lastModified && '<lastmod>' + e.lastModified.toISOString() + '</lastmod>',
    e.changeFrequency && '<changefreq>' + e.changeFrequency + '</changefreq>',
    e.priority !== undefined && '<priority>' + e.priority.toFixed(1) + '</priority>',
    ...Object.entries(e.alternates?.languages || {}).map(([lang, href]) => '<xhtml:link rel="alternate" hreflang="' + lang + '" href="' + esc(href) + '"/>'),
    ...(e.images || []).map((src) => '<image:image><image:loc>' + esc(src) + '</image:loc></image:image>'),
    '</url>',
  ].filter(Boolean).join('')).join('\n');

  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'
    + urls + '\n</urlset>\n';
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
  });
}
