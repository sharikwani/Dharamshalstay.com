-- migration-v43: Tambola party game (/play). Run once in the Supabase SQL editor after v42. Safe to re-run.
-- All reads and writes go through API routes with the service role; phones get live numbers over a
-- Supabase Realtime broadcast channel (no table access for anon).

CREATE TABLE IF NOT EXISTS game_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE CHECK (code ~ '^[0-9]{6}$'),
  party_name TEXT NOT NULL CHECK (char_length(party_name) BETWEEN 2 AND 60),
  party_type TEXT NOT NULL CHECK (party_type IN ('birthday','anniversary','kitty','office','family','festival','other')),
  host_name TEXT NOT NULL CHECK (char_length(host_name) BETWEEN 1 AND 40),
  host_token_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby','live','ended')),
  called INT[] NOT NULL DEFAULT '{}',
  creator_ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_game_rooms_ip ON game_rooms(creator_ip_hash, created_at DESC);

CREATE TABLE IF NOT EXISTS game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 30),
  -- Small JPEG data URL made on the phone (about 20 KB), or null.
  photo TEXT CHECK (photo IS NULL OR (photo LIKE 'data:image/jpeg;base64,%' AND char_length(photo) <= 120000)),
  ticket JSONB NOT NULL,
  ticket_key TEXT NOT NULL,
  player_token_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (room_id, ticket_key)
);
CREATE INDEX IF NOT EXISTS idx_game_players_room ON game_players(room_id, created_at);

CREATE TABLE IF NOT EXISTS game_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
  prize TEXT NOT NULL CHECK (prize IN ('full_house','first_line','early_five')),
  place INT NOT NULL CHECK (place BETWEEN 1 AND 3),
  at_call INT NOT NULL,
  discount_code TEXT NOT NULL UNIQUE,
  discount_amount INT NOT NULL CHECK (discount_amount > 0),
  code_expires_at TIMESTAMPTZ NOT NULL,
  code_status TEXT NOT NULL DEFAULT 'issued' CHECK (code_status IN ('issued','redeemed','cancelled')),
  redeemed_at TIMESTAMPTZ,
  redeemed_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- The first valid claim wins each prize.
  UNIQUE (room_id, prize)
);
CREATE INDEX IF NOT EXISTS idx_game_winners_room ON game_winners(room_id);

ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_winners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin reads game rooms" ON game_rooms;
CREATE POLICY "Admin reads game rooms" ON game_rooms FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "Admin reads game winners" ON game_winners;
CREATE POLICY "Admin reads game winners" ON game_winners FOR SELECT USING (is_admin());
-- No write policies and no player reads: everything goes through API routes with the service role.

-- Call the next number atomically: only succeeds if nobody else called one in between (expected_count).
CREATE OR REPLACE FUNCTION game_call_number(p_room UUID, p_expected_count INT, p_number INT)
RETURNS INT[] LANGUAGE sql AS $$
  UPDATE game_rooms
     SET called = array_append(called, p_number), status = 'live',
         started_at = COALESCE(started_at, NOW()), updated_at = NOW()
   WHERE id = p_room AND status <> 'ended'
     AND COALESCE(array_length(called, 1), 0) = p_expected_count
     AND NOT (p_number = ANY(called))
  RETURNING called
$$;
