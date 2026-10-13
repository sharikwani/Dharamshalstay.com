-- migration-v22: WhatsApp-only hotel offers. Run once in the Supabase SQL editor after v21. Safe to re-run.

-- plan_percents: {"<room name>|<plan name>": 1-90, ...}
CREATE OR REPLACE FUNCTION offer_percents_ok(j JSONB) RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
  SELECT jsonb_typeof(j) = 'object' AND COALESCE(bool_and(
    jsonb_typeof(value) = 'number'
    AND (value::text)::numeric = floor((value::text)::numeric)
    AND (value::text)::numeric BETWEEN 1 AND 90), true)
  FROM jsonb_each(CASE WHEN jsonb_typeof(j) = 'object' THEN j ELSE '{}'::jsonb END)
$$;

CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT false,
  default_percent INT NOT NULL CHECK (default_percent BETWEEN 1 AND 90),
  plan_percents JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (offer_percents_ok(plan_percents)),
  valid_hours INT NOT NULL DEFAULT 3 CHECK (valid_hours BETWEEN 1 AND 168),
  code_prefix TEXT NOT NULL CHECK (code_prefix ~ '^[A-Z]{2,5}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- One active offer per property at a time.
CREATE UNIQUE INDEX IF NOT EXISTS uq_offers_one_active_per_property ON offers(property_id) WHERE active;

CREATE TABLE IF NOT EXISTS offer_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE SET NULL,
  percent INT NOT NULL CHECK (percent BETWEEN 1 AND 90),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  booked_percent INT CHECK (booked_percent BETWEEN 1 AND 90),
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','booked','redeemed','cancelled')),
  redeemed_at TIMESTAMPTZ,
  redeemed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT
);
-- Expired = status 'issued' AND expires_at < now() (computed, not stored).
CREATE INDEX IF NOT EXISTS idx_offer_codes_phone ON offer_codes(offer_id, phone, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_offer_codes_booking ON offer_codes(booking_id);
CREATE INDEX IF NOT EXISTS idx_offer_codes_issued ON offer_codes(issued_at DESC);

CREATE TABLE IF NOT EXISTS offer_code_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID REFERENCES offer_codes(id) ON DELETE SET NULL,
  code_entered TEXT NOT NULL,
  checked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  result TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_offer_code_checks_by ON offer_code_checks(checked_by, created_at DESC);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS offer_code TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS offer_percent INT CHECK (offer_percent BETWEEN 1 AND 90);

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_code_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin reads offers" ON offers;
CREATE POLICY "Admin reads offers" ON offers FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "Admin reads offer codes" ON offer_codes;
CREATE POLICY "Admin reads offer codes" ON offer_codes FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "Admin reads offer code checks" ON offer_code_checks;
CREATE POLICY "Admin reads offer code checks" ON offer_code_checks FOR SELECT USING (is_admin());
-- No write policies: all writes go through API routes with the service role.

-- Seed: Panchvati Cottages offer, switched off until the owner turns it on in Admin -> WhatsApp offers.
INSERT INTO offers (property_id, name, active, default_percent, valid_hours, code_prefix)
SELECT p.id, 'WhatsApp offer – Panchvati Cottages', false, 25, 3, 'PNV'
FROM properties p
WHERE p.id = 'da442d47-cd48-41d5-a301-a1513999d9a8'
  AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.property_id = p.id);

SELECT o.name, o.active, o.default_percent, o.valid_hours, o.code_prefix, p.slug
FROM offers o JOIN properties p ON p.id = o.property_id;
