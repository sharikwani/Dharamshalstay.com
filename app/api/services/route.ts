import { NextResponse } from 'next/server';
import { HttpError, clientIp, jsonError } from '@/lib/server-auth';
import { hashIp } from '@/lib/reviews/validate';
import { serviceSignupSchema, submitService } from '@/lib/services/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST: a business signs up for the local services directory (shown after the owner approves it). */
export async function POST(req: Request) {
  try {
    const parsed = serviceSignupSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message || 'Please check the form');
    if (parsed.data.website) return NextResponse.json({ ok: true });
    await submitService(parsed.data, hashIp(clientIp(req)));
    return NextResponse.json({ ok: true });
  } catch (e) { return jsonError(e); }
}
