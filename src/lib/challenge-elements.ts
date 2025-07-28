// Curated lists for LLM Alchemy challenge system
// Daily challenges use categories, weekly challenges use specific elements

// Daily challenge categories with proper tag mapping and game mode support
export const DAILY_CATEGORIES = {
  science: [
    { category: 'lifeform', title: 'Discover a lifeform', tag: 'lifeform' },
    { category: 'edible', title: 'Discover something edible', tag: 'edible' },
    { category: 'tool', title: 'Discover a tool', tag: 'tool' },
    { category: 'metal', title: 'Discover a metal', tag: 'metal' },
    { category: 'gas', title: 'Discover a gas', tag: 'gas' },
    { category: 'liquid', title: 'Discover a liquid', tag: 'liquid' },
    { category: 'mineral', title: 'Discover a mineral', tag: 'mineral' },
    { category: 'chemical', title: 'Discover a chemical compound', tag: 'chemical' },
    { category: 'plant', title: 'Discover a plant', tag: 'plant' },
    { category: 'organism', title: 'Discover an organism', tag: 'organism' },
    { category: 'material', title: 'Discover a building material', tag: 'material' },
    { category: 'technology', title: 'Discover modern tech', tag: 'technology' }
  ],
  creative: [
    { category: 'creature', title: 'Discover a creature', tag: 'creature' },
    { category: 'magical', title: 'Discover something magical', tag: 'magical' },
    { category: 'weapon', title: 'Discover a weapon', tag: 'weapon' },
    { category: 'mythological', title: 'Discover something mythological', tag: 'mythological' },
    { category: 'artifact', title: 'Discover an artifact', tag: 'artifact' },
    { category: 'divine', title: 'Discover something divine', tag: 'divine' },
    { category: 'everyday', title: 'Discover an everyday object', tag: 'everyday' },
    { category: 'fictional', title: 'Discover something fictional', tag: 'fictional' },
    // Include science categories too for creative mode
    { category: 'lifeform', title: 'Discover a lifeform', tag: 'lifeform' },
    { category: 'edible', title: 'Discover something edible', tag: 'edible' },
    { category: 'tool', title: 'Discover a tool', tag: 'tool' }
  ]
};

// Weekly elements separated by game mode
export const WEEKLY_ELEMENTS = {
  science: [
    // Realistic, grounded elements for Science mode
    'Steam', 'Mud', 'Sand', 'Glass', 'Metal', 'Rust',
    'Salt', 'Sugar', 'Vinegar', 'Oil', 'Soap', 'Paper',
    'Plastic', 'Rubber', 'Cement', 'Brick', 'Wood', 'Coal',
    
    // Biological elements
    'Bacteria', 'Algae', 'Mushroom', 'Coral', 'Pearl',
    'Honey', 'Milk', 'Cheese', 'Yogurt', 'Bread', 'Wine',
    'Beer', 'Whiskey', 'Vodka', 'Rum',
    
    // Technology and tools
    'Telescope', 'Microscope', 'Compass', 'Clock', 'Battery',
    'Magnet', 'Laser', 'Computer', 'Radio', 'Television',
    
    // Materials and compounds
    'Gunpowder', 'Dynamite', 'Fertilizer', 'Pesticide',
    'Medicine', 'Penicillin', 'Insulin', 'Vaccine',
    'Alloy', 'Bronze', 'Steel', 'Titanium',
    
    // Natural phenomena
    'Rainbow', 'Lightning', 'Thunder', 'Tornado', 'Hurricane',
    'Earthquake', 'Volcano', 'Aurora', 'Eclipse',
    
    // Food and cuisine
    'Pizza', 'Sushi', 'Pasta', 'Burger', 'Taco',
    'Ice Cream', 'Chocolate', 'Coffee', 'Tea',
    'Tomato', 'Potato', 'Carrot', 'Apple', 'Orange',
    
    // Precious materials
    'Diamond', 'Gold', 'Silver', 'Platinum', 'Ruby',
    'Emerald', 'Sapphire', 'Crystal', 'Jade'
  ],
  creative: [
    // All science elements plus creative/mythological ones
    'Steam', 'Mud', 'Sand', 'Glass', 'Metal', 'Rust',
    'Salt', 'Sugar', 'Vinegar', 'Oil', 'Soap', 'Paper',
    'Plastic', 'Rubber', 'Cement', 'Brick', 'Wood', 'Coal',
    'Bacteria', 'Algae', 'Mushroom', 'Coral', 'Pearl',
    'Honey', 'Milk', 'Cheese', 'Yogurt', 'Bread', 'Wine',
    'Beer', 'Whiskey', 'Vodka', 'Rum',
    'Telescope', 'Microscope', 'Compass', 'Clock', 'Battery',
    'Magnet', 'Laser', 'Computer', 'Radio', 'Television',
    'Gunpowder', 'Dynamite', 'Fertilizer', 'Pesticide',
    'Medicine', 'Penicillin', 'Insulin', 'Vaccine',
    'Alloy', 'Bronze', 'Steel', 'Titanium',
    'Rainbow', 'Lightning', 'Thunder', 'Tornado', 'Hurricane',
    'Earthquake', 'Volcano', 'Aurora', 'Eclipse',
    'Pizza', 'Sushi', 'Pasta', 'Burger', 'Taco',
    'Ice Cream', 'Chocolate', 'Coffee', 'Tea',
    'Tomato', 'Potato', 'Carrot', 'Apple', 'Orange',
    'Diamond', 'Gold', 'Silver', 'Platinum', 'Ruby',
    'Emerald', 'Sapphire', 'Crystal', 'Jade',
    
    // Creative/Mythological elements (only for creative mode)
    'Dragon', 'Phoenix', 'Unicorn', 'Pegasus', 'Griffin',
    'Kraken', 'Mermaid', 'Vampire', 'Werewolf', 'Ghost',
    'Excalibur', 'Holy Grail', 'Philosopher Stone',
    'Love Potion', 'Invisibility Cloak', 'Time Machine',
    'Portal', 'Lightsaber', 'Wand', 'Spell Book'
  ]
};

// Helper function to get random daily categories based on game mode
export function getRandomDailyCategories(gameMode: 'science' | 'creative' = 'science', count: number = 2) {
  const categories = DAILY_CATEGORIES[gameMode];
  const shuffled = [...categories].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Helper function to get a random weekly element based on game mode
export function getRandomWeeklyElement(
  gameMode: 'science' | 'creative' = 'science', 
  excludeRecent: string[] = []
): string {
  const elements = WEEKLY_ELEMENTS[gameMode];
  const available = elements.filter(e => !excludeRecent.includes(e));
  if (available.length === 0) return elements[0]; // Fallback
  return available[Math.floor(Math.random() * available.length)];
}

// Helper function to determine appropriate game mode for challenge
export function getRandomGameMode(): 'science' | 'creative' | 'any' {
  const modes = ['science', 'creative', 'any'];
  return modes[Math.floor(Math.random() * modes.length)] as 'science' | 'creative' | 'any';
}

// Tag mapping for proper completion detection
export const TAG_MAPPING: Record<string, string[]> = {
  // Map display categories to actual element tags that might be used
  'lifeform': ['lifeform', 'organism', 'life', 'living'],
  'edible': ['edible', 'food', 'consumable'],
  'tool': ['tool', 'implement', 'device'],
  'metal': ['metal', 'metallic'],
  'gas': ['gas', 'gaseous'],
  'liquid': ['liquid', 'fluid'],
  'mineral': ['mineral', 'stone', 'rock'],
  'chemical': ['chemical', 'compound', 'substance'],
  'plant': ['plant', 'vegetation', 'flora'],
  'organism': ['organism', 'lifeform', 'life'],
  'material': ['material', 'building'],
  'technology': ['technology', 'tech', 'electronic'],
  'creature': ['creature', 'being'],
  'magical': ['magical', 'magic', 'mystical'],
  'weapon': ['weapon', 'armament'],
  'mythological': ['mythological', 'mythical', 'legendary'],
  'artifact': ['artifact', 'relic'],
  'divine': ['divine', 'holy', 'sacred'],
  'everyday': ['everyday', 'common', 'ordinary'],
  'fictional': ['fictional', 'fantasy']
};

// Helper function to check if element matches category
// Updated to support both legacy tags and new achievementTags structure
export function elementMatchesCategory(elementTags: string[], targetCategory: string): boolean {
  if (!elementTags || elementTags.length === 0) return false;
  
  const possibleTags = TAG_MAPPING[targetCategory] || [targetCategory];
  return elementTags.some(tag => possibleTags.includes(tag.toLowerCase()));
}

// Overloaded version that accepts an element object with achievementTags
export function elementMatchesCategoryFromElement(element: { achievementTags?: string[], tags?: string[] }, targetCategory: string): boolean {
  // Use achievementTags first, fall back to tags for backwards compatibility
  const elementTags = element.achievementTags || element.tags || [];
  return elementMatchesCategory(elementTags, targetCategory);
}
