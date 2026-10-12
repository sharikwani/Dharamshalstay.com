-- migration-v19: WhatsApp AI assistant chats. Run once in the Supabase SQL editor after v18. Safe to re-run.

CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  profile_name TEXT,
  status TEXT NOT NULL DEFAULT 'ai' CHECK (status IN ('ai','human','needs_human','closed')),
  handover_reason TEXT,
  last_customer_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unread_admin INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wa_conv_last ON whatsapp_conversations(last_message_at DESC);

CREATE TABLE IF NOT EXISTS whatsapp_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('in','out')),
  author TEXT NOT NULL CHECK (author IN ('customer','ai','admin')),
  body TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'text' CHECK (kind IN ('text','voice','media','system')),
  wa_message_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received','sent','delivered','read','failed')),
  error TEXT,
  admin_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wa_chat_conv ON whatsapp_chat_messages(conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS whatsapp_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  ai_mode TEXT NOT NULL DEFAULT 'test' CHECK (ai_mode IN ('off','test','on')),
  test_numbers TEXT[] NOT NULL DEFAULT ARRAY['919805700665'],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO whatsapp_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'website';
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS whatsapp_conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE SET NULL;

ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin reads whatsapp conversations" ON whatsapp_conversations;
CREATE POLICY "Admin reads whatsapp conversations" ON whatsapp_conversations FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "Admin reads whatsapp chat messages" ON whatsapp_chat_messages;
CREATE POLICY "Admin reads whatsapp chat messages" ON whatsapp_chat_messages FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "Admin reads whatsapp settings" ON whatsapp_settings;
CREATE POLICY "Admin reads whatsapp settings" ON whatsapp_settings FOR SELECT USING (is_admin());

SELECT ai_mode, test_numbers FROM whatsapp_settings;
