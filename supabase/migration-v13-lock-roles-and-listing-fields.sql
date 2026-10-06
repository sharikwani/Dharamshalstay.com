-- migration-v13: stop self-promotion to admin, and stop partners setting
-- fields only the admin should control. Run once in the Supabase SQL editor.
-- Safe to re-run.
--
-- 1. Sign-up: handle_new_user() copied `role` from the sign-up metadata, which
--    the browser controls. Anyone could call supabase.auth.signUp() with
--    { role: 'admin' } using the public key and get the admin panel.
--    Now only 'user' or 'partner' can come from sign-up.
-- 2. Profiles: "Partners can update own profile" had no column limits, so a
--    partner could UPDATE profiles SET role = 'admin' on their own row.
--    A trigger now blocks role changes unless an admin (or the service role /
--    SQL editor) makes them.
-- 3. Listings: partners write rows directly, so they could set rating,
--    review_count, featured, sponsorship or publish dates on a draft and have
--    them go live on approval. A trigger now resets those for non-admins.

-- 1. Sign-up role whitelist ------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, role, full_name, phone, business_name)
  VALUES (
    NEW.id,
    NEW.email,
    CASE WHEN NEW.raw_user_meta_data->>'role' IN ('user', 'partner')
         THEN NEW.raw_user_meta_data->>'role' ELSE 'partner' END,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'business_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trusted callers: the service-role key (server code) and the SQL editor.
CREATE OR REPLACE FUNCTION is_trusted_caller()
RETURNS BOOLEAN AS $$
  SELECT coalesce(auth.role(), '') = 'service_role'
      OR current_user IN ('postgres', 'supabase_admin');
$$ LANGUAGE sql STABLE;

-- 2. Role changes only by admins ----------------------------------------------
CREATE OR REPLACE FUNCTION protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT is_trusted_caller() AND NOT is_admin() THEN
    RAISE EXCEPTION 'Only an admin can change account roles';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS protect_profile_role ON profiles;
CREATE TRIGGER protect_profile_role
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_profile_role();

-- 3. Admin-only listing fields ------------------------------------------------
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
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS protect_property_admin_fields ON properties;
CREATE TRIGGER protect_property_admin_fields
  BEFORE INSERT OR UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION protect_property_admin_fields();

-- Check: there should be exactly the admin accounts you expect.
SELECT id, email, role, created_at FROM profiles WHERE role = 'admin' ORDER BY created_at;
