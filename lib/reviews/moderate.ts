// lib/reviews/moderate.ts
import { revalidatePath } from 'next/cache';
import { HttpError } from '@/lib/server-auth';
import { hotelUrls, pingIndexNow } from '@/lib/indexnow';
import { getReview, hadVerifiedStay, propertyRef, publishPhotos, recomputePropertyRating, unpublishPhotos, updateReview } from './store';
import type { ReviewRow, ReviewSummary } from './types';

export type ModerationStatus = 'approved' | 'rejected' | 'hidden';
export type ReplyBy = { by: 'owner' } | { by: 'partner'; partnerId: string };
const REPLY_MAX = 1000;

/** Rebuild the English and Hindi hotel pages now instead of waiting for ISR. */
export function revalidateHotel(slug: string): void {
  for (const p of ['/hotels/' + slug, '/hi/hotels/' + slug]) {
    try { revalidatePath(p); } catch (e) { console.error('Revalidate failed:', p, e); }
  }
}

/**
 * Approve / reject / hide. Photos are copied to the public bucket before the status changes, so a
 * storage failure leaves the review as it was (a missing upload is a 409). Approving re-checks the
 * stay, so a booking that completed after the guest wrote the review still earns the badge; a badge
 * already earned is never taken away (the lookup returns false on a database error).
 * Aggregates are recomputed after every change.
 */
export async function setReviewStatus(id: string, status: ModerationStatus, adminId: string): Promise<ReviewSummary> {
  const review = await getReview(id);
  if (!review) throw new HttpError(404, 'Review not found.');
  const wasApproved = review.status === 'approved';
  if (status === 'approved' && !wasApproved) await publishPhotos(review.photos);
  if (status !== 'approved' && wasApproved) await unpublishPhotos(review.photos);
  const patch: Partial<ReviewRow> = { status, moderated_by: adminId, moderated_at: new Date().toISOString() };
  if (status === 'approved' && !review.verified_stay && await hadVerifiedStay(review.property_id, review.phone)) patch.verified_stay = true;
  await updateReview(id, patch);
  const summary = await recomputePropertyRating(review.property_id);
  const prop = await propertyRef(review.property_id);
  if (prop) {
    revalidateHotel(prop.slug);
    if (status === 'approved' && !wasApproved && prop.status === 'published') await pingIndexNow(hotelUrls(prop.slug));
  }
  return summary;
}

/** One owner reply and one partner reply per review; saving again replaces it, saving '' removes it. */
export async function setReply(id: string, who: ReplyBy, text: string): Promise<void> {
  const reply = text.trim();
  if (reply && (reply.length < 2 || reply.length > REPLY_MAX)) throw new HttpError(400, 'Replies must be 2 to 1000 characters.');
  const review = await getReview(id);
  if (!review) throw new HttpError(404, 'Review not found.');
  const prop = await propertyRef(review.property_id);
  if (who.by === 'partner' && (review.status !== 'approved' || !prop || prop.owner_id !== who.partnerId)) {
    throw new HttpError(404, 'Review not found.');
  }
  const value = reply || null;
  const at = reply ? new Date().toISOString() : null;
  await updateReview(id, who.by === 'owner' ? { owner_reply: value, owner_reply_at: at } : { partner_reply: value, partner_reply_at: at });
  if (prop) revalidateHotel(prop.slug);
}
