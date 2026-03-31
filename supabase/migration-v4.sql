-- Migration v4: User accounts, Stripe payments, availability
-- Run this in Supabase SQL Editor

-- Add user_id to bookings so logged-in users can see their history
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(300);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_payment_intent VARCHAR(300);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS paid_amount INT DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS room_name VARCHAR(200);

CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_stripe ON bookings(stripe_session_id);

-- RLS: Users can read their own bookings
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own bookings" ON bookings;
CREATE POLICY "Users read own bookings" ON bookings
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','partner'))
  );

DROP POLICY IF EXISTS "Anyone can insert bookings" ON bookings;
CREATE POLICY "Anyone can insert bookings" ON bookings
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admin update bookings" ON bookings;
CREATE POLICY "Admin update bookings" ON bookings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Add role 'user' to profiles if not exists
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'partner', 'admin'));
