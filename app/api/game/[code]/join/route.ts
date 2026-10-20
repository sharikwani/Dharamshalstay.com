import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/server-auth';
import { jsonBody } from '@/lib/stories/request';
import { joinRoom } from '@/lib/game/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function POST(req: Request, { params }: { params: { code: string } }) {
  try {
    const b = await jsonBody(req);
    return NextResponse.json(await joinRoom(params.code, { name: b.name, photo: b.photo }));
  } catch (e) { return jsonError(e); }
}
