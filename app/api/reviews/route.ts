// app/api/reviews/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, clientIp, jsonError } from '@/lib/server-auth';
import { adminEmail, escHtml, sendEmail } from '@/lib/email';
import { siteConfig } from '@/lib/config';
import { checkPhotoCount, checkReviewPhoto, hashIp, parseReview } from '@/lib/reviews/validate';
import {
  countRecentByIp, hadVerifiedStay, insertReview, loadApprovedPage, loadSummary,
  phoneAlreadyReviewed, propertyRef, removeUploads, uploadReviewPhoto,
} from '@/lib/reviews/store';
import { PHOTO_TYPES, REVIEWS_PAGE_SIZE, emptySummary, type ReviewInput } from '@/lib/reviews/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; // Next 14 caches GET fetches (Supabase reads) in route handlers otherwise

const RATE_LIMIT = 5;
const HOUR_MS = 3600e3;
const FIELDS = ['property_id', 'name', 'phone', 'rating', 'rating_cleanliness', 'rating_location', 'rating_staff', 'rating_value', 'title', 'body', 'stay_month', 'trip_type'];

async function emailOwner(hotel: string, r: ReviewInput, verified: boolean, photos: number) {
  try {
    await sendEmail({
      to: adminEmail(),
      subject: 'New review to approve: ' + hotel,
      html: `
        <h2>New review to approve</h2>
        <p><strong>${escHtml(hotel)}</strong> · ${r.rating}/5${verified ? ' (verified stay)' : ''}</p>
        <p><strong>${escHtml(r.title)}</strong></p>
        <p>${escHtml(r.body).replace(/\n/g, '<br>')}</p>
        <p>By ${escHtml(r.name)} · stayed ${escHtml(r.stay_month)} · ${escHtml(r.trip_type)} · ${photos} photo(s)</p>
        <p><a href="${siteConfig.url}/admin/reviews">Approve or reject it in the admin panel</a></p>
      `,
    });
  } catch (e) {
    console.error('Review email failed:', e);
  }
}

export async function POST(req: Request) {
  try {
    const form = await req.formData().catch(() => null);
    if (!form) throw new HttpError(400, 'Please fill in the review form.');
    // Honeypot: hidden from people, filled by bots. Pretend it worked so they do not retry.
    if (String(form.get('website') ?? '').trim()) return NextResponse.json({ ok: true });

    // An absent field becomes '' (never null), so validate.ts gives its friendly message for it.
    const fields: Record<string, string> = {};
    for (const k of FIELDS) fields[k] = String(form.get(k) ?? '');
    const parsed = parseReview(fields);
    if (!parsed.ok) throw new HttpError(400, parsed.error);
    const input = parsed.data;

    const files = form.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);
    const countProblem = checkPhotoCount(files.length);
    if (countProblem) throw new HttpError(400, countProblem);
    const photos: { type: string; bytes: Buffer }[] = [];
    for (const f of files) {
      const bytes = Buffer.from(await f.arrayBuffer());
      const problem = checkReviewPhoto({ type: f.type, size: bytes.length, head: bytes.subarray(0, 12) });
      if (problem) throw new HttpError(400, problem);
      photos.push({ type: f.type, bytes });
    }

    const property = await propertyRef(input.property_id);
    if (!property || property.status !== 'published') throw new HttpError(404, 'Property not found.');

    const ipHash = hashIp(clientIp(req));
    const recent = await countRecentByIp(ipHash, new Date(Date.now() - HOUR_MS).toISOString());
    if (recent >= RATE_LIMIT) throw new HttpError(429, 'Too many reviews from this connection. Please try again in an hour.');
    if (await phoneAlreadyReviewed(input.property_id, input.phone)) {
      throw new HttpError(409, 'You have already reviewed this property with this mobile number.');
    }

    const id = crypto.randomUUID();
    const verified = await hadVerifiedStay(input.property_id, input.phone);
    const paths: string[] = [];
    try {
      for (let i = 0; i < photos.length; i++) {
        const path = `${input.property_id}/${id}/${i + 1}.${PHOTO_TYPES[photos[i].type]}`;
        await uploadReviewPhoto(path, photos[i].bytes, photos[i].type);
        paths.push(path);
      }
      await insertReview({ ...input, id, photos: paths, verified_stay: verified, ip_hash: ipHash });
    } catch (e) {
      await removeUploads(paths);
      throw e;
    }

    await emailOwner(property.name, input, verified, paths.length);
    return NextResponse.json({ ok: true });
  } catch (e) { return jsonError(e); }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const propertyId = url.searchParams.get('property_id') || '';
  if (!z.string().uuid().safeParse(propertyId).success) return NextResponse.json({ error: 'Unknown property.' }, { status: 400 });
  const page = Math.min(1000, Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1));
  // Reviews of a draft, hidden or unknown property stay private: answer as if it had none.
  const property = await propertyRef(propertyId).catch((e) => { console.error('Review property lookup failed:', e); return null; });
  const [summary, { reviews, total }] = property?.status === 'published'
    ? await Promise.all([loadSummary(propertyId), loadApprovedPage(propertyId, page)])
    : [emptySummary(), { reviews: [], total: 0 }];
  return NextResponse.json(
    { summary, reviews, total, page, has_more: page * REVIEWS_PAGE_SIZE < total },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
  );
}
