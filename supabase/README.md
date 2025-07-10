# Supabase Database Setup for LLM Alchemy

This directory contains the database schema and setup instructions for the LLM Alchemy game.

## Quick Setup

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down your project URL and anon key from the project settings

### 2. Environment Variables
Copy the Supabase credentials to your `.env.local` file:

```bash
# Add these to your .env.local file
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Deploy Database Schema
1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `schema.sql`
4. Click "Run" to execute the schema

### 4. Verify Setup
The schema will create these tables:
- `users` - User accounts (anonymous and registered)
- `user_sessions` - Daily usage tracking
- `game_states` - Persistent game progress
- `discovered_elements` - Optional global stats

## Database Schema Overview

### Tables

#### `users`
Stores user accounts with support for both anonymous and registered users.
- `id` - UUID primary key (matches Supabase auth.users.id)
- `email` - Optional email for registered users
- `is_anonymous` - Boolean flag for anonymous users
- `subscription_status` - 'free' or 'premium'
- `subscription_ends_at` - Premium subscription expiry

#### `user_sessions`
Tracks daily API usage for rate limiting.
- `user_id` - References users.id
- `date` - Date of usage
- `daily_count` - Number of API calls made
- Unique constraint on (user_id, date)

#### `game_states`
Persistent storage for game progress.
- `user_id` - References users.id
- `game_mode` - 'science' or 'creative'
- `elements` - JSONB array of discovered elements
- `end_elements` - JSONB array of end elements (science mode)
- `combinations` - JSONB object of tried combinations
- `achievements` - JSONB array of unlocked achievements
- Unique constraint on (user_id, game_mode)

#### `discovered_elements`
Optional table for global discovery statistics.
- `user_id` - References users.id
- `element_name` - Name of discovered element
- `discovered_at` - Timestamp of discovery
- Primary key on (user_id, element_name)

### Functions

#### `increment_daily_count(p_user_id UUID)`
Atomically increments the daily API call count for a user.
Returns the new count value.

#### `get_daily_count(p_user_id UUID)`
Gets the current daily API call count for a user.
Returns 0 if no record exists for today.

#### `reset_daily_counts()`
Cleans up old session data (older than 7 days).
Should be run daily via cron job.

### Row Level Security (RLS)

All tables have RLS enabled with policies that ensure:
- Users can only access their own data
- Anonymous users work seamlessly
- Data is properly isolated between users

## Migration from localStorage

The current implementation uses localStorage for daily counts. The database setup enables:

1. **Persistent daily counts** across devices and sessions
2. **Cross-device sync** for registered users  
3. **Anonymous user support** with optional upgrade path
4. **Game state persistence** for save/load functionality
5. **Foundation for subscription management**

## Next Steps

After setting up the database:

1. **Update API routes** to use Supabase instead of localStorage
2. **Implement game state persistence** (save/load)
3. **Add user registration flow** (magic link or social login)
4. **Implement subscription management** with Mollie payments
5. **Add analytics and user insights**

## Development Notes

- The schema includes Row Level Security for data protection
- Anonymous users are created automatically on first visit
- Game states are stored per user per game mode
- Daily counts reset automatically via date-based queries
- All operations are atomic to prevent race conditions

## Production Considerations

- Remove the test admin user from the schema
- Set up automated backups
- Configure appropriate connection pooling
- Monitor database performance and usage
- Set up the daily cleanup cron job for old session data
