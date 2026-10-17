import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/server-auth';
import { excerptOf } from '@/lib/stories/rules';
import { spotlightStory } from '@/lib/stories/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; // Next 14 caches GET fetches (Supabase reads) in route handlers otherwise

/** The homepage "Story of the day" card: the featured story, or the last one featured. */
export async function GET() {
  try {
    const s = await spotlightStory();
    const body = s ? {
      live: s.live,
      story: {
        id: s.story.id, slug: s.story.slug, title: s.story.title, excerpt: excerptOf(s.story.body, 200), place: s.story.place,
        author_name: s.story.author_name, author_kind: s.story.author_kind, author_from: s.story.author_from, instagram: s.story.instagram,
        photo: s.story.photos[0] || null, views: s.story.views, likes: s.story.likes, flags: s.story.flags,
        featured_until: s.story.featured_until,
      },
    } : { live: false, story: null };
    return NextResponse.json(body, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
  } catch (e) { return jsonError(e); }
}
