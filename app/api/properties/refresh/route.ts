import { NextResponse } from 'next/server';
import { jsonError, requireCaller } from '@/lib/server-auth';
import { refreshPublishedProperties } from '@/lib/property-cache';

export const dynamic = 'force-dynamic';

/** Admin and partner screens call this after saving a property from the browser, so public pages update at once. */
export async function POST(req: Request) {
  try {
    await requireCaller(req, ['admin', 'partner']);
    refreshPublishedProperties();
    return NextResponse.json({ ok: true });
  } catch (e) { return jsonError(e); }
}
