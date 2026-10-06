import { llmsIndex } from '@/lib/llms';

// /llms.txt -- index of the site for AI assistants (https://llmstxt.org).
export const revalidate = 3600;

export async function GET() {
  return new Response(await llmsIndex(), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
  });
}
