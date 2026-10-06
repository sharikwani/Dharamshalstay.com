import { blogPosts } from '@/data/blog';
import { siteConfig } from '@/lib/config';

// /feed.xml -- RSS 2.0 feed of the travel guides (feed readers, aggregators, AI search).
export const revalidate = 3600;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const abs = (src: string) => (src.startsWith('http') ? src : siteConfig.url + src);

export async function GET() {
  const B = siteConfig.url;
  const items = blogPosts.map((p) => {
    const url = B + '/blog/' + p.slug;
    return `    <item>
      <title>${esc(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${esc(p.excerpt)}</description>
      <category>${esc(p.category)}</category>
      <pubDate>${new Date(p.published_at).toUTCString()}</pubDate>
      <media:content url="${esc(abs(p.image))}" medium="image" type="image/jpeg"><media:description>${esc(p.image_alt || p.title)}</media:description></media:content>
    </item>`;
  }).join('\n');
  const latest = blogPosts.reduce((m, p) => (p.updated_at > m ? p.updated_at : m), blogPosts[0]?.updated_at || '2026-01-01');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${esc(siteConfig.name)} Travel Guides</title>
    <link>${B}/blog</link>
    <description>Local travel guides to Dharamshala, McLeod Ganj and the Kangra Valley.</description>
    <language>en-in</language>
    <lastBuildDate>${new Date(latest).toUTCString()}</lastBuildDate>
    <atom:link href="${B}/feed.xml" rel="self" type="application/rss+xml"/>
    <image><url>${B}/icon-512.png</url><title>${esc(siteConfig.name)} Travel Guides</title><link>${B}/blog</link></image>
${items}
  </channel>
</rss>
`;
  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
  });
}
