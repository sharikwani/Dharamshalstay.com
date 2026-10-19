/**
 * Curiosity series: post formats built to be shared, saved and commented on, mostly by people who
 * live in or love Dharamshala. Each series has a mood (the feeling the slides should leave), a
 * slide recipe and a share trigger. Facts still come only from our own guides and data.
 */
import { blogPosts, NOINDEX_POSTS } from '@/data/blog';
import { destinations } from '@/data/destinations';
import { monasteries } from '@/data/monasteries';
import { treks } from '@/data/treks';
import { photoCredits } from '@/data/photo-credits';
import { PLACE_IMAGE_KEYS, placeImageAlt, type PlaceImageKey } from '@/lib/place-images';

export type SeriesId = 'hidden' | 'didyouknow' | 'guess' | 'locals' | 'scale' | 'stillness';

export type Series = {
  id: SeriesId;
  name: string;
  /** The feeling the post should leave. */
  mood: string;
  /** How the slides are built. */
  recipe: string;
  /** Why someone sends it on, and the comment it asks for. */
  share: string;
  format: 'single' | 'carousel';
};

export const SERIES: Series[] = [
  {
    id: 'hidden', name: 'Hidden Dharamshala', format: 'carousel',
    mood: 'Quiet luxury and wonder: the feeling of being let in on something most visitors walk past.',
    recipe: 'Cover: a curiosity gap that names the feeling but not the answer (e.g. "Most visitors walk right past this"). Slide 2 reveals the place. Then 2-3 slides of what makes it special and when it is at its best, from the source. Last: cta.',
    share: 'Caption ends by asking locals to name another spot most visitors miss, and invites people to send it to the friend they would take there.',
  },
  {
    id: 'didyouknow', name: 'Did you know?', format: 'carousel',
    mood: 'Pride and surprise: a fact that makes people who live here say "I did not know that" and want to tell someone.',
    recipe: 'First pick the single most surprising fact in the source: a number, an origin, a first, a contrast, something hidden in plain sight, something that changed. Not a description anyone could guess ("it has a golden statue" is not surprising). Cover: the surprising part as a question or a half-told fact. Slide 2 ("fact" style): the fact itself in one big line. Then 1-3 slides of context from the source. Last: cta.',
    share: 'Caption asks "Did you know this?" with a yes/no answer that is easy to comment, and suggests sending it to the family group.',
  },
  {
    id: 'guess', name: 'Guess the place', format: 'carousel',
    mood: 'Playful and welcoming: a small game for people who know the valley.',
    recipe: 'Cover: "Guess where this is" with a short clue, no place name anywhere on the cover. Slide 2 ("question" style): one more clue and "Comment your guess before you swipe". Slide 3 ("fact" style): the answer. Then 1-2 slides about the place. Last: cta.',
    share: 'Caption opens with the clue, asks for guesses in the comments before swiping, and never names the place in its first two lines.',
  },
  {
    id: 'locals', name: 'Only locals know', format: 'carousel',
    mood: 'Warm and welcoming, like advice from a friend who grew up here.',
    recipe: 'Cover: the insider promise (e.g. "What locals do differently at Triund"). Then 3-4 "tip" slides of practical, specific know-how from the source. Last: cta.',
    share: 'Caption asks locals to add their own tip in the comments, and asks visitors to save it for the trip.',
  },
  {
    id: 'scale', name: 'The scale of it', format: 'carousel',
    mood: 'Overwhelming and a little intimidating: the size, height, cold or age of the place, told calmly so it lands harder.',
    recipe: 'Cover: one number or contrast that sounds hard to believe, if the source has it. Slide 2 ("fact" style): the number with what it means. Then 1-3 slides that put it in human terms. Last: cta.',
    share: 'Caption asks who would actually do it or go there, and to tag the friend who would say yes.',
  },
  {
    id: 'stillness', name: 'Quiet hours', format: 'carousel',
    mood: 'Peace: slow, spacious and calm. Few words, lots of air.',
    recipe: 'Cover: a short, calm line about the place and the hour it is most peaceful (only if the source supports the timing). Then 2-4 quiet slides, each a different photo of the place or nearby (a view, a path, a detail), with one short calm line each. Last: cta.',
    share: 'Caption is short and quiet, invites people to save it for a slow morning, and asks where they go to feel calm here.',
  },
];

export const seriesById = (id: string) => SERIES.find((s) => s.id === id);

const GENERIC = new Set(['temple', 'lake', 'valley', 'town', 'hero', 'trek', 'pass', 'road', 'mountain', 'monastery', 'church', 'stadium', 'airport', 'fort', 'waterfall', 'dharamshala', 'kangra', 'tibetan', 'snow', 'cafe', 'painting', 'ceremony', 'monks', 'flags', 'train', 'park', 'tea']);

/** Words that name a place in our text, from its image key (e.g. "bhagsu-waterfall" -> bhagsu). */
export function placeTerms(key: string): string[] {
  const words = key.split('-').filter((w) => w.length > 3 && !GENERIC.has(w));
  return words.length ? words : key.split('-').filter((w) => w.length > 3);
}

const plain = (md: string) => md.replace(/```[\s\S]*?```/g, '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[#*_>|]/g, '');

/**
 * Everything our own pages say about a place: matching paragraphs from guides, and the matching
 * monastery, trek and destination entries. Returns the text and the guide that says the most.
 */
export function placeSource(key: string, max = 7000): { text: string; guideSlug?: string } {
  const terms = placeTerms(key).map((t) => t.toLowerCase());
  if (!terms.length) return { text: '' };
  const hit = (s: string) => terms.some((t) => s.toLowerCase().includes(t));
  const parts: string[] = [];
  for (const m of monasteries) if (hit(m.name + ' ' + (m.aka || '') + ' ' + m.id)) parts.push(`MONASTERY ${m.name}: ${m.about} See: ${m.see.join('; ')}. Visit: ${m.visit}`);
  for (const t of treks) if (hit(t.name + ' ' + t.slug)) parts.push(`TREK ${t.name}: ${t.distance}, max altitude ${t.max_altitude}, ${t.difficulty}, best ${t.best_season}. ${t.description}`);
  for (const d of destinations) if (hit(d.name + ' ' + d.slug)) parts.push(`PLACE ${d.name} (${d.altitude}): ${d.description} ${d.long_description || ''}`);

  let best: { slug: string; n: number } | undefined;
  const paras: string[] = [];
  for (const p of blogPosts) {
    if (NOINDEX_POSTS.includes(p.slug)) continue;
    const body = plain(String(p.content || ''));
    const found = body.split(/\n{2,}/).filter((para) => hit(para) && para.length > 60);
    if (!found.length) continue;
    if (!best || found.length > best.n) best = { slug: p.slug, n: found.length };
    paras.push(...found.slice(0, 4).map((f) => `GUIDE "${p.title}": ${f.trim()}`));
  }
  const text = [...parts, ...paras].join('\n\n').slice(0, max);
  return { text, guideSlug: best?.slug };
}

/** Places we have a licensed photo and enough text for. */
export function seriesPlaces(): PlaceImageKey[] {
  return PLACE_IMAGE_KEYS.filter((k) => !!photoCredits[k] && placeSource(k, 400).text.length >= 200);
}

export const placeName = (k: string) => placeImageAlt(k as PlaceImageKey);
