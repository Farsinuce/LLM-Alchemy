'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { User as DBUser, getOrCreateAnonymousUser, getDailyCount } from '@/lib/supabase'

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
  
  const supabase = createClient()

  const refreshDailyCount = async () => {
    if (user) {
      try {
        const count = await getDailyCount(supabase, user.id)
        setDailyCount(count)
      } catch (error) {
        console.error('Error refreshing daily count:', error)
      }
    }
  }

  const signInAnonymously = async () => {
    try {
      setLoading(true)
      const dbUser = await getOrCreateAnonymousUser(supabase)
      if (dbUser) {
        setDbUser(dbUser)
        await refreshDailyCount()
      }
    } catch (error) {
      console.error('Error signing in anonymously:', error)
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setDbUser(null)
      setDailyCount(0)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user || null)
        
        if (session?.user) {
          // Get or create DB user record
          const dbUser = await getOrCreateAnonymousUser(supabase)
          setDbUser(dbUser)
          
          // Get daily count
          if (dbUser) {
            const count = await getDailyCount(supabase, session.user.id)
            setDailyCount(count)
          }
        } else {
          // Auto-create anonymous user on first visit
          await signInAnonymously()
        }
      } catch (error) {
        console.error('Error getting initial session:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null)
        
        if (session?.user) {
          const dbUser = await getOrCreateAnonymousUser(supabase)
          setDbUser(dbUser)
          await refreshDailyCount()
        } else {
          setDbUser(null)
          setDailyCount(0)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

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
