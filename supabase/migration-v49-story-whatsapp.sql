-- v49: storytellers can leave a WhatsApp number so their memory card reaches them when the story is approved.
-- The number is private: public story pages never select it, and it is cleared when the storyteller removes the story.
ALTER TABLE stories ADD COLUMN IF NOT EXISTS phone TEXT;
-- When the story_card WhatsApp message went out (so it is sent once).
ALTER TABLE stories ADD COLUMN IF NOT EXISTS card_sent_at TIMESTAMPTZ;
