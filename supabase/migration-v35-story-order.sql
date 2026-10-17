-- migration-v35-story-order.sql
-- The owner can pin stories to the top of /stories in a chosen order (1st, 2nd, 3rd...).
-- pin_rank 1 is first; stories without a rank follow, newest approval first.
-- Run once in the Supabase SQL editor. Safe to re-run.

ALTER TABLE stories ADD COLUMN IF NOT EXISTS pin_rank INT;
CREATE INDEX IF NOT EXISTS idx_stories_pin ON stories(pin_rank) WHERE pin_rank IS NOT NULL;
