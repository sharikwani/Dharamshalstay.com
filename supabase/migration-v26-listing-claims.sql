-- migration-v26: claim / removal requests for listings, and WhatsApp outreach to listed hotels.
-- Additive; safe to re-run.

CREATE TABLE IF NOT EXISTS listing_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('claim','removal')),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  role TEXT,
  message TEXT,
  -- TRUE when the request came through the private link we sent to the hotel's own phone.
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done','rejected')),
  admin_note TEXT,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_listing_requests_status ON listing_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listing_requests_ip ON listing_requests(ip_hash, created_at DESC);
ALTER TABLE listing_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access listing requests" ON listing_requests;
CREATE POLICY "Admin full access listing requests" ON listing_requests FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Listings never to be sent the outreach message (e.g. the only number is a chain's head office).
ALTER TABLE properties ADD COLUMN IF NOT EXISTS outreach_skip BOOLEAN NOT NULL DEFAULT FALSE;

-- Outreach messages are logged with the booking alerts, so delivery receipts from the webhook update them too.
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_property ON whatsapp_messages(property_id) WHERE property_id IS NOT NULL;
