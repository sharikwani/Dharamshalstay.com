-- migration-v12: let partners add and edit their OWN listings again
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- migration-v11 removed a broad "all access" policy that had also been what
-- allowed partners to create/edit listings from /partner. These restore
-- exactly that, scoped to the partner's own rows:
--   - insert a listing they own (it starts as draft / pending review)
--   - edit their own listing while it is a draft or has changes requested
-- Publishing, suspending and editing live listings stay admin-only.

DROP POLICY IF EXISTS "Partners can insert properties" ON properties;
CREATE POLICY "Partners can insert properties" ON properties
  FOR INSERT WITH CHECK (
    auth.uid() = owner_id
    AND status IN ('draft', 'pending_review')
  );

DROP POLICY IF EXISTS "Partners can update own properties" ON properties;
CREATE POLICY "Partners can update own properties" ON properties
  FOR UPDATE
  USING (auth.uid() = owner_id AND status IN ('draft', 'changes_requested'))
  WITH CHECK (auth.uid() = owner_id AND status IN ('draft', 'changes_requested', 'pending_review'));

SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'public' AND tablename = 'properties' ORDER BY policyname;
