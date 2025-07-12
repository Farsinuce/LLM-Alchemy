-- Function to decrement daily count atomically (for undo functionality)
CREATE OR REPLACE FUNCTION decrement_daily_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    current_count INTEGER;
BEGIN
    -- Update the daily count, ensuring it doesn't go below 0
    UPDATE user_sessions 
    SET 
        daily_count = GREATEST(daily_count - 1, 0),
        updated_at = NOW()
    WHERE user_id = p_user_id AND date = CURRENT_DATE
    RETURNING daily_count INTO current_count;
    
    -- If no record exists for today, return 0
    IF current_count IS NULL THEN
        current_count := 0;
    END IF;
    
    RETURN current_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION decrement_daily_count(UUID) TO anon, authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION decrement_daily_count(UUID) IS 'Atomically decrement daily API call count for undo functionality';
