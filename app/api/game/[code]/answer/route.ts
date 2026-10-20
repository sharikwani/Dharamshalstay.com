import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/server-auth';
import { jsonBody } from '@/lib/stories/request';
import { submitAnswer } from '@/lib/game/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/** Player: a quiz answer (option index) or a Most Likely vote (player id). */
export async function POST(req: Request, { params }: { params: { code: string } }) {
  try {
    const b = await jsonBody(req);
    return NextResponse.json(await submitAnswer(params.code, b.token, b.value));
  } catch (e) { return jsonError(e); }
}
