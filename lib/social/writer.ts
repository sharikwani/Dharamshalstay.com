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
import { placeName, placeSource, SERIES, seriesById, seriesPlaces, type SeriesId } from './series';

/** cover: the hook; tip: photo + point; fact: one big line on dark; question: a prompt to comment; cta: the brand card. */
export type SlideStyle = 'cover' | 'tip' | 'fact' | 'question' | 'cta';
const STYLES: SlideStyle[] = ['cover', 'tip', 'fact', 'question', 'cta'];
export type Slide = { style: SlideStyle; image?: string; kicker?: string; title: string; body?: string };
export type SocialDraft = {
  topic: string; theme: string; format: 'single' | 'carousel'; slides: Slide[];
  caption: string; hashtags: string[]; alt_text: string; credits: string; link: string;
};
export type Brief = { theme: string; topic: string; guideSlug?: string; format?: 'single' | 'carousel'; notes?: string; series?: SeriesId; placeKey?: string };

/** Instagram allows at most 5 hashtags per post (since late 2025); more can stop the post. */
export const MAX_HASHTAGS = 5;

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
  for (const k of PLACE_KEYS) ideas.push({ theme: `place:${k}`, topic: `Place spotlight: ${placeImageAlt(k as PlaceImageKey)}` });
  return [...ideas, ...seriesIdeas()];
}

/** Every curiosity series for every place we can write about truthfully. */
export function seriesIdeas(): Brief[] {
  const places = seriesPlaces();
  return SERIES.flatMap((s) => places.map((k) => ({ theme: `series:${s.id}:${k}`, topic: `${s.name}: ${placeName(k)}`, series: s.id, placeKey: k, format: s.format })));
}

const SYSTEM = `You are the social media team of Dharamshala Stay (@thedharamshalastay), a local travel and hotel guide run from Khaniyara, Dharamshala, Himachal Pradesh. Tagline: "Your home in the Himalayas". We help travellers book stays, taxis, treks and paragliding in Dharamshala and McLeod Ganj.

The brand feels like a luxury mountain retreat: calm, confident, a little awe-struck by the Dhauladhar, warm to every guest. Never loud, never salesy. Write ONE Instagram/Facebook post that people who live in Dharamshala want to share, and that visitors save.

What makes it shared:
- Curiosity first. The cover opens a gap the reader needs to close: a hidden detail, a surprising fact, a question, a guess. Never give the answer on the cover.
- Local pride. Write so a person from Dharamshala thinks "people should know this about my home" and sends it on.
- One easy comment. End the caption with one specific question that takes a few words to answer (a guess, a yes or no, "name another spot"). No generic "What do you think?".
- Feel, then inform. Each post has one mood (given in SERIES MOOD when present): luxury and wonder, overwhelming scale, deep peace, or a warm welcome. Choose words for that feeling.

Truth rules (never break these):
- Use only facts from the SOURCE text and VERIFIED FACTS. Never invent prices, timings, distances, heights, dates, legends or rules. If unsure, leave it out.
- Never call a famous place "secret" or "unknown". Say "most visitors miss" or "few people know" only when the source supports it (it is off the main route, or the fact is genuinely little known).
- No superlatives you cannot back up ("the best", "the highest") unless the source says so.

Slides:
- style "cover": hook title max 48 characters; kicker 1-3 words (the series name works well); body optional, max 90 characters.
- style "tip": one point: title max 40 characters, body max 130 characters, concrete.
- style "fact": the surprising fact or the answer as one big line: title max 60 characters, body max 110 characters of context.
- style "question": a prompt to comment (e.g. "Comment your guess before you swipe"): title max 50 characters, body max 90 characters.
- style "cta": last slide of a carousel: title like "Stay close to the mountains", body max 70 characters about stays, taxis or treks with local experts.
- Carousel: 4 to 7 slides, cover first, cta last. Single: one "cover" slide.
- Every slide except cta uses an image id from the IMAGE CATALOG that fits it. Use the PLACE IMAGE for the cover and the reveal when one is given. Never use the same image twice in one post: every slide gets a different image id.

Caption: first line is the hook (no hashtags, and no place name in the first two lines of a guessing game), then 3-6 short lines with line breaks and at most 3 tasteful emojis, then the comment question, then one soft line like "Save this for your next trip" or "Send this to someone who loves the mountains". 400-900 characters. Indian English. No ALL CAPS, no fake urgency, no prices unless in the source.
Hashtags: exactly 5, no "#", lowercase, no spaces: one broad (himachal or incredibleindia), two local (dharamshala, mcleodganj), two specific to the place or topic. No spammy tags.
alt_text: one plain sentence describing the cover image for visually impaired users.
Return only JSON matching the schema.`;

const SCHEMA = {
  name: 'social_post', strict: true,
  schema: {
    type: 'object', additionalProperties: false, required: ['slides', 'caption', 'hashtags', 'alt_text'],
    properties: {
      slides: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['style', 'image', 'kicker', 'title', 'body'],
        properties: { style: { type: 'string', enum: STYLES }, image: { type: 'string' }, kicker: { type: 'string' }, title: { type: 'string' }, body: { type: 'string' } } } },
      caption: { type: 'string' }, hashtags: { type: 'array', items: { type: 'string' } }, alt_text: { type: 'string' },
    },
  },
};

const clip = (s: unknown, n: number) => String(s ?? '').replace(/<[^>]*>/g, '').replace(/[ \t]+/g, ' ').trim().slice(0, n);
const plain = (md: string) => md.replace(/```[\s\S]*?```/g, '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[#*_>|]/g, '').replace(/\n{3,}/g, '\n\n');

/** Scenic views that fit any slide; used when the AI repeats a photo or gives none. */
const SCENIC = ['dhauladhar-hero', 'dharamshala-town', 'kangra-valley', 'mountain-road', 'prayer-flags', 'mcleod-ganj', 'naddi', 'dharamkot', 'dharamshala-snow'];

/** Owner's rule: no photo appears twice in a post. A repeated or missing photo becomes an unused scenic one;
 * the closing slide simply drops a repeated photo (it reads fine as a plain card). */
export function noRepeats(slides: Slide[]): void {
  const used = new Set<string>();
  const spare = () => [...SCENIC, ...PLACE_KEYS].find((k) => (PLACE_KEYS as string[]).includes(k) && !used.has(k) && !slides.some((s) => s.image === k));
  for (const s of slides) {
    if (s.image && used.has(s.image)) s.image = s.style === 'cta' ? undefined : spare();
    else if (!s.image && s.style !== 'cta') s.image = spare();
    if (s.image) used.add(s.image);
  }
}

export function sanitize(raw: any, brief: Brief): Omit<SocialDraft, 'topic' | 'theme' | 'credits' | 'link'> {
  const format = brief.format === 'single' ? 'single' : 'carousel';
  let slides: Slide[] = (Array.isArray(raw?.slides) ? raw.slides : []).map((s: any) => ({
    style: (STYLES.includes(s?.style) ? s.style : 'tip') as SlideStyle,
    image: PLACE_KEYS.includes(s?.image) ? s.image : undefined,
    kicker: clip(s?.kicker, 30) || undefined, title: clip(s?.title, 70), body: clip(s?.body, 180) || undefined,
  })).filter((s: Slide) => s.title);
  if (format === 'single') slides = slides.filter((s) => s.style === 'cover').slice(0, 1);
  else {
    // Keep the story order (a guess, then the answer); only one cover first and one cta last.
    const cover = slides.find((s) => s.style === 'cover');
    const middle = slides.filter((s) => s.style !== 'cover' && s.style !== 'cta').slice(0, 5);
    const cta = slides.find((s) => s.style === 'cta');
    slides = [cover, ...middle, cta].filter(Boolean) as Slide[];
  }
  noRepeats(slides);
  if (!slides.length || slides[0].style !== 'cover' || (format === 'carousel' && slides.length < 3)) throw new Error('AI post was missing a cover or enough slides');
  const hashtags = Array.from(new Set((Array.isArray(raw?.hashtags) ? raw.hashtags : [])
    .map((h: any) => String(h).toLowerCase().replace(/[^a-z0-9_]/g, '')).filter((h: string) => h.length > 2 && h.length < 40))).slice(0, MAX_HASHTAGS) as string[];
  const caption = String(raw?.caption || '').replace(/#[\w]+/g, '').replace(/[ \t]+\n/g, '\n').trim().slice(0, 1800);
  if (caption.length < 80) throw new Error('AI caption too short');
  return { format, slides, caption, hashtags, alt_text: clip(raw?.alt_text, 200) };
}

/**
 * Numbers in the post (heights, distances, years, counts) that appear nowhere in the source. The AI
 * may only repeat numbers it was given, so any of these means it invented or misread something.
 */
export function unsupportedNumbers(post: { slides: Slide[]; caption: string }, source: string): string[] {
  const norm = (s: string) => s.replace(/(\d),(?=\d{3}\b)/g, '$1');
  const known = new Set((norm(source).match(/\d+(?:\.\d+)?/g) || []));
  const text = norm([post.caption, ...post.slides.flatMap((s) => [s.kicker, s.title, s.body])].filter(Boolean).join(' '));
  const found = Array.from(new Set(text.match(/\d+(?:\.\d+)?/g) || []));
  // Small counts ("3 tips", "1/5") are the post's own structure, not facts.
  return found.filter((n) => Number(n) > 9 && !known.has(n));
}

export async function writePost(brief: Brief): Promise<SocialDraft> {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set');
  const series = brief.series ? seriesById(brief.series) : undefined;
  const place = brief.placeKey ? placeSource(brief.placeKey) : undefined;
  const guideSlug = brief.guideSlug || place?.guideSlug;
  const guide = guideSlug ? blogPosts.find((p) => p.slug === guideSlug) : undefined;
  const source = place?.text ? `ABOUT ${placeName(brief.placeKey!)} (from our pages):\n${place.text}` : guide ? `GUIDE "${guide.title}":\n${plain(String(guide.content || '')).slice(0, 7000)}\n\nGUIDE FAQS:\n${(guide.faqs || []).map((f: any) => `Q: ${f.question} A: ${f.answer}`).join('\n').slice(0, 2000)}` : '';
  const verified = facts.map((f) => `- ${f.question} ${f.answer}`).join('\n');
  const catalog = PLACE_KEYS.map((k) => `${k}: ${placeImageAlt(k as PlaceImageKey)}`).join('\n');
  const seriesText = series ? `SERIES: ${series.name}\nSERIES MOOD: ${series.mood}\nSLIDE RECIPE: ${series.recipe}\nSHARE TRIGGER: ${series.share}\n` : '';
  const placeText = brief.placeKey ? `PLACE IMAGE: ${brief.placeKey} (${placeName(brief.placeKey)})\n` : '';
  const user = `TOPIC: ${brief.topic}\nFORMAT: ${brief.format === 'single' ? 'single (one cover slide)' : 'carousel'}\n${seriesText}${placeText}${brief.notes ? 'NOTES: ' + brief.notes + '\n' : ''}\nSOURCE:\n${source || '(no guide; use verified facts and the image descriptions)'}\n\nVERIFIED FACTS:\n${verified}\n\nIMAGE CATALOG (id: description):\n${catalog}`;

  const ask = async (messages: { role: string; content: string }[]) => {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal: AbortSignal.timeout(45000),
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MARKETING_MODEL || process.env.OPENAI_CHAT_MODEL || 'gpt-4.1', temperature: 0.8, max_tokens: 2000,
        messages, response_format: { type: 'json_schema', json_schema: SCHEMA },
      }),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${data?.error?.message || 'error'}`);
    return String(data?.choices?.[0]?.message?.content || '{}');
  };
  const messages = [{ role: 'system', content: SYSTEM }, { role: 'user', content: user }];
  let reply = await ask(messages);
  let out = sanitize(JSON.parse(reply), brief);
  // Every number must come from what we gave it; one retry with the offending numbers named.
  const allSource = source + '\n' + verified;
  let bad = unsupportedNumbers(out, allSource);
  if (bad.length) {
    reply = await ask([...messages, { role: 'assistant', content: reply }, { role: 'user', content: `These numbers are not in the SOURCE or VERIFIED FACTS: ${bad.join(', ')}. Remove them or use the exact figures from the source. Return the whole post again.` }]);
    out = sanitize(JSON.parse(reply), brief);
    bad = unsupportedNumbers(out, allSource);
    if (bad.length) throw new Error(`AI post used numbers not in our sources (${bad.join(', ')}); not saved`);
  }
  return { ...out, topic: brief.topic, theme: brief.theme, credits: creditsFor(out.slides), link: guide ? `/blog/${guide.slug}` : '/hotels' };
}

/** Caption as published: text, credit line, hashtags (Instagram) or link (Facebook). */
export function fullCaption(p: { caption: string; hashtags: string[]; credits?: string | null; link?: string | null }, platform: 'instagram' | 'facebook'): string {
  const tags = p.hashtags.length ? '\n\n' + p.hashtags.map((h) => '#' + h).join(' ') : '';
  const link = p.link ? (platform === 'facebook' ? `\n\n👉 ${SITE()}${p.link}` : '') : '';
  const credits = p.credits ? `\n\n${p.credits}` : '';
  return (p.caption + link + credits + tags).slice(0, 2200);
}
