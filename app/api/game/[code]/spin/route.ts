import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/server-auth';
import { jsonBody } from '@/lib/stories/request';
import { spinDraw } from '@/lib/game/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/** Host: Lucky Draw spin. */
export async function POST(req: Request, { params }: { params: { code: string } }) {
  try {
    const b = await jsonBody(req);
    return NextResponse.json(await spinDraw(params.code, b.hostToken));
  } catch (e) { return jsonError(e); }
}
