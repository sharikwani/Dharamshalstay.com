import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { HttpError, jsonError } from '@/lib/server-auth';
import { adminEmail, escHtml, sendEmail } from '@/lib/email';
import { removeByAuthor, storyByToken } from '@/lib/stories/store';
import { jsonBody } from '@/lib/stories/request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; // Next 14 caches GET fetches (Supabase reads) in route handlers otherwise

/** The storyteller takes their story down from their private page. */
export async function POST(req: Request, { params }: { params: { token: string } }) {
  try {
    const b = await jsonBody(req);
    if (b.action !== 'remove') throw new HttpError(400, 'Unknown action');
    const s = await storyByToken(params.token);
    if (!s) throw new HttpError(404, 'This story link is not valid any more.');
    await removeByAuthor(s);
    revalidatePath('/stories');
    revalidatePath('/stories/' + s.slug);
    await sendEmail({
      to: adminEmail(), subject: 'Story taken down by its author: ' + s.title,
      html: `<h2>A storyteller removed their story</h2><p><strong>${escHtml(s.title)}</strong> by ${escHtml(s.author_name)}. It is off the site and its photos are deleted.${s.ig_story_id ? ' It was on our Instagram story; delete it there too if it is still up.' : ''}</p>`,
    }).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (e) { return jsonError(e); }
}
