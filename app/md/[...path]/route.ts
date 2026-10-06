import { pageMarkdown } from '@/lib/llms';
import { siteConfig } from '@/lib/config';

// Markdown twin of a page: /blog/x.md is rewritten here (see next.config.js).
export const revalidate = 3600;

export async function GET(_req: Request, { params }: { params: { path: string[] } }) {
  const path = '/' + params.path.join('/');
  const md = await pageMarkdown(path);
  if (!md) return new Response('Not found\n', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  return new Response(md, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      // The HTML page is the one search engines should index.
      Link: '<' + siteConfig.url + path + '>; rel="canonical"',
    },
  });
}
