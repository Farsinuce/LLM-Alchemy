import Fuse from 'fuse.js';

// Type definitions for OpenMoji data structure
interface OpenMojiData {
  emoji: string;
  hexcode: string;
  group: string;
  subgroups: string;
  annotation: string;
  tags: string;
  openmoji_tags: string;
  openmoji_author: string;
  openmoji_date: string;
  skintone?: string;
  skintone_combination?: string;
  skintone_base_emoji?: string;
  skintone_base_hexcode?: string;
  unicode?: number;
  order?: number;
}

// Import OpenMoji data with proper typing
// eslint-disable-next-line @typescript-eslint/no-require-imports
const openmoji = require('openmoji') as { openmojis: OpenMojiData[] };

// Global cache for serverless warm starts
const globalCache = globalThis as any; // eslint-disable-line @typescript-eslint/no-explicit-any
if (!globalCache.__openmojiFuse) {
  globalCache.__openmojiFuse = new Fuse(openmoji.openmojis, {
    keys: ['annotation', 'openmoji_tags'],
    threshold: 0.32,
    includeScore: true
  });
}
const fuse = globalCache.__openmojiFuse;

// Create Unicode → OpenMoji map for O(1) lookups
if (!globalCache.__openmojiUnicodeMap) {
  globalCache.__openmojiUnicodeMap = new Map(
    openmoji.openmojis.map(d => [d.emoji, d])
  );
}
const unicodeMap = globalCache.__openmojiUnicodeMap;

// Result cache to avoid repeat fuzzy searches
if (!globalCache.__openmojiResultCache) {
  globalCache.__openmojiResultCache = new Map<string, ResolveEmojiResult>();
}
const resultCache = globalCache.__openmojiResultCache;

// v2.1: Alias table for known mismatches
const aliasHex: Record<string, string> = {
  microbe: 'E011',        // Dedicated microbe emoji
  'coffee grinder': 'E156', // Coffee grinder (if exists)
  golem: 'E0BF'          // Golem (if exists)
};

interface ResolveEmojiParams {
  unicodeEmoji: string;
  name: string;
  tags?: string[];  // These are specifically emojiTags for visual search
}

interface ResolveEmojiResult {
  hexcode: string;
  svgPath: string;
  isExtra: boolean; // true if it's a PUA (Private Use Area) emoji
}

/**
 * Resolves the best OpenMoji for a given element
 * Always returns an OpenMoji (fallback to ❓ if nothing found)
 * v2.1: Enhanced with debug logging and aliases
 */
export function resolveEmoji({ 
  unicodeEmoji = '', 
  name, 
  tags = [] 
}: ResolveEmojiParams): ResolveEmojiResult {
  // Check cache first
  const cacheKey = `${name}|${tags.join(',')}`;
  if (resultCache.has(cacheKey)) {
    return resultCache.get(cacheKey)!;
  }
  
  // v2.1: Check aliases first
  const alias = aliasHex[name.toLowerCase()];
  if (alias) {
    const datum = openmoji.openmojis.find(o => o.hexcode === alias);
    if (datum) {
      const result = wrap(datum);
      resultCache.set(cacheKey, result);
      
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[OpenMoji] Alias match:', { name, alias, hexcode: datum.hexcode });
      }
      
      return result;
    }
  }
  
  // Get direct Unicode match if available
  const direct = unicodeEmoji ? unicodeMap.get(unicodeEmoji) : null;
  
  // Always search for potentially better match
  const searchQuery = `${name} ${tags.join(' ')}`.trim();
  const searchResults = fuse.search(searchQuery);
  const bestHit = searchResults[0];

  // Decision logic for using search result vs direct match (v2.1: threshold 0.35)
  const useBest = bestHit && (
    // Use if it's a PUA emoji (extends beyond Unicode)
    bestHit.item.hexcode.startsWith('E') ||
    // Use if no direct match exists
    !direct ||
    // Use if search result is significantly better (v2.1: 0.35 threshold)
    (direct && bestHit.score! < 0.35) // Score closer to 0 is better
  );

  // v2.1: Debug logging in development
  if (process.env.NODE_ENV !== 'production') {
    console.debug('[OpenMoji] Search result:', {
      name,
      tags,
      unicodeEmoji,
      direct: direct ? `${direct.emoji} (${direct.hexcode})` : null,
      bestHit: bestHit ? `${bestHit.item.emoji || bestHit.item.hexcode} (score: ${bestHit.score?.toFixed(3)})` : null,
      useBest,
      decision: useBest ? 'fuzzy' : 'direct'
    });
  }

  const datum = useBest ? bestHit.item : direct;
  const result = wrap(datum);
  
  // Cache the result
  resultCache.set(cacheKey, result);
  return result;
}

// v2.1: Helper function for consistent result wrapping
function wrap(datum?: OpenMojiData): ResolveEmojiResult {
  if (!datum) {
    const fallback = unicodeMap.get('❓')!;
    return {
      hexcode: fallback.hexcode,
      svgPath: `/openmoji/${fallback.hexcode}.svg`,
      isExtra: false
    };
  }
  
  return {
    hexcode: datum.hexcode,
    svgPath: `/openmoji/${datum.hexcode}.svg`,
    isExtra: datum.hexcode.startsWith('E')
  };
}

/**
 * Converts Unicode emoji to hexcode sequence
 * Handles multi-codepoint emojis (flags, skin tones, ZWJ sequences)
 * UPDATED: Strips FE0F anywhere in the sequence
 */
export function unicodeToHexSequence(emoji: string): string {
  return [...emoji]
    .map(cp => cp.codePointAt(0)!)
    .filter(code => code !== 0xFE0F) // Remove variation selector-16 anywhere
    .map(code => code.toString(16).toUpperCase().padStart(4, '0'))
    .join('-');
}

/**
 * Helper function for static OpenMoji usage in UI components
 * Returns the SVG path for a given Unicode emoji
 */
export function getStaticOpenMoji(emoji: string): string {
  const hexcode = unicodeToHexSequence(emoji);
  return `/openmoji/${hexcode}.svg`;
}
