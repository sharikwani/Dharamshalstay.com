/**
 * Social autopilot, run by the 10-minute cron:
 * 1. Publish the next post that is due (Instagram first, then Facebook; retried up to 3 times).
 * 2. Keep the calendar filled: when fewer than posts_per_week posts are queued, the AI writes the next one
 *    for the next free slot. Mode "approve" saves it as a draft for the admin; "auto" schedules it.
 * Topics never repeat (theme is stored), festivals come first, then guides, then place spotlights.
 */
import { serviceClient } from '@/lib/server-auth';
import { publishFacebook, publishInstagram, socialConfigured } from './publish';
import { topicIdeas, writePost, type Brief } from './writer';

const IST = 5.5 * 3600e3;

/** Next free posting slot on the chosen weekdays at the chosen IST time, after `after`. */
export function nextSlot(days: number[], time: string, taken: number[], after = Date.now()): Date {
  const [hh, mm] = time.split(':').map(Number);
  for (let d = 0; d < 60; d++) {
    const ist = new Date(after + IST + d * 86400e3);
    const slot = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), hh, mm) - IST;
    if (slot <= after + 30 * 60e3) continue;
    if (!days.includes(new Date(slot + IST).getUTCDay())) continue;
    if (taken.some((t) => Math.abs(t - slot) < 3600e3)) continue;
    return new Date(slot);
  }
  return new Date(after + 86400e3);
}

export async function publishPost(id: string, deadline = Date.now() + 45_000) {
  const sb = serviceClient();
  const { data: p } = await sb.from('social_posts').select('*').eq('id', id).single();
  if (!p) throw new Error('Post not found');
  await sb.from('social_posts').update({ status: 'publishing', attempts: (p.attempts || 0) + 1, updated_at: new Date().toISOString() }).eq('id', id);
  const patch: Record<string, unknown> = {};
  const errors: string[] = [];
  try {
    if (p.platforms.includes('instagram') && !p.ig_media_id) {
      const r = await publishInstagram(p, deadline);
      patch.ig_media_id = r.id; patch.ig_permalink = r.permalink || null;
      // Saved straight away: if the run is cut off before the end, a retry must not post to Instagram again.
      await sb.from('social_posts').update({ ig_media_id: r.id, ig_permalink: r.permalink || null }).eq('id', id);
    }
  } catch (e: any) { errors.push('Instagram: ' + (e?.message || e)); }
  try {
    if (p.platforms.includes('facebook') && !p.fb_post_id) {
      patch.fb_post_id = (await publishFacebook(p)).id;
      await sb.from('social_posts').update({ fb_post_id: patch.fb_post_id }).eq('id', id);
    }
  } catch (e: any) { errors.push('Facebook: ' + (e?.message || e)); }

  const igDone = !p.platforms.includes('instagram') || p.ig_media_id || patch.ig_media_id;
  const fbDone = !p.platforms.includes('facebook') || p.fb_post_id || patch.fb_post_id;
  const done = igDone && fbDone;
  const status = done ? 'published' : (p.attempts || 0) + 1 >= 3 ? 'failed' : 'scheduled';
  await sb.from('social_posts').update({
    ...patch, status, error: errors.join(' | ') || null, published_at: done ? new Date().toISOString() : null,
    // A partial failure is retried in 15 minutes; the part that worked is not posted twice.
    ...(status === 'scheduled' ? { scheduled_at: new Date(Date.now() + 15 * 60e3).toISOString() } : {}),
    updated_at: new Date().toISOString(),
  }).eq('id', id);
  return { status, errors };
}

export async function createPost(brief: Brief, opts: { schedule: boolean; at?: Date; createdBy?: 'ai' | 'admin' }) {
  const sb = serviceClient();
  const d = await writePost(brief);
  const { data, error } = await sb.from('social_posts').insert({
    theme: d.theme, topic: d.topic, format: d.format, slides: d.slides, caption: d.caption, hashtags: d.hashtags,
    alt_text: d.alt_text, credits: d.credits, link: d.link,
    status: opts.schedule ? 'scheduled' : 'draft', scheduled_at: opts.at ? opts.at.toISOString() : null, created_by: opts.createdBy || 'ai',
  }).select('*').single();
  if (error) throw new Error(error.message);
  return data;
}

const randomOf = <T,>(xs: T[]): T | undefined => xs[Math.floor(Math.random() * xs.length)];

/**
 * The next curiosity post: series in turn, each on a place not featured in the last few posts,
 * so the feed never shows the same place twice in a row.
 */
export function pickSeries(ideas: Brief[], used: Set<string>, count: number, rand = Math.random): Brief | undefined {
  const open = ideas.filter((i) => i.series && !used.has(i.theme));
  if (!open.length) return undefined;
  const order = Array.from(new Set(open.map((i) => i.series!)));
  const series = order[count % order.length];
  const recent = new Set(Array.from(used).slice(-6).map((t) => t.split(':')[2]).filter(Boolean));
  const pool = open.filter((i) => i.series === series && !recent.has(i.placeKey!));
  const from = pool.length ? pool : open.filter((i) => i.series === series);
  return from[Math.floor(rand() * from.length)];
}

export async function runSocialAutopilot(opts: { deadline: number }) {
  if (!socialConfigured()) return { skipped: 'not configured' };
  const sb = serviceClient();
  const { data: settings } = await sb.from('social_settings').select('*').eq('id', 1).maybeSingle();
  const mode = (settings?.mode || 'approve') as 'off' | 'approve' | 'auto';
  if (mode === 'off') return { mode };
  const out: Record<string, unknown> = { mode };

  // 0. A run cut off mid-publish (time limit, database outage) leaves a post on 'publishing'. After 15 minutes it is
  //    retried: only the platforms it has no id for are posted, since ids are saved as soon as each one succeeds.
  await sb.from('social_posts').update({ status: 'scheduled', error: 'Retrying: the last publish was cut off', updated_at: new Date().toISOString() })
    .eq('status', 'publishing').lt('updated_at', new Date(Date.now() - 15 * 60e3).toISOString());

  // 1. Publish what is due (one per run keeps us inside the time limit).
  const { data: due } = await sb.from('social_posts').select('id').eq('status', 'scheduled').lte('scheduled_at', new Date().toISOString()).order('scheduled_at').limit(1);
  if (due?.length) {
    out.published = await publishPost(due[0].id, Math.min(opts.deadline, Date.now() + 45_000));
    return out;
  }

  // 2. Keep the next week filled.
  const perWeek = Math.max(1, Math.min(14, Number(settings?.posts_per_week || 4)));
  const { data: queued } = await sb.from('social_posts').select('scheduled_at').in('status', ['draft', 'scheduled']).gte('scheduled_at', new Date().toISOString());
  if ((queued?.length || 0) >= perWeek) return { ...out, idle: 'calendar is full' };
  if (Date.now() > opts.deadline - 50_000) return { ...out, idle: 'not enough time left this run' };

  const { data: used } = await sb.from('social_posts').select('theme').neq('status', 'cancelled').order('created_at');
  const usedSet = new Set((used || []).map((u) => u.theme));
  const ideas = topicIdeas();
  // Festivals first; then mostly curiosity series (2 of 3 posts), rotating the series, with a guide carousel in between.
  const festival = ideas.find((i) => i.theme.startsWith('festival:') && !usedSet.has(i.theme));
  const guides = ideas.filter((i) => i.theme.startsWith('guide:') && !usedSet.has(i.theme));
  const count = used?.length || 0;
  const pick = festival || (count % 3 === 2 ? randomOf(guides) : pickSeries(ideas, usedSet, count)) || randomOf(guides) || pickSeries(ideas, usedSet, count);
  if (!pick) return { ...out, idle: 'no new topics' };

  const days = Array.isArray(settings?.post_days) && settings.post_days.length ? settings.post_days : [2, 4, 6, 0];
  const at = nextSlot(days, settings?.post_time || '19:30', (queued || []).map((q) => Date.parse(q.scheduled_at)));
  const post = await createPost(pick, { schedule: mode === 'auto', at });
  return { ...out, created: { id: post.id, topic: post.topic, status: post.status, at: post.scheduled_at } };
}
