-- Add subscription usage tracking fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_usage INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS usage_reset_date TIMESTAMPTZ DEFAULT DATE_TRUNC('month', NOW()) + INTERVAL '1 month';
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_llm_model TEXT DEFAULT 'flash' CHECK (preferred_llm_model IN ('flash', 'pro'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS openrouter_api_key TEXT;

-- Function to check and reset monthly usage if needed
CREATE OR REPLACE FUNCTION check_and_reset_monthly_usage(p_user_id UUID)
RETURNS TABLE(monthly_usage INTEGER, should_reset BOOLEAN) AS $$
DECLARE
    user_record RECORD;
    current_month_start DATE;
BEGIN
    -- Get current month start
    current_month_start := DATE_TRUNC('month', NOW())::DATE;
    
    -- Get user record
    SELECT u.monthly_usage, u.usage_reset_date, u.subscription_status
    INTO user_record
    FROM users u
    WHERE u.id = p_user_id;
    
    -- Check if we need to reset (if we're past the reset date)
    IF user_record.usage_reset_date <= NOW() THEN
        -- Reset usage and update reset date to next month
        UPDATE users 
        SET 
            monthly_usage = 0,
            usage_reset_date = DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
        WHERE id = p_user_id;
        
        RETURN QUERY SELECT 0 as monthly_usage, true as should_reset;
    ELSE
        RETURN QUERY SELECT user_record.monthly_usage, false as should_reset;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment monthly usage for subscribers
CREATE OR REPLACE FUNCTION increment_monthly_usage(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    current_usage INTEGER;
    user_sub_status TEXT;
BEGIN
    -- Check and reset if needed first
    PERFORM check_and_reset_monthly_usage(p_user_id);
    
    -- Get subscription status
    SELECT subscription_status INTO user_sub_status
    FROM users WHERE id = p_user_id;
    
    -- Only track usage for premium subscribers
    IF user_sub_status = 'premium' THEN
        UPDATE users 
        SET monthly_usage = monthly_usage + 1
        WHERE id = p_user_id
        RETURNING monthly_usage INTO current_usage;
        
        RETURN current_usage;
    END IF;
    
    RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get monthly usage for a user
CREATE OR REPLACE FUNCTION get_monthly_usage(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    usage_info RECORD;
BEGIN
    -- Check and reset if needed, then get current usage
    SELECT * INTO usage_info FROM check_and_reset_monthly_usage(p_user_id);
    
    RETURN usage_info.monthly_usage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has exceeded fair use limit (3000/month)
CREATE OR REPLACE FUNCTION has_exceeded_fair_use(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_usage INTEGER;
    user_sub_status TEXT;
BEGIN
    current_usage := get_monthly_usage(p_user_id);
    
    SELECT subscription_status INTO user_sub_status
    FROM users WHERE id = p_user_id;
    
    -- Only applies to premium subscribers
    IF user_sub_status = 'premium' AND current_usage >= 3000 THEN
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_and_reset_monthly_usage(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_monthly_usage(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_monthly_usage(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION has_exceeded_fair_use(UUID) TO anon, authenticated;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_monthly_usage ON users(monthly_usage) WHERE subscription_status = 'premium';
CREATE INDEX IF NOT EXISTS idx_users_usage_reset_date ON users(usage_reset_date) WHERE subscription_status = 'premium';
CREATE INDEX IF NOT EXISTS idx_users_preferred_llm_model ON users(preferred_llm_model);

-- Comments for documentation
COMMENT ON COLUMN users.monthly_usage IS 'Number of LLM API calls made this month (for premium subscribers)';
COMMENT ON COLUMN users.usage_reset_date IS 'When monthly usage counter resets to 0';
COMMENT ON COLUMN users.preferred_llm_model IS 'User preference for LLM model: flash or pro';
COMMENT ON COLUMN users.openrouter_api_key IS 'User OpenRouter API key for unlimited access';
COMMENT ON FUNCTION increment_monthly_usage(UUID) IS 'Increment monthly usage counter for premium subscribers';
COMMENT ON FUNCTION get_monthly_usage(UUID) IS 'Get current monthly usage, resetting if needed';
COMMENT ON FUNCTION has_exceeded_fair_use(UUID) IS 'Check if premium subscriber has exceeded 3000 monthly calls';
