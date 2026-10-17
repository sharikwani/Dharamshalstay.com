/** Stories: database and storage access (service role, server only). */
import { HttpError, serviceClient } from '@/lib/server-auth';
import { PUBLIC_BUCKET, UPLOAD_BUCKET, publicPhotoUrl, type StoryInput } from './rules';

export type StoryStatus = 'pending' | 'approved' | 'rejected' | 'hidden' | 'removed';

export type StoryRow = StoryInput & {
  id: string; slug: string; status: StoryStatus; photos: string[]; consent_at: string; ip_hash: string | null; manage_token: string;
  ai_score: number | null; ai_notes: string | null; ai_flags: string[]; ai_caption: string | null; ai_screened_at: string | null;
  proposed_at: string | null; featured_at: string | null; featured_until: string | null;
  ig_story_id: string | null; ig_attempts: number; ig_error: string | null;
  views: number; likes: number; comments: number; flags: number;
  approved_at: string | null; created_at: string; updated_at: string;
};

/** What the public pages may see (no email, IP hash, token or AI notes). */
export type PublicStory = Pick<StoryRow,
  'id' | 'slug' | 'title' | 'body' | 'place' | 'visited' | 'author_name' | 'author_kind' | 'author_from' | 'instagram'
  | 'views' | 'likes' | 'comments' | 'flags' | 'featured_at' | 'featured_until' | 'approved_at' | 'created_at'> & { photos: string[] };

const PUBLIC_COLS = 'id, slug, title, body, place, visited, author_name, author_kind, author_from, instagram, photos, views, likes, comments, flags, featured_at, featured_until, approved_at, created_at';

const toPublic = (r: any): PublicStory => ({ ...r, photos: (r.photos || []).map(publicPhotoUrl) });

export function contentTypeFor(path: string): string {
  return path.endsWith('.png') ? 'image/png' : path.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
}

// ---------- Submitting ----------

export async function countRecent(table: 'stories' | 'story_comments' | 'story_flags' | 'story_likes', ipHash: string, sinceIso: string): Promise<number> {
  const { count, error } = await serviceClient().from(table).select('*', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', sinceIso);
  if (error) throw error;
  return count || 0;
}

export async function uploadStoryPhoto(path: string, bytes: Uint8Array, contentType: string): Promise<void> {
  const { error } = await serviceClient().storage.from(UPLOAD_BUCKET).upload(path, bytes, { contentType, upsert: false });
  if (error) throw error;
}

export async function removeStoryUploads(paths: string[]): Promise<void> {
  if (!paths.length) return;
  const { error } = await serviceClient().storage.from(UPLOAD_BUCKET).remove(paths);
  if (error) console.error('Story upload cleanup failed:', error);
}

export async function insertStory(row: Partial<StoryRow> & StoryInput & { id: string; slug: string; photos: string[]; manage_token: string; consent_at: string }): Promise<void> {
  const { error } = await serviceClient().from('stories').insert(row);
  if (error) throw error;
}

/** Copy approved photos to the public bucket (same paths). */
export async function publishStoryPhotos(paths: string[]): Promise<void> {
  const sb = serviceClient();
  for (const p of paths) {
    const { data, error } = await sb.storage.from(UPLOAD_BUCKET).download(p);
    if (error || !data) throw new HttpError(409, 'A photo of this story is missing from storage.');
    const { error: upErr } = await sb.storage.from(PUBLIC_BUCKET).upload(p, data, { contentType: contentTypeFor(p), upsert: true });
    if (upErr) throw upErr;
  }
}

export async function unpublishStoryPhotos(paths: string[]): Promise<void> {
  if (!paths.length) return;
  const { error } = await serviceClient().storage.from(PUBLIC_BUCKET).remove(paths);
  if (error) console.error('Story photo unpublish failed:', error);
}

// ---------- Public reads ----------

export async function listPublicStories(limit = 60): Promise<PublicStory[]> {
  const { data, error } = await serviceClient().from('stories').select(PUBLIC_COLS).eq('status', 'approved')
    .order('approved_at', { ascending: false, nullsFirst: false }).limit(limit);
  if (error) { console.error('Stories list failed:', error); return []; }
  return (data || []).map(toPublic);
}

export async function getPublicStory(slug: string): Promise<PublicStory | null> {
  const { data, error } = await serviceClient().from('stories').select(PUBLIC_COLS).eq('slug', slug).eq('status', 'approved').maybeSingle();
  if (error) { console.error('Story read failed:', error); return null; }
  return data ? toPublic(data) : null;
}

/** The story in the spotlight now, or else the last one that was. */
export async function spotlightStory(): Promise<{ story: PublicStory; live: boolean } | null> {
  const { data, error } = await serviceClient().from('stories').select(PUBLIC_COLS).eq('status', 'approved')
    .not('featured_at', 'is', null).order('featured_at', { ascending: false }).limit(1);
  if (error) { console.error('Spotlight read failed:', error); return null; }
  const s = data?.[0];
  if (!s) return null;
  return { story: toPublic(s), live: !!s.featured_until && Date.parse(s.featured_until) > Date.now() };
}

export type Reach = { city: string; country: string; readers: number; last_at: string };
export type ShortItem = { id: string; name: string; text: string; created_at: string; color?: string };

export async function liveData(storyId: string, visitor: string | null) {
  const sb = serviceClient();
  const [counts, liked, comments, flags, reach] = await Promise.all([
    sb.from('stories').select('views, likes, comments, flags').eq('id', storyId).eq('status', 'approved').maybeSingle(),
    visitor ? sb.from('story_likes').select('story_id').eq('story_id', storyId).eq('visitor_id', visitor).maybeSingle() : Promise.resolve({ data: null }),
    sb.from('story_comments').select('id, name, body, created_at').eq('story_id', storyId).eq('status', 'visible').order('created_at', { ascending: false }).limit(100),
    sb.from('story_flags').select('id, name, message, color, created_at').eq('story_id', storyId).eq('status', 'visible').order('created_at').limit(200),
    sb.from('story_reach').select('city, country, readers, last_at').eq('story_id', storyId).order('readers', { ascending: false }).limit(500),
  ]);
  if (!counts.data) return null;
  const places = (reach.data || []) as Reach[];
  return {
    ...counts.data,
    liked: !!liked.data,
    commentList: (comments.data || []).map((c: any) => ({ id: c.id, name: c.name, text: c.body, created_at: c.created_at })) as ShortItem[],
    flagList: (flags.data || []).map((f: any) => ({ id: f.id, name: f.name, text: f.message, color: f.color, created_at: f.created_at })) as ShortItem[],
    ...reachSummary(places),
  };
}

/** Cities and countries a story reached, the top places and the latest reader's place. */
export function reachSummary(places: Reach[]) {
  const named = places.filter((p) => p.city || p.country);
  const cities = new Set(named.filter((p) => p.city).map((p) => p.city + '|' + p.country)).size;
  const countries = new Set(named.filter((p) => p.country).map((p) => p.country)).size;
  const latest = [...named].sort((a, b) => b.last_at.localeCompare(a.last_at))[0] || null;
  return { cities, countries, top: named.slice(0, 12), latest };
}

export async function recordView(storyId: string, visitor: string, city: string, country: string): Promise<boolean> {
  const { data, error } = await serviceClient().rpc('story_record_view', { p_story: storyId, p_visitor: visitor, p_city: city.slice(0, 60), p_country: country.slice(0, 2) });
  if (error) throw error;
  return !!data;
}

export async function setLike(storyId: string, visitor: string, on: boolean, ipHash: string): Promise<number> {
  const { data, error } = await serviceClient().rpc('story_set_like', { p_story: storyId, p_visitor: visitor, p_on: on, p_ip: ipHash });
  if (error) throw error;
  return Number(data) || 0;
}

export async function isApproved(storyId: string): Promise<boolean> {
  const { data } = await serviceClient().from('stories').select('id').eq('id', storyId).eq('status', 'approved').maybeSingle();
  return !!data;
}

export async function addComment(row: { story_id: string; name: string; body: string; status: 'visible' | 'held'; ip_hash: string }) {
  const sb = serviceClient();
  const { data, error } = await sb.from('story_comments').insert(row).select('id, created_at').single();
  if (error) throw error;
  await sb.rpc('story_recount', { p_story: row.story_id });
  return data;
}

export async function addFlag(row: { story_id: string; name: string; message: string; color: string; status: 'visible' | 'held'; ip_hash: string }) {
  const sb = serviceClient();
  const { data, error } = await sb.from('story_flags').insert(row).select('id, created_at').single();
  if (error) throw error;
  await sb.rpc('story_recount', { p_story: row.story_id });
  return data;
}

/** Totals for the hub: stories shared, reads, cities reached and flags tied. */
export async function hubStats() {
  const sb = serviceClient();
  const [stories, reach] = await Promise.all([
    sb.from('stories').select('views, flags, likes').eq('status', 'approved').limit(5000),
    sb.from('story_reach').select('city, country').limit(20000),
  ]);
  const rows = stories.data || [];
  const cities = new Set((reach.data || []).filter((r: any) => r.city).map((r: any) => r.city + '|' + r.country)).size;
  const countries = new Set((reach.data || []).filter((r: any) => r.country).map((r: any) => r.country)).size;
  return {
    stories: rows.length,
    reads: rows.reduce((n: number, r: any) => n + (r.views || 0), 0),
    flags: rows.reduce((n: number, r: any) => n + (r.flags || 0), 0),
    likes: rows.reduce((n: number, r: any) => n + (r.likes || 0), 0),
    cities, countries,
  };
}

// ---------- The storyteller's private page ----------

export async function storyByToken(token: string): Promise<StoryRow | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const { data } = await serviceClient().from('stories').select('*').eq('manage_token', token).neq('status', 'removed').maybeSingle();
  return (data as StoryRow) || null;
}

export async function storyReach(storyId: string): Promise<Reach[]> {
  const { data } = await serviceClient().from('story_reach').select('city, country, readers, last_at').eq('story_id', storyId).order('readers', { ascending: false }).limit(500);
  return (data || []) as Reach[];
}

export async function storyFlags(storyId: string): Promise<ShortItem[]> {
  const { data } = await serviceClient().from('story_flags').select('id, name, message, color, created_at').eq('story_id', storyId).eq('status', 'visible').order('created_at', { ascending: false }).limit(200);
  return (data || []).map((f: any) => ({ id: f.id, name: f.name, text: f.message, color: f.color, created_at: f.created_at }));
}

/** The storyteller takes their story down: off the site, photos deleted, personal details cleared. */
export async function removeByAuthor(s: StoryRow): Promise<void> {
  const sb = serviceClient();
  const { error } = await sb.from('stories').update({
    status: 'removed', email: null, instagram: null, featured_until: s.featured_until && Date.parse(s.featured_until) > Date.now() ? new Date().toISOString() : s.featured_until,
    updated_at: new Date().toISOString(),
  }).eq('id', s.id);
  if (error) throw error;
  await unpublishStoryPhotos(s.photos);
  await removeStoryUploads(s.photos);
}

// ---------- Admin ----------

export async function getStory(id: string): Promise<StoryRow | null> {
  const { data } = await serviceClient().from('stories').select('*').eq('id', id).maybeSingle();
  return (data as StoryRow) || null;
}

export async function updateStory(id: string, patch: Partial<StoryRow>): Promise<void> {
  const { error } = await serviceClient().from('stories').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function signedUploadUrls(paths: string[]): Promise<(string | null)[]> {
  if (!paths.length) return [];
  const { data, error } = await serviceClient().storage.from(UPLOAD_BUCKET).createSignedUrls(paths, 3600);
  if (error) return paths.map(() => null);
  return paths.map((_, i) => (data as any[])?.[i]?.signedUrl || null);
}

export async function listAdminStories(status: StoryStatus | 'featured', limit = 100) {
  let q = serviceClient().from('stories').select('*');
  q = status === 'featured' ? q.not('featured_at', 'is', null).order('featured_at', { ascending: false }) : q.eq('status', status).order('created_at', { ascending: false });
  const { data, error } = await q.limit(limit);
  if (error) throw error;
  const rows = (data || []) as StoryRow[];
  return Promise.all(rows.map(async (r) => ({ ...r, photo_urls: r.status === 'approved' ? r.photos.map(publicPhotoUrl) : await signedUploadUrls(r.photos) })));
}

export async function listHeld() {
  const sb = serviceClient();
  const [c, f] = await Promise.all([
    sb.from('story_comments').select('id, story_id, name, body, created_at, stories(title, slug)').eq('status', 'held').order('created_at', { ascending: false }).limit(100),
    sb.from('story_flags').select('id, story_id, name, message, color, created_at, stories(title, slug)').eq('status', 'held').order('created_at', { ascending: false }).limit(100),
  ]);
  return { comments: c.data || [], flags: f.data || [] };
}

export async function setShortStatus(table: 'story_comments' | 'story_flags', id: string, status: 'visible' | 'removed'): Promise<void> {
  const sb = serviceClient();
  const { data, error } = await sb.from(table).update({ status }).eq('id', id).select('story_id').single();
  if (error) throw error;
  await sb.rpc('story_recount', { p_story: (data as any).story_id });
}

export async function pendingCounts() {
  const sb = serviceClient();
  const [s, c, f] = await Promise.all([
    sb.from('stories').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    sb.from('story_comments').select('id', { count: 'exact', head: true }).eq('status', 'held'),
    sb.from('story_flags').select('id', { count: 'exact', head: true }).eq('status', 'held'),
  ]);
  return { stories: s.count || 0, held: (c.count || 0) + (f.count || 0) };
}
