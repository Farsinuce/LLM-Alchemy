// DEPRECATED: Import types from @/types instead
console.warn('⚠️ Importing types from @/lib/supabase/types is deprecated. Please import from @/types instead.');

// Re-export from new location for backwards compatibility
export type { User, UserSession, GameElement, GameState, Achievement, DiscoveredElement, GameProgress } from '@/types'
