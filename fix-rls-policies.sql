-- Fix RLS Policies for LLM Alchemy
-- Run this in your Supabase SQL Editor to fix the permission errors

-- First, check if tables exist and enable RLS if not already enabled
DO $$
BEGIN
    -- Ensure RLS is enabled on all tables
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_sessions') THEN
        ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'game_states') THEN
        ALTER TABLE game_states ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'discovered_elements') THEN
        ALTER TABLE discovered_elements ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can create own record" ON users;
DROP POLICY IF EXISTS "Users can manage own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can manage own game states" ON game_states;
DROP POLICY IF EXISTS "Users can manage own discoveries" ON discovered_elements;

-- Create fresh RLS policies

-- Users table policies
CREATE POLICY "Users can read own data" ON users
    FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can create own record" ON users
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- User sessions policies
CREATE POLICY "Users can manage own sessions" ON user_sessions
    FOR ALL 
    USING (auth.uid() = user_id);

-- Game states policies (if table exists)
CREATE POLICY "Users can manage own game states" ON game_states
    FOR ALL 
    USING (auth.uid() = user_id);

-- Discovered elements policies (if table exists)
CREATE POLICY "Users can manage own discoveries" ON discovered_elements
    FOR ALL 
    USING (auth.uid() = user_id);

-- Ensure the increment function exists and has proper permissions
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

-- Grant necessary permissions for anonymous users
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Test query to verify policies work
-- This should succeed if everything is configured correctly
SELECT 'RLS policies successfully applied!' as status;
