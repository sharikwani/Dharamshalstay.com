-- migration-v44: more party games on /play (Party Quiz, Lucky Draw, Who's Most Likely To). Run once in the
-- Supabase SQL editor after v43. Safe to re-run.

-- Which game a room plays, and that game's own state (questions, current round, phase...).
ALTER TABLE game_rooms ADD COLUMN IF NOT EXISTS game TEXT NOT NULL DEFAULT 'tambola';
ALTER TABLE game_rooms DROP CONSTRAINT IF EXISTS game_rooms_game_check;
ALTER TABLE game_rooms ADD CONSTRAINT game_rooms_game_check CHECK (game IN ('tambola','quiz','lucky_draw','most_likely'));
ALTER TABLE game_rooms ADD COLUMN IF NOT EXISTS state JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Winners of any game; several places can share a prize name (quiz 1st/2nd/3rd).
ALTER TABLE game_winners DROP CONSTRAINT IF EXISTS game_winners_prize_check;
ALTER TABLE game_winners ADD CONSTRAINT game_winners_prize_check
  CHECK (prize IN ('full_house','first_line','early_five','quiz','lucky_draw','most_likely'));
ALTER TABLE game_winners DROP CONSTRAINT IF EXISTS game_winners_room_id_prize_key;
ALTER TABLE game_winners DROP CONSTRAINT IF EXISTS game_winners_room_id_prize_place_key;
ALTER TABLE game_winners ADD CONSTRAINT game_winners_room_id_prize_place_key UNIQUE (room_id, prize, place);
-- Extra line on the certificate ("1,240 points", "Voted most likely to ...").
ALTER TABLE game_winners ADD COLUMN IF NOT EXISTS detail TEXT;
-- Discount codes only go to games with enough players; small games get the certificate alone.
ALTER TABLE game_winners ALTER COLUMN discount_code DROP NOT NULL;
ALTER TABLE game_winners ALTER COLUMN discount_amount DROP NOT NULL;
ALTER TABLE game_winners ALTER COLUMN code_expires_at DROP NOT NULL;
ALTER TABLE game_winners DROP CONSTRAINT IF EXISTS game_winners_discount_amount_check;
ALTER TABLE game_winners ADD CONSTRAINT game_winners_discount_amount_check CHECK (discount_amount IS NULL OR discount_amount > 0);

-- Quiz answers and Most Likely votes: one per player per round.
CREATE TABLE IF NOT EXISTS game_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
  round INT NOT NULL,
  answer TEXT NOT NULL,
  ms INT,
  points INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (room_id, player_id, round)
);
CREATE INDEX IF NOT EXISTS idx_game_answers_room ON game_answers(room_id, round);
ALTER TABLE game_answers ENABLE ROW LEVEL SECURITY;
-- No policies: all access goes through API routes with the service role.

-- Players give an email and phone so a winner's discount coupon can be sent to them (never shown to others).
ALTER TABLE game_players ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE game_players ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE game_players ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN NOT NULL DEFAULT false;
-- When the coupon email went out.
ALTER TABLE game_winners ADD COLUMN IF NOT EXISTS code_sent_at TIMESTAMPTZ;
