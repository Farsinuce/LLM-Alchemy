'use client'

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase-client'
import { User } from '@supabase/supabase-js'
import { User as DBUser, getOrCreateAnonymousUser, getDailyCount, getTokenBalance } from '@/lib/supabase-client'

interface SupabaseContextType {
  user: User | null
  dbUser: DBUser | null
  dailyCount: number
  tokenBalance: number
  loading: boolean
  signInAnonymously: () => Promise<void>
  signOut: () => Promise<void>
  refreshDailyCount: () => Promise<void>
  refreshTokenBalance: () => Promise<void>
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [dbUser, setDbUser] = useState<DBUser | null>(null)
  const [dailyCount, setDailyCount] = useState<number>(0)
  const [tokenBalance, setTokenBalance] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  
  // Memoize supabase client to prevent recreation on every render
  const supabase = useMemo(() => createClient(), [])

  const refreshDailyCount = useCallback(async () => {
    if (user) {
      try {
        const count = await getDailyCount(supabase, user.id)
        setDailyCount(count)
      } catch (error) {
        console.error('Error refreshing daily count:', error)
      }
    }
  }, [user, supabase])

  const refreshTokenBalance = useCallback(async () => {
    if (user) {
      try {
        const balance = await getTokenBalance(supabase, user.id)
        setTokenBalance(balance)
      } catch (error) {
        console.error('Error refreshing token balance:', error)
      }
    }
  }, [user, supabase])

  const signInAnonymously = useCallback(async () => {
    try {
      setLoading(true)
      const dbUser = await getOrCreateAnonymousUser(supabase)
      if (dbUser) {
        setDbUser(dbUser)
        
        // Get the session to get the user ID for daily count
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const count = await getDailyCount(supabase, session.user.id)
          setDailyCount(count)
        }
      }
    } catch (error) {
      console.error('❌ Error signing in anonymously:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setDbUser(null)
      setDailyCount(0)
      setTokenBalance(0)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }, [supabase])

  useEffect(() => {
    let mounted = true
    let isInitializing = false
    
    const initializeAuth = async () => {
      if (isInitializing) return
      isInitializing = true
      
      try {
        // Get current session (don't create new anonymous user automatically)
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (session?.user) {
          // User already exists - load their data in parallel
          setUser(session.user)
          
          // Parallelize database operations for faster loading
          const [dbUserResult, dailyCountResult, tokenBalanceResult] = await Promise.allSettled([
            supabase.from('users').select('*').eq('id', session.user.id).single(),
            getDailyCount(supabase, session.user.id),
            getTokenBalance(supabase, session.user.id)
          ])
          
          if (mounted) {
            if (dbUserResult.status === 'fulfilled' && dbUserResult.value.data) {
              setDbUser(dbUserResult.value.data)
            }
            if (dailyCountResult.status === 'fulfilled') {
              setDailyCount(dailyCountResult.value)
            }
            if (tokenBalanceResult.status === 'fulfilled') {
              setTokenBalance(tokenBalanceResult.value)
            }
          }
        }
        // No else clause - don't create anonymous user automatically
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        if (mounted) {
          setLoading(false)
          isInitializing = false
        }
      }
    }

    // Initialize auth
    initializeAuth()

    // Listen for auth state changes (but don't trigger during initialization)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted || isInitializing) return
        
        // Keep 50ms delay only for deadlock prevention in auth state changes
        setTimeout(async () => {
          try {
            if (event === 'SIGNED_OUT') {
              setUser(null)
              setDbUser(null)
              setDailyCount(0)
              setTokenBalance(0)
            } else if (event === 'SIGNED_IN' && session?.user) {
              setUser(session.user)
              
              // Get or create DB user record for authenticated users
              let { data: dbUser } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single()
              
              // If no user record exists, create one for authenticated users
              if (!dbUser && session.user.email) {
                const newUserRecord = {
                  id: session.user.id,
                  email: session.user.email,
                  display_name: session.user.user_metadata?.display_name || 
                               session.user.user_metadata?.full_name || 
                               session.user.email?.split('@')[0],
                  avatar_url: session.user.user_metadata?.avatar_url,
                  google_id: session.user.app_metadata?.provider === 'google' ? 
                            session.user.user_metadata?.sub : null,
                  is_anonymous: false,
                  email_verified: session.user.email_confirmed_at !== null,
                  subscription_status: 'free' as const,
                  updated_at: new Date().toISOString()
                }

                const { data: newUser, error: createError } = await supabase
                  .from('users')
                  .insert([newUserRecord])
                  .select()
                  .single()

                if (!createError && newUser) {
                  dbUser = newUser
                  console.log('✅ Created user record for authenticated user:', session.user.id)
                } else {
                  console.error('Error creating authenticated user record:', createError)
                }
              }
              
              if (mounted && dbUser) {
                setDbUser(dbUser)
                // Parallelize these database calls too
                const [dailyCountResult, tokenBalanceResult] = await Promise.allSettled([
                  getDailyCount(supabase, session.user.id),
                  getTokenBalance(supabase, session.user.id)
                ])
                
                if (mounted) {
                  if (dailyCountResult.status === 'fulfilled') {
                    setDailyCount(dailyCountResult.value)
                  }
                  if (tokenBalanceResult.status === 'fulfilled') {
                    setTokenBalance(tokenBalanceResult.value)
                  }
                }
              }
            }
          } catch (error) {
            console.error('Auth state change error:', error)
          } finally {
            if (mounted) setLoading(false)
          }
        }, 50)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  const value = {
    user,
    dbUser,
    dailyCount,
    tokenBalance,
    loading,
    signInAnonymously,
    signOut,
    refreshDailyCount,
    refreshTokenBalance,
  }

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  )
}

export function useSupabase() {
  const context = useContext(SupabaseContext)
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider')
  }
  return context
}
