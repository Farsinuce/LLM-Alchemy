// GameElement, GameState, etc. (domain-prefixed)

// Comprehensive game element structure used throughout the game
export interface GameElement {
  id: string;
  name: string;
  emoji: string;
  color: string;
  unlockOrder: number;
  rarity?: string;
  reasoning?: string;
  // Tag separation for different purposes
  achievementTags?: string[];  // For achievements and challenges
  emojiTags?: string[];        // For OpenMoji visual search
  tags?: string[];             // Legacy fallback for backwards compatibility
  isEndElement?: boolean;
  parents?: GameElement[];
  energyEnhanced?: boolean;
  // OpenMoji-specific fields (only for PUA emojis)
  openmojiHex?: string;      // Hexcode for non-Unicode emojis
  isOpenmojiExtra?: boolean; // True if using PUA emoji
}

// Comprehensive achievement structure with tiering support
export interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  unlocked: number;
  // Tiering support
  isProgressive?: boolean;
  countType?: string;
  tier?: 1 | 2 | 3;
  currentCount?: number;
  nextTierAt?: number | null;
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
