import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, requireCaller } from '@/lib/server-auth';
import { approveStory, featureStory, unfeatureStory } from '@/lib/stories/feature';
import { getStory, listAdminStories, listHeld, pendingCounts, setShortStatus, unpublishStoryPhotos, updateStory } from '@/lib/stories/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; // Next 14 caches GET fetches (Supabase reads) in route handlers otherwise
export const maxDuration = 60;

const TABS = ['pending', 'approved', 'featured', 'rejected', 'hidden', 'held'] as const;

export async function GET(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    const url = new URL(req.url);
    if (url.searchParams.get('count')) return NextResponse.json(await pendingCounts().catch(() => ({ stories: 0, held: 0 })));
    const tab = (TABS as readonly string[]).includes(url.searchParams.get('tab') || '') ? url.searchParams.get('tab')! : 'pending';
    if (tab === 'held') return NextResponse.json({ held: await listHeld() });
    return NextResponse.json({ stories: await listAdminStories(tab as any) });
  } catch (e) {
    // Before migration v34 the tables do not exist yet.
    if ((e as any)?.code === '42P01' || /relation .* does not exist|Could not find the table/i.test(String((e as any)?.message))) {
      return NextResponse.json({ missing: true, stories: [], held: { comments: [], flags: [] } });
    }
    return jsonError(e);
  }
}

const schema = z.object({
  action: z.enum(['approve', 'reject', 'hide', 'feature', 'unfeature', 'edit', 'comment_show', 'comment_remove', 'flag_show', 'flag_remove']),
  id: z.string().uuid(),
  title: z.string().trim().min(8).max(90).optional(),
});

export async function POST(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    const body = schema.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new HttpError(400, 'Invalid request');
    const { action, id, title } = body.data;

    if (action.startsWith('comment_') || action.startsWith('flag_')) {
      await setShortStatus(action.startsWith('comment_') ? 'story_comments' : 'story_flags', id, action.endsWith('_show') ? 'visible' : 'removed');
      return NextResponse.json({ ok: true });
    }
    if (action === 'approve') { await approveStory(id); return NextResponse.json({ ok: true }); }
    if (action === 'feature') return NextResponse.json({ ok: true, ...(await featureStory(id)) });
    if (action === 'unfeature') { await unfeatureStory(id); return NextResponse.json({ ok: true }); }

    const s = await getStory(id);
    if (!s) throw new HttpError(404, 'Story not found');
    if (action === 'edit') {
      if (!title) throw new HttpError(400, 'A title needs 8 to 90 characters.');
      await updateStory(id, { title });
    } else {
      // reject / hide: off the site, photos out of the public bucket, out of the spotlight.
      await updateStory(id, {
        status: action === 'reject' ? 'rejected' : 'hidden',
        ...(s.featured_until && Date.parse(s.featured_until) > Date.now() ? { featured_until: new Date().toISOString() } : {}),
      });
      await unpublishStoryPhotos(s.photos);
    }
    return NextResponse.json({ ok: true });
  } catch (e) { return jsonError(e); }
}
