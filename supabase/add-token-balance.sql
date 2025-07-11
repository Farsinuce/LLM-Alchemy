-- Add token_balance column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS token_balance INTEGER DEFAULT 0;

-- Function to add tokens (for testing/debugging)
CREATE OR REPLACE FUNCTION add_tokens(p_user_id UUID, p_tokens INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  UPDATE users
  SET token_balance = token_balance + p_tokens
  WHERE id = p_user_id
  RETURNING token_balance INTO new_balance;
  
  RETURN COALESCE(new_balance, 0);
END;
$$;

-- Function to consume a token
CREATE OR REPLACE FUNCTION consume_token(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_balance INTEGER;
BEGIN
  -- Get current balance and decrement if positive
  UPDATE users
  SET token_balance = GREATEST(0, token_balance - 1)
  WHERE id = p_user_id AND token_balance > 0
  RETURNING token_balance INTO current_balance;
  
  -- Return true if we successfully consumed a token
  RETURN current_balance IS NOT NULL;
END;
$$;

-- Function to get user's token balance
CREATE OR REPLACE FUNCTION get_token_balance(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  balance INTEGER;
BEGIN
  SELECT token_balance INTO balance
  FROM users
  WHERE id = p_user_id;
  
  RETURN COALESCE(balance, 0);
END;
$$;
