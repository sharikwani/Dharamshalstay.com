import { NextResponse } from 'next/server';
import { HttpError, jsonError, requireCaller } from '@/lib/server-auth';
import { listListingRequests, pendingListingRequestCount } from '@/lib/listings/admin';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; // Next 14 caches GET fetches (Supabase reads) in route handlers otherwise

const STATUSES = ['pending', 'done', 'rejected'] as const;

export async function GET(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    const params = new URL(req.url).searchParams;
    if (params.get('count')) return NextResponse.json({ count: await pendingListingRequestCount() });
    const status = (params.get('status') || 'pending') as (typeof STATUSES)[number];
    if (!STATUSES.includes(status)) throw new HttpError(400, 'Unknown status');
    return NextResponse.json({ requests: await listListingRequests(status) });
  } catch (e) { return jsonError(e); }
}
