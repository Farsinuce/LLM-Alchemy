// DEPRECATED: This file has been refactored into separate files for better security
// Please update your imports to use:
// - import { ... } from '@/lib/supabase' for browser-safe functions
// - import { ... } from '@/lib/supabase/server' for server-only functions

console.warn('⚠️ DEPRECATED: Importing from @/lib/supabase is deprecated. Please update imports to @/lib/supabase or @/lib/supabase/server');

// Re-export only browser-safe functions for backwards compatibility
// SECURITY: Do not export server functions to prevent accidental client-side usage
export * from './supabase/index';

// Server functions must be imported explicitly from '@/lib/supabase/server'
// This prevents accidental exposure of server-only code to client bundles
