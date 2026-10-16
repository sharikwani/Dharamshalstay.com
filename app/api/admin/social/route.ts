import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, requireCaller, serviceClient } from '@/lib/server-auth';
import { accountStats, socialConfigured } from '@/lib/social/publish';
import { createPost, nextSlot, publishPost } from '@/lib/social/autopilot';
import { slideUrl, topicIdeas, fullCaption, type Slide } from '@/lib/social/writer';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    const sb = serviceClient();
    const view = new URL(req.url).searchParams.get('view') || 'posts';
    if (view === 'posts') {
      const { data } = await sb.from('social_posts').select('*').neq('status', 'cancelled').order('created_at', { ascending: false }).limit(60);
      const rows = (data || []).map((p) => ({
        ...p,
        slide_urls: (p.slides as Slide[]).map((s, i) => slideUrl(s, i, (p.slides as Slide[]).length)),
        ig_caption: fullCaption(p, 'instagram'),
      }));
      return NextResponse.json({ rows });
    }
    if (view === 'settings') {
      const { data } = await sb.from('social_settings').select('*').eq('id', 1).maybeSingle();
      return NextResponse.json({ settings: data, configured: socialConfigured() });
    }
    if (view === 'stats') return NextResponse.json(socialConfigured() ? await accountStats() : {});
    if (view === 'ideas') {
      const { data: used } = await sb.from('social_posts').select('theme').neq('status', 'cancelled');
      const usedSet = new Set((used || []).map((u) => u.theme));
      const ideas = topicIdeas().filter((i) => !usedSet.has(i.theme));
      return NextResponse.json({ ideas: [...ideas.filter((i) => i.theme.startsWith('festival:')), ...ideas.filter((i) => i.theme.startsWith('guide:')).slice(0, 40), ...ideas.filter((i) => i.theme.startsWith('place:')).slice(0, 20)] });
    }
    throw new HttpError(400, 'Unknown view');
  } catch (e) { return jsonError(e); }
}

const slide = z.object({ style: z.enum(['cover', 'tip', 'cta']), image: z.string().max(60).optional(), kicker: z.string().max(40).optional(), title: z.string().min(1).max(90), body: z.string().max(220).optional() });
const action = z.discriminatedUnion('action', [
  z.object({ action: z.literal('settings'), mode: z.enum(['off', 'approve', 'auto']).optional(), posts_per_week: z.number().int().min(1).max(14).optional(), post_time: z.string().regex(/^\d{2}:\d{2}$/).optional(), post_days: z.array(z.number().int().min(0).max(6)).min(1).optional() }),
  z.object({ action: z.literal('generate'), theme: z.string().max(120).optional(), topic: z.string().max(300).optional(), format: z.enum(['single', 'carousel']).optional() }),
  z.object({ action: z.literal('update'), id: z.string().uuid(), caption: z.string().min(20).max(2000), hashtags: z.array(z.string().max(40)).max(25), slides: z.array(slide).min(1).max(10).optional() }),
  z.object({ action: z.literal('approve'), id: z.string().uuid() }),
  z.object({ action: z.literal('publish'), id: z.string().uuid() }),
  z.object({ action: z.literal('cancel'), id: z.string().uuid() }),
]);

export async function POST(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    const parsed = action.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message || 'Bad request');
    const a = parsed.data;
    const sb = serviceClient();
    const now = new Date().toISOString();

    if (a.action === 'settings') {
      const { action: _a, ...patch } = a;
      const { data, error } = await sb.from('social_settings').update({ ...patch, updated_at: now }).eq('id', 1).select('*').single();
      if (error) throw new HttpError(500, error.message);
      return NextResponse.json({ settings: data });
    }
    if (a.action === 'generate') {
      const ideas = topicIdeas();
      const brief = a.theme ? ideas.find((i) => i.theme === a.theme) : a.topic ? { theme: `custom:${Date.now()}`, topic: a.topic, format: a.format } : undefined;
      if (!brief) throw new HttpError(400, 'Pick a topic or write one');
      return NextResponse.json({ post: await createPost({ ...brief, format: a.format || brief.format }, { schedule: false, createdBy: 'admin' }) });
    }
    if (a.action === 'update') {
      const { data, error } = await sb.from('social_posts').update({ caption: a.caption, hashtags: a.hashtags.map((h) => h.replace(/^#/, '').toLowerCase()), ...(a.slides ? { slides: a.slides } : {}), updated_at: now })
        .eq('id', a.id).in('status', ['draft', 'scheduled', 'failed']).select('*').single();
      if (error || !data) throw new HttpError(409, 'Only unpublished posts can be edited');
      return NextResponse.json({ post: data });
    }
    if (a.action === 'approve') {
      const { data: p } = await sb.from('social_posts').select('scheduled_at').eq('id', a.id).single();
      let at = p?.scheduled_at && Date.parse(p.scheduled_at) > Date.now() + 5 * 60e3 ? new Date(p.scheduled_at) : null;
      if (!at) {
        const { data: s } = await sb.from('social_settings').select('*').eq('id', 1).maybeSingle();
        const { data: q } = await sb.from('social_posts').select('scheduled_at').eq('status', 'scheduled').gte('scheduled_at', now);
        at = nextSlot(s?.post_days || [2, 4, 6, 0], s?.post_time || '19:30', (q || []).map((x) => Date.parse(x.scheduled_at)));
      }
      await sb.from('social_posts').update({ status: 'scheduled', scheduled_at: at.toISOString(), attempts: 0, error: null, updated_at: now }).eq('id', a.id).in('status', ['draft', 'failed', 'scheduled']);
      return NextResponse.json({ ok: true, at });
    }
    if (a.action === 'publish') {
      if (!socialConfigured()) throw new HttpError(400, 'Instagram/Facebook are not connected');
      return NextResponse.json(await publishPost(a.id, Date.now() + 50_000));
    }
    if (a.action === 'cancel') {
      await sb.from('social_posts').update({ status: 'cancelled', updated_at: now }).eq('id', a.id).in('status', ['draft', 'scheduled', 'failed']);
      return NextResponse.json({ ok: true });
    }
    throw new HttpError(400, 'Unknown action');
  } catch (e) { return jsonError(e); }
}
