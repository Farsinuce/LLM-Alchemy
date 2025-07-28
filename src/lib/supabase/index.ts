// Safe barrel export - only browser-safe symbols
// This file ensures no server-only code leaks to the client

// Export browser client and auth functions
export { createClient, signInWithEmail, signInWithGoogle } from './browser'

// Export all helper functions (runtime-agnostic)
export {
  getOrCreateAnonymousUser,
  getDailyCount,
  incrementDailyCount,
  decrementDailyCount,
  saveGameState,
  loadGameState,
  getGameProgress,
  resetGameState,
  getTokenBalance,
  consumeToken,
  addTokens,
  getMonthlyUsage,
  incrementMonthlyUsage,
  hasExceededFairUse,
  getLlmModelPreference,
  updateLlmModelPreference,
  getChallengePreference,
  updateChallengePreference,
} from './helpers'

// Export types
export type {
  User,
  UserSession,
  GameState,
  GameElement,
  Achievement,
  DiscoveredElement,
  GameProgress,
} from './types'

// DO NOT EXPORT SERVER-ONLY FUNCTIONS:
// - createServerSupabaseClient
// - createServiceRoleClient  
// - createMiddlewareClient
//
// These must be imported directly from './server' in server-side code only
