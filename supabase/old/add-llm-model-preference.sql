-- Add LLM model preference field to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS llm_model TEXT DEFAULT 'flash' CHECK (llm_model IN ('flash', 'pro'));

-- Update existing premium users to default to 'pro' model
UPDATE users 
SET llm_model = 'pro' 
WHERE subscription_status = 'premium' AND llm_model = 'flash';

-- Comment for documentation
COMMENT ON COLUMN users.llm_model IS 'User preference for LLM model: flash (speed) or pro (reasoning)';
