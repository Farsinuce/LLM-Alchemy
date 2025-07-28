import { Element, MixingElement } from '@/components/game/LLMAlchemy/hooks/useGameState';

// Constants for collision detection and UI
export const GAME_CONSTANTS = {
  HOVER_DELAY: 500,
  ANIMATION_DURATION: 300,
  TOAST_DURATION: 3000,
  ELEMENT_SIZES: { sm: 48, md: 56, lg: 64 },
  BREAKPOINTS: { sm: 640, md: 768 },
  COLLISION_SPACING: 8,
  MAX_COLLISION_DISTANCE: 300,
  COLLISION_POSITIONS: 16
};

// Utility functions
export const getElementSize = (): number => {
  if (typeof window === 'undefined') return GAME_CONSTANTS.ELEMENT_SIZES.md;
  
  if (window.innerWidth < GAME_CONSTANTS.BREAKPOINTS.sm) return GAME_CONSTANTS.ELEMENT_SIZES.sm;
  if (window.innerWidth < GAME_CONSTANTS.BREAKPOINTS.md) return GAME_CONSTANTS.ELEMENT_SIZES.md;
  return GAME_CONSTANTS.ELEMENT_SIZES.lg;
};

export const getContrastColor = (hexcolor: string): string => {
  const r = parseInt(hexcolor.slice(1, 3), 16);
  const g = parseInt(hexcolor.slice(3, 5), 16);
  const b = parseInt(hexcolor.slice(5, 7), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#000000' : '#FFFFFF';
};

export const getRarityHoverColor = (rarity: string = 'common'): string => {
  switch (rarity) {
    case 'uncommon': return '#10B981'; // Green
    case 'rare': return '#8B5CF6';     // Purple  
    default: return '#6B7280';         // Gray (common)
  }
};

// Collision detection functions
export const checkCollision = (
  x1: number, 
  y1: number, 
  x2: number, 
  y2: number, 
  size: number | null = null
): boolean => {
  const currentSize = size || getElementSize();
  return Math.abs(x1 - x2) < currentSize && Math.abs(y1 - y2) < currentSize;
};

export const hasCollisionAt = (
  x: number, 
  y: number, 
  mixingArea: MixingElement[], 
  dropZoneElement: HTMLDivElement | null,
  excludeIndex: number | null = null
): boolean => {
  const rect = dropZoneElement?.getBoundingClientRect();
  if (!rect) return false;
  
  const elementSize = getElementSize();
  
  // Check boundaries
  if (x < 0 || y < 0 || x + elementSize > rect.width || y + elementSize > rect.height) {
    return true; // Out of bounds
  }
  
  // Check collision with existing elements
  return mixingArea.some(el => 
    el.index !== excludeIndex && checkCollision(x, y, el.x, el.y)
  );
};

export const findBestPosition = (
  centerX: number, 
  centerY: number, 
  mixingArea: MixingElement[], 
  dropZoneElement: HTMLDivElement | null,
  excludeIndex: number | null = null
): { x: number; y: number } => {
  const elementSize = getElementSize();
  const spacing = elementSize + GAME_CONSTANTS.COLLISION_SPACING;
  
  // Try center first
  if (!hasCollisionAt(centerX, centerY, mixingArea, dropZoneElement, excludeIndex)) {
    return { x: centerX, y: centerY };
  }
  
  // Spiral outward from center
  for (let distance = spacing; distance < GAME_CONSTANTS.MAX_COLLISION_DISTANCE; distance += spacing * 0.7) {
    // Try positions around each circle
    for (let i = 0; i < GAME_CONSTANTS.COLLISION_POSITIONS; i++) {
      const angle = (i / GAME_CONSTANTS.COLLISION_POSITIONS) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      
      if (!hasCollisionAt(x, y, mixingArea, dropZoneElement, excludeIndex)) {
        return { x, y };
      }
    }
  }
  
  // Fallback: find any available position in grid pattern
  const rect = dropZoneElement?.getBoundingClientRect();
  if (rect) {
    for (let y = 0; y < rect.height - elementSize; y += spacing) {
      for (let x = 0; x < rect.width - elementSize; x += spacing) {
        if (!hasCollisionAt(x, y, mixingArea, dropZoneElement, excludeIndex)) {
          return { x, y };
        }
      }
    }
  }
  
  // Final fallback: return center even if it collides
  return { x: centerX, y: centerY };
};

export const resolveCollisions = (
  newX: number, 
  newY: number, 
  mixingArea: MixingElement[], 
  dropZoneElement: HTMLDivElement | null,
  excludeIndex: number | null = null
): { x: number; y: number } => {
  return findBestPosition(newX, newY, mixingArea, dropZoneElement, excludeIndex);
};

// Game logic functions
export const getPreviouslyMixedElements = (
  elementName: string, 
  combinations: Record<string, string | null>, 
  failedCombinations: string[]
): Set<string> => {
  const mixedWith = new Set<string>();
  
  // Check combinations object
  Object.keys(combinations).forEach(comboKey => {
    const parts = comboKey.split('+');
    if (parts.includes(elementName)) {
      parts.forEach(part => {
        if (part !== elementName && part !== 'Energy') {
          mixedWith.add(part);
        }
      });
    }
  });
  
  // Check failed combinations
  failedCombinations.forEach(failedCombo => {
    const parts = failedCombo.split('+');
    if (parts.includes(elementName)) {
      parts.forEach(part => {
        if (part !== elementName && part !== 'Energy') {
          mixedWith.add(part);
        }
      });
    }
  });
  
  return mixedWith;
};

// Touch device detection
export const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (('ontouchstart' in window) || navigator.maxTouchPoints > 0);
};

// Sorting functions for elements
export const sortElements = (
  elements: Element[], 
  sortMode: 'unlock' | 'alpha', 
  searchTerm: string = ''
): Element[] => {
  const filtered = elements
    .filter(e => e.name !== 'Energy')
    .filter(e => searchTerm === '' || e.name.toLowerCase().includes(searchTerm.toLowerCase()));
  
  return filtered.sort((a, b) => {
    if (sortMode === 'alpha') {
      return a.name.localeCompare(b.name);
    }
    return a.unlockOrder - b.unlockOrder;
  });
};

// Game mode validation
export const isValidGameMode = (mode: string): mode is 'science' | 'creative' => {
  return mode === 'science' || mode === 'creative';
};

// Element validation helpers
export const isEndElement = (element: Element): boolean => {
  return element.isEndElement === true;
};

export const canElementBeDragged = (element: Element): boolean => {
  return !isEndElement(element);
};

// Combination key generation
export const generateCombinationKey = (elements: Element[], hasEnergy: boolean = false): string => {
  const sortedNames = elements.map(e => e.name).sort().join('+');
  return hasEnergy ? `${sortedNames}+Energy` : sortedNames;
};

// Animation helpers
export const getAnimationDuration = (type: 'fast' | 'normal' | 'slow'): number => {
  switch (type) {
    case 'fast': return 150;
    case 'slow': return 500;
    default: return GAME_CONSTANTS.ANIMATION_DURATION;
  }
};

// API request helpers (pure functions)
export interface CombinationRequest {
  elem1: Element;
  elem2: Element;
  elem3?: Element | null;
  gameMode: 'science' | 'creative';
  useProModel: boolean;
  userApiKey?: string;
  combinations: Record<string, string | null>;
  failedCombinations: string[];
  elements: Element[];
}

export interface CombinationResult {
  result: string | null;
  emoji?: string;
  color?: string;
  rarity?: string;
  reasoning?: string;
  tags?: string[];
  achievementTags?: string[];
  emojiTags?: string[];
  isEndElement?: boolean;
  error?: boolean;
  limitReached?: boolean;
  timeout?: boolean;
}

// Hardcoded combinations for life form path (pure function)
export const getHardcodedCombination = (
  sortedNames: string, 
  gameMode: 'science' | 'creative'
): CombinationResult | null => {
  if (gameMode !== 'science') return null;
  
  // Microbe creation
  if ((sortedNames.includes('Mud') || sortedNames.includes('Clay') || sortedNames.includes('Nutrient')) && 
      sortedNames.includes('Air') && sortedNames.includes('Energy')) {
    return { 
      result: 'Microbe', 
      emoji: '🦠', 
      color: '#90EE90', 
      rarity: 'common', 
      reasoning: 'Energy activates organic matter in suitable environment',
      achievementTags: ['lifeform', 'microorganism'],
      isEndElement: false
    };
  }
  
  // Microbe branches
  if (sortedNames === 'Energy+Microbe+Water' || sortedNames === 'Air+Energy+Microbe' || sortedNames === 'Earth+Energy+Microbe') {
    return { 
      result: 'Algae', 
      emoji: '🌿', 
      color: '#228B22', 
      rarity: 'common', 
      reasoning: 'Microbes evolve photosynthesis in favorable conditions',
      achievementTags: ['lifeform', 'plant', 'organism'],
      isEndElement: false
    };
  }
  if (sortedNames === 'Microbe+Water') {
    return { 
      result: 'Protozoa', 
      emoji: '🔬', 
      color: '#4169E1', 
      rarity: 'common', 
      reasoning: 'Single-celled organisms thrive in aquatic environment',
      achievementTags: ['lifeform', 'microorganism'],
      isEndElement: false
    };
  }
  if (sortedNames === 'Microbe+Mud' || sortedNames === 'Compost+Microbe') {
    return { 
      result: 'Fungi', 
      emoji: '🍄', 
      color: '#8B4513', 
      rarity: 'common', 
      reasoning: 'Decomposer organisms break down organic matter',
      achievementTags: ['lifeform', 'organism'],
      isEndElement: false
    };
  }
  
  return null;
};

// Mixing validation logic (pure)
export const validateMixing = (elem1: Element, elem2: Element): boolean => {
  // Don't allow mixing with self
  if (elem1.name === elem2.name) return false;
  
  // Don't allow mixing End Elements
  if (elem1.isEndElement || elem2.isEndElement) return false;
  
  return true;
};

// Determine mixing type (pure)
export const getMixingType = (elem1: MixingElement, elem2: MixingElement): 'energize' | 'mix' | 'energy-mix' => {
  if (elem1.name === 'Energy' && !elem2.energized) {
    return 'energize';
  } else if (elem1.energized || elem2.energized) {
    return 'energy-mix';
  } else {
    return 'mix';
  }
};

// Calculate rarity target (pure)
export const calculateRarityTarget = (): 'common' | 'uncommon' | 'rare' => {
  const roll = Math.random();
  if (roll < 0.85) return 'common';
  else if (roll < 0.96) return 'uncommon';
  else return 'rare';
};

// Build combination context for LLM (pure)
export const buildCombinationContext = (
  combinations: Record<string, string | null>,
  failedCombinations: string[]
): { recentText: string; failedText: string } => {
  // Keep only last 10 combinations for context (prevents endless chains)
  const recentCombinations = Object.entries(combinations).slice(-10);
  const recentText = recentCombinations.length > 0 
    ? recentCombinations.map(([mix, result]) => `${mix}=${result || 'null'}`).join(', ')
    : 'none';

  // Prepare failed combinations text
  const failedText = failedCombinations.length > 0 
    ? failedCombinations.slice(-5).join(', ')
    : 'none';
    
  return { recentText, failedText };
};

// Check if combination exists in cache (pure)
export const getCachedCombination = (
  mixKey: string,
  combinations: Record<string, string | null>,
  elements: Element[],
  endElements: Element[]
): CombinationResult | null => {
  if (combinations[mixKey] === undefined) return null;
  
  const cachedResult = combinations[mixKey];
  if (!cachedResult) return { result: null };
  
  // Find the full element data
  const existingElement = elements.find(e => e.name === cachedResult) || 
                          endElements.find(e => e.name === cachedResult);
                          
  return existingElement ? { 
    result: existingElement.name, 
    emoji: existingElement.emoji, 
    color: existingElement.color, 
    rarity: existingElement.rarity,
    reasoning: existingElement.reasoning || '',
    achievementTags: existingElement.achievementTags || [],
    emojiTags: existingElement.emojiTags || [],
    tags: existingElement.tags || [],
    isEndElement: existingElement.isEndElement || false
  } : { result: null };
};

// Determine model selection (pure)
export const determineModelSelection = (
  userApiKey: string,
  tokenBalance: number,
  selectedModel: 'flash' | 'pro'
): { useProModel: boolean; userType: string; reason: string; model: string } => {
  const useProModel = userApiKey 
    ? (selectedModel === 'pro') 
    : (tokenBalance > 0 && selectedModel === 'pro');
  
  let userType: string;
  let reason: string;
  let model: string;
  
  if (userApiKey) {
    userType = 'API Key User';
    model = useProModel ? 'google/gemini-2.5-pro' : 'google/gemini-2.5-flash';
    reason = `User preference (${useProModel ? 'Pro' : 'Flash'} selected)`;
  } else {
    userType = useProModel ? 'Token User' : 'Freemium User';
    model = useProModel ? 'google/gemini-2.5-pro' : 'google/gemini-2.5-flash';
    reason = useProModel ? `Has tokens (${tokenBalance} remaining)` : `Daily limit user`;
  }
  
  return { useProModel, userType, reason, model };
};

// Rate limiting logic (pure)
export const shouldAllowMixing = (
  userApiKey: string,
  tokenBalance: number,
  dailyCount: number,
  dailyLimit: number
): { allowed: boolean; reason?: string } => {
  // If user has their own API key, no limits
  if (userApiKey) return { allowed: true };
  
  // If user has tokens, they can use them
  if (tokenBalance > 0) return { allowed: true };
  
  // Otherwise check daily limit
  if (dailyCount >= dailyLimit) {
    return { 
      allowed: false, 
      reason: `Daily limit reached: ${dailyCount}/${dailyLimit} - Click "Get more" for tokens!` 
    };
  }
  
  return { allowed: true };
};
