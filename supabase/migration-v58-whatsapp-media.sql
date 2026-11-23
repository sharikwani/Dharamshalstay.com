-- v58: keep photos and documents people send us on WhatsApp (owner, 23 Nov 2026), so the admin inbox can show
-- them (rate cards, payment screenshots, IDs). Private bucket: only the server reads it and hands the admin a
-- short-lived signed link. Safe to re-run.

ALTER TABLE whatsapp_chat_messages ADD COLUMN IF NOT EXISTS media_path TEXT;
ALTER TABLE whatsapp_chat_messages ADD COLUMN IF NOT EXISTS media_mime TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('whatsapp-media', 'whatsapp-media', false, 16777216)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 16777216;

-- Check: columns and private bucket exist.
SELECT 'media_path column' AS what, count(*)::text AS value FROM information_schema.columns
  WHERE table_name = 'whatsapp_chat_messages' AND column_name = 'media_path'
UNION ALL
SELECT 'bucket public?', public::text FROM storage.buckets WHERE id = 'whatsapp-media';
