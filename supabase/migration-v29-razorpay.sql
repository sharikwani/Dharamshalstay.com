-- migration-v29: Razorpay payments. A booking keeps its open Razorpay Payment Link and the payment that paid it,
-- like stripe_session_id / stripe_payment_intent, and 'razorpay' becomes a payment channel. Safe to re-run.
BEGIN;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS razorpay_link_id VARCHAR(100);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_bookings_razorpay_link ON bookings(razorpay_link_id);

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_channel_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_payment_channel_check
  CHECK (payment_channel IN ('upi','bank','cash','card','stripe','razorpay'));
COMMIT;
