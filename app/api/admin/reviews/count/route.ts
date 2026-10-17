import { NextResponse } from 'next/server';
import { jsonError, requireCaller, serviceClient } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; // Next 14 caches GET fetches (Supabase reads) in route handlers otherwise

/**
 * Pending-review count for the admin nav badge. hotel_reviews is service-role only (v23 revokes
 * authenticated), so the browser cannot count it itself. Any database problem shows as 0.
 */
export async function GET(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    let pending = 0;
    try {
      const { count, error } = await serviceClient().from('hotel_reviews')
        .select('id', { count: 'exact', head: true }).eq('status', 'pending');
      if (error) console.error('Pending review count failed:', error.message);
      else pending = count ?? 0;
    } catch (e) {
      console.error('Pending review count failed:', e);
    }
    return NextResponse.json({ pending });
  } catch (e) { return jsonError(e); }
}
