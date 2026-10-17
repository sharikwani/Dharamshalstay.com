import { NextResponse } from 'next/server';
import { HttpError, jsonError } from '@/lib/server-auth';
import { isFlagColor, parseShort } from '@/lib/stories/rules';
import { addComment, addFlag, countRecent, isApproved, liveData, recordView, setLike } from '@/lib/stories/store';
import { moderateShort } from '@/lib/stories/ai';
import { HOUR_MS, geoOf, ipHashOf, isBot, jsonBody, requireUuid } from '@/lib/stories/request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; // Next 14 caches GET fetches (Supabase reads) in route handlers otherwise

/** Live numbers for a story page: reads, likes, comments, prayer flags and where readers are. */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = requireUuid(params.id, 'story');
    const v = new URL(req.url).searchParams.get('v');
    const visitor = v && /^[0-9a-f-]{36}$/i.test(v) ? v : null;
    const data = await liveData(id, visitor);
    if (!data) throw new HttpError(404, 'Story not found');
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { return jsonError(e); }
}

const LIMITS = { comment: 10, flag: 10, like: 120 };

/**
 * Reader actions: view (once per visitor), like / unlike, comment and tie a prayer flag.
 * Comments and flags with links or contact details, or that fail the safety check, wait for the owner.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = requireUuid(params.id, 'story');
    const b = await jsonBody(req);
    const visitor = requireUuid(b.visitor, 'visitor');
    const action = String(b.action || '');
    if (!(await isApproved(id))) throw new HttpError(404, 'Story not found');
    const ipHash = ipHashOf(req);
    const since = new Date(Date.now() - HOUR_MS).toISOString();

    if (action === 'view') {
      if (isBot(req)) return NextResponse.json({ ok: true, counted: false });
      const { city, country } = geoOf(req);
      return NextResponse.json({ ok: true, counted: await recordView(id, visitor, city, country) });
    }

    if (action === 'like') {
      if (await countRecent('story_likes', ipHash, since) >= LIMITS.like) throw new HttpError(429, 'Slow down a little and try again later.');
      return NextResponse.json({ ok: true, likes: await setLike(id, visitor, b.on !== false, ipHash) });
    }

    if (action === 'comment' || action === 'flag') {
      if (String(b.website ?? '').trim()) return NextResponse.json({ ok: true, status: 'visible' }); // honeypot
      const p = parseShort(action, b);
      if (!p.ok) throw new HttpError(400, p.error);
      const table = action === 'comment' ? 'story_comments' : 'story_flags';
      if (await countRecent(table, ipHash, since) >= LIMITS[action]) throw new HttpError(429, 'You have posted a lot in the last hour. Please try again later.');
      const status = await moderateShort(p.name + '\n' + p.text);
      if (action === 'comment') {
        const row = await addComment({ story_id: id, name: p.name, body: p.text, status, ip_hash: ipHash });
        return NextResponse.json({ ok: true, status, item: { id: row.id, name: p.name, text: p.text, created_at: row.created_at } });
      }
      if (!isFlagColor(b.color)) throw new HttpError(400, 'Choose a colour for your flag.');
      const row = await addFlag({ story_id: id, name: p.name, message: p.text, color: b.color, status, ip_hash: ipHash });
      return NextResponse.json({ ok: true, status, item: { id: row.id, name: p.name, text: p.text, color: b.color, created_at: row.created_at } });
    }

    throw new HttpError(400, 'Unknown action');
  } catch (e) { return jsonError(e); }
}
