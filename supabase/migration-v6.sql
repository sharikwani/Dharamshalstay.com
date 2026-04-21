-- Migration v6: Property owner email assignment
-- Run in Supabase SQL Editor
-- Allows admin to assign a property to an email address.
-- When that person signs up/logs in with that email, they see their property in their account.

ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_email VARCHAR(200);

CREATE INDEX IF NOT EXISTS idx_properties_owner_email ON properties(owner_email) WHERE owner_email IS NOT NULL;

-- Allow users to read properties assigned to their email
DROP POLICY IF EXISTS "Users read own properties" ON properties;
CREATE POLICY "Users read own properties" ON properties
  FOR SELECT USING (
    -- Public can see published
    status = 'published'
    -- Owner by user ID
    OR owner_id = auth.uid()
    -- Owner by email match
    OR owner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    -- Admin/partner can see all
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'partner'))
  );
