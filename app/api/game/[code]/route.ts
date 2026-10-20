import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/server-auth';
import { publicState } from '@/lib/game/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/** The game as every phone sees it: called numbers, player count, winners. */
export async function GET(_req: Request, { params }: { params: { code: string } }) {
  try {
    return NextResponse.json(await publicState(params.code), { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { return jsonError(e); }
}
