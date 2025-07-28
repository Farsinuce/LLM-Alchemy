// DEPRECATED: This file has been moved to src/lib/supabase/
// Please update your imports to use:
// - import { ... } from '@/lib/supabase' for browser-safe functions
// - import { ... } from '@/lib/supabase/server' for server-only functions

console.warn('⚠️ DEPRECATED: Importing from @/lib/supabase-client is deprecated. Please update to @/lib/supabase');

// Re-export everything from new location for backwards compatibility
export * from './supabase';
