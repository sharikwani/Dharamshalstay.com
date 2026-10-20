import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/server-auth';
import { jsonBody } from '@/lib/stories/request';
import { ipHashOf } from '@/lib/stories/request';
import { createRoom } from '@/lib/game/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/** Start a tambola game: returns the 6-digit room code and the host's secret token. */
export async function POST(req: Request) {
  try {
    const b = await jsonBody(req);
    return NextResponse.json(await createRoom({ party_name: b.party_name, party_type: b.party_type, host_name: b.host_name, game: b.game, options: b.options }, ipHashOf(req)));
  } catch (e) { return jsonError(e); }
}
