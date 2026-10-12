-- migration-v18: close partner security gaps found in the October 2026 review.
-- Run once in the Supabase SQL editor, AFTER v17. Safe to re-run.
--
--  1. Partners can no longer change their profile email / active flag / GST number
--     (the admin "assign listing by email" step trusted profiles.email).
--  2. Partners can no longer set commission or other admin-only listing fields.
--  3. Only hotel partners can create hotel listings.
--  4. Staff WhatsApp alerts are off until the partner records consent.
--  5. property-images: no public file listing; partners may only write in their own folder.
--  6. Public (anon) reads of taxi_routes / treks / paragliding_packages / guides removed:
--     the public site reads them server-side with the service role.
--  6b. Hotel partners no longer read the bookings table directly (API only).
--  7. search_path pinned on the remaining SECURITY DEFINER functions.

-- 1. Profile: extended copy of protect_profile_role() from v17 (email, is_active, gst_number added).
CREATE OR REPLACE FUNCTION protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  IF is_trusted_caller() OR is_admin() THEN RETURN NEW; END IF;
  IF NEW.role IS DISTINCT FROM OLD.role THEN RAISE EXCEPTION 'Only an admin can change account roles'; END IF;
  IF NEW.partner_type IS DISTINCT FROM OLD.partner_type
     OR NEW.partner_status IS DISTINCT FROM OLD.partner_status
     OR NEW.commission_pct IS DISTINCT FROM OLD.commission_pct
     OR NEW.legal_name IS DISTINCT FROM OLD.legal_name
     OR NEW.business_registration_no IS DISTINCT FROM OLD.business_registration_no
     OR NEW.phone IS DISTINCT FROM OLD.phone
     OR NEW.payout_method IS DISTINCT FROM OLD.payout_method
     OR NEW.payout_details IS DISTINCT FROM OLD.payout_details
     OR NEW.pan_number IS DISTINCT FROM OLD.pan_number
     OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
     OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
     OR NEW.verification_note IS DISTINCT FROM OLD.verification_note
     OR NEW.whatsapp_number IS DISTINCT FROM OLD.whatsapp_number
     OR NEW.whatsapp_alerts IS DISTINCT FROM OLD.whatsapp_alerts
     OR NEW.whatsapp_opt_in_at IS DISTINCT FROM OLD.whatsapp_opt_in_at
     OR NEW.whatsapp_opt_in_by IS DISTINCT FROM OLD.whatsapp_opt_in_by
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.gst_number IS DISTINCT FROM OLD.gst_number THEN
    RAISE EXCEPTION 'These partner details can only be changed through the partner portal';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 2. Listings: extended copy of protect_property_admin_fields() from v14.
CREATE OR REPLACE FUNCTION protect_property_admin_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF is_trusted_caller() OR is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.rating := 0;
    NEW.review_count := 0;
    NEW.featured := false;
    NEW.is_sponsored := false;
    NEW.priority_score := 0;
    NEW.published_at := NULL;
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
    NEW.listing_type := 'partner';
    NEW.commission_pct := 10.00;
    NEW.admin_notes := NULL;
    NEW.rejection_reason := NULL;
    NEW.compliance := '{}'::jsonb;
    NEW.last_verified_at := NULL;
    NEW.published_by := NULL;
    NEW.sort_order := 0;
    NEW.whatsapp_alerts := false;
    NEW.owner_email := NULL;
    NEW.submitted_at := CASE WHEN NEW.status = 'pending_review' THEN NOW() ELSE NULL END;
  ELSE
    NEW.rating := OLD.rating;
    NEW.review_count := OLD.review_count;
    NEW.featured := OLD.featured;
    NEW.is_sponsored := OLD.is_sponsored;
    NEW.priority_score := OLD.priority_score;
    NEW.published_at := OLD.published_at;
    NEW.reviewed_by := OLD.reviewed_by;
    NEW.reviewed_at := OLD.reviewed_at;
    NEW.listing_type := OLD.listing_type;
    NEW.owner_id := OLD.owner_id;
    NEW.owner_email := OLD.owner_email;
    NEW.commission_pct := OLD.commission_pct;
    NEW.admin_notes := OLD.admin_notes;
    NEW.rejection_reason := OLD.rejection_reason;
    NEW.compliance := OLD.compliance;
    NEW.last_verified_at := OLD.last_verified_at;
    NEW.published_by := OLD.published_by;
    NEW.sort_order := OLD.sort_order;
    NEW.whatsapp_alerts := OLD.whatsapp_alerts;
    NEW.slug := OLD.slug;
    NEW.submitted_at := CASE
      WHEN NEW.status = 'pending_review' AND OLD.status IS DISTINCT FROM 'pending_review' THEN NOW()
      ELSE OLD.submitted_at END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 3. Only hotel partners create listings (customers and activity partners cannot).
DROP POLICY IF EXISTS "Partners can insert properties" ON properties;
CREATE POLICY "Partners can insert properties" ON properties
  FOR INSERT WITH CHECK (
    auth.uid() = owner_id
    AND status IN ('draft', 'pending_review')
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'partner' AND p.partner_type = 'hotel')
  );

-- 4. Staff alerts need explicit consent.
ALTER TABLE partner_staff ALTER COLUMN whatsapp_alerts SET DEFAULT FALSE;
UPDATE partner_staff SET whatsapp_alerts = FALSE WHERE whatsapp_alerts;

-- 5. property-images bucket: drop every existing policy for this bucket, then recreate narrowly.
--    Public image URLs keep working (the bucket is public); only listing via the API is removed.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (coalesce(qual, '') LIKE '%property-images%' OR coalesce(with_check, '') LIKE '%property-images%')
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "property-images owner insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'property-images' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));
CREATE POLICY "property-images owner update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'property-images' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()))
  WITH CHECK (bucket_id = 'property-images' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));
CREATE POLICY "property-images owner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'property-images' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));

-- 6. No anon reads of catalogue tables (these exposed commission_pct, created_by, guide phone/email).
DROP POLICY IF EXISTS "Public read active taxis" ON taxi_routes;
DROP POLICY IF EXISTS "Public read published treks" ON treks;
DROP POLICY IF EXISTS "Public read published paragliding" ON paragliding_packages;
DROP POLICY IF EXISTS "Public read active guides" ON guides;

-- 6b. Hotel partners read bookings only through /api/partner/bookings, which hides guest
--     phone/email until a booking is confirmed. Remove the direct table read.
DROP POLICY IF EXISTS "Partner read own property bookings" ON bookings;

-- 7. Pin search_path on SECURITY DEFINER functions that lacked it.
ALTER FUNCTION is_admin() SET search_path = public;
ALTER FUNCTION create_commission_record() SET search_path = public;

-- Check: expect the new policies listed and no anon policies on the catalogue tables.
SELECT schemaname, tablename, policyname, cmd FROM pg_policies
WHERE (schemaname = 'storage' AND tablename = 'objects')
   OR (schemaname = 'public' AND tablename IN ('properties', 'taxi_routes', 'treks', 'paragliding_packages', 'guides', 'bookings'))
ORDER BY schemaname, tablename, policyname;
