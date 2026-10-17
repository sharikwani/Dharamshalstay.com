import { indexNowKey } from '@/lib/indexnow';

// /<key>.txt is rewritten here (next.config.js). IndexNow fetches it to check we own the site.
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; // always live data, never a cached Supabase read

export function GET(_req: Request, { params }: { params: { key: string } }) {
  const key = indexNowKey();
  if (!key || params.key !== key) {
    return new Response('Not found\n', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
  return new Response(key, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
}
