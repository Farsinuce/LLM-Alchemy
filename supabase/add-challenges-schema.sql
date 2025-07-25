-- LLM Alchemy Challenge System Schema
-- Creates tables for daily and weekly challenges with completion tracking

-- Master challenges table
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_type TEXT CHECK (challenge_type IN ('daily', 'weekly')),
  title TEXT NOT NULL,
  target_element TEXT,
  target_category TEXT,
  game_mode TEXT CHECK (game_mode IN ('science', 'creative', 'any')) DEFAULT 'any',
  reward_tokens INTEGER NOT NULL DEFAULT 5,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uniq_type_date_title UNIQUE (challenge_type, start_date, title)
);

-- Completion tracking
CREATE TABLE challenge_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  element_discovered TEXT NOT NULL,
  game_mode TEXT NOT NULL,
  UNIQUE (challenge_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_challenge_active ON challenges (end_date DESC);
CREATE INDEX idx_challenge_type_date ON challenges (challenge_type, start_date DESC);
CREATE INDEX idx_completion_user ON challenge_completions (user_id, completed_at DESC);

-- Row Level Security
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- Anyone can read challenges
CREATE POLICY "public_read" ON challenges 
  FOR SELECT 
  USING (true);

ALTER TABLE challenge_completions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own completions
CREATE POLICY "user_completions_select" ON challenge_completions 
  FOR SELECT 
  USING (user_id = auth.uid());

-- Users can only insert their own completions
CREATE POLICY "user_completions_insert" ON challenge_completions 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- Add token_balance column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_balance INTEGER DEFAULT 0;

-- Function to safely increment user tokens
CREATE OR REPLACE FUNCTION increment_user_tokens(
  p_user_id UUID,
  p_amount INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  UPDATE users
  SET token_balance = COALESCE(token_balance, 0) + p_amount,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING token_balance INTO v_new_balance;
  
  RETURN COALESCE(v_new_balance, 0);
END;
$$;
