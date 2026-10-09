-- migration-v15: paragliding / taxi / trek partner onboarding
-- Partners never write these tables directly: every write goes through
-- /api/partner/* (service role) so files, formats and state changes are
-- checked on the server. The browser may only READ its own rows.

-- 1. Partner columns on profiles ---------------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS partner_type TEXT CHECK (partner_type IN ('hotel','paragliding','taxi','trek')),
  ADD COLUMN IF NOT EXISTS partner_status TEXT CHECK (partner_status IN
    ('onboarding','pending_verification','verified','changes_requested','suspended','rejected')),
  ADD COLUMN IF NOT EXISTS commission_pct NUMERIC(5,2) NOT NULL DEFAULT 20 CHECK (commission_pct BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS legal_name TEXT,
  ADD COLUMN IF NOT EXISTS business_registration_no TEXT,
  ADD COLUMN IF NOT EXISTS payout_method TEXT CHECK (payout_method IN ('bank','upi')),
  ADD COLUMN IF NOT EXISTS payout_details JSONB,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_note TEXT;

-- Existing partners are hotel owners; they keep the listing-review flow.
UPDATE profiles SET partner_type = 'hotel' WHERE role = 'partner' AND partner_type IS NULL;

-- 2. Sign-up: carry the chosen partner type; activity partners start onboarding.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  r TEXT := CASE WHEN NEW.raw_user_meta_data->>'role' IN ('user','partner') THEN NEW.raw_user_meta_data->>'role' ELSE 'partner' END;
  t TEXT := CASE WHEN NEW.raw_user_meta_data->>'partner_type' IN ('hotel','paragliding','taxi','trek') THEN NEW.raw_user_meta_data->>'partner_type' ELSE 'hotel' END;
BEGIN
  INSERT INTO profiles (id, email, role, full_name, phone, business_name, partner_type, partner_status)
  VALUES (
    NEW.id, NEW.email, r,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'business_name', ''),
    CASE WHEN r = 'partner' THEN t END,
    CASE WHEN r = 'partner' AND t <> 'hotel' THEN 'onboarding' END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Only admins / server code may change verification and money fields.
CREATE OR REPLACE FUNCTION protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  IF is_trusted_caller() OR is_admin() THEN RETURN NEW; END IF;
  IF NEW.role IS DISTINCT FROM OLD.role THEN RAISE EXCEPTION 'Only an admin can change account roles'; END IF;
  IF NEW.partner_type IS DISTINCT FROM OLD.partner_type
     OR NEW.partner_status IS DISTINCT FROM OLD.partner_status
     OR NEW.commission_pct IS DISTINCT FROM OLD.commission_pct
     OR NEW.legal_name IS DISTINCT FROM OLD.legal_name
     OR NEW.payout_method IS DISTINCT FROM OLD.payout_method
     OR NEW.payout_details IS DISTINCT FROM OLD.payout_details
     OR NEW.pan_number IS DISTINCT FROM OLD.pan_number
     OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
     OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
     OR NEW.verification_note IS DISTINCT FROM OLD.verification_note THEN
    RAISE EXCEPTION 'These partner details can only be changed through the partner portal';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Staff (drivers, pilots, guides) and vehicles ----------------------------
CREATE TABLE IF NOT EXISTS partner_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('driver','pilot','guide')),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  licence_no TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_partner_staff_partner ON partner_staff(partner_id);

CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('sedan','suv','innova','tempo','bus')),
  make_model TEXT NOT NULL,
  registration_no TEXT NOT NULL UNIQUE,
  seats INT NOT NULL CHECK (seats BETWEEN 1 AND 60),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vehicles_partner ON vehicles(partner_id);

-- 5. KYC documents -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS partner_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('aadhaar_front','aadhaar_back','pan','tourism_registration',
    'driving_licence','pilot_licence','vehicle_rc','vehicle_permit','vehicle_insurance','other')),
  staff_id UUID REFERENCES partner_staff(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT,
  mime_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  rejection_reason TEXT,
  expires_on DATE,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_partner_documents_partner ON partner_documents(partner_id);

-- 6. Signed agreements (append-only) -------------------------------------------
CREATE TABLE IF NOT EXISTS partner_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  body_text TEXT NOT NULL,
  body_sha256 TEXT NOT NULL,
  signed_name TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip TEXT,
  user_agent TEXT,
  pdf_path TEXT,
  UNIQUE (partner_id, version)
);

-- 7. RLS: partners read their own rows; admins everything; no client writes.
ALTER TABLE partner_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Partner reads own staff" ON partner_staff;
CREATE POLICY "Partner reads own staff" ON partner_staff FOR SELECT USING (partner_id = auth.uid());
DROP POLICY IF EXISTS "Admin full access staff" ON partner_staff;
CREATE POLICY "Admin full access staff" ON partner_staff FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Partner reads own vehicles" ON vehicles;
CREATE POLICY "Partner reads own vehicles" ON vehicles FOR SELECT USING (partner_id = auth.uid());
DROP POLICY IF EXISTS "Admin full access vehicles" ON vehicles;
CREATE POLICY "Admin full access vehicles" ON vehicles FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Partner reads own documents" ON partner_documents;
CREATE POLICY "Partner reads own documents" ON partner_documents FOR SELECT USING (partner_id = auth.uid());
DROP POLICY IF EXISTS "Admin full access documents" ON partner_documents;
CREATE POLICY "Admin full access documents" ON partner_documents FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Partner reads own agreements" ON partner_agreements;
CREATE POLICY "Partner reads own agreements" ON partner_agreements FOR SELECT USING (partner_id = auth.uid());
DROP POLICY IF EXISTS "Admin reads agreements" ON partner_agreements;
CREATE POLICY "Admin reads agreements" ON partner_agreements FOR SELECT USING (is_admin());

-- 8. Private KYC bucket. No storage.objects policies on purpose: only the
--    service role (our API) can read or write; people get 5-minute signed URLs.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('partner-kyc', 'partner-kyc', false, 8388608, ARRAY['image/jpeg','image/png','application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 8388608,
  allowed_mime_types = ARRAY['image/jpeg','image/png','application/pdf'];
