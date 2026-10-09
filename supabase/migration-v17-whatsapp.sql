-- migration-v17: WhatsApp booking alerts. Additive; safe to re-run.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_alerts BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in_at TIMESTAMPTZ;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS whatsapp_alerts BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE guides ADD COLUMN IF NOT EXISTS whatsapp_alerts BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE partner_staff ADD COLUMN IF NOT EXISTS whatsapp_alerts BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS partner_response TEXT CHECK (partner_response IN ('accepted','declined')),
  ADD COLUMN IF NOT EXISTS partner_responded_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  recipient_kind TEXT NOT NULL CHECK (recipient_kind IN ('partner','staff','hotel','guide','customer')),
  to_phone TEXT NOT NULL,
  template TEXT NOT NULL,
  wa_message_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','delivered','read','failed')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_booking ON whatsapp_messages(booking_id);
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin reads whatsapp messages" ON whatsapp_messages;
CREATE POLICY "Admin reads whatsapp messages" ON whatsapp_messages FOR SELECT USING (is_admin());

-- Extended copy of protect_profile_role() from migration-v15-partner-onboarding.sql
-- (WhatsApp fields added to the protected list).
CREATE OR REPLACE FUNCTION protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  IF is_trusted_caller() OR is_admin() THEN RETURN NEW; END IF;
  IF NEW.role IS DISTINCT FROM OLD.role THEN RAISE EXCEPTION 'Only an admin can change account roles'; END IF;
  IF NEW.partner_type IS DISTINCT FROM OLD.partner_type
     OR NEW.partner_status IS DISTINCT FROM OLD.partner_status
     OR NEW.commission_pct IS DISTINCT FROM OLD.commission_pct
     OR NEW.legal_name IS DISTINCT FROM OLD.legal_name
     OR NEW.business_registration_no IS DISTINCT FROM OLD.business_registration_no
     OR NEW.phone IS DISTINCT FROM OLD.phone
     OR NEW.payout_method IS DISTINCT FROM OLD.payout_method
     OR NEW.payout_details IS DISTINCT FROM OLD.payout_details
     OR NEW.pan_number IS DISTINCT FROM OLD.pan_number
     OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
     OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
     OR NEW.verification_note IS DISTINCT FROM OLD.verification_note
     OR NEW.whatsapp_number IS DISTINCT FROM OLD.whatsapp_number
     OR NEW.whatsapp_alerts IS DISTINCT FROM OLD.whatsapp_alerts
     OR NEW.whatsapp_opt_in_at IS DISTINCT FROM OLD.whatsapp_opt_in_at THEN
    RAISE EXCEPTION 'These partner details can only be changed through the partner portal';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
