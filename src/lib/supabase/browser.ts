import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

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

// Authentication functions - browser only
export async function signInWithEmail(
  supabase: SupabaseClient, 
  email: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    return { error };
  } catch (error) {
    return { error: error as Error };
  }
}

export async function signInWithGoogle(
  supabase: SupabaseClient
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    return { error };
  } catch (error) {
    return { error: error as Error };
  }
}
