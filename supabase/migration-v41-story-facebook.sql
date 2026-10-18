-- v41: the Story of the day also goes to the Facebook Page story; keep its id so a retry only posts what is missing.
ALTER TABLE stories ADD COLUMN IF NOT EXISTS fb_story_id TEXT;
