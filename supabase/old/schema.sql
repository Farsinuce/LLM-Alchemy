-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_anonymous BOOLEAN DEFAULT true,
    subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'premium')),
    subscription_ends_at TIMESTAMPTZ
);

-- Create user_sessions table for daily limit tracking
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    daily_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Create game_states table for persistent game progress
CREATE TABLE IF NOT EXISTS game_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    game_mode TEXT NOT NULL CHECK (game_mode IN ('science', 'creative')),
    elements JSONB DEFAULT '[]',
    end_elements JSONB DEFAULT '[]',
    combinations JSONB DEFAULT '{}',
    achievements JSONB DEFAULT '[]',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, game_mode)
);

-- Create discovered_elements table for global stats (optional)
CREATE TABLE IF NOT EXISTS discovered_elements (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    element_name TEXT NOT NULL,
    discovered_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, element_name)
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovered_elements ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies

-- Users can read and update their own data
CREATE POLICY "Users can read own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own record (for anonymous user creation)
CREATE POLICY "Users can create own record" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- User sessions: users can manage their own session data
CREATE POLICY "Users can manage own sessions" ON user_sessions
    FOR ALL USING (auth.uid() = user_id);

-- Game states: users can manage their own game states
CREATE POLICY "Users can manage own game states" ON game_states
    FOR ALL USING (auth.uid() = user_id);

-- Discovered elements: users can manage their own discoveries
CREATE POLICY "Users can manage own discoveries" ON discovered_elements
    FOR ALL USING (auth.uid() = user_id);

-- Create database functions

-- Function to increment daily count atomically
CREATE OR REPLACE FUNCTION increment_daily_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    current_count INTEGER;
BEGIN
    INSERT INTO user_sessions (user_id, date, daily_count)
    VALUES (p_user_id, CURRENT_DATE, 1)
    ON CONFLICT (user_id, date)
    DO UPDATE SET 
        daily_count = user_sessions.daily_count + 1,
        updated_at = NOW()
    RETURNING daily_count INTO current_count;
    
    RETURN current_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get daily count for a user
CREATE OR REPLACE FUNCTION get_daily_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    current_count INTEGER;
BEGIN
    SELECT daily_count INTO current_count
    FROM user_sessions
    WHERE user_id = p_user_id AND date = CURRENT_DATE;
    
    RETURN COALESCE(current_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset daily counts (can be called by cron job)
CREATE OR REPLACE FUNCTION reset_daily_counts()
RETURNS void AS $$
BEGIN
    -- Delete old session records (older than 7 days)
    DELETE FROM user_sessions 
    WHERE date < CURRENT_DATE - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_date ON user_sessions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_game_states_user_mode ON game_states(user_id, game_mode);
CREATE INDEX IF NOT EXISTS idx_discovered_elements_user ON discovered_elements(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_subscription ON users(subscription_status, subscription_ends_at);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Insert default admin user (optional, for testing)
-- Note: This should be removed in production
INSERT INTO users (id, email, is_anonymous, subscription_status) 
VALUES ('00000000-0000-0000-0000-000000000000', 'admin@llmalchemy.com', false, 'premium')
ON CONFLICT (id) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE users IS 'User accounts, both anonymous and registered';
COMMENT ON TABLE user_sessions IS 'Daily usage tracking for rate limiting';
COMMENT ON TABLE game_states IS 'Persistent game progress for each user and mode';
COMMENT ON TABLE discovered_elements IS 'Optional tracking of all discoveries for stats';
COMMENT ON FUNCTION increment_daily_count(UUID) IS 'Atomically increment daily API call count';
COMMENT ON FUNCTION get_daily_count(UUID) IS 'Get current daily API call count for user';
COMMENT ON FUNCTION reset_daily_counts() IS 'Cleanup old session data, should be run daily';
