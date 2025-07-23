// Achievement system for LLM Alchemy
// Extracted from LLMAlchemy.tsx for better code organization

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

export interface Element {
  id: string;
  name: string;
  emoji: string;
  color: string;
  unlockOrder: number;
  rarity?: string;
  reasoning?: string;
  tags?: string[];
  isEndElement?: boolean;
  parents?: Element[];
  energyEnhanced?: boolean;
}

// Tiered achievement configuration - easy to extend
interface TieredAchievementConfig {
  id: string;
  name: string;
  description: string;
  emoji: string;
  countType: string;
  tiers: [number, number, number]; // Bronze, Silver, Gold
  tags?: string[]; // Tags to count for this achievement
}

const TIERED_ACHIEVEMENTS: TieredAchievementConfig[] = [
  {
    id: 'danger-zone',
    name: 'Danger Zone',
    description: 'Create dangerous elements',
    emoji: '⚠️',
    countType: 'danger',
    tiers: [5, 25, 100],
    tags: ['danger', 'catastrophe', 'toxic', 'explosive', 'corrosive', 'radioactive', 'unstable']
  },
  {
    id: 'advanced-metallurgist',
    name: 'Metallurgist',
    description: 'Discover metals',
    emoji: '⚒️',
    countType: 'metal',
    tiers: [10, 30, 75],
    tags: ['metal']
  },
  {
    id: 'life-finds-a-way',
    name: 'Life Finds a Way',
    description: 'Discover organisms',
    emoji: '🧬',
    countType: 'life',
    tiers: [15, 50, 150],
    tags: ['plant', 'animal', 'organism']
  },
  {
    id: 'element-master',
    name: 'Element Master',
    description: 'Discover elements',
    emoji: '💯',
    countType: 'total',
    tiers: [10, 50, 100]
  }
];

/**
 * Calculate current count for a specific achievement type
 */
function calculateAchievementCount(
  countType: string,
  allElements: Element[],
  allEndElements: Element[],
  tags?: string[]
): number {
  const allDiscoveredElements = [...allElements, ...allEndElements];
  
  if (countType === 'total') {
    return allDiscoveredElements.length;
  }
  
  if (tags) {
    return allDiscoveredElements.filter(e => 
      e.tags && e.tags.some(tag => tags.includes(tag))
    ).length;
  }
  
  return 0;
}

/**
 * Get tier information for a current count
 */
function getTierInfo(count: number, tiers: [number, number, number]): {
  tier: 1 | 2 | 3 | null;
  nextTierAt: number | null;
} {
  if (count >= tiers[2]) return { tier: 3, nextTierAt: null }; // Gold
  if (count >= tiers[1]) return { tier: 2, nextTierAt: tiers[2] }; // Silver
  if (count >= tiers[0]) return { tier: 1, nextTierAt: tiers[1] }; // Bronze
  return { tier: null, nextTierAt: tiers[0] };
}

/**
 * Update existing achievements with current progress information
 */
export function updateAchievementsWithProgress(
  achievements: Achievement[],
  allElements: Element[],
  allEndElements: Element[]
): Achievement[] {
  return achievements.map(achievement => {
    // Find if this achievement is tiered
    const tieredConfig = TIERED_ACHIEVEMENTS.find(config => config.id === achievement.id);
    
    if (!tieredConfig) {
      return achievement; // Not a tiered achievement
    }
    
    // Calculate current count
    const currentCount = calculateAchievementCount(
      tieredConfig.countType,
      allElements,
      allEndElements,
      tieredConfig.tags
    );
    
    // Get tier information
    const { tier, nextTierAt } = getTierInfo(currentCount, tieredConfig.tiers);
    
    return {
      ...achievement,
      isProgressive: true,
      countType: tieredConfig.countType,
      tier: tier || 1, // Default to bronze if unlocked
      currentCount,
      nextTierAt
    };
  });
}

/**
 * Check for new achievements based on a newly discovered element
 * @param newElement The element that was just discovered
 * @param allElements Array of all discovered regular elements
 * @param allEndElements Array of all discovered end elements
 * @param existingAchievements Array of already unlocked achievements
 * @param gameMode Current game mode ('science' or 'creative')
 * @returns Array of newly unlocked achievements
 */
export function checkAchievements(
  newElement: Element,
  allElements: Element[],
  allEndElements: Element[],
  existingAchievements: Achievement[],
  gameMode: 'science' | 'creative'
): Achievement[] {
  const newAchievements: Achievement[] = [];
  
  try {
    // Tag-based achievement detection
    if (newElement.tags && Array.isArray(newElement.tags)) {
      for (const tag of newElement.tags) {
        let achievementId: string | null = null;
        let achievementName: string = '';
        let achievementDescription: string = '';
        let achievementEmoji: string = '🏆';
        
        // Check if this is the first element with this tag
        const hasExistingWithTag = [...allElements, ...allEndElements]
          .filter(e => e.id !== newElement.id)
          .some(e => e.tags && e.tags.includes(tag));
        
        if (!hasExistingWithTag) {
          // Map tags to achievements based on game mode
          if (gameMode === 'creative') {
            switch (tag) {
              case 'food':
                achievementId = 'first-food';
                achievementName = 'Edible Elements';
                achievementDescription = 'Created your first food item';
                achievementEmoji = '🍎';
                break;
              case 'lifeform':
              case 'creature':
              case 'animal':
                achievementId = 'first-lifeform';
                achievementName = 'First Lifeform!';
                achievementDescription = 'Brought life into existence';
                achievementEmoji = '🧬';
                break;
              case 'metal':
                achievementId = 'first-metal';
                achievementName = 'Metalworker';
                achievementDescription = 'Forged your first metal';
                achievementEmoji = '⚒️';
                break;
              case 'tool':
                achievementId = 'first-tool';
                achievementName = 'Tool Maker';
                achievementDescription = 'Crafted your first tool';
                achievementEmoji = '🔨';
                break;
              case 'fictional-character':
              case 'character':
                achievementId = 'first-character';
                achievementName = 'Fictional Hero';
                achievementDescription = 'Summoned a legendary being';
                achievementEmoji = '🦸';
                break;
              case 'disaster':
                achievementId = 'first-disaster';
                achievementName = 'Chaos Alchemist';
                achievementDescription = 'Unleashed destructive forces';
                achievementEmoji = '💥';
                break;
            }
          } else { // Science mode
            switch (tag) {
              case 'lifeform':
              case 'organism':
              case 'microorganism':
                achievementId = 'first-lifeform';
                achievementName = 'Genesis';
                achievementDescription = 'Created the first living organism';
                achievementEmoji = '🧬';
                break;
              case 'mineral':
              case 'compound':
                achievementId = 'first-mineral';
                achievementName = 'Geologist';
                achievementDescription = 'Discovered your first mineral compound';
                achievementEmoji = '💎';
                break;
              case 'metal':
                achievementId = 'first-metal';
                achievementName = 'Metallurgist';
                achievementDescription = 'Refined your first metal';
                achievementEmoji = '⚒️';
                break;
              case 'plant':
                achievementId = 'first-plant';
                achievementName = 'Botanist';
                achievementDescription = 'Cultivated plant life';
                achievementEmoji = '🌱';
                break;
            }
          }
          
          // Add the achievement if we found a match and don't already have it
          if (achievementId && !existingAchievements.find(a => a.id === achievementId)) {
            newAchievements.push({
              id: achievementId,
              name: achievementName,
              description: achievementDescription,
              emoji: achievementEmoji,
              unlocked: Date.now()
            });
          }
        }
      }
    }
    
    // Milestone achievements using passed arrays
    const totalElements = allElements.length + allEndElements.length;
    
    // 10 elements achievement
    if (totalElements >= 10 && !existingAchievements.find(a => a.id === 'alchemist-apprentice')) {
      newAchievements.push({
        id: 'alchemist-apprentice',
        name: 'Alchemist Apprentice',
        description: 'Discovered 10 elements',
        emoji: '🎓',
        unlocked: Date.now()
      });
    }
    
    // 50 elements achievement
    if (totalElements >= 50 && !existingAchievements.find(a => a.id === 'skilled-alchemist')) {
      newAchievements.push({
        id: 'skilled-alchemist',
        name: 'Skilled Alchemist',
        description: 'Discovered 50 elements',
        emoji: '🧙',
        unlocked: Date.now()
      });
    }
    
    // 100 elements achievement
    if (totalElements >= 100 && !existingAchievements.find(a => a.id === 'century-club')) {
      newAchievements.push({
        id: 'century-club',
        name: 'Century Club',
        description: 'Discovered 100 elements',
        emoji: '💯',
        unlocked: Date.now()
      });
    }
    
    // End element achievements (Science mode only)
    if (gameMode === 'science') {
      if (allEndElements.length >= 1 && !existingAchievements.find(a => a.id === 'dead-end')) {
        newAchievements.push({
          id: 'dead-end',
          name: 'End of Branch',
          description: 'Discovered your first End Element',
          emoji: '🔚',
          unlocked: Date.now()
        });
      }
      
      if (allEndElements.length >= 10 && !existingAchievements.find(a => a.id === 'end-collector')) {
        newAchievements.push({
          id: 'end-collector',
          name: 'End Collector',
          description: 'Collected 10 End Elements',
          emoji: '🏁',
          unlocked: Date.now()
        });
      }
      
      // Advanced Science Mode Achievements
      const allDiscoveredElements = [...allElements, ...allEndElements];
      
      // Master of States: 5 elements in each state of matter
      if (!existingAchievements.find(a => a.id === 'master-of-states')) {
        const solidElements = allDiscoveredElements.filter(e => e.tags && e.tags.includes('solid'));
        const liquidElements = allDiscoveredElements.filter(e => e.tags && e.tags.includes('liquid'));
        const gasElements = allDiscoveredElements.filter(e => e.tags && e.tags.includes('gas'));
        
        if (solidElements.length >= 5 && liquidElements.length >= 5 && gasElements.length >= 5) {
          newAchievements.push({
            id: 'master-of-states',
            name: 'Master of States',
            description: 'Discover 5 elements in each state of matter (5 solids, 5 liquids, 5 gases)',
            emoji: '🧊',
            unlocked: Date.now()
          });
        }
      }
      
      // Biome Explorer: 4 different environments
      if (!existingAchievements.find(a => a.id === 'biome-explorer')) {
        const biomeTags = ['terrestrial', 'aquatic', 'aerial', 'arctic', 'desert', 'forest', 'marine'];
        const discoveredBiomes = new Set();
        
        allDiscoveredElements.forEach(element => {
          if (element.tags) {
            element.tags.forEach(tag => {
              if (biomeTags.includes(tag)) {
                discoveredBiomes.add(tag);
              }
            });
          }
        });
        
        if (discoveredBiomes.size >= 4) {
          newAchievements.push({
            id: 'biome-explorer',
            name: 'Biome Explorer',
            description: 'Create elements from 4 different environments',
            emoji: '🌍',
            unlocked: Date.now()
          });
        }
      }
      
      // Metallurgist: 10 different metals
      if (!existingAchievements.find(a => a.id === 'advanced-metallurgist')) {
        const metalElements = allDiscoveredElements.filter(e => e.tags && e.tags.includes('metal'));
        
        if (metalElements.length >= 10) {
          newAchievements.push({
            id: 'advanced-metallurgist',
            name: 'Metallurgist',
            description: 'Discover 10 different metals',
            emoji: '⚒️',
            unlocked: Date.now()
          });
        }
      }
      
      // Danger Zone: 5 dangerous elements
      if (!existingAchievements.find(a => a.id === 'danger-zone')) {
        const dangerTags = ['danger', 'catastrophe', 'toxic', 'explosive', 'corrosive', 'radioactive', 'unstable'];
        const dangerousElements = allDiscoveredElements.filter(e => 
          e.tags && e.tags.some(tag => dangerTags.includes(tag))
        );
        
        if (dangerousElements.length >= 5) {
          newAchievements.push({
            id: 'danger-zone',
            name: 'Danger Zone',
            description: 'Create 5 dangerous elements',
            emoji: '⚠️',
            unlocked: Date.now()
          });
        }
      }
      
      // Life Finds a Way: 15 organisms
      if (!existingAchievements.find(a => a.id === 'life-finds-a-way')) {
        const lifeTags = ['plant', 'animal', 'organism'];
        const lifeElements = allDiscoveredElements.filter(e => 
          e.tags && e.tags.some(tag => lifeTags.includes(tag))
        );
        
        if (lifeElements.length >= 15) {
          newAchievements.push({
            id: 'life-finds-a-way',
            name: 'Life Finds a Way',
            description: 'Discover 15 organisms',
            emoji: '🧬',
            unlocked: Date.now()
          });
        }
      }
    }
    
  } catch (error) {
    console.error('Error checking achievements:', error);
  }
  
  return newAchievements;
}
