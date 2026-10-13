import { NextResponse } from 'next/server';
import { HttpError, jsonError, requireCaller } from '@/lib/server-auth';
import { listAdminReviews } from '@/lib/reviews/store';
import type { ReviewStatus } from '@/lib/reviews/types';

export const dynamic = 'force-dynamic';

const STATUSES: ReviewStatus[] = ['pending', 'approved', 'rejected', 'hidden'];

export async function GET(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    const status = (new URL(req.url).searchParams.get('status') || 'pending') as ReviewStatus;
    if (!STATUSES.includes(status)) throw new HttpError(400, 'Unknown status');
    return NextResponse.json({ reviews: await listAdminReviews(status) });
  } catch (e) { return jsonError(e); }
}
