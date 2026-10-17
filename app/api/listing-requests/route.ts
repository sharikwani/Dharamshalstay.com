import { NextResponse } from 'next/server';
import { HttpError, clientIp, jsonError } from '@/lib/server-auth';
import { hashIp } from '@/lib/reviews/validate';
import { listingRequestSchema, submitListingRequest } from '@/lib/listings/requests';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; // Next 14 caches GET fetches (Supabase reads) in route handlers otherwise

export async function POST(req: Request) {
  try {
    const parsed = listingRequestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message || 'Please check the form');
    }
    if (parsed.data.website) return NextResponse.json({ ok: true, kind: parsed.data.kind, removed: false, verified: false });
    const r = await submitListingRequest(parsed.data, hashIp(clientIp(req)));
    return NextResponse.json({ ok: true, ...r });
  } catch (e) { return jsonError(e); }
}
