# Hotel Reviews, Rich Search Results and AI-Engine Feeds

Date: 2026-10-13
Status: design approved by owner in chat ("yes"); spec awaiting owner review

## 1. Goal

Every hotel page gets a **Write a review** button. Approved reviews show on the page,
feed real review stars and photos into Google/Bing structured data, and appear in the
AI-readable pages (`/llms.txt`, per-hotel Markdown). Nothing fake: only real,
owner-approved reviews ever reach search engines.

Note: search engines decide what to display; we provide complete, valid data.
Review stars typically appear weeks after real reviews exist.

## 2. Decisions

| Topic | Decision |
|---|---|
| Who | Anyone; every review is moderated by the owner before it appears. |
| Verified stay | Badge when the reviewer's phone (last 10 digits) matches a non-cancelled booking at that property whose check-out is in the past. |
| Fields | Name, phone (private), overall 1-5, optional cleanliness/location/staff/value 1-5, title (5-100), text (30-2000), stay month (YYYY-MM, not future), trip type (family/couple/solo/friends/business), up to 3 photos (JPEG/PNG/WebP, 5 MB each). |
| Limits | One review per phone per property; honeypot field; max 5 submissions per IP per hour. |
| Replies | Owner (as Dharamshala Stay) from admin; partner for own properties from the partner portal. One reply each per review. |
| Aggregates | `properties.rating` (avg, 1 decimal) and `review_count` recomputed from approved reviews on every approve/hide/reject. |
| Directory listings | Get the button and reviews too. |
| Out of scope | Importing reviews from Google/TripAdvisor; incentives for reviews. |

## 3. Data

Migration `supabase/migration-v23-hotel-reviews.sql`:
- `hotel_reviews` – `id`, `property_id` FK, `name`, `phone`, `rating` INT 1-5,
  `rating_cleanliness`/`_location`/`_staff`/`_value` INT 1-5 NULL, `title`, `body`,
  `stay_month` TEXT, `trip_type`, `photos` JSONB (array of storage paths),
  `verified_stay` BOOL, `status` CHECK ('pending','approved','rejected','hidden'),
  `owner_reply`, `owner_reply_at`, `partner_reply`, `partner_reply_at`,
  `moderated_by`, `moderated_at`, `ip_hash`, `created_at`. UNIQUE (property_id, phone).
- Public bucket `review-photos` for approved photos only; uploads land in a private
  `review-uploads` bucket and are copied to the public bucket on approval.
- RLS: public can read approved reviews (without phone/ip_hash via a view
  `public_hotel_reviews`); writes via service role routes only.

## 4. Routes and UI

- `POST /api/reviews` (multipart): validation, honeypot, rate limit, verified-stay
  match, private photo upload, status pending; owner email "New review to approve".
- `GET /api/reviews?property_id&page` → approved reviews + summary.
- Hotel page (`HotelDetailView`, `DirectoryListing`): rating summary, category bars,
  photo strip, review list (badge, replies), "Write a review" modal; success message
  "Thanks – your review will appear after a quick check."
- Admin `app/(site)/admin/reviews/page.tsx` (+ nav, pending badge): queue with
  approve / reject / hide, reply box. API `app/api/admin/reviews/*`.
- Partner `app/(site)/partner/reviews/page.tsx`: approved reviews of own properties,
  reply box. API `app/api/partner/reviews/route.ts`.

## 5. Search engines

`lib/seo.ts` hotel JSON-LD:
- `image`: up to 10 absolute URLs (property images first, then room images).
- `containsPlace`: `HotelRoom` per active room type with `name`, `image`, `occupancy`,
  `bed`, and an `Offer` with price.
- `amenityFeature`, `checkinTime`, `checkoutTime`, `numberOfRooms` when known.
- `aggregateRating` from approved reviews only (`ratingCount` = approved count);
  `review`: latest 5 approved reviews (`author` name, `datePublished`, `reviewRating`,
  `reviewBody` truncated to 500).
- Metadata title/description template: `"<Name>, <Area> · Rated <x>/5 by <n> guests · Rooms from ₹<min>"`
  (rating part only when n >= 1); fallback to current text.
- Sitemap: add `<image:image>` entries for hotel and room photos.
- IndexNow: `lib/indexnow.ts` pings `https://api.indexnow.org/indexnow` with the hotel
  URL on review approval and hotel publish/update; key file served at `/<key>.txt`
  (`INDEXNOW_KEY` env).

## 6. AI engines

`lib/llms.ts`:
- `hotelMarkdown`: rating summary, category averages, up to 5 short approved review
  quotes (name initial + month), room list with prices and photo alt text.
- `/llms.txt` hotel lines include "rated x/5 (n reviews)".

## 7. Testing

Unit: validation, verified-stay matching, aggregate recompute, JSON-LD shape
(no aggregateRating without approved reviews; review array content), metadata
template, Markdown output. API: honeypot/rate limit/duplicate, admin-only moderation,
partner own-property replies. Manual: submit a review, approve, see it on the page,
validate the page in Google's Rich Results Test.
