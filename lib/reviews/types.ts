// lib/reviews/types.ts
/** Shared review types and limits. Safe to import from client components (no server imports). */
export const TRIP_TYPES = ['family', 'couple', 'solo', 'friends', 'business'] as const;
export type TripType = (typeof TRIP_TYPES)[number];

export const CATEGORIES = ['cleanliness', 'location', 'staff', 'value'] as const;
export type Category = (typeof CATEGORIES)[number];

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'hidden';

export const REVIEWS_PAGE_SIZE = 10;
export const MAX_PHOTOS = 3;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
/** Allowed photo types and the extension each is stored with. */
export const PHOTO_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
/** Private: every upload lands here. */
export const UPLOAD_BUCKET = 'review-uploads';
/** Public: approved photos only. */
export const PUBLIC_BUCKET = 'review-photos';

export type ReviewInput = {
  property_id: string;
  name: string;
  /** Last 10 digits only. Never shown publicly. */
  phone: string;
  rating: number;
  rating_cleanliness: number | null;
  rating_location: number | null;
  rating_staff: number | null;
  rating_value: number | null;
  title: string;
  body: string;
  stay_month: string;
  trip_type: TripType;
};

/** What anyone may see (from the public_hotel_reviews view). `photos` are absolute URLs. */
export type PublicReview = {
  id: string;
  property_id: string;
  name: string;
  rating: number;
  rating_cleanliness: number | null;
  rating_location: number | null;
  rating_staff: number | null;
  rating_value: number | null;
  title: string;
  body: string;
  stay_month: string;
  trip_type: TripType;
  photos: string[];
  verified_stay: boolean;
  owner_reply: string | null;
  owner_reply_at: string | null;
  partner_reply: string | null;
  partner_reply_at: string | null;
  created_at: string;
};

/** A full hotel_reviews row (service role only). Here `photos` are storage paths. */
export type ReviewRow = PublicReview & {
  phone: string;
  status: ReviewStatus;
  ip_hash: string | null;
  moderated_by: string | null;
  moderated_at: string | null;
};

export type RatingRow = Pick<PublicReview, 'rating' | 'rating_cleanliness' | 'rating_location' | 'rating_staff' | 'rating_value'>;

export type ReviewSummary = {
  count: number;
  /** Mean overall rating, 1 decimal; 0 when there are no reviews. */
  average: number;
  /** Mean per category over the reviews that rated it, 1 decimal; null when nobody did. */
  categories: Record<Category, number | null>;
  /** distribution[0] = number of 1-star reviews ... distribution[4] = 5-star. */
  distribution: number[];
};

export type ReviewBundle = { summary: ReviewSummary; reviews: PublicReview[]; total: number };

/** Approved reviews handed to JSON-LD and Markdown. */
export type ReviewFeed = { summary: ReviewSummary; latest: PublicReview[] };

export function emptySummary(): ReviewSummary {
  return { count: 0, average: 0, categories: { cleanliness: null, location: null, staff: null, value: null }, distribution: [0, 0, 0, 0, 0] };
}

/** Public URL of an approved photo (storage path in the review-photos bucket). */
export function photoUrl(path: string): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL || '') + '/storage/v1/object/public/' + PUBLIC_BUCKET + '/' + path;
}

export function contentTypeFor(path: string): string {
  const ext = path.split('.').pop() || '';
  return Object.keys(PHOTO_TYPES).find((t) => PHOTO_TYPES[t] === ext) || 'application/octet-stream';
}
