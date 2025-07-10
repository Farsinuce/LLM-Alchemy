import { createBrowserClient } from '@supabase/ssr'

// Types for our database schema
export interface User {
  id: string
  email?: string | null
  created_at: string
  is_anonymous: boolean
  subscription_status: 'free' | 'premium'
  subscription_ends_at?: string | null
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
  updated_at: string
}

export interface DiscoveredElement {
  user_id: string
  element_name: string
  discovered_at: string
}

// Browser client for client-side operations
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Helper functions for common database operations
export async function getOrCreateAnonymousUser(supabase: any): Promise<User | null> {
  try {
    // First try to get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // Get user record from our database
      const { data: dbUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (dbUser) {
        return dbUser
      }
    }

    // Create anonymous user
    const { data, error } = await supabase.auth.signInAnonymously()
    
    if (error) {
      console.error('Error creating anonymous user:', error)
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

    return dbUser

  } catch (error) {
    console.error('Error in getOrCreateAnonymousUser:', error)
    return null
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
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error getting daily count:', error)
      return 0
    }
    
    return data?.daily_count || 0
  } catch (error) {
    console.error('Error in getDailyCount:', error)
    return 0
  }
}

export async function incrementDailyCount(supabase: any, userId: string): Promise<number> {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    // Use upsert to handle both insert and update
    const { data, error } = await supabase
      .from('user_sessions')
      .upsert({
        user_id: userId,
        date: today,
        daily_count: 1
      }, {
        onConflict: 'user_id,date',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (error) {
      // If upsert failed, try to increment existing record
      const { data: incrementData, error: incrementError } = await supabase.rpc('increment_daily_count', {
        p_user_id: userId
      })

      if (incrementError) {
        console.error('Error incrementing daily count:', incrementError)
        return 0
      }

      return incrementData || 1
    }

    return data?.daily_count || 1
  } catch (error) {
    console.error('Error in incrementDailyCount:', error)
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

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading game state:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in loadGameState:', error)
    return null
  }
}
