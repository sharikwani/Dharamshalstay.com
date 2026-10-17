-- migration-v34-stories.sql
-- Traveller and local stories (/stories): people share a story and photos from Dharamshala and McLeod Ganj.
-- Nothing is public until the owner approves it. Each day the AI suggests one approved story; when the owner
-- features it, it is "Story of the day" on the homepage and our Instagram story for 24 hours.
-- Readers can like, comment, share and tie a prayer flag (a one-line blessing in one of the five colours).
-- Every read is counted once per visitor, with the reader's city, so storytellers see how far they reached.
-- Run once in the Supabase SQL editor. Safe to re-run.

CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'hidden', 'removed')),
  author_name TEXT NOT NULL,
  author_kind TEXT NOT NULL CHECK (author_kind IN ('local', 'traveller')),
  author_from TEXT,                   -- home town or city, as they wrote it
  instagram TEXT,                     -- handle without @, only if they chose to share it
  email TEXT,                         -- only to tell them when the story goes live
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  place TEXT NOT NULL,
  visited TEXT,                       -- e.g. "March 2026", free text
  photos TEXT[] NOT NULL DEFAULT '{}', -- storage paths (story-uploads, copied to story-photos on approval)
  consent_at TIMESTAMPTZ NOT NULL,
  ip_hash TEXT,
  manage_token TEXT NOT NULL UNIQUE,  -- the storyteller's private page: /stories/me/<token>
  -- AI screening (advice for the owner, never acts on its own)
  ai_score INT,
  ai_notes TEXT,
  ai_flags TEXT[] NOT NULL DEFAULT '{}',
  ai_caption TEXT,
  ai_screened_at TIMESTAMPTZ,
  -- Story of the day
  proposed_at TIMESTAMPTZ,            -- the AI suggested it to the owner
  featured_at TIMESTAMPTZ,
  featured_until TIMESTAMPTZ,
  ig_story_id TEXT,
  ig_attempts INT NOT NULL DEFAULT 0,
  ig_error TEXT,
  -- counters (kept in step by the functions below and by the server)
  views INT NOT NULL DEFAULT 0,
  likes INT NOT NULL DEFAULT 0,
  comments INT NOT NULL DEFAULT 0,
  flags INT NOT NULL DEFAULT 0,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stories_status ON stories(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_featured ON stories(featured_at DESC) WHERE featured_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stories_ip ON stories(ip_hash, created_at);

CREATE TABLE IF NOT EXISTS story_likes (
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  visitor_id UUID NOT NULL,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (story_id, visitor_id)
);
CREATE INDEX IF NOT EXISTS idx_story_likes_ip ON story_likes(ip_hash, created_at);

CREATE TABLE IF NOT EXISTS story_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'held', 'removed')),
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_story_comments_story ON story_comments(story_id, created_at);
CREATE INDEX IF NOT EXISTS idx_story_comments_ip ON story_comments(ip_hash, created_at);

-- Prayer flags: blue (sky), white (air), red (fire), green (water), yellow (earth).
CREATE TABLE IF NOT EXISTS story_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  color TEXT NOT NULL CHECK (color IN ('blue', 'white', 'red', 'green', 'yellow')),
  status TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'held', 'removed')),
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_story_flags_story ON story_flags(story_id, created_at);
CREATE INDEX IF NOT EXISTS idx_story_flags_ip ON story_flags(ip_hash, created_at);

CREATE TABLE IF NOT EXISTS story_views (
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  visitor_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (story_id, visitor_id)
);

-- Where readers are: one row per story and city (from the visitor's IP location; the IP is never stored).
CREATE TABLE IF NOT EXISTS story_reach (
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  city TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  readers INT NOT NULL DEFAULT 0,
  last_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (story_id, city, country)
);

-- One read per visitor per story.
CREATE OR REPLACE FUNCTION story_record_view(p_story UUID, p_visitor UUID, p_city TEXT, p_country TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO story_views (story_id, visitor_id) VALUES (p_story, p_visitor) ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  UPDATE stories SET views = views + 1 WHERE id = p_story;
  INSERT INTO story_reach (story_id, city, country, readers, last_at)
  VALUES (p_story, COALESCE(p_city, ''), COALESCE(p_country, ''), 1, NOW())
  ON CONFLICT (story_id, city, country) DO UPDATE SET readers = story_reach.readers + 1, last_at = NOW();
  RETURN TRUE;
END $$;

-- Like or unlike; returns the new total.
CREATE OR REPLACE FUNCTION story_set_like(p_story UUID, p_visitor UUID, p_on BOOLEAN, p_ip TEXT)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE n INT;
BEGIN
  IF p_on THEN
    INSERT INTO story_likes (story_id, visitor_id, ip_hash) VALUES (p_story, p_visitor, p_ip) ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM story_likes WHERE story_id = p_story AND visitor_id = p_visitor;
  END IF;
  SELECT COUNT(*) INTO n FROM story_likes WHERE story_id = p_story;
  UPDATE stories SET likes = n WHERE id = p_story;
  RETURN n;
END $$;

-- Recount visible comments and flags after a new one or a moderation change.
CREATE OR REPLACE FUNCTION story_recount(p_story UUID)
RETURNS VOID LANGUAGE sql AS $$
  UPDATE stories SET
    comments = (SELECT COUNT(*) FROM story_comments WHERE story_id = p_story AND status = 'visible'),
    flags = (SELECT COUNT(*) FROM story_flags WHERE story_id = p_story AND status = 'visible')
  WHERE id = p_story;
$$;

-- Photos: uploads stay private until the story is approved, then are copied to the public bucket.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('story-uploads', 'story-uploads', false, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 5242880, allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp'];
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('story-photos', 'story-photos', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 5242880, allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp'];

-- Server only (service role); no public access.
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_reach ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON stories, story_likes, story_comments, story_flags, story_views, story_reach FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION story_record_view(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION story_set_like(UUID, UUID, BOOLEAN, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION story_recount(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION story_record_view(UUID, UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION story_set_like(UUID, UUID, BOOLEAN, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION story_recount(UUID) TO service_role;
