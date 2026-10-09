-- migration-v16: admin manual bookings (local guide bookings, assignment, payment details)
-- Additive; safe to run on live data and safe to re-run.

-- 1. Local guide bookings
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_category_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_category_check
  CHECK (category IN ('hotel','taxi','trek','paragliding','guide'));

-- 2. Assignment, pricing and payment details
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS guide_id UUID REFERENCES guides(id),
  ADD COLUMN IF NOT EXISTS guide_days INT CHECK (guide_days BETWEEN 1 AND 30),
  ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES partner_staff(id),
  ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES vehicles(id),
  ADD COLUMN IF NOT EXISTS list_amount INT,
  ADD COLUMN IF NOT EXISTS price_overridden BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS price_override_reason TEXT,
  ADD COLUMN IF NOT EXISTS collected_by TEXT CHECK (collected_by IN ('partner','platform')),
  ADD COLUMN IF NOT EXISTS payment_channel TEXT CHECK (payment_channel IN ('upi','bank','cash','card','stripe')),
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS partner_share_amount INT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
CREATE INDEX IF NOT EXISTS idx_bookings_partner ON bookings(partner_id);

-- 3. Booking reference prefix for guide bookings
CREATE OR REPLACE FUNCTION generate_booking_ref()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.category
    WHEN 'hotel' THEN NEW.booking_ref := 'HTL';
    WHEN 'taxi' THEN NEW.booking_ref := 'TXI';
    WHEN 'trek' THEN NEW.booking_ref := 'TRK';
    WHEN 'paragliding' THEN NEW.booking_ref := 'PLG';
    WHEN 'guide' THEN NEW.booking_ref := 'GDE';
    ELSE NEW.booking_ref := 'BKG';
  END CASE;
  NEW.booking_ref := NEW.booking_ref || '-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 5));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Partners read bookings assigned to them
DROP POLICY IF EXISTS "Partner reads assigned bookings" ON bookings;
CREATE POLICY "Partner reads assigned bookings" ON bookings
  FOR SELECT USING (partner_id IS NOT NULL AND partner_id = auth.uid());
