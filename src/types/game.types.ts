// GameElement, GameState, etc. (domain-prefixed)

// Game element structure
export interface GameElement {
  name: string
  discovered_at?: string
  [key: string]: unknown
}

// Achievement structure
export interface Achievement {
  name: string
  unlocked_at: string
  [key: string]: unknown
}

export interface GameState {
  id: string
  user_id: string
  game_mode: 'science' | 'creative'
  elements: GameElement[]
  end_elements: GameElement[]
  combinations: Record<string, string | null>
  achievements: Achievement[]
  failed_combinations: string[]
  updated_at: string
}

export interface DiscoveredElement {
  user_id: string
  element_name: string
  discovered_at: string
}

// Helper type for game progress data
export interface GameProgress {
  science: { 
    elements: number
    endElements: number
    achievements: number
    lastPlayed?: string 
  } | null
  creative: { 
    elements: number
    endElements: number
    achievements: number
    lastPlayed?: string 
  } | null
  lastMode: 'science' | 'creative'
}
