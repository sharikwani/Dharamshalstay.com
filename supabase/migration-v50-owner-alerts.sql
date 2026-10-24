-- v50: owner alerts on WhatsApp. Every admin email alert can also reach the owner's WhatsApp
-- (approved template owner_alert). Mode: off, important (bookings, enquiries, payments, cancellations,
-- chats needing a person, partner news) or all. Starts off until the template is approved.
ALTER TABLE whatsapp_settings ADD COLUMN IF NOT EXISTS owner_alerts TEXT NOT NULL DEFAULT 'off'; -- switched to 'important' once Meta approves owner_alert
ALTER TABLE whatsapp_settings DROP CONSTRAINT IF EXISTS whatsapp_settings_owner_alerts_check;
ALTER TABLE whatsapp_settings ADD CONSTRAINT whatsapp_settings_owner_alerts_check CHECK (owner_alerts IN ('off', 'important', 'all'));
-- The owner's WhatsApp (digits with country code); the public office number by default.
ALTER TABLE whatsapp_settings ADD COLUMN IF NOT EXISTS owner_phone TEXT DEFAULT '919805700665';

-- Owner alerts are logged with the other sent templates.
ALTER TABLE whatsapp_messages DROP CONSTRAINT IF EXISTS whatsapp_messages_recipient_kind_check;
ALTER TABLE whatsapp_messages ADD CONSTRAINT whatsapp_messages_recipient_kind_check
  CHECK (recipient_kind IN ('partner', 'staff', 'hotel', 'guide', 'customer', 'owner'));
