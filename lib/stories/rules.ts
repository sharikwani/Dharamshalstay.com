/**
 * Stories from travellers and locals (/stories): limits, validation and the pure rules shared by the
 * pages, the API and the daily pick. Safe to import in the browser.
 */
import { slugify } from '@/lib/utils';

export const MAX_STORY_PHOTOS = 5;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const PHOTO_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export const UPLOAD_BUCKET = 'story-uploads';
export const PUBLIC_BUCKET = 'story-photos';
/** How long the Story of the day stays on the homepage (and an Instagram story lasts). */
export const FEATURE_HOURS = 24;

export const LIMITS = {
  title: [8, 90], body: [150, 5000], name: [2, 60], from: [0, 60], visited: [0, 40],
  comment: [2, 500], flag: [2, 60],
} as const;

export const PLACES = [
  'McLeod Ganj', 'Dharamshala', 'Bhagsu', 'Dharamkot', 'Naddi', 'Triund', 'Kareri Lake',
  'Bir Billing', 'Palampur', 'Kangra', 'Somewhere else nearby',
] as const;

export const AUTHOR_KINDS = ['local', 'traveller'] as const;
export type AuthorKind = (typeof AUTHOR_KINDS)[number];

/** The five prayer-flag colours, in their traditional order. */
export const FLAG_COLORS = [
  { key: 'blue', label: 'Blue', means: 'sky and space', hex: '#2f6fd6' },
  { key: 'white', label: 'White', means: 'air and wind', hex: '#f4f1e8' },
  { key: 'red', label: 'Red', means: 'fire', hex: '#d63a2f' },
  { key: 'green', label: 'Green', means: 'water', hex: '#2f9e5b' },
  { key: 'yellow', label: 'Yellow', means: 'earth', hex: '#f0c419' },
] as const;
export type FlagColor = (typeof FLAG_COLORS)[number]['key'];
export const isFlagColor = (c: unknown): c is FlagColor => FLAG_COLORS.some((f) => f.key === c);

export type StoryInput = {
  title: string; body: string; place: string; visited: string;
  author_name: string; author_kind: AuthorKind; author_from: string; instagram: string | null; email: string | null;
};

const clean = (v: unknown) => String(v ?? '').replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
const len = (s: string) => Array.from(s).length;

/** "@name", "instagram.com/name/" or "name" -> "name"; null when empty; false when it is not a handle. */
export function normalizeInstagram(raw: unknown): string | null | false {
  let s = String(raw ?? '').trim();
  if (!s) return null;
  s = s.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/[/?#].*$/, '').replace(/^@/, '');
  return /^[A-Za-z0-9._]{1,30}$/.test(s) && !/^\.|\.$|\.\./.test(s) ? s.toLowerCase() : false;
}

export function parseStory(f: Record<string, unknown>): { ok: true; data: StoryInput } | { ok: false; error: string } {
  const title = clean(f.title), body = clean(f.body), name = clean(f.author_name), from = clean(f.author_from), visited = clean(f.visited);
  const place = clean(f.place), kind = clean(f.author_kind), email = clean(f.email).toLowerCase();
  if (len(title) < LIMITS.title[0]) return { ok: false, error: 'Give your story a title (at least 8 characters).' };
  if (len(title) > LIMITS.title[1]) return { ok: false, error: 'Please keep the title under 90 characters.' };
  if (len(body) < LIMITS.body[0]) return { ok: false, error: 'Tell us a little more: your story needs at least 150 characters.' };
  if (len(body) > LIMITS.body[1]) return { ok: false, error: 'Please keep your story under 5,000 characters.' };
  if (!(PLACES as readonly string[]).includes(place)) return { ok: false, error: 'Choose where your story happened.' };
  if (!(AUTHOR_KINDS as readonly string[]).includes(kind)) return { ok: false, error: 'Tell us if you are a local or a traveller.' };
  if (len(name) < LIMITS.name[0] || len(name) > LIMITS.name[1]) return { ok: false, error: 'Please add your name (2 to 60 characters).' };
  if (len(from) > LIMITS.from[1]) return { ok: false, error: 'Please keep "where you are from" short.' };
  if (len(visited) > LIMITS.visited[1]) return { ok: false, error: 'Please keep "when" short, like "March 2026".' };
  const instagram = normalizeInstagram(f.instagram);
  if (instagram === false) return { ok: false, error: 'That does not look like an Instagram username. Leave it empty if you prefer.' };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, error: 'Please check your email address, or leave it empty.' };
  if (f.consent !== 'yes' && f.consent !== true) return { ok: false, error: 'Please tick the box to say the photos are yours and we may share your story.' };
  return { ok: true, data: { title, body, place, visited, author_name: name, author_kind: kind as AuthorKind, author_from: from, instagram, email: email || null } };
}

/** Public URL of the story: readable words plus a short id so two titles never collide. */
export const storySlug = (title: string, id: string) => slugify(title, 'story').slice(0, 70).replace(/-+$/, '') + '-' + id.replace(/-/g, '').slice(0, 6);

/** Phone numbers, links and handles in a comment or flag: held for the owner (spam and touts). */
export function hasContactInfo(s: string): boolean {
  return /(https?:\/\/|www\.|\.(com|in|net|org|co)\b)/i.test(s) || /(\+?\d[\d\s-]{8,}\d)/.test(s) || /@[a-z0-9._]{3,}/i.test(s);
}

export function parseShort(kind: 'comment' | 'flag', f: Record<string, unknown>): { ok: true; name: string; text: string } | { ok: false; error: string } {
  const name = clean(f.name), text = clean(f.text).replace(/\n+/g, kind === 'flag' ? ' ' : '\n');
  const [min, max] = LIMITS[kind];
  if (len(name) < LIMITS.name[0] || len(name) > LIMITS.name[1]) return { ok: false, error: 'Please add your name.' };
  if (len(text) < min) return { ok: false, error: kind === 'flag' ? 'Write a short wish for your flag.' : 'Write a comment first.' };
  if (len(text) > max) return { ok: false, error: kind === 'flag' ? 'A flag holds up to 60 characters.' : 'Please keep comments under 500 characters.' };
  return { ok: true, name, text };
}

export type FeatureState = 'live' | 'past' | null;
export function featureState(s: { featured_at: string | null; featured_until: string | null }, now = Date.now()): FeatureState {
  if (!s.featured_at || !s.featured_until) return null;
  return Date.parse(s.featured_until) > now ? 'live' : 'past';
}

/** "14h 22m" left in the spotlight. */
export function timeLeft(until: string, now = Date.now()): string {
  const m = Math.max(0, Math.round((Date.parse(until) - now) / 60000));
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}

type Candidate = { id: string; status: string; ai_score: number | null; featured_at: string | null; created_at: string; author_kind: string };

/**
 * The story the AI suggests today: approved, never featured, best score first, oldest first on a tie.
 * It prefers the other kind of storyteller than yesterday's (local / traveller) when the scores are close.
 */
export function pickStoryOfTheDay<T extends Candidate>(stories: T[], lastKind?: string | null): T | null {
  const open = stories.filter((s) => s.status === 'approved' && !s.featured_at);
  if (!open.length) return null;
  const sorted = [...open].sort((a, b) => (b.ai_score ?? 50) - (a.ai_score ?? 50) || a.created_at.localeCompare(b.created_at));
  const best = sorted[0];
  if (lastKind && best.author_kind === lastKind) {
    const other = sorted.find((s) => s.author_kind !== lastKind && (best.ai_score ?? 50) - (s.ai_score ?? 50) <= 10);
    if (other) return other;
  }
  return best;
}

/** Midnight in India, as an ISO time, for "already suggested today?". */
export function istDayStart(now = Date.now()): string {
  const IST = 5.5 * 3600e3;
  const d = new Date(now + IST);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - IST).toISOString();
}
export const istHour = (now = Date.now()) => new Date(now + 5.5 * 3600e3).getUTCHours();

/** The first paragraph, cut at a word, for cards. */
export function excerptOf(body: string, max = 180): string {
  const p = body.split(/\n+/)[0].trim();
  if (len(p) <= max) return p;
  const cut = p.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 20)).replace(/[,;:.\s]+$/, '') + '…';
}

export function publicPhotoUrl(path: string): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL || '') + '/storage/v1/object/public/' + PUBLIC_BUCKET + '/' + path;
}

/** Country code -> flag emoji ("IN" -> 🇮🇳). */
export function countryFlag(cc: string): string {
  return /^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...Array.from(cc).map((c) => 0x1f1a5 + c.charCodeAt(0))) : '🌏';
}
