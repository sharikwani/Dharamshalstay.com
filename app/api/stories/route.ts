import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import sharp from 'sharp';
import { HttpError, jsonError } from '@/lib/server-auth';
import { adminEmail, escHtml, sendEmail } from '@/lib/email';
import { siteConfig } from '@/lib/config';
import { checkReviewPhoto } from '@/lib/reviews/validate';
import { MAX_STORY_PHOTOS, parseStory, storySlug, type StoryInput } from '@/lib/stories/rules';
import { countRecent, insertStory, removeStoryUploads, uploadStoryPhoto } from '@/lib/stories/store';
import { HOUR_MS, ipHashOf } from '@/lib/stories/request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; // Next 14 caches GET fetches (Supabase reads) in route handlers otherwise

const RATE_LIMIT = 3;
const FIELDS = ['title', 'body', 'place', 'visited', 'author_name', 'author_kind', 'author_from', 'instagram', 'email', 'consent'];

async function emailOwner(s: StoryInput, photos: number) {
  await sendEmail({
    to: adminEmail(),
    subject: 'New story to approve: ' + s.title,
    html: `
      <h2>New story to approve</h2>
      <p><strong>${escHtml(s.title)}</strong> · ${escHtml(s.place)}</p>
      <p>${escHtml(s.body).replace(/\n/g, '<br>')}</p>
      <p>By ${escHtml(s.author_name)} (${s.author_kind}${s.author_from ? ', ' + escHtml(s.author_from) : ''})${s.instagram ? ' · @' + escHtml(s.instagram) : ''} · ${photos} photo(s)</p>
      <p><a href="${siteConfig.url}/admin/stories">Read it and approve or reject it in the admin panel</a></p>
    `,
  }).catch((e) => console.error('Story email failed:', e));
}

/** A new story from the /stories/share form. It stays private until the owner approves it. */
export async function POST(req: Request) {
  try {
    const form = await req.formData().catch(() => null);
    if (!form) throw new HttpError(400, 'Please fill in the form.');
    if (String(form.get('website') ?? '').trim()) return NextResponse.json({ ok: true }); // honeypot

    const fields: Record<string, string> = {};
    for (const k of FIELDS) fields[k] = String(form.get(k) ?? '');
    const parsed = parseStory(fields);
    if (!parsed.ok) throw new HttpError(400, parsed.error);
    const input = parsed.data;

    const files = form.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);
    if (!files.length) throw new HttpError(400, 'Add at least one photo from your trip.');
    if (files.length > MAX_STORY_PHOTOS) throw new HttpError(400, `You can add up to ${MAX_STORY_PHOTOS} photos.`);
    const photos: Buffer[] = [];
    for (const f of files) {
      const bytes = Buffer.from(await f.arrayBuffer());
      const problem = checkReviewPhoto({ type: f.type, size: bytes.length, head: bytes.subarray(0, 12) });
      if (problem) throw new HttpError(400, problem);
      // Re-encoded as JPEG: one format everywhere (the card renderer cannot read WebP), and the
      // camera's hidden details, such as where the photo was taken, are removed.
      try {
        photos.push(await sharp(bytes).rotate().resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 84, mozjpeg: true }).toBuffer());
      } catch {
        throw new HttpError(400, 'One of the photos could not be read. Please choose a JPG or PNG photo.');
      }
    }

    const ipHash = ipHashOf(req);
    if (await countRecent('stories', ipHash, new Date(Date.now() - HOUR_MS).toISOString()) >= RATE_LIMIT) {
      throw new HttpError(429, 'You have shared a few stories already. Please try again in an hour.');
    }

    const id = crypto.randomUUID();
    const token = randomBytes(24).toString('base64url');
    const paths: string[] = [];
    try {
      for (let i = 0; i < photos.length; i++) {
        const path = `${id}/${i + 1}.jpg`;
        await uploadStoryPhoto(path, photos[i], 'image/jpeg');
        paths.push(path);
      }
      await insertStory({ ...input, id, slug: storySlug(input.title, id), photos: paths, manage_token: token, consent_at: new Date().toISOString(), ip_hash: ipHash });
    } catch (e) {
      await removeStoryUploads(paths);
      throw e;
    }

    await emailOwner(input, paths.length);
    return NextResponse.json({ ok: true, manage_url: `/stories/me/${token}` });
  } catch (e) { return jsonError(e); }
}
