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
        // Get current session (don't create new anonymous user)
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (session?.user) {
          // User already exists - load their data
          setUser(session.user)
          
          // Get existing DB user record (don't create)
          const { data: dbUser } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          if (mounted && dbUser) {
            setDbUser(dbUser)
            const count = await getDailyCount(supabase, session.user.id)
            const balance = await getTokenBalance(supabase, session.user.id)
            if (mounted) {
              setDailyCount(count)
              setTokenBalance(balance)
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
        
        try {
          if (event === 'SIGNED_OUT') {
            setUser(null)
            setDbUser(null)
            setDailyCount(0)
            setTokenBalance(0)
          } else if (event === 'SIGNED_IN' && session?.user) {
            setUser(session.user)
            
            // Get or create DB user
            const dbUser = await getOrCreateAnonymousUser(supabase)
            if (mounted && dbUser) {
              setDbUser(dbUser)
              const count = await getDailyCount(supabase, session.user.id)
              const balance = await getTokenBalance(supabase, session.user.id)
              if (mounted) {
                setDailyCount(count)
                setTokenBalance(balance)
              }
            }
          }
        } catch (error) {
          console.error('Auth state change error:', error)
        } finally {
          if (mounted) setLoading(false)
        }
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
