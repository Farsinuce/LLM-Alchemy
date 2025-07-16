-- Add failed_combinations column to game_states table
ALTER TABLE game_states 
ADD COLUMN failed_combinations JSONB DEFAULT '[]';

-- Add comment for documentation
COMMENT ON COLUMN game_states.failed_combinations IS 'Array of recent failed element combinations for LLM context';

-- Verify the column was added successfully
SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'game_states' AND column_name = 'failed_combinations';
