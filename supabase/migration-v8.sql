-- migration-v8: directory listings managed from the admin panel + compliance
-- Run once in the Supabase SQL editor. Safe to re-run.

-- 1. Listing type: 'partner' (works with us, shows rooms & prices) or
--    'directory' (real property described by us, rates on request).
ALTER TABLE properties ADD COLUMN IF NOT EXISTS listing_type VARCHAR(20) NOT NULL DEFAULT 'partner';
DO $$ BEGIN
  ALTER TABLE properties ADD CONSTRAINT properties_listing_type_check CHECK (listing_type IN ('partner','directory'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Extra listing details (all editable in /admin/properties/<id>/edit)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS locality VARCHAR(200);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS price_band VARCHAR(20);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS highlights JSONB DEFAULT '[]';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS good_for JSONB DEFAULT '[]';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS nearby JSONB DEFAULT '[]';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS website VARCHAR(500);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS photo_source VARCHAR(500);

-- 3. Admin compliance tracking
ALTER TABLE properties ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS compliance JSONB DEFAULT '{}';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;

-- 4. Panchvati was imported with a locality ('kharota') instead of an area.
UPDATE properties SET destination_slug = 'dharamshala', locality = COALESCE(locality, 'Kharota, Rakkar Road')
WHERE slug = 'panchvati-cottages' AND destination_slug = 'kharota';
