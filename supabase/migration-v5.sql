-- Migration v5: Fix property delete
-- The primary fix is the server-side API route at /api/admin/properties/[id]
-- which uses the service role key and bypasses RLS.
-- This migration adds an RLS policy as a fallback so admins can delete
-- directly via the client too if ever needed.
-- Run this in Supabase SQL Editor.

-- Allow admins to delete properties via RLS (fallback)
DROP POLICY IF EXISTS "Admin delete properties" ON properties;
CREATE POLICY "Admin delete properties" ON properties
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Ensure the bookings table allows property_id to be set to NULL
-- (needed when deleting a property that has bookings)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'property_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE bookings ALTER COLUMN property_id DROP NOT NULL;
  END IF;
END $$;

-- Same for inquiries if that table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inquiries') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'inquiries' AND column_name = 'property_id' AND is_nullable = 'NO'
    ) THEN
      ALTER TABLE inquiries ALTER COLUMN property_id DROP NOT NULL;
    END IF;
  END IF;
END $$;

-- Change foreign key constraints to ON DELETE SET NULL so DB handles cleanup automatically
-- This is a safety net in case the API route's manual cleanup misses something.
DO $$
BEGIN
  -- bookings.property_id
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'bookings' AND constraint_name = 'bookings_property_id_fkey'
  ) THEN
    ALTER TABLE bookings DROP CONSTRAINT bookings_property_id_fkey;
    ALTER TABLE bookings ADD CONSTRAINT bookings_property_id_fkey
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL;
  END IF;

  -- inquiries.property_id (if exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inquiries') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = 'inquiries' AND constraint_name = 'inquiries_property_id_fkey'
    ) THEN
      ALTER TABLE inquiries DROP CONSTRAINT inquiries_property_id_fkey;
      ALTER TABLE inquiries ADD CONSTRAINT inquiries_property_id_fkey
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL;
    END IF;
  END IF;

  -- commission_records.property_id (if exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'commission_records') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = 'commission_records' AND constraint_name = 'commission_records_property_id_fkey'
    ) THEN
      ALTER TABLE commission_records DROP CONSTRAINT commission_records_property_id_fkey;
      ALTER TABLE commission_records ADD CONSTRAINT commission_records_property_id_fkey
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL;
    END IF;
  END IF;

  -- notification_log.property_id (if exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_log') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = 'notification_log' AND constraint_name = 'notification_log_property_id_fkey'
    ) THEN
      ALTER TABLE notification_log DROP CONSTRAINT notification_log_property_id_fkey;
      ALTER TABLE notification_log ADD CONSTRAINT notification_log_property_id_fkey
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;
