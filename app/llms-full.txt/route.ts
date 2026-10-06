import { llmsFull } from '@/lib/llms';

// /llms-full.txt -- the whole site's text in one Markdown file for AI assistants.
export const revalidate = 3600;

export async function GET() {
  return new Response(await llmsFull(), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
  });
}
