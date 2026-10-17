-- migration-v33-retention.sql
-- Keeping bookings instead of losing them: when a guest asks the WhatsApp assistant to cancel (change of plans,
-- travel disruption, weather), it first offers, once each and in order:
--   1. date_change  a free date change
--   2. next_25      keep the booking, get 25% off the next booking (max Rs 2,000), usable from checkout, 6 months
--   3. instant_5    keep the booking, get 5% now: back to the original payment (paid online), off at the hotel
--                   (pay later), or as a credit coupon for the next booking
-- If all are declined the normal cancellation rules apply. Discounts are split 50/50 with the hotel.
-- Run once in the Supabase SQL editor. Safe to re-run.

CREATE TABLE IF NOT EXISTS retention_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE SET NULL,
  step TEXT NOT NULL CHECK (step IN ('date_change', 'next_25', 'instant_5')),
  outcome TEXT NOT NULL DEFAULT 'offered' CHECK (outcome IN ('offered', 'accepted', 'declined')),
  choice TEXT CHECK (choice IN ('refund', 'at_hotel', 'credit')),
  amount INT,                         -- rupees, for instant_5
  reason_code TEXT,
  reason_text TEXT,
  -- instant_5 paid back to the original payment: the owner sends it (Razorpay) and marks it done.
  refund_status TEXT CHECK (refund_status IN ('pending', 'done')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id, step)
);
CREATE INDEX IF NOT EXISTS idx_retention_offers_refund ON retention_offers(refund_status) WHERE refund_status = 'pending';

CREATE TABLE IF NOT EXISTS loyalty_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,   -- the booking the guest kept
  kind TEXT NOT NULL CHECK (kind IN ('next_25', 'credit_5')),
  percent INT,                        -- next_25: 25
  amount INT,                         -- credit_5: fixed rupees
  max_discount INT,                   -- next_25: 2000
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'reserved', 'used', 'void')),
  active_from DATE NOT NULL,          -- the kept booking's checkout (or activity) date
  valid_until DATE NOT NULL,
  funding TEXT NOT NULL DEFAULT 'split_50',
  used_booking_ref TEXT,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id, kind)
);
CREATE INDEX IF NOT EXISTS idx_loyalty_coupons_phone ON loyalty_coupons(phone);

-- Server only (service role); no public access.
ALTER TABLE retention_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_coupons ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON retention_offers FROM anon, authenticated;
REVOKE ALL ON loyalty_coupons FROM anon, authenticated;
