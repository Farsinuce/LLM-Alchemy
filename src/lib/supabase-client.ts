import { createBrowserClient } from '@supabase/ssr'

// Types for our database schema
export interface User {
  id: string
  email?: string | null
  created_at: string
  is_anonymous: boolean
  subscription_status: 'free' | 'premium'
  subscription_ends_at?: string | null
  token_balance?: number
  display_name?: string | null
  avatar_url?: string | null
  google_id?: string | null
  email_verified?: boolean
  upgraded_from_anonymous?: boolean
  anonymous_data_migrated?: boolean
  llm_model?: 'flash' | 'pro'
}

export interface UserSession {
  id: string
  user_id: string
  date: string
  daily_count: number
  created_at: string
  updated_at: string
}

export interface GameState {
  id: string
  user_id: string
  game_mode: 'science' | 'creative'
  elements: any[]
  end_elements: any[]
  combinations: Record<string, string | null>
  achievements: any[]
  failed_combinations: string[]
  updated_at: string
}

export interface DiscoveredElement {
  user_id: string
  element_name: string
  discovered_at: string
}

// Browser client for client-side operations
export function createClient() {
  // Clean implementation without debug logs
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createBrowserClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: false,  // Disable auto refresh
      detectSessionInUrl: true
    },
    isSingleton: true  // Ensure single instance
  })
}

// Authentication functions
export async function signInWithEmail(supabase: any, email: string): Promise<{ error: any }> {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    return { error };
  } catch (error) {
    return { error };
  }
}

export async function signInWithGoogle(supabase: any): Promise<{ error: any }> {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    return { error };
  } catch (error) {
    return { error };
  }
}

// Prevent multiple simultaneous signup attempts
let isCreatingUser = false;
let lastAttemptTime = 0;
const MIN_RETRY_INTERVAL = 5000; // 5 seconds between attempts

// Helper functions for common database operations
export async function getOrCreateAnonymousUser(supabase: any): Promise<User | null> {
  try {
    // Prevent multiple simultaneous calls
    if (isCreatingUser) {
      console.log('Anonymous user creation already in progress, waiting...');
      return null;
    }
    
    // Rate limiting: prevent rapid retry attempts
    const now = Date.now();
    if (now - lastAttemptTime < MIN_RETRY_INTERVAL) {
      console.log('Too soon to retry anonymous user creation');
      return null;
    }
    
    lastAttemptTime = now;

    // First check for existing session to prevent duplicate signups
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session?.user) {
      // Get existing user record from our database
      const { data: dbUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()
      
      if (dbUser) {
        return dbUser
      }
    }

    isCreatingUser = true;

    // Create anonymous user with Turnstile protection and timeout fallback
    let captchaToken: string | undefined;
    
    // Get Turnstile token with shorter timeout for better UX
    try {
      const { getTurnstileToken, waitForTurnstile } = await import('./turnstile');
      const turnstileReady = await waitForTurnstile(3000); // 3 seconds to load
      
      if (turnstileReady) {
        // Get Turnstile token with 5 second timeout (matches the function's internal timeout)
        captchaToken = await getTurnstileToken() || undefined;
      }
    } catch (error) {
      console.warn('Turnstile not available, proceeding without captcha:', error);
    }

    const { data, error } = await supabase.auth.signInAnonymously(
      captchaToken ? { options: { captchaToken } } : undefined
    )
    
    if (error) {
      console.error('Error creating anonymous user:', error)
      // If it's a captcha error, don't retry immediately
      if (error.message?.includes('captcha')) {
        lastAttemptTime = now + MIN_RETRY_INTERVAL; // Force longer wait
      }
      return null
    }

    // Create user record in our database
    const newUser = {
      id: data.user.id,
      email: null,
      is_anonymous: true,
      subscription_status: 'free' as const,
      subscription_ends_at: null
    }

    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .insert([newUser])
      .select()
      .single()

    if (dbError) {
      console.error('Error creating user record:', dbError)
      return null
    }

    // Store anonymous user ID for potential migration later
    if (typeof window !== 'undefined') {
      localStorage.setItem('anonymous_user_id', data.user.id)
    }

    return dbUser

  } catch (error) {
    console.error('Error in getOrCreateAnonymousUser:', error)
    return null
  } finally {
    isCreatingUser = false;
  }
}

export async function getDailyCount(supabase: any, userId: string): Promise<number> {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('user_sessions')
      .select('daily_count')
      .eq('user_id', userId)
      .eq('date', today)
      .single()
    
    if (error) {
      // Handle different error types gracefully
      if (error.code === 'PGRST116') {
        // No rows returned - user hasn't used any combinations today
        return 0
      } else if (error.code === 'PGRST301' || error.message?.includes('406') || error.status === 406) {
        // RLS policy issues - return 0 and continue silently (expected for anonymous users)
        return 0
      } else {
        console.error('Error getting daily count:', error)
        return 0
      }
    }
    
    return data?.daily_count || 0
  } catch (error) {
    console.error('Error in getDailyCount:', error)
    return 0
  }
}

export async function incrementDailyCount(supabase: any, userId: string): Promise<number> {
  try {
    // Use the database function to atomically increment
    const { data, error } = await supabase.rpc('increment_daily_count', {
      p_user_id: userId
    })

    if (error) {
      console.error('Error incrementing daily count:', error)
      return 0
    }

    return data || 1
  } catch (error) {
    console.error('Error in incrementDailyCount:', error)
    return 0
  }
}

export async function decrementDailyCount(supabase: any, userId: string): Promise<number> {
  try {
    // Use the database function to atomically decrement
    const { data, error } = await supabase.rpc('decrement_daily_count', {
      p_user_id: userId
    })

    if (error) {
      console.error('Error decrementing daily count:', error)
      return 0
    }

    return data || 0
  } catch (error) {
    console.error('Error in decrementDailyCount:', error)
    return 0
  }
}

export async function saveGameState(supabase: any, userId: string, gameState: Partial<GameState>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('game_states')
      .upsert({
        user_id: userId,
        ...gameState,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,game_mode'
      })

    if (error) {
      console.error('Error saving game state:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in saveGameState:', error)
    return false
  }
}

export async function loadGameState(supabase: any, userId: string, gameMode: string): Promise<GameState | null> {
  try {
    const { data, error } = await supabase
      .from('game_states')
      .select('*')
      .eq('user_id', userId)
      .eq('game_mode', gameMode)
      .single()

    if (error) {
      // Handle different error types gracefully
      if (error.code === 'PGRST116') {
        // No rows returned - no saved state for this mode
        return null
      } else if (error.code === 'PGRST301' || error.message?.includes('406') || error.status === 406) {
        // RLS policy issues - return null and continue silently (expected for anonymous users)
        return null
      } else {
        console.error('Error loading game state:', error)
        return null
      }
    }

    return data
  } catch (error) {
    console.error('Error in loadGameState:', error)
    return null
  }
}

export async function getGameProgress(supabase: any, userId: string): Promise<{
  science: { elements: number, endElements: number, achievements: number, lastPlayed?: string } | null,
  creative: { elements: number, endElements: number, achievements: number, lastPlayed?: string } | null,
  lastMode: 'science' | 'creative'
}> {
  try {
    const { data, error } = await supabase
      .from('game_states')
      .select('*')
      .eq('user_id', userId)

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting game progress:', error)
      return { science: null, creative: null, lastMode: 'science' }
    }

    if (!data || data.length === 0) {
      return { science: null, creative: null, lastMode: 'science' }
    }

    const progress = {
      science: null as any,
      creative: null as any,
      lastMode: 'science' as 'science' | 'creative'
    }

    // Find the most recently updated mode
    let latestUpdate = 0
    
    data.forEach((gameState: GameState) => {
      const updatedAt = new Date(gameState.updated_at).getTime()
      if (updatedAt > latestUpdate) {
        latestUpdate = updatedAt
        progress.lastMode = gameState.game_mode
      }

      const modeProgress = {
        elements: Array.isArray(gameState.elements) ? gameState.elements.length : 0,
        endElements: Array.isArray(gameState.end_elements) ? gameState.end_elements.length : 0,
        achievements: Array.isArray(gameState.achievements) ? gameState.achievements.length : 0,
        lastPlayed: gameState.updated_at
      }

      if (gameState.game_mode === 'science') {
        progress.science = modeProgress
      } else if (gameState.game_mode === 'creative') {
        progress.creative = modeProgress
      }
    })

    return progress
  } catch (error) {
    console.error('Error in getGameProgress:', error)
    return { science: null, creative: null, lastMode: 'science' }
  }
}

export async function resetGameState(supabase: any, userId: string, gameMode: string, includeAchievements: boolean = false): Promise<boolean> {
  try {
    if (includeAchievements) {
      // Delete the entire game state record
      const { error } = await supabase
        .from('game_states')
        .delete()
        .eq('user_id', userId)
        .eq('game_mode', gameMode)

      if (error) {
        console.error('Error deleting game state:', error)
        return false
      }
    } else {
      // Get existing achievements first
      const existingState = await loadGameState(supabase, userId, gameMode)
      const existingAchievements = existingState?.achievements || []
      
      // Reset but keep achievements
      const { error } = await supabase
        .from('game_states')
        .upsert({
          user_id: userId,
          game_mode: gameMode,
          elements: [],
          end_elements: [],
          combinations: {},
          achievements: existingAchievements, // Preserve existing achievements
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,game_mode'
        })

      if (error) {
        console.error('Error resetting game state:', error)
        return false
      }
    }

    return true
  } catch (error) {
    console.error('Error in resetGameState:', error)
    return false
  }
}

// Token-related functions
export async function getTokenBalance(supabase: any, userId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_token_balance', {
      p_user_id: userId
    })

    if (error) {
      console.error('Error getting token balance:', error)
      return 0
    }

    return data || 0
  } catch (error) {
    console.error('Error in getTokenBalance:', error)
    return 0
  }
}

export async function consumeToken(supabase: any, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('consume_token', {
      p_user_id: userId
    })

    if (error) {
      console.error('Error consuming token:', error)
      return false
    }

    return data || false
  } catch (error) {
    console.error('Error in consumeToken:', error)
    return false
  }
}

export async function addTokens(supabase: any, userId: string, tokens: number): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('add_tokens', {
      p_user_id: userId,
      p_tokens: tokens
    })

    if (error) {
      console.error('Error adding tokens:', error)
      return 0
    }

    return data || 0
  } catch (error) {
    console.error('Error in addTokens:', error)
    return 0
  }
}

// Monthly usage tracking functions for subscription fair use
export async function getMonthlyUsage(supabase: any, userId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_monthly_usage', {
      p_user_id: userId
    })

    if (error) {
      console.error('Error getting monthly usage:', error)
      return 0
    }

    return data || 0
  } catch (error) {
    console.error('Error in getMonthlyUsage:', error)
    return 0
  }
}

export async function incrementMonthlyUsage(supabase: any, userId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('increment_monthly_usage', {
      p_user_id: userId
    })

    if (error) {
      console.error('Error incrementing monthly usage:', error)
      return 0
    }

    return data || 0
  } catch (error) {
    console.error('Error in incrementMonthlyUsage:', error)
    return 0
  }
}

export async function hasExceededFairUse(supabase: any, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('has_exceeded_fair_use', {
      p_user_id: userId
    })

    if (error) {
      console.error('Error checking fair use limit:', error)
      return false
    }

    return data || false
  } catch (error) {
    console.error('Error in hasExceededFairUse:', error)
    return false
  }
}

// LLM Model preference functions
export async function getLlmModelPreference(supabase: any, userId: string): Promise<'flash' | 'pro'> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('llm_model')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error getting LLM model preference:', error)
      return 'flash'
    }

    return data?.llm_model || 'flash'
  } catch (error) {
    console.error('Error in getLlmModelPreference:', error)
    return 'flash'
  }
}

export async function updateLlmModelPreference(supabase: any, userId: string, model: 'flash' | 'pro'): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ llm_model: model })
      .eq('id', userId)

    if (error) {
      console.error('Error updating LLM model preference:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in updateLlmModelPreference:', error)
    return false
  }
}

// Challenge preference functions
export async function getChallengePreference(supabase: any, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('show_challenges')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error getting challenge preference:', error)
      return true // Default to showing challenges
    }

    return data?.show_challenges ?? true
  } catch (error) {
    console.error('Error in getChallengePreference:', error)
    return true
  }
}

export async function updateChallengePreference(supabase: any, userId: string, showChallenges: boolean): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ show_challenges: showChallenges })
      .eq('id', userId)

    if (error) {
      console.error('Error updating challenge preference:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in updateChallengePreference:', error)
    return false
  }
}
