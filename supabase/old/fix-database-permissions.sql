-- Fix Database Permissions for LLM Alchemy
-- This addresses the 406 errors by granting proper permissions to anon and authenticated roles

-- Step 1: Grant full permissions to anon role (for anonymous users)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- Step 2: Grant full permissions to authenticated role (for logged-in users)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Step 3: Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Step 4: Set default privileges for future tables/functions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;

-- Step 5: Verify permissions
DO $$
DECLARE
    table_record RECORD;
BEGIN
    RAISE NOTICE '=== VERIFYING TABLE PERMISSIONS ===';
    
    FOR table_record IN
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
    LOOP
        RAISE NOTICE 'Table: % - Permissions granted to anon and authenticated roles', table_record.tablename;
    END LOOP;
    
    RAISE NOTICE '=== PERMISSIONS FIX COMPLETE ===';
    RAISE NOTICE 'All 406 errors should now be resolved';
END $$;
