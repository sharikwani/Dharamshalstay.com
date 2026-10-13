-- migration-v23: hotel reviews. Run once in the Supabase SQL editor after v25, BEFORE deploying the code that uses it. Safe to re-run.
-- Writes only go through our API routes (service role). The public reads approved reviews via the
-- public_hotel_reviews view, which leaves out phone and ip_hash.

CREATE TABLE IF NOT EXISTS hotel_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL CHECK (phone ~ '^[0-9]{10}$'),
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  rating_cleanliness INT CHECK (rating_cleanliness BETWEEN 1 AND 5),
  rating_location INT CHECK (rating_location BETWEEN 1 AND 5),
  rating_staff INT CHECK (rating_staff BETWEEN 1 AND 5),
  rating_value INT CHECK (rating_value BETWEEN 1 AND 5),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  stay_month TEXT NOT NULL CHECK (stay_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  trip_type TEXT NOT NULL CHECK (trip_type IN ('family','couple','solo','friends','business')),
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  verified_stay BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','hidden')),
  owner_reply TEXT,
  owner_reply_at TIMESTAMPTZ,
  partner_reply TEXT,
  partner_reply_at TIMESTAMPTZ,
  moderated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  moderated_at TIMESTAMPTZ,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (property_id, phone)
);
CREATE INDEX IF NOT EXISTS idx_hotel_reviews_property ON hotel_reviews(property_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hotel_reviews_status ON hotel_reviews(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hotel_reviews_ip ON hotel_reviews(ip_hash, created_at DESC);

ALTER TABLE hotel_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access hotel reviews" ON hotel_reviews;
CREATE POLICY "Admin full access hotel reviews" ON hotel_reviews FOR ALL USING (is_admin());
-- Supabase grants anon/authenticated table rights by default; only the service role (our API routes) may touch this table.
REVOKE ALL ON hotel_reviews FROM anon, authenticated;

-- Approved reviews without private columns. A plain view runs as its owner, so anon can read it
-- even though hotel_reviews itself has no public policy.
CREATE OR REPLACE VIEW public_hotel_reviews AS
SELECT id, property_id, name, rating, rating_cleanliness, rating_location, rating_staff, rating_value,
       title, body, stay_month, trip_type, photos, verified_stay,
       owner_reply, owner_reply_at, partner_reply, partner_reply_at, created_at
FROM hotel_reviews
WHERE status = 'approved';
-- Auto-updatable view owned by postgres: without the REVOKE, anon could UPDATE/DELETE approved reviews through it.
-- Supabase's linter flags this as a security-definer view. That is on purpose (anon has no policy on the table); do NOT "fix" it with security_invoker.
REVOKE ALL ON public_hotel_reviews FROM anon, authenticated;
GRANT SELECT ON public_hotel_reviews TO anon, authenticated;

-- Uploads land in a private bucket; approved photos are copied to the public one.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('review-uploads', 'review-uploads', false, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp'];
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('review-photos', 'review-photos', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp'];

-- Keep the old imported / hand-typed numbers so they can be restored. Created once; a re-run never overwrites it.
CREATE TABLE IF NOT EXISTS properties_rating_backup_v23 AS SELECT id, rating, review_count FROM properties;
ALTER TABLE properties_rating_backup_v23 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON properties_rating_backup_v23 FROM anon, authenticated;

-- Ratings now come only from approved reviews. This replaces imported or hand-typed numbers
-- (0 / 0 until real reviews are approved). Re-running recomputes the same values.
UPDATE properties p
SET rating = s.avg_rating, review_count = s.n
FROM (
  SELECT pr.id, COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) AS avg_rating, COUNT(r.id)::int AS n
  FROM properties pr
  LEFT JOIN hotel_reviews r ON r.property_id = pr.id AND r.status = 'approved'
  GROUP BY pr.id
) s
WHERE s.id = p.id;

-- Verify (optional): anon/authenticated should show only SELECT on public_hotel_reviews and nothing on the other two.
-- SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_name IN ('public_hotel_reviews','hotel_reviews','properties_rating_backup_v23');
