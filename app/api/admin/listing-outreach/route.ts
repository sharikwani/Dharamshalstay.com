import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, requireCaller } from '@/lib/server-auth';
import { outreachList, sendOutreach } from '@/lib/listings/outreach';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    return NextResponse.json({ rows: await outreachList() });
  } catch (e) { return jsonError(e); }
}

const body = z.object({ ids: z.array(z.string().uuid()).max(100).optional() });

/** Sends the next batch; the admin page calls it again while `remaining` > 0. */
export async function POST(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    const parsed = body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new HttpError(400, 'Bad request');
    return NextResponse.json(await sendOutreach(parsed.data.ids));
  } catch (e) { return jsonError(e); }
}
