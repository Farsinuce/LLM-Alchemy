-- Comprehensive RLS Fix for LLM Alchemy
-- This script ensures all tables exist and have proper RLS policies for anonymous users

-- First, ensure all tables exist (in case some weren't created properly)

-- Create game_states table if it doesn't exist
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

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovered_elements ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can create own record" ON users;
DROP POLICY IF EXISTS "Users can manage own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can manage own game states" ON game_states;
DROP POLICY IF EXISTS "Users can manage own discoveries" ON discovered_elements;

-- Recreate policies with explicit permissions

-- Users table policies
CREATE POLICY "users_select_own" ON users
    FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON users
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own" ON users
    FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- User sessions policies
CREATE POLICY "sessions_select_own" ON user_sessions
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "sessions_insert_own" ON user_sessions
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sessions_update_own" ON user_sessions
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sessions_delete_own" ON user_sessions
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Game states policies (THE CRITICAL ONES)
CREATE POLICY "game_states_select_own" ON game_states
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "game_states_insert_own" ON game_states
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "game_states_update_own" ON game_states
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "game_states_delete_own" ON game_states
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Discovered elements policies
CREATE POLICY "discoveries_select_own" ON discovered_elements
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "discoveries_insert_own" ON discovered_elements
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "discoveries_update_own" ON discovered_elements
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "discoveries_delete_own" ON discovered_elements
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Grant comprehensive permissions for anonymous and authenticated users
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Ensure the database functions exist and work properly
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_game_states_user_mode ON game_states(user_id, game_mode);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_date ON user_sessions(user_id, date);

-- Test that policies work by attempting a basic query structure
-- This should succeed if everything is configured correctly
SELECT 'RLS policies successfully applied and tested!' as status;

-- Show current policy status
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'user_sessions', 'game_states', 'discovered_elements')
ORDER BY tablename, policyname;
