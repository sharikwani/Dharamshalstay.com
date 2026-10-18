-- v40: the filled-in values of every WhatsApp template we send, so admin can read the exact message
-- (Admin -> WhatsApp -> Sent messages). Server-only, like the other WhatsApp tables.
CREATE TABLE IF NOT EXISTS whatsapp_template_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_message_id TEXT NOT NULL,
  to_phone TEXT NOT NULL,
  template TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  params JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS whatsapp_template_sends_msg_idx ON whatsapp_template_sends (wa_message_id);
ALTER TABLE whatsapp_template_sends ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON whatsapp_template_sends FROM anon, authenticated;
