// DEPRECATED: This file has been moved to src/lib/supabase/server.ts
// Please update your imports to use:
// - import { ... } from '@/lib/supabase/server' for server-only functions

console.warn('⚠️ DEPRECATED: Importing from @/lib/supabase server functions is deprecated. Please update to @/lib/supabase/server');

// Re-export everything from new location for backwards compatibility
export * from './supabase/server';
