-- v54: local guides register themselves on /local-guides/register and appear on /local-guides once the owner
-- approves them in /admin/guides. Guide bookings carry 15% commission (owner, 26 Oct 2026). Safe to re-run.

ALTER TABLE guides ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE guides ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE guides ADD COLUMN IF NOT EXISTS areas JSONB NOT NULL DEFAULT '[]';
ALTER TABLE guides ADD COLUMN IF NOT EXISTS hp_registration_no TEXT;
-- Set by the owner after checking the certificate by hand; only then does the profile say "Registered with HP Tourism".
ALTER TABLE guides ADD COLUMN IF NOT EXISTS hp_registration_verified BOOLEAN NOT NULL DEFAULT FALSE;
-- Set by the owner after meeting the guide / checking ID: shows "Verified by Dharamshala Stay".
ALTER TABLE guides ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE guides ADD COLUMN IF NOT EXISTS ip_hash TEXT;
ALTER TABLE guides ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE guides ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
-- The photo a guide uploads at sign-up (private bucket path); copied to the public bucket and set as photo on approval.
ALTER TABLE guides ADD COLUMN IF NOT EXISTS photo_upload TEXT;

-- Photos: sign-up uploads stay private until the owner approves the guide, then are copied to the public bucket.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('guide-uploads', 'guide-uploads', false, 5242880, ARRAY['image/jpeg'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 5242880, allowed_mime_types = ARRAY['image/jpeg'];
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('guide-photos', 'guide-photos', true, 5242880, ARRAY['image/jpeg'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 5242880, allowed_mime_types = ARRAY['image/jpeg'];

CREATE UNIQUE INDEX IF NOT EXISTS guides_slug_key ON guides(slug) WHERE slug IS NOT NULL;

-- Sign-ups wait as 'pending'; 'rejected' keeps a record of refused ones.
ALTER TABLE guides DROP CONSTRAINT IF EXISTS guides_status_check;
ALTER TABLE guides ADD CONSTRAINT guides_status_check CHECK (status IN ('pending', 'active', 'inactive', 'rejected'));

-- Check: the new columns exist.
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'guides' AND column_name IN ('slug', 'whatsapp', 'areas', 'hp_registration_no', 'hp_registration_verified', 'verified', 'published_at', 'photo_upload')
ORDER BY column_name;
