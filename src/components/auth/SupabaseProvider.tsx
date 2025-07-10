'use client'

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase-client'
import { User } from '@supabase/supabase-js'
import { User as DBUser, getOrCreateAnonymousUser, getDailyCount } from '@/lib/supabase-client'

interface SupabaseContextType {
  user: User | null
  dbUser: DBUser | null
  dailyCount: number
  loading: boolean
  signInAnonymously: () => Promise<void>
  signOut: () => Promise<void>
  refreshDailyCount: () => Promise<void>
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [dbUser, setDbUser] = useState<DBUser | null>(null)
  const [dailyCount, setDailyCount] = useState<number>(0)
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

  const signInAnonymously = useCallback(async () => {
    try {
      setLoading(true)
      const dbUser = await getOrCreateAnonymousUser(supabase)
      if (dbUser) {
        setDbUser(dbUser)
        // Don't call refreshDailyCount here to avoid circular dependency
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
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }, [supabase])

  useEffect(() => {
    let mounted = true
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        setUser(session?.user || null)
        
        if (session?.user) {
          // Get or create DB user record
          const dbUser = await getOrCreateAnonymousUser(supabase)
          if (mounted) {
            setDbUser(dbUser)
            // Get daily count
            if (dbUser) {
              const count = await getDailyCount(supabase, session.user.id)
              if (mounted) setDailyCount(count)
            }
          }
        } else {
          // Auto-create anonymous user on first visit
          await signInAnonymously()
        }
      } catch (error) {
        console.error('❌ Error getting initial session:', error)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes - only set user, don't create DB records here
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          
          // Get DB user and daily count for newly signed in user
          const dbUser = await getOrCreateAnonymousUser(supabase)
          if (mounted) {
            setDbUser(dbUser)
            if (dbUser) {
              const count = await getDailyCount(supabase, session.user.id)
              if (mounted) setDailyCount(count)
            }
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setDbUser(null)
          setDailyCount(0)
        }
        
        if (mounted) setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase, signInAnonymously])

  const value = {
    user,
    dbUser,
    dailyCount,
    loading,
    signInAnonymously,
    signOut,
    refreshDailyCount,
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
