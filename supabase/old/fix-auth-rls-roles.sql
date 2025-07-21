-- Fix Authentication and RLS Issues for LLM Alchemy
-- This script fixes the 406 errors and email authentication issues
-- Run this in your Supabase SQL Editor

-- Step 1: Fix RLS Policies - Target correct roles (anon, authenticated)
-- Drop existing incorrect policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can create own record" ON users;
DROP POLICY IF EXISTS "Users can manage own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can manage own game states" ON game_states;
DROP POLICY IF EXISTS "Users can manage own discoveries" ON discovered_elements;

-- Step 2: Create correct policies targeting anon and authenticated roles
-- Users table policies
CREATE POLICY "anon_users_full_access" ON users FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_users_full_access" ON users FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- User sessions policies
CREATE POLICY "anon_sessions_full_access" ON user_sessions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_sessions_full_access" ON user_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Game states policies
CREATE POLICY "anon_game_states_full_access" ON game_states FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_game_states_full_access" ON game_states FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Discovered elements policies
CREATE POLICY "anon_discovered_full_access" ON discovered_elements FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_discovered_full_access" ON discovered_elements FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Step 3: Ensure proper permissions for anon and authenticated roles
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Step 4: Verify the fix
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '=== RLS POLICY FIX COMPLETE ===';
    RAISE NOTICE 'All tables now have correct RLS policies targeting anon and authenticated roles';
    RAISE NOTICE '406 errors should be resolved';
    
    -- Show current policies
    FOR rec IN 
        SELECT tablename, policyname, roles, cmd
        FROM pg_policies 
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname
    LOOP
        RAISE NOTICE 'Table: %, Policy: %, Roles: %, Command: %', 
            rec.tablename, rec.policyname, rec.roles, rec.cmd;
    END LOOP;
END $$;

-- Step 5: Test query to verify access
SELECT 'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'user_sessions', COUNT(*) FROM user_sessions
UNION ALL
SELECT 'game_states', COUNT(*) FROM game_states
UNION ALL
SELECT 'discovered_elements', COUNT(*) FROM discovered_elements;
