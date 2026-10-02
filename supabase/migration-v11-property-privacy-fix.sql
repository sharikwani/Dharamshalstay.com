-- migration-v11: make sure the public API key cannot read the properties table
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- migration-v10 dropped the policies we knew about, but the public key could
-- still read rows -- the live database has extra read policies (or RLS was
-- off). This removes EVERY read policy on `properties`, whatever its name,
-- and recreates only the intended ones. Insert/update policies are untouched.
-- The public website is unaffected: it reads with the service-role key.

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname, cmd, qual FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'properties'
      AND (cmd = 'SELECT' OR (cmd = 'ALL' AND coalesce(qual, '') NOT ILIKE '%is_admin%'))
  LOOP
    RAISE NOTICE 'Dropping policy % (%)', pol.policyname, pol.cmd;
    EXECUTE format('DROP POLICY %I ON public.properties', pol.policyname);
  END LOOP;
END $$;

-- Owners (by account or by assigned email) and admins can read; nobody else.
CREATE POLICY "Users read own properties" ON properties
  FOR SELECT USING (
    owner_id = auth.uid()
    OR (owner_email IS NOT NULL AND lower(owner_email) = lower(auth.jwt() ->> 'email'))
    OR is_admin()
  );

-- Admins keep full access (recreated only if it was missing).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'properties' AND policyname = 'Admin full access properties') THEN
    CREATE POLICY "Admin full access properties" ON properties FOR ALL USING (is_admin());
  END IF;
END $$;

-- What remains (shown in the results panel):
SELECT policyname, cmd, roles FROM pg_policies WHERE schemaname = 'public' AND tablename = 'properties' ORDER BY policyname;
