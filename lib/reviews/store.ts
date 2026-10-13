// lib/reviews/store.ts
/**
 * Database and storage access for hotel reviews (service role). Public reads use the
 * public_hotel_reviews view so a phone number or IP hash can never reach a page.
 */
import { HttpError, serviceClient } from '@/lib/server-auth';
import { todayIST } from '@/lib/bookings/timing';
import { isVerifiedStay, summarize } from './summary';
import {
  PUBLIC_BUCKET, REVIEWS_PAGE_SIZE, UPLOAD_BUCKET, contentTypeFor, emptySummary, photoUrl,
  type PublicReview, type ReviewBundle, type ReviewInput, type ReviewRow, type ReviewStatus, type ReviewSummary,
} from './types';

const PUBLIC_COLS = 'id, property_id, name, rating, rating_cleanliness, rating_location, rating_staff, rating_value, title, body, stay_month, trip_type, photos, verified_stay, owner_reply, owner_reply_at, partner_reply, partner_reply_at, created_at';
const RATING_COLS = 'rating, rating_cleanliness, rating_location, rating_staff, rating_value';
const SIGNED_URL_SECONDS = 300;

const configured = () => !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const pathsOf = (v: unknown): string[] => (Array.isArray(v) ? v.filter((p): p is string => typeof p === 'string' && p !== '') : []);
const toPublic = (r: any): PublicReview => ({ ...r, photos: pathsOf(r.photos).map(photoUrl) });

// ---------- Public reads (never throw: a review problem must not break a hotel page) ----------

export async function loadSummary(propertyId: string): Promise<ReviewSummary> {
  if (!configured()) return emptySummary();
  try {
    const { data, error } = await serviceClient().from('public_hotel_reviews').select(RATING_COLS).eq('property_id', propertyId);
    if (error) { console.error('Review summary load failed:', error.message); return emptySummary(); }
    return summarize((data as any[]) || []);
  } catch (e) {
    console.error('Review summary load failed:', e);
    return emptySummary();
  }
}

export async function loadApprovedPage(propertyId: string, page = 1, pageSize = REVIEWS_PAGE_SIZE): Promise<{ reviews: PublicReview[]; total: number }> {
  if (!configured()) return { reviews: [], total: 0 };
  const from = (Math.max(1, page) - 1) * pageSize;
  try {
    const { data, error, count } = await serviceClient().from('public_hotel_reviews')
      .select(PUBLIC_COLS, { count: 'exact' })
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) { console.error('Review page load failed:', error.message); return { reviews: [], total: 0 }; }
    return { reviews: ((data as any[]) || []).map(toPublic), total: count ?? 0 };
  } catch (e) {
    console.error('Review page load failed:', e);
    return { reviews: [], total: 0 };
  }
}

export async function loadReviewBundle(propertyId: string): Promise<ReviewBundle> {
  const [summary, page] = await Promise.all([loadSummary(propertyId), loadApprovedPage(propertyId)]);
  return { summary, reviews: page.reviews, total: page.total };
}

// ---------- Submission ----------

export async function countRecentByIp(ipHash: string, sinceIso: string): Promise<number> {
  const { count, error } = await serviceClient().from('hotel_reviews')
    .select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', sinceIso);
  if (error) throw error;
  return count ?? 0;
}

export async function phoneAlreadyReviewed(propertyId: string, phone: string): Promise<boolean> {
  const { data, error } = await serviceClient().from('hotel_reviews')
    .select('id').eq('property_id', propertyId).eq('phone', phone).limit(1);
  if (error) throw error;
  return ((data as any[]) || []).length > 0;
}

/** True when this phone has a real, finished stay at the property (see isVerifiedStay). */
export async function hadVerifiedStay(propertyId: string, phone: string, today = todayIST()): Promise<boolean> {
  const { data, error } = await serviceClient().from('bookings')
    .select('guest_phone, status, check_out')
    .eq('property_id', propertyId)
    .ilike('guest_phone', '%' + phone.slice(-4))
    .limit(200);
  if (error) { console.error('Verified-stay lookup failed:', error.message); return false; }
  return isVerifiedStay(phone, (data as any[]) || [], today);
}

export type NewReview = ReviewInput & { id: string; photos: string[]; verified_stay: boolean; ip_hash: string };

export async function insertReview(row: NewReview): Promise<void> {
  const { error } = await serviceClient().from('hotel_reviews').insert({ ...row, status: 'pending' });
  if (error?.code === '23505') throw new HttpError(409, 'You have already reviewed this property with this mobile number.');
  if (error) throw error;
}

// ---------- Moderation ----------

export async function getReview(id: string): Promise<ReviewRow | null> {
  const { data, error } = await serviceClient().from('hotel_reviews').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? ({ ...(data as any), photos: pathsOf((data as any).photos) } as ReviewRow) : null;
}

export async function updateReview(id: string, patch: Partial<ReviewRow>): Promise<void> {
  const { error } = await serviceClient().from('hotel_reviews').update(patch).eq('id', id);
  if (error) throw error;
}

/** properties.rating / review_count = approved reviews only. Returns the new summary. */
export async function recomputePropertyRating(propertyId: string): Promise<ReviewSummary> {
  const sb = serviceClient();
  const { data, error } = await sb.from('hotel_reviews').select(RATING_COLS).eq('property_id', propertyId).eq('status', 'approved');
  if (error) throw error;
  const s = summarize((data as any[]) || []);
  const { error: upErr } = await sb.from('properties').update({ rating: s.average, review_count: s.count }).eq('id', propertyId);
  if (upErr) throw upErr;
  return s;
}

export type PropertyRef = { id: string; name: string; slug: string; owner_id: string | null; status: string };

export async function propertyRef(id: string): Promise<PropertyRef | null> {
  const { data, error } = await serviceClient().from('properties').select('id, name, slug, owner_id, status').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as PropertyRef) || null;
}

// ---------- Photos ----------

export async function uploadReviewPhoto(path: string, bytes: Uint8Array, contentType: string): Promise<void> {
  const { error } = await serviceClient().storage.from(UPLOAD_BUCKET).upload(path, bytes, { contentType, upsert: false });
  if (error) throw error;
}

export async function removeUploads(paths: string[]): Promise<void> {
  if (!paths.length) return;
  const { error } = await serviceClient().storage.from(UPLOAD_BUCKET).remove(paths);
  if (error) console.error('Review upload cleanup failed:', error);
}

/** Copy approved photos from the private bucket to the public one (same paths). */
export async function publishPhotos(paths: string[]): Promise<void> {
  const sb = serviceClient();
  for (const p of paths) {
    const { data, error } = await sb.storage.from(UPLOAD_BUCKET).download(p);
    if (error || !data) throw error || new Error('Review photo missing: ' + p);
    const { error: upErr } = await sb.storage.from(PUBLIC_BUCKET).upload(p, data, { contentType: contentTypeFor(p), upsert: true });
    if (upErr) throw upErr;
  }
}

export async function unpublishPhotos(paths: string[]): Promise<void> {
  if (!paths.length) return;
  const { error } = await serviceClient().storage.from(PUBLIC_BUCKET).remove(paths);
  if (error) throw error;
}

async function signedUploadUrls(paths: string[]): Promise<(string | null)[]> {
  if (!paths.length) return [];
  const { data, error } = await serviceClient().storage.from(UPLOAD_BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
  if (error) { console.error('Review photo links failed:', error); return paths.map(() => null); }
  const urls = (data as any[]) || [];
  return paths.map((_, i) => urls[i]?.signedUrl || null);
}

// ---------- Admin and partner lists ----------

export type AdminReview = ReviewRow & { property_name: string; property_slug: string; photo_urls: (string | null)[] };

export async function listAdminReviews(status: ReviewStatus, limit = 100): Promise<AdminReview[]> {
  const { data, error } = await serviceClient().from('hotel_reviews')
    .select('*, properties(name, slug)')
    .eq('status', status)
    .order('created_at', { ascending: status === 'pending' })
    .limit(limit);
  if (error) throw error;
  return Promise.all(((data as any[]) || []).map(async (r) => {
    const { properties: p, ...rest } = r;
    const photos = pathsOf(r.photos);
    return {
      ...rest, photos,
      property_name: p?.name ?? '', property_slug: p?.slug ?? '',
      photo_urls: status === 'approved' ? photos.map(photoUrl) : await signedUploadUrls(photos),
    } as AdminReview;
  }));
}

export type PartnerReview = PublicReview & { property_name: string };

export async function listPartnerReviews(ownerId: string): Promise<PartnerReview[]> {
  const sb = serviceClient();
  const { data: props, error: pErr } = await sb.from('properties').select('id, name').eq('owner_id', ownerId);
  if (pErr) throw pErr;
  const list = (props as { id: string; name: string }[]) || [];
  if (!list.length) return [];
  const names: Record<string, string> = {};
  list.forEach((p) => { names[p.id] = p.name; });
  const { data, error } = await sb.from('public_hotel_reviews').select(PUBLIC_COLS)
    .in('property_id', list.map((p) => p.id)).order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return ((data as any[]) || []).map((r) => ({ ...toPublic(r), property_name: names[r.property_id] ?? '' }));
}
