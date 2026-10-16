/**
 * Marketing autopilot, run by the email cron.
 * 1. Keeps sending any campaign that is due (in slices that fit the run).
 * 2. At most once a week, picks the theme of the moment (festival, season or fresh guides),
 *    has the AI write it, and either schedules it (mode "auto") or saves a draft and asks the admin (mode "approve").
 * Each theme is used once (unique index on email_campaigns.theme), so the same campaign never goes out twice.
 */
import { serviceClient } from '@/lib/server-auth';
import { festiveCampaigns } from '@/data/festive';
import { blogPosts, NOINDEX_POSTS } from '@/data/blog';
import { sendCampaignSlice, writeCampaign, type Campaign } from './marketing';
import { deliver, ADMIN_TO } from './send';

export type Theme = { id: string; name: string; brief: string };

const istDate = (d = new Date()) => new Date(d.getTime() + 5.5 * 3600e3).toISOString().slice(0, 10);

/** The best theme for today, most specific first. Exported for tests and the admin "suggest" button. */
export function themeFor(today = istDate()): Theme[] {
  const y = Number(today.slice(0, 4)), m = Number(today.slice(5, 7));
  const out: Theme[] = [];

  for (const c of festiveCampaigns) {
    if (today >= c.from && today <= c.to) {
      out.push({ id: `${c.id}`, name: c.text.en.split(':')[0], brief: `Festive campaign "${c.id}". ${c.text.en} Main link: ${c.guide.href}. Mix the festival guide with stays (rooms fill fast that week) and one experience (trek, monastery, cafés). Encourage booking early through our site.` });
    }
  }
  if (m === 12 || m <= 2) out.push({ id: `snow-season-${m === 12 ? y : y - 1}`, name: 'Snow season', brief: 'Winter in McLeod Ganj: sunny days, snow on the Dhauladhar, cosy cafés, Tibetan food, monasteries in winter light. Feature warm stays with heaters and mountain views, and a winter-safe walk. Remind them winter trek rules apply above 3,000 m.' });
  if (m >= 3 && m <= 6) out.push({ id: `summer-escape-${y}`, name: 'Summer escape', brief: 'Escape the plains heat: cool mountain air in Dharamshala and McLeod Ganj, Triund trek season, waterfalls, paragliding in Bir Billing. Feature stays, the Triund trek and taxis.' });
  if (m >= 7 && m <= 9) out.push({ id: `monsoon-${y}`, name: 'Monsoon magic', brief: 'Monsoon in the mountains: green valleys, waterfalls at their best, misty monasteries and café days. Honest about rain: suggest flexible plans and stays close to cafés and the temple. Avoid recommending high treks.' });
  if (m >= 10 && m <= 11) out.push({ id: `clear-skies-${y}`, name: 'Clear mountain skies', brief: 'October and November bring the clearest skies of the year: crisp views of the Dhauladhar, perfect trekking weather, quieter streets. Feature mountain-view stays, Triund and a monastery morning.' });

  // A monthly digest of guides published or updated in the last 45 days.
  const cutoff = new Date(Date.parse(today) - 45 * 86400e3).toISOString().slice(0, 10);
  const fresh = blogPosts.filter((p) => !NOINDEX_POSTS.includes(p.slug) && String(p.updated_at || p.published_at || '') >= cutoff).slice(0, 6);
  if (fresh.length >= 2) out.push({ id: `guides-${today.slice(0, 7)}`, name: 'New travel guides', brief: `Share our newest guides as a helpful digest: ${fresh.map((p) => `"${p.title}" (/blog/${p.slug})`).join('; ')}. Each section one guide; finish by inviting them to book a stay.` });
  return out;
}

/** Next send slot: 10:30 IST today if still ahead, else tomorrow (good open rates in India). */
function nextSlot(): Date {
  const d = new Date(`${istDate()}T10:30:00+05:30`);
  return d.getTime() > Date.now() + 10 * 60e3 ? d : new Date(d.getTime() + 86400e3);
}

export async function createCampaignFromTheme(theme: Theme, mode: 'auto' | 'approve', createdBy: 'ai' | 'admin' = 'ai') {
  const sb = serviceClient();
  const draft = await writeCampaign(theme.brief);
  const { data, error } = await sb.from('email_campaigns').insert({
    name: theme.name, theme: theme.id, brief: theme.brief, subject: draft.subject, preheader: draft.preheader, content: draft.content,
    status: mode === 'auto' ? 'scheduled' : 'draft', scheduled_at: mode === 'auto' ? nextSlot().toISOString() : null, created_by: createdBy,
  }).select('*').single();
  if (error) throw new Error(error.message);
  await deliver({
    to: ADMIN_TO(), kind: 'admin', template: 'admin_campaign_ready', campaignId: data.id,
    subject: (mode === 'auto' ? 'Marketing email scheduled: ' : 'Marketing draft to approve: ') + draft.subject,
    doc: {
      heading: mode === 'auto' ? 'The AI scheduled a marketing email' : 'A marketing draft is waiting for you',
      blocks: [
        { type: 'details', rows: [['Theme', theme.name], ['Subject', draft.subject], ['Preview text', draft.preheader || '-'], ['Sends', mode === 'auto' ? new Date(data.scheduled_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST' : 'After you approve it']] },
        { type: 'p', text: mode === 'auto' ? 'You can preview, edit or cancel it before then.' : 'Preview it, edit if you like, then press Send.' },
        { type: 'button', label: 'Open campaigns', href: '/admin/email?tab=campaigns' },
      ],
      footer: { kind: 'admin' }, signoff: false,
    },
  });
  return data as Campaign;
}

export async function runMarketingAutopilot(opts: { deadline: number }) {
  const sb = serviceClient();
  const { data: settings } = await sb.from('email_settings').select('*').eq('id', 1).maybeSingle();
  const mode = (settings?.marketing_mode || 'auto') as 'off' | 'approve' | 'auto';
  const out: Record<string, unknown> = { mode };

  // 1. Send what is due (also in "approve" mode: the admin pressed Send, which schedules it).
  const { data: due } = await sb.from('email_campaigns').select('*').in('status', ['scheduled', 'sending']).lte('scheduled_at', new Date().toISOString()).order('scheduled_at').limit(1);
  if (due?.length && mode !== 'off') {
    const c = due[0] as Campaign;
    if (c.status === 'scheduled') await sb.from('email_campaigns').update({ status: 'sending' }).eq('id', c.id);
    const r = await sendCampaignSlice(c, { deadline: opts.deadline });
    if (r.done) await sb.from('email_campaigns').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', c.id);
    out.sending = { campaign: c.name, ...r };
    return out;
  }
  if (mode === 'off') return out;

  // 2. Make a new one at most every 7 days, and not while another is waiting.
  const weekAgo = new Date(Date.now() - 7 * 86400e3).toISOString();
  const { count: recent } = await sb.from('email_campaigns').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo).neq('status', 'cancelled');
  const { count: waiting } = await sb.from('email_campaigns').select('id', { count: 'exact', head: true }).in('status', ['draft', 'scheduled', 'sending']);
  if (recent || waiting) return { ...out, idle: 'a campaign was made in the last 7 days or is waiting' };

  // Only worth writing if someone can receive it.
  const { count: audience } = await sb.from('contacts').select('id', { count: 'exact', head: true }).eq('marketing_consent', true).is('unsubscribed_at', null).is('suppressed_reason', null).not('email', 'is', null);
  if (!audience) return { ...out, idle: 'no subscribed contacts yet' };

  const { data: used } = await sb.from('email_campaigns').select('theme').not('theme', 'is', null).neq('status', 'cancelled');
  const usedSet = new Set((used || []).map((u) => u.theme));
  const theme = themeFor().find((t) => !usedSet.has(t.id));
  if (!theme) return { ...out, idle: 'no new theme right now' };
  if (Date.now() > opts.deadline - 45_000) return { ...out, idle: 'not enough time left this run' };
  const c = await createCampaignFromTheme(theme, mode);
  return { ...out, created: { id: c.id, theme: theme.id, status: c.status } };
}
