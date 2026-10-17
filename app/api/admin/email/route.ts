import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, requireCaller, serviceClient } from '@/lib/server-auth';
import { renderEmail } from '@/lib/email/layout';
import { campaignDoc, sendTest, type Campaign, type CampaignContent } from '@/lib/email/marketing';
import { createCampaignFromTheme, themeFor } from '@/lib/email/autopilot';
import { deliver, fetchSentHtml, ADMIN_TO } from '@/lib/email/send';
import { runDueJobs } from '@/lib/email/jobs';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; // Next 14 caches GET fetches (Supabase reads) in route handlers otherwise
export const maxDuration = 60;

const since = (days: number) => new Date(Date.now() - days * 86400e3).toISOString();

/** GET ?view=overview|messages|message|contacts|campaigns|jobs|settings|preview&id= */
export async function GET(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    const sb = serviceClient();
    const url = new URL(req.url);
    const view = url.searchParams.get('view') || 'overview';
    const q = (url.searchParams.get('q') || '').trim();

    if (view === 'overview') {
      const count = async (table: string, f: (x: any) => any) => (await f(sb.from(table).select('id', { count: 'exact', head: true }))).count || 0;
      const [sent30, delivered30, opened30, clicked30, bounced30, contacts, subscribed, unsub, pending] = await Promise.all([
        count('email_messages', (x) => x.gte('created_at', since(30)).in('status', ['sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained'])),
        count('email_messages', (x) => x.gte('created_at', since(30)).in('status', ['delivered', 'opened', 'clicked'])),
        count('email_messages', (x) => x.gte('created_at', since(30)).in('status', ['opened', 'clicked'])),
        count('email_messages', (x) => x.gte('created_at', since(30)).eq('status', 'clicked')),
        count('email_messages', (x) => x.gte('created_at', since(30)).in('status', ['bounced', 'complained'])),
        count('contacts', (x) => x),
        count('contacts', (x) => x.eq('marketing_consent', true).is('unsubscribed_at', null).is('suppressed_reason', null)),
        count('contacts', (x) => x.not('unsubscribed_at', 'is', null)),
        count('email_jobs', (x) => x.eq('status', 'pending')),
      ]);
      return NextResponse.json({ sent30, delivered30, opened30, clicked30, bounced30, contacts, subscribed, unsub, pending, configured: !!process.env.RESEND_API_KEY, webhook: !!process.env.RESEND_WEBHOOK_SECRET, cron: !!process.env.CRON_SECRET, ai: !!process.env.OPENAI_API_KEY });
    }
    if (view === 'messages') {
      let x = sb.from('email_messages').select('id,to_email,kind,template,subject,status,error,created_at,opened_at,clicked_at').order('created_at', { ascending: false }).limit(200);
      if (q) x = x.or(`to_email.ilike.%${q.replace(/[%,()]/g, '')}%,subject.ilike.%${q.replace(/[%,()]/g, '')}%`);
      const kind = url.searchParams.get('kind');
      if (kind) x = x.eq('kind', kind);
      return NextResponse.json({ rows: (await x).data || [] });
    }
    if (view === 'message') {
      const { data: m } = await sb.from('email_messages').select('*').eq('id', url.searchParams.get('id') || '').maybeSingle();
      if (!m) throw new HttpError(404, 'Email not found');
      // Our own copy first (kept since migration v38); older emails come back from Resend while it still holds them.
      const html = m.html || (m.resend_id ? await fetchSentHtml(m.resend_id) : null);
      const { html: _h, ...row } = m;
      return NextResponse.json({ row, html });
    }
    if (view === 'contacts') {
      let x = sb.from('contacts').select('id,email,phone,name,source,interests,marketing_consent,consent_source,consent_at,unsubscribed_at,suppressed_reason,booking_count,last_booking_at,last_enquiry_at,last_marketing_at,created_at').order('created_at', { ascending: false }).limit(300);
      if (q) x = x.or(`email.ilike.%${q.replace(/[%,()]/g, '')}%,name.ilike.%${q.replace(/[%,()]/g, '')}%,phone.ilike.%${q.replace(/\D/g, '')}%`);
      return NextResponse.json({ rows: (await x).data || [] });
    }
    if (view === 'campaigns') {
      const { data } = await sb.from('email_campaigns').select('*').order('created_at', { ascending: false }).limit(50);
      const ids = (data || []).map((c) => c.id);
      const stats: Record<string, Record<string, number>> = {};
      if (ids.length) {
        const { data: msgs } = await sb.from('email_messages').select('campaign_id,status').in('campaign_id', ids).eq('kind', 'marketing');
        for (const m of msgs || []) { (stats[m.campaign_id] ||= {})[m.status] = (stats[m.campaign_id][m.status] || 0) + 1; }
      }
      return NextResponse.json({ rows: (data || []).map((c) => ({ ...c, stats: stats[c.id] || {} })), themes: themeFor() });
    }
    if (view === 'jobs') {
      const { data } = await sb.from('email_jobs').select('id,template,send_at,status,last_error,booking_id,inquiry_id,sent_at').order('send_at', { ascending: false }).limit(200);
      return NextResponse.json({ rows: data || [] });
    }
    if (view === 'settings') {
      const { data } = await sb.from('email_settings').select('*').eq('id', 1).maybeSingle();
      return NextResponse.json({ settings: data });
    }
    if (view === 'preview') {
      const { data: c } = await sb.from('email_campaigns').select('*').eq('id', url.searchParams.get('id') || '').maybeSingle();
      if (!c) throw new HttpError(404, 'Campaign not found');
      return NextResponse.json({ html: renderEmail(await campaignDoc(c as Campaign, 'Asha')) });
    }
    throw new HttpError(400, 'Unknown view');
  } catch (e) { return jsonError(e); }
}

const content = z.object({
  kicker: z.string().max(60).optional(), heading: z.string().min(1).max(120), intro: z.string().max(1200), hero: z.string().max(200).optional(),
  sections: z.array(z.object({ title: z.string().max(120), text: z.string().max(1000), image: z.string().max(200), link: z.string().max(300), cta: z.string().max(60).optional() })).max(6),
  cta: z.object({ label: z.string().max(60), link: z.string().max(300) }), ps: z.string().max(400).optional(),
});

const action = z.discriminatedUnion('action', [
  z.object({ action: z.literal('settings'), marketing_mode: z.enum(['off', 'approve', 'auto']).optional(), max_marketing_per_week: z.number().int().min(1).max(3).optional(), automations: z.record(z.boolean()).optional() }),
  z.object({ action: z.literal('generate'), theme: z.string().max(80).optional(), brief: z.string().max(1500).optional() }),
  z.object({ action: z.literal('update'), id: z.string().uuid(), subject: z.string().min(3).max(120), preheader: z.string().max(150).optional(), content, segment: z.object({ interests: z.array(z.string()).optional(), language: z.string().optional() }).optional() }),
  z.object({ action: z.literal('test'), id: z.string().uuid(), to: z.string().email().optional() }),
  z.object({ action: z.literal('schedule'), id: z.string().uuid(), at: z.string().datetime().optional() }),
  z.object({ action: z.literal('cancel'), id: z.string().uuid() }),
  z.object({ action: z.literal('compose'), to: z.string().email(), subject: z.string().min(3).max(150), body: z.string().min(5).max(8000), button: z.object({ label: z.string().max(60), href: z.string().max(500) }).optional() }),
  z.object({ action: z.literal('run-jobs') }),
]);

export async function POST(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    const parsed = action.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message || 'Bad request');
    const a = parsed.data;
    const sb = serviceClient();

    if (a.action === 'settings') {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (a.marketing_mode) patch.marketing_mode = a.marketing_mode;
      if (a.max_marketing_per_week) patch.max_marketing_per_week = a.max_marketing_per_week;
      if (a.automations) {
        const { data } = await sb.from('email_settings').select('automations').eq('id', 1).maybeSingle();
        patch.automations = { ...(data?.automations || {}), ...a.automations };
      }
      const { data, error } = await sb.from('email_settings').update(patch).eq('id', 1).select('*').single();
      if (error) throw new HttpError(500, error.message);
      return NextResponse.json({ settings: data });
    }
    if (a.action === 'generate') {
      const themes = themeFor();
      const picked = a.brief
        ? { id: `custom-${Date.now()}`, name: a.brief.slice(0, 60), brief: a.brief }
        : themes.find((t) => t.id === a.theme) || themes[0];
      if (!picked) throw new HttpError(400, 'Write a short brief for the AI');
      // Re-using a theme that already went out would hit the unique index, so custom-tag repeats.
      const { count } = await sb.from('email_campaigns').select('id', { count: 'exact', head: true }).eq('theme', picked.id).neq('status', 'cancelled');
      const theme = count ? { ...picked, id: `${picked.id}-${Date.now()}` } : picked;
      const c = await createCampaignFromTheme(theme, 'approve', 'admin');
      return NextResponse.json({ campaign: c });
    }
    if (a.action === 'update') {
      const { data, error } = await sb.from('email_campaigns').update({ subject: a.subject, preheader: a.preheader || null, content: a.content as CampaignContent, ...(a.segment ? { segment: a.segment } : {}), updated_at: new Date().toISOString() })
        .eq('id', a.id).in('status', ['draft', 'scheduled']).select('*').single();
      if (error || !data) throw new HttpError(409, 'Only drafts and scheduled campaigns can be edited');
      return NextResponse.json({ campaign: data });
    }
    if (a.action === 'test') {
      const { data: c } = await sb.from('email_campaigns').select('*').eq('id', a.id).maybeSingle();
      if (!c) throw new HttpError(404, 'Campaign not found');
      const r = await sendTest(c as Campaign, a.to || ADMIN_TO());
      if (!r.ok) throw new HttpError(502, 'Test email failed: ' + (r.reason || r.status));
      return NextResponse.json({ ok: true });
    }
    if (a.action === 'schedule') {
      const at = a.at ? new Date(a.at) : new Date();
      const { error } = await sb.from('email_campaigns').update({ status: 'scheduled', scheduled_at: at.toISOString(), updated_at: new Date().toISOString() }).eq('id', a.id).in('status', ['draft', 'scheduled']);
      if (error) throw new HttpError(500, error.message);
      return NextResponse.json({ ok: true });
    }
    if (a.action === 'cancel') {
      await sb.from('email_campaigns').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', a.id).in('status', ['draft', 'scheduled', 'sending']);
      return NextResponse.json({ ok: true });
    }
    if (a.action === 'compose') {
      const paras = a.body.split(/\n{2,}/).map((t) => ({ type: 'p' as const, text: t.trim() })).filter((b) => b.text);
      const r = await deliver({
        to: a.to, subject: a.subject, kind: 'transactional', template: 'admin_compose',
        doc: { heading: a.subject, blocks: [...paras, ...(a.button ? [{ type: 'button' as const, label: a.button.label, href: a.button.href }] : [])], footer: { kind: 'transactional' } },
      });
      if (!r.ok) throw new HttpError(502, 'Email not sent: ' + (r.reason || r.status));
      return NextResponse.json({ ok: true, id: r.id });
    }
    if (a.action === 'run-jobs') return NextResponse.json(await runDueJobs());
    throw new HttpError(400, 'Unknown action');
  } catch (e) { return jsonError(e); }
}
