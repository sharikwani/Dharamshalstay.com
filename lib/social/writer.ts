/**
 * AI social posts. ChatGPT plans the slides and writes the caption and hashtags, using only our own
 * guide text and verified facts, and only our own licensed photos (each credited in the caption, as
 * CC BY / BY-SA require). Slides are rendered by /social/card.jpg in the brand design.
 */
import { blogPosts, NOINDEX_POSTS } from '@/data/blog';
import { facts } from '@/data/facts';
import { festiveCampaigns } from '@/data/festive';
import { photoCredits } from '@/data/photo-credits';
import { PLACE_IMAGE_KEYS, placeImageAlt, type PlaceImageKey } from '@/lib/place-images';
import { siteConfig } from '@/lib/config';

export type SlideStyle = 'cover' | 'tip' | 'cta';
export type Slide = { style: SlideStyle; image?: string; kicker?: string; title: string; body?: string };
export type SocialDraft = {
  topic: string; theme: string; format: 'single' | 'carousel'; slides: Slide[];
  caption: string; hashtags: string[]; alt_text: string; credits: string; link: string;
};
export type Brief = { theme: string; topic: string; guideSlug?: string; format?: 'single' | 'carousel'; notes?: string };

const SITE = () => siteConfig.url.replace(/\/$/, '');

/** Public JPEG URL of one slide (what Instagram downloads). */
export function slideUrl(s: Slide, i: number, n: number): string {
  const q = new URLSearchParams({ s: s.style, t: s.title });
  if (s.image) q.set('img', s.image);
  if (s.kicker) q.set('k', s.kicker);
  if (s.body) q.set('b', s.body);
  if (n > 1) { q.set('n', String(i + 1)); q.set('of', String(n)); }
  return `${SITE()}/social/card.jpg?${q.toString()}`;
}

/** "📷 Photos: Author (CC BY-SA 4.0), ... via Wikimedia Commons" for the images used. */
export function creditsFor(slides: Slide[]): string {
  const keys = Array.from(new Set(slides.map((s) => s.image).filter((k): k is string => !!k && !!photoCredits[k])));
  if (!keys.length) return '';
  const parts = keys.map((k) => `${photoCredits[k].author.replace(/\s*\(.*?\)\s*/g, ' ').trim()} (${photoCredits[k].license})`);
  return `📷 ${keys.length > 1 ? 'Photos' : 'Photo'}: ${parts.join(', ')} via Wikimedia Commons, adapted.`;
}

const PLACE_KEYS = PLACE_IMAGE_KEYS.filter((k) => !!photoCredits[k]);

/** Topics the planner rotates through. Guides give endless, accurate carousels. */
export function topicIdeas(today = new Date().toISOString().slice(0, 10)): Brief[] {
  const ideas: Brief[] = [];
  for (const c of festiveCampaigns) if (today >= c.from && today <= c.to) ideas.push({ theme: `festival:${c.id}`, topic: c.text.en, guideSlug: c.guide.href.replace('/blog/', '') });
  const posts = blogPosts.filter((p) => !NOINDEX_POSTS.includes(p.slug));
  for (const p of posts) ideas.push({ theme: `guide:${p.slug}`, topic: p.title, guideSlug: p.slug });
  for (const k of PLACE_KEYS) ideas.push({ theme: `place:${k}`, topic: `Place spotlight: ${placeImageAlt(k as PlaceImageKey)}`, format: 'single' });
  return ideas;
}

const SYSTEM = `You are the social media team of Dharamshala Stay (@thedharamshalastay), a local travel and hotel guide run from Khaniyara, Dharamshala, Himachal Pradesh. Tagline: "Your home in the Himalayas". We help travellers book stays, taxis, treks and paragliding in Dharamshala and McLeod Ganj.

Write ONE Instagram/Facebook post that people save and share, and that grows followers who later book with us.

Content rules:
- Use only facts from the SOURCE text and VERIFIED FACTS. Never invent prices, timings, distances or rules. If unsure, leave it out.
- Slide 1 (style "cover") is the hook: a short, specific, curiosity title (max 48 characters), e.g. "5 things to know before Triund" or "McLeod Ganj's quietest sunrise spot". Kicker max 2-3 words.
- Middle slides (style "tip"): one useful point each: title max 40 characters, body max 130 characters, concrete and practical.
- Last slide (style "cta"): title like "Plan your <topic> trip", body max 70 characters about stays, taxis or treks with local experts.
- Carousel: 5 to 7 slides. Single: just one "cover" slide.
- Every cover/tip slide uses an image id from the IMAGE CATALOG that fits its text. Do not repeat an image if you can avoid it.
- Caption: first line is a scroll-stopping hook (no hashtags), then 3-6 short lines with line breaks and a few relevant emojis, then a question that invites comments, then a call to action: "Save this for your trip" and "Plan and book through the link in bio". 600-1100 characters. Indian English. No ALL CAPS, no fake urgency, no prices unless in the source.
- Hashtags: 12-15, no "#" in the array items, a mix of broad (himachal, incredibleindia), mid (mcleodganj, dharamshala, triund), and niche/location tags (dharamkot, bhagsunag, dhauladhar). Lowercase, no spaces, no banned or spammy tags (no follow4follow, like4like).
- alt_text: one plain sentence describing the cover image for visually impaired users.
Return only JSON matching the schema.`;

const SCHEMA = {
  name: 'social_post', strict: true,
  schema: {
    type: 'object', additionalProperties: false, required: ['slides', 'caption', 'hashtags', 'alt_text'],
    properties: {
      slides: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['style', 'image', 'kicker', 'title', 'body'],
        properties: { style: { type: 'string', enum: ['cover', 'tip', 'cta'] }, image: { type: 'string' }, kicker: { type: 'string' }, title: { type: 'string' }, body: { type: 'string' } } } },
      caption: { type: 'string' }, hashtags: { type: 'array', items: { type: 'string' } }, alt_text: { type: 'string' },
    },
  },
};

const clip = (s: unknown, n: number) => String(s ?? '').replace(/<[^>]*>/g, '').replace(/[ \t]+/g, ' ').trim().slice(0, n);
const plain = (md: string) => md.replace(/```[\s\S]*?```/g, '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[#*_>|]/g, '').replace(/\n{3,}/g, '\n\n');

export function sanitize(raw: any, brief: Brief): Omit<SocialDraft, 'topic' | 'theme' | 'credits' | 'link'> {
  const format = brief.format === 'single' ? 'single' : 'carousel';
  let slides: Slide[] = (Array.isArray(raw?.slides) ? raw.slides : []).map((s: any) => ({
    style: (['cover', 'tip', 'cta'].includes(s?.style) ? s.style : 'tip') as SlideStyle,
    image: PLACE_KEYS.includes(s?.image) ? s.image : undefined,
    kicker: clip(s?.kicker, 30) || undefined, title: clip(s?.title, 70), body: clip(s?.body, 180) || undefined,
  })).filter((s: Slide) => s.title);
  for (const s of slides) if (s.style !== 'cta' && !s.image) s.image = 'dhauladhar-hero';
  if (format === 'single') slides = slides.filter((s) => s.style === 'cover').slice(0, 1);
  else {
    const cover = slides.find((s) => s.style === 'cover');
    const tips = slides.filter((s) => s.style === 'tip').slice(0, 5);
    const cta = slides.find((s) => s.style === 'cta');
    slides = [cover, ...tips, cta].filter(Boolean) as Slide[];
  }
  if (!slides.length || slides[0].style !== 'cover' || (format === 'carousel' && slides.length < 3)) throw new Error('AI post was missing a cover or enough slides');
  const hashtags = Array.from(new Set((Array.isArray(raw?.hashtags) ? raw.hashtags : [])
    .map((h: any) => String(h).toLowerCase().replace(/[^a-z0-9_]/g, '')).filter((h: string) => h.length > 2 && h.length < 40))).slice(0, 15) as string[];
  const caption = String(raw?.caption || '').replace(/#[\w]+/g, '').replace(/[ \t]+\n/g, '\n').trim().slice(0, 1800);
  if (caption.length < 80) throw new Error('AI caption too short');
  return { format, slides, caption, hashtags, alt_text: clip(raw?.alt_text, 200) };
}

export async function writePost(brief: Brief): Promise<SocialDraft> {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set');
  const guide = brief.guideSlug ? blogPosts.find((p) => p.slug === brief.guideSlug) : undefined;
  const source = guide ? `GUIDE "${guide.title}":\n${plain(String(guide.content || '')).slice(0, 7000)}\n\nGUIDE FAQS:\n${(guide.faqs || []).map((f: any) => `Q: ${f.question} A: ${f.answer}`).join('\n').slice(0, 2000)}` : '';
  const verified = facts.map((f) => `- ${f.question} ${f.answer}`).join('\n');
  const catalog = PLACE_KEYS.map((k) => `${k}: ${placeImageAlt(k as PlaceImageKey)}`).join('\n');
  const user = `TOPIC: ${brief.topic}\nFORMAT: ${brief.format === 'single' ? 'single (one cover slide)' : 'carousel'}\n${brief.notes ? 'NOTES: ' + brief.notes + '\n' : ''}\nSOURCE:\n${source || '(no guide; use verified facts and the image descriptions)'}\n\nVERIFIED FACTS:\n${verified}\n\nIMAGE CATALOG (id: description):\n${catalog}`;

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
  const out = sanitize(JSON.parse(data?.choices?.[0]?.message?.content || '{}'), brief);
  return { ...out, topic: brief.topic, theme: brief.theme, credits: creditsFor(out.slides), link: guide ? `/blog/${guide.slug}` : '/hotels' };
}

/** Caption as published: text, credit line, hashtags (Instagram) or link (Facebook). */
export function fullCaption(p: { caption: string; hashtags: string[]; credits?: string | null; link?: string | null }, platform: 'instagram' | 'facebook'): string {
  const tags = p.hashtags.length ? '\n\n' + p.hashtags.map((h) => '#' + h).join(' ') : '';
  const link = p.link ? (platform === 'facebook' ? `\n\n👉 ${SITE()}${p.link}` : '') : '';
  const credits = p.credits ? `\n\n${p.credits}` : '';
  return (p.caption + link + credits + tags).slice(0, 2200);
}
