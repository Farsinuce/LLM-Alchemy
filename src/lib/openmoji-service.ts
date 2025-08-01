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
    threshold: 0.25,
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

export interface ResolveEmojiParams {
  unicodeEmoji: string;
  name: string;
  tags?: string[];  // These are specifically emojiTags for visual search
  confidence?: number;  // LLM confidence in emoji choice (0.0-1.0)
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
  tags = [],
  confidence = 0.5
}: ResolveEmojiParams): ResolveEmojiResult {
  // Check cache first with confidence bucketing
  const confBucket = Math.round(confidence * 10); // 0-10
  const cacheKey = `${name}|${tags.join(',')}|${confBucket}`;
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
  
  // Two-phase search: prioritize element name, fallback to tags
  // Phase 1: Search by name only
  let searchResults = fuse.search(name);
  let bestHit = searchResults[0];
  
  // Phase 2: If no good match by name alone (score > 0.3), try with tags
  if (!bestHit || bestHit.score! > 0.3) {
    const searchQuery = `${name} ${tags.join(' ')}`.trim();
    searchResults = fuse.search(searchQuery);
    bestHit = searchResults[0];
  }

  // Multi-stage guard decision logic
  let chosenDatum: OpenMojiData | null = null;
  let decision = 'fallback';

  // Stage 1: Always prefer exact PUA matches with token overlap
  if (bestHit?.item.hexcode.startsWith('E') && tokenOverlap(name, bestHit)) {
    chosenDatum = bestHit.item;
    decision = 'pua-exact';
  }
  // Stage 2: Trust LLM when confidence is high AND Unicode exists in OpenMoji
  else if (confidence >= 0.85 && direct && unicodeMap.has(unicodeEmoji)) {
    chosenDatum = direct;
    decision = 'llm-confident';
  }
  // Stage 3: Use fuzzy search only with meaningful word overlap
  else if (!direct || (bestHit && bestHit.score! < 0.15 && tokenOverlap(name, bestHit))) {
    chosenDatum = bestHit?.item || null;
    decision = 'fuzzy-validated';
  }
  // Stage 4: Fallback to LLM's choice
  else {
    chosenDatum = direct;
    decision = 'llm-fallback';
  }

  // Debug logging in development
  if (process.env.NODE_ENV !== 'production') {
    const searchPhase = (bestHit?.score ?? 1) <= 0.3 ? 'name-only' : 'name-with-tags';
    console.debug('[OpenMoji] Multi-stage decision:', {
      name,
      tags,
      unicodeEmoji,
      confidence,
      searchPhase,
      direct: direct ? `${direct.emoji} (${direct.hexcode})` : null,
      bestHit: bestHit ? `${bestHit.item.emoji || bestHit.item.hexcode} (score: ${bestHit.score?.toFixed(3)})` : null,
      tokenOverlap: bestHit ? tokenOverlap(name, bestHit) : false,
      decision,
      chosen: chosenDatum ? `${chosenDatum.emoji || chosenDatum.hexcode} (${chosenDatum.hexcode})` : null
    });
  }

  const datum = chosenDatum || undefined;
  const result = wrap(datum);
  
  // Cache the result
  resultCache.set(cacheKey, result);
  return result;
}

/**
 * Helper function to check if element name and annotation share meaningful words
 * Prevents prefix-only matches like "coal" → "collaboration"
 */
function tokenOverlap(elementName: string, fuseResult: { item: OpenMojiData; score?: number }): boolean {
  const nameWords = elementName.toLowerCase().split(/\s+/);
  const annotationWords = fuseResult.item.annotation.toLowerCase().split(/\s+/);
  return nameWords.some(word => annotationWords.includes(word));
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
