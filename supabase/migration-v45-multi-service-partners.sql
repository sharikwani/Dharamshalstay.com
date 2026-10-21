-- migration-v45: partners who offer several services (e.g. taxi + trek + paragliding), and fuller vehicle details.
-- Run once in the Supabase SQL editor after v44. Safe to re-run.

-- 1. Services a partner offers. partner_type stays as the main one; partner_services lists all of them.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS partner_services TEXT[];
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_partner_services_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_partner_services_check
  CHECK (partner_services IS NULL OR partner_services <@ ARRAY['paragliding','taxi','trek']::TEXT[]);
UPDATE profiles SET partner_services = ARRAY[partner_type]
  WHERE role = 'partner' AND partner_type IN ('paragliding','taxi','trek') AND partner_services IS NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_partner_services ON profiles USING GIN (partner_services);

-- Partners must not change their own services (the admin sets them), like partner_type.
CREATE OR REPLACE FUNCTION guard_partner_services() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF is_trusted_caller() OR is_admin() THEN RETURN NEW; END IF;
  IF NEW.partner_services IS DISTINCT FROM OLD.partner_services THEN
    RAISE EXCEPTION 'Partners cannot change their own services';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_partner_services ON profiles;
CREATE TRIGGER trg_guard_partner_services BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION guard_partner_services();

-- 2. Vehicles: hatchbacks, fuel, colour, and new cars whose registration number has not been issued yet.
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_vehicle_type_check;
ALTER TABLE vehicles ADD CONSTRAINT vehicles_vehicle_type_check CHECK (vehicle_type IN ('hatchback','sedan','suv','innova','tempo','bus'));
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fuel TEXT CHECK (fuel IS NULL OR fuel IN ('petrol','diesel','cng','electric'));
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS colour TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS notes TEXT;
-- "Applied for": no number yet. Numbers that exist stay unique.
ALTER TABLE vehicles ALTER COLUMN registration_no DROP NOT NULL;
