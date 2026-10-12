-- migration-v20: WhatsApp bookings and cancellations. Run once in the Supabase SQL editor after v19. Safe to re-run.

CREATE TABLE IF NOT EXISTS whatsapp_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('hotel','taxi','trek','paragliding')),
  input JSONB NOT NULL,
  amount INT NOT NULL DEFAULT 0,
  summary TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wa_quotes_conv ON whatsapp_quotes(conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS whatsapp_cancellations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  reason_code TEXT NOT NULL CHECK (reason_code IN ('medical','travel_disruption','family_emergency','weather_road','duplicate_or_mistake','other')),
  reason_text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'awaiting_proof' CHECK (status IN ('awaiting_proof','cancelled','needs_review','handed_over')),
  proof_path TEXT,
  verdict TEXT CHECK (verdict IN ('matches','mismatch','unclear')),
  verdict_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wa_cancel_conv ON whatsapp_cancellations(conversation_id, created_at DESC);

ALTER TABLE whatsapp_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_cancellations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin reads whatsapp quotes" ON whatsapp_quotes;
CREATE POLICY "Admin reads whatsapp quotes" ON whatsapp_quotes FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "Admin reads whatsapp cancellations" ON whatsapp_cancellations;
CREATE POLICY "Admin reads whatsapp cancellations" ON whatsapp_cancellations FOR SELECT USING (is_admin());

-- Private proof bucket. No storage.objects policies: only the service role reads or writes; the owner gets signed links.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('whatsapp-proofs', 'whatsapp-proofs', false, 16777216, ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 16777216,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','application/pdf'];
