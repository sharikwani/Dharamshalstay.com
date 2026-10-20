import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/server-auth';
import { jsonBody } from '@/lib/stories/request';
import { callNumber } from '@/lib/game/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function POST(req: Request, { params }: { params: { code: string } }) {
  try {
    const b = await jsonBody(req);
    return NextResponse.json(await callNumber(params.code, b.hostToken));
  } catch (e) { return jsonError(e); }
}
