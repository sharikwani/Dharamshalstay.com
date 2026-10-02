-- migration-v10: stop the public API key from reading private property data
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- Problem: two policies let ANYONE holding the public (anon) key read every
-- column of every published property through the Supabase REST API --
-- including admin_notes, compliance, owner_email, contact details and
-- commission_pct. A third let every partner read every other partner's rows.
--
-- The public website does not need these policies: it reads properties on the
-- server with the service-role key (lib/db.ts), which bypasses RLS.
-- Admins keep full access via "Admin full access properties" (is_admin()).

DROP POLICY IF EXISTS "Public read published properties" ON properties;

DROP POLICY IF EXISTS "Users read own properties" ON properties;
CREATE POLICY "Users read own properties" ON properties
  FOR SELECT USING (
    owner_id = auth.uid()
    OR (owner_email IS NOT NULL AND lower(owner_email) = lower(auth.jwt() ->> 'email'))
    OR is_admin()
  );
