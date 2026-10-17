import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, requireCaller } from '@/lib/server-auth';
import { hotelUrls, pingIndexNow } from '@/lib/indexnow';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; // Next 14 caches GET fetches (Supabase reads) in route handlers otherwise

const schema = z.object({ slug: z.string().regex(/^[a-z0-9-]{1,200}$/) });

/** Admin pages call this after publishing or saving a hotel (lib/indexnow-client.ts). */
export async function POST(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    const body = schema.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new HttpError(400, 'Invalid hotel');
    const sent = await pingIndexNow(hotelUrls(body.data.slug));
    return NextResponse.json({ ok: true, sent });
  } catch (e) { return jsonError(e); }
}
