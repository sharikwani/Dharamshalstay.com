import { NextResponse } from 'next/server';
import { HttpError, clientIp, jsonError } from '@/lib/server-auth';
import { hashIp } from '@/lib/reviews/validate';
import { guideSignupSchema, submitGuide } from '@/lib/guides/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST: a local guide signs up for the directory (shown after the owner approves it). */
export async function POST(req: Request) {
  try {
    const parsed = guideSignupSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message || 'Please check the form');
    if (parsed.data.website) return NextResponse.json({ ok: true });
    await submitGuide(parsed.data, hashIp(clientIp(req)));
    return NextResponse.json({ ok: true });
  } catch (e) { return jsonError(e); }
}
