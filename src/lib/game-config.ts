/**
 * Centralized game configuration constants
 * 
 * This file contains all game-related constants to ensure consistency
 * across the application and make it easy to adjust values.
 */

export const GAME_CONFIG = {
  /**
   * Daily free combinations limit for non-paying users
   * Used across main menu display, game logic, and upgrade prompts
   */
  DAILY_FREE_COMBINATIONS: 5,
  
  // Future game constants can be added here, such as:
  // TOKEN_COSTS: { combination: 1, undo: 1 },
  // ACHIEVEMENT_THRESHOLDS: { apprentice: 10, skilled: 50, expert: 100 },
  // etc.
} as const;
