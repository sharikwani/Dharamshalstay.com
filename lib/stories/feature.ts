/**
 * Approving and featuring stories, and the daily job (run by the 10-minute cron):
 * 1. Screen one new story with the AI (score, notes, caption) for the owner's queue.
 * 2. Retry today's Instagram story if posting it failed.
 * 3. From 9 am India time, suggest one approved story to the owner as today's Story of the day,
 *    unless one is already in the spotlight or was suggested today. The owner features it with one tap.
 */
import { HttpError, serviceClient } from '@/lib/server-auth';
import { adminEmail, escHtml, sendEmail } from '@/lib/email';
import { siteConfig } from '@/lib/config';
import { publishInstagramStory, socialConfigured } from '@/lib/social/publish';
import { FEATURE_HOURS, UPLOAD_BUCKET, istDayStart, istHour, pickStoryOfTheDay } from './rules';
import { getStory, publishStoryPhotos, updateStory, type StoryRow } from './store';
import { screenStory } from './ai';

const SITE = () => siteConfig.url.replace(/\/$/, '');
export const storyUrl = (s: Pick<StoryRow, 'slug'>) => `${SITE()}/stories/${s.slug}`;
export const cardUrl = (s: Pick<StoryRow, 'slug' | 'updated_at'>, f: 'story' | 'fame' | 'og') => `${SITE()}/stories/card/${s.slug}?f=${f}&v=${Date.parse(s.updated_at) || 0}`;
const manageUrl = (s: Pick<StoryRow, 'manage_token'>) => `${SITE()}/stories/me/${s.manage_token}`;

async function emailAuthor(s: StoryRow, subject: string, html: string) {
  if (!s.email) return;
  await sendEmail({ to: s.email, subject, html, template: 'story_notice' }).catch((e) => console.error('Story author email failed:', e));
}

export async function approveStory(id: string): Promise<void> {
  const s = await getStory(id);
  if (!s) throw new HttpError(404, 'Story not found');
  if (s.status === 'removed') throw new HttpError(409, 'The storyteller removed this story.');
  await publishStoryPhotos(s.photos);
  const first = !s.approved_at;
  await updateStory(id, { status: 'approved', approved_at: s.approved_at || new Date().toISOString() });
  if (first) {
    await emailAuthor(s, 'Your Dharamshala story is live',
      `<h2>Your story is live</h2>
       <p>Hi ${escHtml(s.author_name)}, thank you for sharing <strong>${escHtml(s.title)}</strong>. It is now on Dharamshala Stay for everyone to read:</p>
       <p><a href="${storyUrl(s)}">${storyUrl(s)}</a></p>
       <p>Every day we choose one story for our homepage and Instagram. Watch how far yours travels, and who ties a prayer flag to it, on your private page:</p>
       <p><a href="${manageUrl(s)}">Your story page</a> (only you have this link)</p>`);
  }
}

/** Story of the day for the next 24 hours: on the homepage and as our Instagram story. */
export async function featureStory(id: string, deadline = Date.now() + 45_000): Promise<{ instagram: 'posted' | 'failed' | 'off'; error?: string }> {
  const s = await getStory(id);
  if (!s) throw new HttpError(404, 'Story not found');
  if (s.status !== 'approved') throw new HttpError(409, 'Approve the story before featuring it.');
  const sb = serviceClient();
  const now = new Date();
  // Only one story in the spotlight at a time.
  await sb.from('stories').update({ featured_until: now.toISOString() }).gt('featured_until', now.toISOString()).neq('id', id);
  const until = new Date(now.getTime() + FEATURE_HOURS * 3600e3).toISOString();
  await updateStory(id, { featured_at: now.toISOString(), featured_until: until, ig_story_id: null, ig_error: null, ig_attempts: 0 });
  const fresh = (await getStory(id))!;
  const ig = await postToInstagram(fresh, deadline);
  await emailAuthor(fresh, 'You are today\'s Story of the day',
    `<h2>You are today's Story of the day</h2>
     <p>Hi ${escHtml(s.author_name)}, <strong>${escHtml(s.title)}</strong> is on the Dharamshala Stay homepage for the next 24 hours${ig.instagram === 'posted' ? ' and on our Instagram story (@' + escHtml(siteConfig.instagramHandle) + ')' : ''}.</p>
     <p>Your featured card to share: <a href="${cardUrl(fresh, 'fame')}">download it here</a>${s.instagram ? ', and tag @' + escHtml(siteConfig.instagramHandle) + ' so we can reshare it' : ''}.</p>
     <p><a href="${storyUrl(fresh)}">Your story</a> · <a href="${manageUrl(fresh)}">See who is reading it</a></p>`);
  return ig;
}

async function postToInstagram(s: StoryRow, deadline: number): Promise<{ instagram: 'posted' | 'failed' | 'off'; error?: string }> {
  if (!socialConfigured()) return { instagram: 'off' };
  try {
    const r = await publishInstagramStory(cardUrl(s, 'story'), deadline);
    await updateStory(s.id, { ig_story_id: r.id, ig_attempts: s.ig_attempts + 1, ig_error: null });
    return { instagram: 'posted' };
  } catch (e: any) {
    const error = String(e?.message || e).slice(0, 300);
    await updateStory(s.id, { ig_attempts: s.ig_attempts + 1, ig_error: error });
    return { instagram: 'failed', error };
  }
}

export async function unfeatureStory(id: string): Promise<void> {
  await updateStory(id, { featured_until: new Date().toISOString() });
}

export async function runStoriesAutopilot(opts: { deadline: number }) {
  const sb = serviceClient();
  const out: Record<string, unknown> = {};

  // 1. Screen one new story (also one approved before the AI got to it, so it can be picked).
  const { data: fresh, error } = await sb.from('stories').select('*').in('status', ['pending', 'approved']).is('ai_screened_at', null).order('created_at').limit(1);
  if (error) return { error: error.message }; // tables missing until migration v34 runs
  if (fresh?.length && Date.now() < opts.deadline - 45_000) {
    const s = fresh[0] as StoryRow;
    const images: { type: string; bytes: Uint8Array }[] = [];
    for (const p of s.photos.slice(0, 3)) {
      const { data } = await sb.storage.from(UPLOAD_BUCKET).download(p);
      if (data) images.push({ type: data.type || 'image/jpeg', bytes: new Uint8Array(await data.arrayBuffer()) });
    }
    const r = await screenStory(s, images);
    await updateStory(s.id, r
      ? { ai_score: r.score, ai_notes: r.notes, ai_flags: r.flags, ai_caption: r.caption, ai_screened_at: new Date().toISOString() }
      : { ai_screened_at: new Date().toISOString(), ai_notes: 'The AI check could not run; read it yourself.' });
    out.screened = { id: s.id, score: r?.score ?? null };
  }

  const nowIso = new Date().toISOString();
  const { data: live } = await sb.from('stories').select('*').gt('featured_until', nowIso).limit(1);

  // 2. Retry the Instagram story (twice more at most, within its first 3 hours).
  const l = live?.[0] as StoryRow | undefined;
  if (l && !l.ig_story_id && l.ig_attempts < 3 && Date.now() - Date.parse(l.featured_at!) < 3 * 3600e3 && socialConfigured() && Date.now() < opts.deadline - 30_000) {
    out.instagram = await postToInstagram(l, Math.min(opts.deadline, Date.now() + 40_000));
  }

  // 3. Suggest today's story.
  if (l || istHour() < 9) return out;
  const { count: suggested } = await sb.from('stories').select('id', { count: 'exact', head: true }).gte('proposed_at', istDayStart());
  if (suggested) return out;
  const [{ data: open }, { data: last }] = await Promise.all([
    sb.from('stories').select('id, status, ai_score, featured_at, created_at, author_kind, title, author_name, place, ai_notes, slug').eq('status', 'approved').is('featured_at', null).limit(200),
    sb.from('stories').select('author_kind').not('featured_at', 'is', null).order('featured_at', { ascending: false }).limit(1),
  ]);
  const pick = pickStoryOfTheDay(open || [], last?.[0]?.author_kind);
  if (!pick) return out;
  await sb.from('stories').update({ proposed_at: nowIso }).eq('id', pick.id);
  await sendEmail({
    to: adminEmail(),
    subject: 'Story of the day: feature "' + pick.title + '"?',
    html: `<h2>Today's story pick</h2>
      <p><strong>${escHtml(pick.title)}</strong> by ${escHtml(pick.author_name)} (${pick.author_kind}) · ${escHtml(pick.place)}${pick.ai_score != null ? ' · AI score ' + pick.ai_score + '/100' : ''}</p>
      ${pick.ai_notes ? `<p>${escHtml(pick.ai_notes)}</p>` : ''}
      <p><a href="${SITE()}/stories/${pick.slug}">Read it</a> · <a href="${SITE()}/admin/stories?pick=${pick.id}">Feature it (homepage + Instagram story for 24 hours)</a></p>`,
  }).catch((e) => console.error('Story pick email failed:', e));
  out.suggested = pick.id;
  return out;
}
