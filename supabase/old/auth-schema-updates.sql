-- Authentication Schema Updates for LLM Alchemy
-- Run this in your Supabase SQL editor

-- Update users table to support email authentication
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS upgraded_from_anonymous BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS anonymous_data_migrated BOOLEAN DEFAULT FALSE;

-- Create user profiles table for additional data
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to handle user profile creation
CREATE OR REPLACE FUNCTION handle_new_user_profile() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.display_name,
    NEW.avatar_url
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_user_profile_created ON users;
CREATE TRIGGER on_user_profile_created
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_profile();

-- Function to migrate anonymous user data to registered account
CREATE OR REPLACE FUNCTION migrate_anonymous_data(
  p_anonymous_user_id UUID,
  p_registered_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  migration_success BOOLEAN := FALSE;
  table_exists BOOLEAN;
BEGIN
  -- Start transaction
  BEGIN
    -- Migrate game states (always exists)
    UPDATE game_states 
    SET user_id = p_registered_user_id 
    WHERE user_id = p_anonymous_user_id;
    
    -- Migrate user sessions (always exists)
    UPDATE user_sessions 
    SET user_id = p_registered_user_id 
    WHERE user_id = p_anonymous_user_id;
    
    -- Migrate user elements (if table exists)
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'user_elements'
    ) INTO table_exists;
    
    IF table_exists THEN
      UPDATE user_elements 
      SET user_id = p_registered_user_id 
      WHERE user_id = p_anonymous_user_id;
    END IF;
    
    -- Migrate user combinations (if table exists)
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'user_combinations'
    ) INTO table_exists;
    
    IF table_exists THEN
      UPDATE user_combinations 
      SET user_id = p_registered_user_id 
      WHERE user_id = p_anonymous_user_id;
    END IF;
    
    -- Migrate payments (if table exists)
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'payments'
    ) INTO table_exists;
    
    IF table_exists THEN
      UPDATE payments 
      SET user_id = p_registered_user_id 
      WHERE user_id = p_anonymous_user_id;
    END IF;
    
    -- Mark the registered user as having migrated data
    UPDATE users 
    SET 
      upgraded_from_anonymous = TRUE,
      anonymous_data_migrated = TRUE
    WHERE id = p_registered_user_id;
    
    -- Delete the anonymous user record
    DELETE FROM users WHERE id = p_anonymous_user_id AND is_anonymous = TRUE;
    
    migration_success := TRUE;
    
  EXCEPTION WHEN OTHERS THEN
    -- If any error occurs, rollback will happen automatically
    migration_success := FALSE;
    RAISE;
  END;
  
  RETURN migration_success;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user authentication status
CREATE OR REPLACE FUNCTION get_user_auth_status(p_user_id UUID)
RETURNS TABLE(
  is_anonymous BOOLEAN,
  email_verified BOOLEAN,
  has_google_auth BOOLEAN,
  display_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.is_anonymous,
    u.email_verified,
    (u.google_id IS NOT NULL) AS has_google_auth,
    u.display_name
  FROM users u
  WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_is_anonymous ON users(is_anonymous);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Comments for documentation
COMMENT ON FUNCTION migrate_anonymous_data IS 'Migrates all data from anonymous user to registered user account';
COMMENT ON FUNCTION get_user_auth_status IS 'Returns authentication status for a user';
COMMENT ON TABLE user_profiles IS 'Extended user profile information';
