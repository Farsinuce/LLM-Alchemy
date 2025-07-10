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
  
  // Debug environment variables
  console.log('🔍 Environment Variables Check:')
  console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  
  const supabase = createClient()
  console.log('🔍 Supabase client created:', supabase)

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
      console.log('🔍 Starting anonymous sign in...')
      setLoading(true)
      const dbUser = await getOrCreateAnonymousUser(supabase)
      console.log('🔍 getOrCreateAnonymousUser result:', dbUser)
      if (dbUser) {
        setDbUser(dbUser)
        await refreshDailyCount()
        console.log('🔍 Anonymous sign in successful')
      } else {
        console.log('❌ getOrCreateAnonymousUser returned null')
      }
    } catch (error) {
      console.error('❌ Error signing in anonymously:', error)
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
    console.log('🔍 SupabaseProvider useEffect starting...')
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('🔍 Getting initial session...')
        const { data: { session } } = await supabase.auth.getSession()
        console.log('🔍 Initial session:', session)
        setUser(session?.user || null)
        
        if (session?.user) {
          console.log('🔍 Existing session found, getting DB user...')
          // Get or create DB user record
          const dbUser = await getOrCreateAnonymousUser(supabase)
          setDbUser(dbUser)
          
          // Get daily count
          if (dbUser) {
            const count = await getDailyCount(supabase, session.user.id)
            setDailyCount(count)
          }
        } else {
          console.log('🔍 No existing session, creating anonymous user...')
          // Auto-create anonymous user on first visit
          await signInAnonymously()
        }
      } catch (error) {
        console.error('❌ Error getting initial session:', error)
      } finally {
        setLoading(false)
        console.log('🔍 Initial session setup complete')
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
