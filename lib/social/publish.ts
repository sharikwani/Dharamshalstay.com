/**
 * Publishing to Instagram (Content Publishing API) and the Facebook Page (Graph API), using the
 * system-user token in META_SOCIAL_TOKEN. Instagram: upload containers, wait until FINISHED, publish.
 * Facebook: unpublished photos, then one feed post with all of them attached.
 */
import { fullCaption, slideUrl, type Slide } from './writer';

const GRAPH = 'https://graph.facebook.com/v21.0';
export const socialConfigured = () => !!(process.env.META_SOCIAL_TOKEN && process.env.META_PAGE_ID && process.env.META_IG_USER_ID);

async function graph(path: string, params: Record<string, string> = {}, method: 'GET' | 'POST' = 'GET', token = process.env.META_SOCIAL_TOKEN!) {
  const body = new URLSearchParams({ ...params, access_token: token });
  const url = method === 'GET' ? `${GRAPH}/${path}?${body}` : `${GRAPH}/${path}`;
  const res = await fetch(url, { method, body: method === 'POST' ? body : undefined, signal: AbortSignal.timeout(25000) });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) throw new Error(data?.error?.error_user_msg || data?.error?.message || `Graph ${res.status}`);
  return data;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitFinished(containerId: string, deadline: number) {
  while (Date.now() < deadline) {
    const s = await graph(containerId, { fields: 'status_code,status' });
    if (s.status_code === 'FINISHED') return;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error('Instagram could not process the image: ' + (s.status || s.status_code));
    await sleep(2000);
  }
  throw new Error('Instagram is still processing the images; will retry');
}

export type PostInput = { slides: Slide[]; caption: string; hashtags: string[]; credits?: string | null; link?: string | null; alt_text?: string | null };

export async function publishInstagram(p: PostInput, deadline = Date.now() + 45_000): Promise<{ id: string; permalink?: string }> {
  const ig = process.env.META_IG_USER_ID!;
  const caption = fullCaption(p, 'instagram');
  const urls = p.slides.map((s, i) => slideUrl(s, i, p.slides.length));
  let creation: string;
  if (urls.length === 1) {
    creation = (await graph(`${ig}/media`, { image_url: urls[0], caption, ...(p.alt_text ? { alt_text: p.alt_text } : {}) }, 'POST')).id;
  } else {
    const children: string[] = [];
    for (const u of urls) children.push((await graph(`${ig}/media`, { image_url: u, is_carousel_item: 'true' }, 'POST')).id);
    for (const c of children) await waitFinished(c, deadline);
    creation = (await graph(`${ig}/media`, { media_type: 'CAROUSEL', children: children.join(','), caption }, 'POST')).id;
  }
  await waitFinished(creation, deadline);
  const published = await graph(`${ig}/media_publish`, { creation_id: creation }, 'POST');
  let permalink: string | undefined;
  try { permalink = (await graph(published.id, { fields: 'permalink' })).permalink; } catch { /* not essential */ }
  return { id: published.id, permalink };
}

/** A single-image Instagram story (24 hours). The image must be a public JPEG. */
export async function publishInstagramStory(imageUrl: string, deadline = Date.now() + 45_000): Promise<{ id: string }> {
  const ig = process.env.META_IG_USER_ID!;
  const creation = (await graph(`${ig}/media`, { media_type: 'STORIES', image_url: imageUrl }, 'POST')).id;
  await waitFinished(creation, deadline);
  const published = await graph(`${ig}/media_publish`, { creation_id: creation }, 'POST');
  return { id: published.id };
}

/** A Facebook Page story from one image (the same card as the Instagram story). */
export async function publishFacebookStory(imageUrl: string): Promise<{ id: string }> {
  const page = process.env.META_PAGE_ID!;
  const token = await pageToken();
  const photo = (await graph(`${page}/photos`, { url: imageUrl, published: 'false' }, 'POST', token)).id;
  const r = await graph(`${page}/photo_stories`, { photo_id: photo }, 'POST', token);
  return { id: r.post_id || r.id || photo };
}

let pageTokenCache: { token: string; at: number } | null = null;
async function pageToken(): Promise<string> {
  if (pageTokenCache && Date.now() - pageTokenCache.at < 3600e3) return pageTokenCache.token;
  const r = await graph(process.env.META_PAGE_ID!, { fields: 'access_token' });
  pageTokenCache = { token: r.access_token, at: Date.now() };
  return r.access_token;
}

export async function publishFacebook(p: PostInput): Promise<{ id: string }> {
  const page = process.env.META_PAGE_ID!;
  const token = await pageToken();
  const message = fullCaption(p, 'facebook');
  const urls = p.slides.map((s, i) => slideUrl(s, i, p.slides.length));
  if (urls.length === 1) {
    const r = await graph(`${page}/photos`, { url: urls[0], caption: message }, 'POST', token);
    return { id: r.post_id || r.id };
  }
  const media: string[] = [];
  for (const u of urls) media.push((await graph(`${page}/photos`, { url: u, published: 'false' }, 'POST', token)).id);
  const params: Record<string, string> = { message };
  media.forEach((id, i) => { params[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id }); });
  const r = await graph(`${page}/feed`, params, 'POST', token);
  return { id: r.id };
}

/** Follower counts for the admin page. */
export async function accountStats() {
  const [ig, fb] = await Promise.all([
    graph(process.env.META_IG_USER_ID!, { fields: 'username,followers_count,media_count' }).catch(() => null),
    graph(process.env.META_PAGE_ID!, { fields: 'name,followers_count,fan_count' }).catch(() => null),
  ]);
  return { instagram: ig, facebook: fb };
}
