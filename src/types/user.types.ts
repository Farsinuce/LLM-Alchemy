// User-related interfaces
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
  show_challenges?: boolean
}

export interface UserSession {
  id: string
  user_id: string
  date: string
  daily_count: number
  created_at: string
  updated_at: string
}
