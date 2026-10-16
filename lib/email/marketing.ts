/**
 * AI marketing emails. ChatGPT writes the copy as structured JSON; it may only pick photos and links
 * from catalogs we give it and only state facts from our verified facts list. Our layout builds the HTML,
 * so a campaign always looks on-brand and can never contain broken images, foreign links or raw HTML.
 */
import { serviceClient } from '@/lib/server-auth';
import { blogPosts, NOINDEX_POSTS } from '@/data/blog';
import { facts } from '@/data/facts';
import { travelUpdates } from '@/data/travel-updates';
import { festiveCampaigns } from '@/data/festive';
import { PLACE_IMAGE_KEYS, placeImage, placeImageAlt } from '@/lib/place-images';
import type { Block, EmailDoc, Photo } from './layout';
import { deliver } from './send';

export type CampaignContent = {
  kicker?: string; heading: string; intro: string;
  sections: { title: string; text: string; image: string; link: string; cta?: string }[];
  cta: { label: string; link: string };
  ps?: string;
  hero?: string;
};
export type Campaign = { id: string; name: string; theme: string | null; subject: string; preheader: string | null; content: CampaignContent; segment: { interests?: string[]; language?: string }; status: string };

// ───────────── Catalogs the AI may choose from ─────────────

type ImageItem = { id: string; src: string; alt: string };
type LinkItem = { path: string; label: string };

export async function catalogs() {
  const images: ImageItem[] = PLACE_IMAGE_KEYS.map((k) => ({ id: 'place:' + k, src: placeImage(k), alt: placeImageAlt(k) }));
  const links: LinkItem[] = [
    { path: '/hotels', label: 'All stays with direct rates' },
    { path: '/hotels/near-dalai-lama-temple', label: 'Hotels near the Dalai Lama Temple' },
    { path: '/hotels/mountain-view', label: 'Mountain-view hotels' },
    { path: '/hotels/hostels', label: 'Hostels' },
    { path: '/taxi', label: 'Taxis at fixed prices' },
    { path: '/treks', label: 'Treks with local guides' },
    { path: '/paragliding', label: 'Paragliding in Bir Billing' },
    { path: '/monasteries-meditation', label: 'Monasteries and meditation' },
    { path: '/travel-updates', label: 'Latest travel updates' },
  ];
  const posts = blogPosts.filter((p) => !NOINDEX_POSTS.includes(p.slug))
    .sort((a, b) => String(b.updated_at || b.published_at).localeCompare(String(a.updated_at || a.published_at)));
  for (const p of posts.slice(0, 60)) links.push({ path: '/blog/' + p.slug, label: p.title });

  try {
    const { data } = await serviceClient().from('properties').select('id,name,slug,images,locality,price_min,rating,review_count')
      .eq('status', 'published').order('priority_score', { ascending: false, nullsFirst: false }).limit(40);
    for (const h of data || []) {
      const imgs: any[] = Array.isArray(h.images) ? h.images : [];
      const main = imgs.find((i) => i?.is_primary) || imgs[0];
      if (main?.url && /^https:\/\//.test(main.url)) images.push({ id: 'hotel:' + h.slug, src: main.url, alt: main.alt || h.name });
      links.push({ path: '/hotels/' + h.slug, label: `${h.name}${h.locality ? ' (' + h.locality + ')' : ''}${h.price_min ? ', from Rs ' + h.price_min : ''}` });
    }
  } catch (e) { console.error('marketing catalog: hotels failed', e); }
  return { images, links };
}

function factsBrief(): string {
  const f = facts.map((x) => `- ${x.question} ${x.answer} (checked ${x.verified})`).join('\n');
  const u = travelUpdates.map((x) => `- ${x.date}: ${x.title}. ${x.body}`).join('\n');
  const fest = festiveCampaigns.map((c) => `- ${c.id} (${c.from} to ${c.to}): ${c.text.en}`).join('\n');
  return `VERIFIED FACTS (only state facts from here; never invent prices, dates, distances or opening hours):\n${f}\n\nTRAVEL UPDATES:\n${u}\n\nFESTIVE CAMPAIGNS:\n${fest}`;
}

const SYSTEM = `You write marketing emails for Dharamshala Stay (dharamshalastay.com), a local travel and hotel guide run from Khaniyara, Dharamshala, Himachal Pradesh. The site sells hotel and homestay bookings with direct rates, fixed-price taxis, guided treks and paragliding.

Goal: make the reader want to visit Dharamshala/McLeod Ganj and book through our website. Paint vivid, specific pictures (mountain light on the Dhauladhar, butter tea and momos, prayer flags, the walk up to Triund) and give one clear reason to book now.

Rules:
- Warm, confident, never pushy or spammy. No ALL CAPS, no "!!!", no fake urgency, no invented discounts or prices. No words like "free", "guaranteed", "act now", "limited time" in the subject.
- Only state facts from the VERIFIED FACTS list. If unsure, leave it out.
- British/Indian English spelling. Short paragraphs (2-3 sentences).
- Subject: under 55 characters, specific and curiosity-led. Preheader: under 90 characters, complements the subject.
- 2 to 4 sections. Each section must use an image id and a link path chosen EXACTLY from the catalogs provided.
- Do not include greetings or sign-offs (we add them), and no HTML or markdown except **bold** for 1-3 key phrases.
Return only JSON matching the schema.`;

const SCHEMA = {
  name: 'campaign', strict: true,
  schema: {
    type: 'object', additionalProperties: false,
    required: ['subject', 'preheader', 'kicker', 'heading', 'intro', 'hero', 'sections', 'cta', 'ps'],
    properties: {
      subject: { type: 'string' }, preheader: { type: 'string' }, kicker: { type: 'string' }, heading: { type: 'string' },
      intro: { type: 'string' }, hero: { type: 'string', description: 'image id for the top photo' },
      sections: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['title', 'text', 'image', 'link', 'cta'], properties: { title: { type: 'string' }, text: { type: 'string' }, image: { type: 'string' }, link: { type: 'string' }, cta: { type: 'string' } } } },
      cta: { type: 'object', additionalProperties: false, required: ['label', 'link'], properties: { label: { type: 'string' }, link: { type: 'string' } } },
      ps: { type: 'string' },
    },
  },
};

export type Draft = { subject: string; preheader: string; content: CampaignContent };

/** Ask ChatGPT for a campaign, then keep only valid images/links. Throws if the result is unusable. */
export async function writeCampaign(brief: string): Promise<Draft> {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set');
  const { images, links } = await catalogs();
  const today = new Date().toISOString().slice(0, 10);
  const user = `Today is ${today}.\nBRIEF: ${brief}\n\n${factsBrief()}\n\nIMAGE CATALOG (id: description):\n${images.map((i) => `${i.id}: ${i.alt}`).join('\n')}\n\nLINK CATALOG (path: page):\n${links.map((l) => `${l.path}: ${l.label}`).join('\n')}`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST', signal: AbortSignal.timeout(45000),
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_MARKETING_MODEL || process.env.OPENAI_CHAT_MODEL || 'gpt-4.1', temperature: 0.8, max_tokens: 1800,
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: user }],
      response_format: { type: 'json_schema', json_schema: SCHEMA },
    }),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${data?.error?.message || 'error'}`);
  const raw = JSON.parse(data?.choices?.[0]?.message?.content || '{}');
  return sanitizeDraft(raw, images.map((i) => i.id), links.map((l) => l.path));
}

const clip = (s: unknown, n: number) => String(s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, n);

export function sanitizeDraft(raw: any, imageIds: string[], linkPaths: string[]): Draft {
  const imgOk = (id: string) => imageIds.includes(id);
  const linkOk = (p: string) => linkPaths.includes(p);
  const sections = (Array.isArray(raw?.sections) ? raw.sections : [])
    .map((s: any) => ({ title: clip(s.title, 80), text: clip(s.text, 600), image: String(s.image || ''), link: String(s.link || ''), cta: clip(s.cta, 40) }))
    .filter((s: any) => s.title && s.text && imgOk(s.image) && linkOk(s.link))
    .slice(0, 4);
  const subject = clip(raw?.subject, 70);
  if (!subject || sections.length < 2) throw new Error('AI campaign was missing a subject or valid sections');
  const ctaLink = linkOk(raw?.cta?.link) ? raw.cta.link : '/hotels';
  return {
    subject,
    preheader: clip(raw?.preheader, 110),
    content: {
      kicker: clip(raw?.kicker, 40), heading: clip(raw?.heading, 90) || subject, intro: clip(raw?.intro, 700),
      hero: imgOk(raw?.hero) ? raw.hero : sections[0].image,
      sections, cta: { label: clip(raw?.cta?.label, 40) || 'Plan your trip', link: ctaLink }, ps: clip(raw?.ps, 300),
    },
  };
}

// ───────────── Build the email ─────────────

async function imageMap(): Promise<Map<string, Photo>> {
  const { images } = await catalogs();
  return new Map(images.map((i) => [i.id, { src: i.src, alt: i.alt }]));
}

export async function campaignDoc(c: Pick<Campaign, 'subject' | 'preheader' | 'content'>, firstName?: string | null, imgs?: Map<string, Photo>): Promise<EmailDoc> {
  const map = imgs || (await imageMap());
  const k = c.content;
  const blocks: Block[] = [{ type: 'p', text: k.intro }];
  for (const s of k.sections) {
    const photo = map.get(s.image);
    blocks.push(photo
      ? { type: 'feature', photo: { ...photo, href: s.link }, title: s.title, text: s.text, cta: { label: s.cta || 'Take a look', href: s.link } }
      : { type: 'p', text: `**${s.title}.** ${s.text} [${s.cta || 'Take a look'}](${s.link})` });
  }
  blocks.push({ type: 'button', label: k.cta.label, href: k.cta.link, secondary: { label: 'Ask us on WhatsApp', href: 'https://wa.me/19295255894?text=' + encodeURIComponent('Hi! I saw your email: ' + c.subject) } });
  if (k.ps) blocks.push({ type: 'small', text: 'P.S. ' + k.ps });
  return {
    preheader: c.preheader || undefined, kicker: k.kicker, heading: k.heading, hero: k.hero ? map.get(k.hero) : undefined,
    greeting: firstName ? `Hi ${firstName},` : 'Hi there,', blocks, footer: { kind: 'marketing' },
  };
}

// ───────────── Recipients and sending ─────────────

export async function recipients(c: Campaign, limit: number): Promise<{ id: string; email: string; name: string | null }[]> {
  const sb = serviceClient();
  const { data: settings } = await sb.from('email_settings').select('max_marketing_per_week').eq('id', 1).maybeSingle();
  const perWeek = Math.max(1, Number(settings?.max_marketing_per_week || 1));
  const gap = new Date(Date.now() - (7 / perWeek) * 86400e3).toISOString();
  let q = sb.from('contacts').select('id,email,name').eq('marketing_consent', true).is('unsubscribed_at', null).is('suppressed_reason', null)
    .not('email', 'is', null).or(`last_marketing_at.is.null,last_marketing_at.lt.${gap}`).order('created_at').limit(limit * 3);
  if (c.segment?.language) q = q.eq('language', c.segment.language);
  if (c.segment?.interests?.length) q = q.overlaps('interests', c.segment.interests);
  const { data } = await q;
  if (!data?.length) return [];
  const { data: done } = await sb.from('email_messages').select('contact_id').eq('campaign_id', c.id).in('contact_id', data.map((d) => d.id));
  const sent = new Set((done || []).map((d) => d.contact_id));
  return (data as any[]).filter((d) => !sent.has(d.id)).slice(0, limit);
}

/** Send the next slice of a campaign. Returns how many went out and whether anyone is left. */
export async function sendCampaignSlice(c: Campaign, opts: { deadline: number; max?: number }): Promise<{ sent: number; done: boolean }> {
  const sb = serviceClient();
  const list = await recipients(c, opts.max ?? 150);
  if (!list.length) return { sent: 0, done: true };
  const imgs = await imageMap();
  let sent = 0;
  for (const r of list) {
    if (Date.now() > opts.deadline) return { sent, done: false };
    const doc = await campaignDoc(c, (r.name || '').split(/\s+/)[0] || null, imgs);
    const res = await deliver({ to: r.email, subject: c.subject, doc, kind: 'marketing', template: 'campaign', campaignId: c.id });
    // Mark the contact even on a skip, so a bad address can't block the queue.
    await sb.from('contacts').update({ last_marketing_at: new Date().toISOString() }).eq('id', r.id);
    if (res.ok) sent++;
    await new Promise((ok) => setTimeout(ok, 550)); // stay under Resend's 2 requests/second
  }
  await sb.from('email_campaigns').update({ recipients: (await sb.from('email_messages').select('id', { count: 'exact', head: true }).eq('campaign_id', c.id).eq('kind', 'marketing').neq('status', 'skipped')).count || 0, updated_at: new Date().toISOString() }).eq('id', c.id);
  return { sent, done: list.length < (opts.max ?? 150) && Date.now() <= opts.deadline };
}

/** A copy to the admin (or any address) without consent checks: used for "send test". */
export async function sendTest(c: Campaign, to: string) {
  const doc = await campaignDoc(c, null);
  return deliver({ to, subject: '[TEST] ' + c.subject, doc: { ...doc, footer: { kind: 'admin' } }, kind: 'admin', template: 'campaign_test', campaignId: c.id });
}
