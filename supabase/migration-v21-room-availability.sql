-- migration-v21: room availability calendar. Run once in the Supabase SQL editor after v20. Safe to re-run.

CREATE TABLE IF NOT EXISTS room_availability (
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  room_key TEXT NOT NULL,
  date DATE NOT NULL,
  units INT NOT NULL CHECK (units >= 0),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (property_id, room_key, date)
);

-- The room type's exact name for new hotel bookings. Old bookings stay null and are matched by room_name.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS room_key TEXT;
CREATE INDEX IF NOT EXISTS idx_bookings_property_stay ON bookings(property_id, check_in, check_out);

-- Reads for the admin and the owning partner; no write policies: only the service role (API routes) writes.
ALTER TABLE room_availability ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin reads room availability" ON room_availability;
CREATE POLICY "Admin reads room availability" ON room_availability FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "Partners read own room availability" ON room_availability;
CREATE POLICY "Partners read own room availability" ON room_availability FOR SELECT USING (
  EXISTS (SELECT 1 FROM properties p WHERE p.id = room_availability.property_id AND p.owner_id = auth.uid())
);
