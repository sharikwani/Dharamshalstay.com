-- migration-v31: email engine (contacts + consent, email log, scheduled emails, AI campaigns, settings)
-- Run once in the Supabase SQL editor. Safe to re-run (IF NOT EXISTS / ON CONFLICT).
-- All tables are service-role only (RLS on, no policies): the website reads and writes them from server code.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- One row per person we can reach, merged from bookings, enquiries, WhatsApp, reviews and newsletter sign-ups.
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  phone TEXT,
  name TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  source TEXT NOT NULL DEFAULT 'website',            -- website | whatsapp | booking | review | newsletter | admin
  interests TEXT[] NOT NULL DEFAULT '{}',             -- hotel | taxi | trek | paragliding | monastery | ...
  -- Marketing consent (booking/enquiry emails never need it). Proof is kept: when, where, and the words shown.
  marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
  consent_at TIMESTAMPTZ,
  consent_source TEXT,
  consent_text TEXT,
  double_opt_in_token UUID,                          -- newsletter sign-ups confirm by email first
  unsubscribed_at TIMESTAMPTZ,
  suppressed_reason TEXT,                            -- bounced | complained: never email again
  unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid(),
  booking_count INT NOT NULL DEFAULT 0,
  last_booking_at TIMESTAMPTZ,
  last_enquiry_at TIMESTAMPTZ,
  last_marketing_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS contacts_email_key ON contacts (LOWER(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS contacts_phone_idx ON contacts (phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS contacts_unsub_token_key ON contacts (unsubscribe_token);
CREATE INDEX IF NOT EXISTS contacts_marketing_idx ON contacts (marketing_consent) WHERE marketing_consent AND unsubscribed_at IS NULL AND suppressed_reason IS NULL;

-- Every email we send, with its delivery status from Resend webhooks.
CREATE TABLE IF NOT EXISTS email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  to_email TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'transactional',        -- transactional | marketing | admin
  template TEXT NOT NULL,
  subject TEXT NOT NULL,
  resend_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued',             -- queued | sent | delivered | opened | clicked | bounced | complained | failed | skipped
  error TEXT,
  booking_id UUID,
  inquiry_id UUID,
  campaign_id UUID,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS email_messages_resend_key ON email_messages (resend_id) WHERE resend_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS email_messages_created_idx ON email_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS email_messages_contact_idx ON email_messages (contact_id);
CREATE INDEX IF NOT EXISTS email_messages_campaign_idx ON email_messages (campaign_id) WHERE campaign_id IS NOT NULL;

-- Emails to send later (pre-arrival, review requests, follow-ups). dedupe_key makes scheduling idempotent.
CREATE TABLE IF NOT EXISTS email_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template TEXT NOT NULL,
  send_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',            -- pending | sent | skipped | failed
  dedupe_key TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  booking_id UUID,
  inquiry_id UUID,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS email_jobs_dedupe_key ON email_jobs (dedupe_key);
CREATE INDEX IF NOT EXISTS email_jobs_due_idx ON email_jobs (send_at) WHERE status = 'pending';

-- Marketing campaigns written by the AI (or the admin), sent to consenting contacts.
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  theme TEXT,                                        -- e.g. diwali-2026, snow-season, new-guides
  brief TEXT,
  subject TEXT NOT NULL,
  preheader TEXT,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,        -- structured copy; the HTML is always built by our layout
  segment JSONB NOT NULL DEFAULT '{}'::jsonb,        -- { interests?: string[], language?: 'en'|'hi' }
  status TEXT NOT NULL DEFAULT 'draft',              -- draft | scheduled | sending | sent | cancelled
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_by TEXT NOT NULL DEFAULT 'ai',             -- ai | admin
  recipients INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS email_campaigns_theme_key ON email_campaigns (theme) WHERE theme IS NOT NULL AND status <> 'cancelled';

-- One row of switches for the engine.
CREATE TABLE IF NOT EXISTS email_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  marketing_mode TEXT NOT NULL DEFAULT 'auto',       -- off | approve (AI drafts, admin sends) | auto (AI drafts and sends)
  max_marketing_per_week INT NOT NULL DEFAULT 1,
  automations JSONB NOT NULL DEFAULT '{}'::jsonb,    -- per-automation on/off, e.g. {"review_request": true}
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO email_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_settings ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ---------------------------------------------------------------------------
-- Scheduler: call the website every 10 minutes to send due emails.
-- Replace PASTE_CRON_SECRET_HERE with the CRON_SECRET value from Vercel, then run this block.
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
SELECT cron.unschedule('email-engine') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'email-engine');
SELECT cron.schedule(
  'email-engine',
  '*/10 * * * *',
  $$ SELECT net.http_post(
       url := 'https://www.dharamshalastay.com/api/cron/email',
       headers := jsonb_build_object('Authorization', 'Bearer PASTE_CRON_SECRET_HERE', 'Content-Type', 'application/json'),
       body := '{}'::jsonb,
       timeout_milliseconds := 55000
     ) $$
);
