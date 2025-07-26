-- Add challenge preference column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS show_challenges BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN users.show_challenges IS 'User preference for showing/hiding challenges in the game';
