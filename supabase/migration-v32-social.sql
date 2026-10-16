-- migration-v32: social media autopilot (Instagram + Facebook posts written by the AI, published on a schedule)
-- Run once in the Supabase SQL editor. Safe to re-run. Service-role only (RLS on, no policies).

BEGIN;

CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme TEXT,                                        -- e.g. place:triund, tips:triund, festival:diwali-2026
  topic TEXT NOT NULL,                               -- what the post is about, in words
  format TEXT NOT NULL DEFAULT 'carousel',           -- single | carousel
  slides JSONB NOT NULL DEFAULT '[]'::jsonb,         -- [{ image, kicker, title, body, style }]
  caption TEXT NOT NULL DEFAULT '',
  hashtags TEXT[] NOT NULL DEFAULT '{}',
  alt_text TEXT,
  credits TEXT,                                      -- photo credits added to the caption (licence requirement)
  link TEXT,                                         -- our page the post points to ("link in bio")
  platforms TEXT[] NOT NULL DEFAULT '{instagram,facebook}',
  status TEXT NOT NULL DEFAULT 'draft',              -- draft | scheduled | publishing | published | failed | cancelled
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  ig_media_id TEXT,
  ig_permalink TEXT,
  fb_post_id TEXT,
  error TEXT,
  attempts INT NOT NULL DEFAULT 0,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,        -- likes, comments, saves, reach (refreshed later)
  created_by TEXT NOT NULL DEFAULT 'ai',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS social_posts_due_idx ON social_posts (scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS social_posts_created_idx ON social_posts (created_at DESC);

CREATE TABLE IF NOT EXISTS social_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  mode TEXT NOT NULL DEFAULT 'approve',              -- off | approve (AI drafts, admin approves) | auto (AI drafts and schedules)
  posts_per_week INT NOT NULL DEFAULT 4,
  post_time TEXT NOT NULL DEFAULT '19:30',           -- IST
  post_days INT[] NOT NULL DEFAULT '{2,4,6,0}',      -- 0 = Sunday ... 6 = Saturday
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO social_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_settings ENABLE ROW LEVEL SECURITY;

COMMIT;
