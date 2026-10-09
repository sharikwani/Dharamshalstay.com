-- migration-v14: booking privacy + customer sign-up role
-- Run once, before v15. Never re-run after v15 (re-running v15 afterwards restores its guards).
-- Section 0 can also run on its own as an urgent hotfix.

-- 0. Trusted-caller check and role/listing guards (hotfix for v13).
--    Problem: protect_profile_role / protect_property_admin_fields were
--    SECURITY DEFINER, so they run as the function owner (postgres). Inside
--    them current_user is 'postgres', and is_trusted_caller() checked
--    current_user IN ('postgres', ...), so EVERY browser caller passed and any
--    user could set role = 'admin'.
--    Fix: check session_user instead. session_user is the login role that
--    opened the connection (PostgREST connects as 'authenticator'), and it is
--    not changed by SECURITY DEFINER. Server code is recognised by its JWT role.
--    The guard functions are no longer SECURITY DEFINER, so current_user is
--    the caller inside them.
CREATE OR REPLACE FUNCTION is_trusted_caller()
RETURNS BOOLEAN AS $$
  SELECT coalesce(auth.role(), '') = 'service_role'
      OR session_user IN ('postgres', 'supabase_admin');
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT is_trusted_caller() AND NOT is_admin() THEN
    RAISE EXCEPTION 'Only an admin can change account roles';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

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
$$ LANGUAGE plpgsql SET search_path = public;

-- 1. "Users read own bookings" (v4) let ANY partner read EVERY booking, guest
--    phone numbers included. Customers now read only their own; partners keep
--    "Partner read own property bookings" (v3); admins keep is_admin().
DROP POLICY IF EXISTS "Users read own bookings" ON bookings;
DROP POLICY IF EXISTS "Customers read own bookings" ON bookings;
CREATE POLICY "Customers read own bookings" ON bookings
  FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 2. Bookings are created only by /api/bookings (service role), which prices
--    them. Direct inserts from the browser could set any amount.
DROP POLICY IF EXISTS "Anyone can insert bookings" ON bookings;
DROP POLICY IF EXISTS "Public insert bookings" ON bookings;

-- 3. (Repair of customer accounts wrongly created as 'partner' moved to v15,
--    where it runs before the hotel backfill and only for pre-existing accounts.)

-- Release check (run as an authenticated NON-admin user, e.g. via the
-- Supabase client with a normal user's JWT, NOT the SQL editor, which is
-- trusted). This statement must fail with 'Only an admin can change account roles':
--   UPDATE profiles SET role = 'admin' WHERE id = auth.uid();
