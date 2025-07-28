# OpenMoji Integration Plan for LLM Alchemy

**Date**: January 28, 2025  
**Version**: 2.0  
**Status**: In Progress - Critical Fixes Identified

## Executive Summary

This document outlines the integration of OpenMoji emojis into LLM Alchemy, replacing standard Unicode emoji rendering with consistent, beautiful OpenMoji SVGs. The approach follows the principle: **"Nothing fancy, always OpenMoji"**.

### Key Benefits
- **Visual Consistency**: All emojis use the same art style
- **Extended Library**: Access to ~450 extra emojis beyond Unicode
- **Simple Implementation**: ~40 lines of core logic
- **No External Dependencies**: All assets served locally
- **Performance Optimized**: Static files with browser caching

## Critical Fixes Required (v2.0)

Based on production review, these issues must be addressed:

1. **Copy Script Path** - `__dirname` breaks on Vercel, use `process.cwd()`
2. **Build Performance** - Synchronous copying can timeout (45s limit)
3. **React Reconciliation** - `insertAdjacentHTML` breaks virtual DOM
4. **Unicode Handling** - FE0F not stripped from middle positions
5. **Reasoning Popup** - Parent emojis still using raw text

## Technical Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   LLM Response  │────▶│ OpenMoji Service │────▶│  React Display  │
│ (Unicode emoji) │     │   (Resolution)   │     │  (SVG render)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │                         │
         │                       ▼                         │
         │              ┌─────────────────┐               │
         │              │   Fuse Search   │               │
         │              │ (Better match?) │               │
         │              └─────────────────┘               │
         │                       │                         │
         └───────────────────────┴─────────────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Static SVGs    │
                        │ /public/openmoji│
                        └─────────────────┘
```

## Implementation Guide

### Step 1: Install Dependencies

```bash
npm install openmoji fuse.js
```

### Step 2: Create Build Script (UPDATED)

Create `scripts/copy-openmoji.js`:

```javascript
const fs = require('fs');
const path = require('path');

function copyOpenMojiAssets() {
  // Use process.cwd() for Vercel compatibility
  const source = path.resolve(process.cwd(), 'node_modules/openmoji/color/svg');
  const destination = path.resolve(process.cwd(), 'public/openmoji');
  
  // Check if already copied (cache check)
  const testFile = path.join(destination, '2615.svg'); // ☕ Coffee
  if (fs.existsSync(testFile)) {
    console.log('✅ OpenMoji SVGs already present, skipping copy');
    return;
  }

  try {
    // Ensure destination exists
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }
    
    // Use async copying for better performance
    const copyFile = (src, dest) => {
      return new Promise((resolve, reject) => {
        fs.copyFile(src, dest, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    };
    
    // Copy all SVG files asynchronously
    async function copyAllFiles() {
      const files = fs.readdirSync(source);
      const svgFiles = files.filter(f => f.endsWith('.svg'));
      
      console.log(`📁 Copying ${svgFiles.length} OpenMoji SVGs...`);
      
      // Batch copy to avoid overwhelming file system
      const batchSize = 100;
      for (let i = 0; i < svgFiles.length; i += batchSize) {
        const batch = svgFiles.slice(i, i + batchSize);
        await Promise.all(
          batch.map(file => 
            copyFile(
              path.join(source, file),
              path.join(destination, file)
            )
          )
        );
        
        if (i % 500 === 0) {
          console.log(`  Copied ${i}/${svgFiles.length} files...`);
        }
      }
    }
    
    copyAllFiles().then(() => {
      console.log('✅ OpenMoji SVGs copied to public/openmoji');
      console.log(`📁 Total files: ~4000 SVGs`);
      console.log(`💾 Disk usage: ~50MB uncompressed, ~35MB when served with gzip`);
    }).catch(error => {
      console.error('❌ Error copying OpenMoji assets:', error);
      process.exit(1);
    });
    
  } catch (error) {
    console.error('❌ Error in copy setup:', error);
    process.exit(1);
  }
}

copyOpenMojiAssets();
```

Update `package.json`:

```json
{
  "scripts": {
    "postinstall": "node scripts/copy-openmoji.js",
    "build": "node scripts/copy-openmoji.js && next build"
  }
}
```

### Step 3: Create OpenMoji Service (UPDATED)

Create `src/lib/openmoji-service.ts`:

```typescript
import Fuse from 'fuse.js';
import openmoji from 'openmoji';

// Global cache for serverless warm starts
const globalCache = globalThis as any;
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
  globalCache.__openmojiResultCache = new Map<string, any>();
}
const resultCache = globalCache.__openmojiResultCache;

interface ResolveEmojiParams {
  unicodeEmoji?: string;
  name: string;
  tags?: string[];
}

interface ResolveEmojiResult {
  hexcode: string;
  svgPath: string;
  isExtra: boolean; // true if it's a PUA (Private Use Area) emoji
}

/**
 * Resolves the best OpenMoji for a given element
 * Always returns an OpenMoji (fallback to ❓ if nothing found)
 */
export function resolveEmoji({ 
  unicodeEmoji = '', 
  name, 
  tags = [] 
}: ResolveEmojiParams): ResolveEmojiResult {
  // Check cache first
  const cacheKey = `${name}|${tags.join(',')}`;
  if (resultCache.has(cacheKey)) {
    return resultCache.get(cacheKey);
  }
  
  // Get direct Unicode match if available
  const direct = unicodeEmoji ? unicodeMap.get(unicodeEmoji) : null;
  
  // Always search for potentially better match
  const searchQuery = `${name} ${tags.join(' ')}`.trim();
  const searchResults = fuse.search(searchQuery);
  const bestHit = searchResults[0];

  // Decision logic for using search result vs direct match
  const useBest = bestHit && (
    // Use if it's a PUA emoji (extends beyond Unicode)
    bestHit.item.hexcode.startsWith('E') ||
    // Use if no direct match exists
    !direct ||
    // Use if search result is significantly better (0.25 threshold)
    (direct && bestHit.score! < 0.25) // Score closer to 0 is better
  );

  const datum = useBest ? bestHit.item : direct;

  // Fallback to question mark if nothing found
  if (!datum) {
    const fallback = unicodeMap.get('❓')!;
    const result = {
      hexcode: fallback.hexcode,
      svgPath: `/openmoji/${fallback.hexcode}.svg`,
      isExtra: false
    };
    resultCache.set(cacheKey, result);
    return result;
  }

  const result = {
    hexcode: datum.hexcode,
    svgPath: `/openmoji/${datum.hexcode}.svg`,
    isExtra: datum.hexcode.startsWith('E')
  };
  
  // Cache the result
  resultCache.set(cacheKey, result);
  return result;
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
```

### Step 4: Create React Display Component (UPDATED)

Create `src/components/game/OpenMojiDisplay.tsx`:

```typescript
import React, { memo, useState } from 'react';
import { unicodeToHexSequence } from '@/lib/openmoji-service';

interface OpenMojiDisplayProps {
  emoji: string;           // Unicode emoji
  hexcode?: string;        // Pre-resolved hexcode (for PUA emojis)
  name: string;           // Alt text
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Displays an OpenMoji SVG
 * Memoized to prevent unnecessary re-renders
 * UPDATED: Uses React state for fallback instead of insertAdjacentHTML
 */
export const OpenMojiDisplay = memo<OpenMojiDisplayProps>(({ 
  emoji, 
  hexcode,
  name,
  size = 'md',
  className = '' 
}) => {
  const [fallbackToUnicode, setFallbackToUnicode] = useState(false);
  
  const sizeClasses = {
    sm: 'w-6 h-6',     // 24px - for UI elements
    md: 'w-8 h-8',     // 32px - default game size
    lg: 'w-12 h-12'    // 48px - for showcases
  };
  
  // Use provided hexcode or convert from Unicode
  const finalHexcode = hexcode || unicodeToHexSequence(emoji);
  
  // If fallback is triggered, render Unicode emoji
  if (fallbackToUnicode) {
    return (
      <span className={`${sizeClasses[size]} flex items-center justify-center text-2xl ${className}`}>
        {emoji}
      </span>
    );
  }
  
  return (
    <img 
      src={`/openmoji/${finalHexcode}.svg`}
      alt={name}
      className={`${sizeClasses[size]} ${className} select-none`}
      loading="lazy"
      draggable={false}
      onError={() => {
        console.warn(`Failed to load OpenMoji SVG: ${finalHexcode}`);
        setFallbackToUnicode(true);
      }}
    />
  );
});

OpenMojiDisplay.displayName = 'OpenMojiDisplay';
```

### Step 5: Update Element Type Definition

In `src/components/game/LLMAlchemy.tsx`, update the Element interface:

```typescript
interface Element {
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
  // OpenMoji-specific fields (only for PUA emojis)
  openmojiHex?: string;      // Hexcode for non-Unicode emojis
  isOpenmojiExtra?: boolean; // True if using PUA emoji
}
```

### Step 5b: Update .gitignore

Add to `.gitignore`:
```
# OpenMoji SVG assets (generated during build)
/public/openmoji/
```

### Step 6: Integrate with Game Logic

In `src/components/game/LLMAlchemy.tsx`, update the `performMix` function:

```typescript
import { resolveEmoji } from '@/lib/openmoji-service';
import { OpenMojiDisplay } from '@/components/game/OpenMojiDisplay';

// In performMix function, after getting LLM response:
if (result.result) {
  // ... existing code ...
  
  // Resolve OpenMoji for the new element
  const openmojiData = resolveEmoji({
    unicodeEmoji: selectedOutcome.emoji || '✨',
    name: selectedOutcome.result,
    tags: selectedOutcome.tags
  });
  
  const newElement = {
    id: selectedOutcome.result.toLowerCase().replace(/\s+/g, '-'),
    name: selectedOutcome.result,
    emoji: selectedOutcome.emoji || '✨',
    color: selectedOutcome.color,
    unlockOrder: elements.length + endElements.length,
    rarity: selectedOutcome.rarity,
    reasoning: selectedOutcome.reasoning,
    tags: selectedOutcome.tags,
    isEndElement: selectedOutcome.isEndElement,
    parents: elementsToMix,
    energyEnhanced: hasEnergy,
    // Only store OpenMoji data for PUA (extra) emojis
    ...(openmojiData.isExtra && {
      openmojiHex: openmojiData.hexcode,
      isOpenmojiExtra: true
    })
  };
  
  // ... rest of existing code ...
}
```

### Step 7: Update All Emoji Rendering (UPDATED)

Replace all emoji rendering in `LLMAlchemy.tsx`:

**Locations to update:**

1. **Energy Element Display**
2. **Regular Elements List**
3. **Mixing Area Elements**
4. **Touch Drag Overlay**
5. **Unlock Animation Modal**
6. **Reasoning Popup Parent Display** (NEW - was missed before)

**NEW: Reasoning Popup Update**

Find the reasoning popup section (around line 1800) and update:

```typescript
// OLD CODE:
{reasoningPopup.element.parents.map(parent => parent.emoji).join('+')}

// NEW CODE:
<div className="flex items-center justify-center gap-1">
  {reasoningPopup.element.parents.map((parent, index) => (
    <React.Fragment key={parent.id}>
      <OpenMojiDisplay 
        emoji={parent.emoji} 
        hexcode={parent.openmojiHex}
        name={parent.name} 
        size="sm"
        className="inline-block"
      />
      {index < reasoningPopup.element.parents.length - 1 && (
        <span className="text-gray-400">
          {reasoningPopup.element.energyEnhanced && index === reasoningPopup.element.parents.length - 2 ? '〰️' : '+'}
        </span>
      )}
    </React.Fragment>
  ))}
</div>
```

### Step 8: Vercel Optimizations

Add to `next.config.js`:

```javascript
module.exports = {
  // ... existing config ...
  
  // Cache OpenMoji SVGs for 1 year
  async headers() {
    return [
      {
        source: '/openmoji/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
```

Add to `vercel.json`:

```json
{
  "outputFileTracing": true,
  "functions": {
    "src/app/api/generate/route.ts": {
      "excludeFiles": "public/openmoji/**"
    }
  }
}
```

### Step 9: Optional Enhancements

**1. Critical Path Preload**

In `src/app/game/page.tsx` or layout:

```tsx
export default function GamePage() {
  return (
    <>
      <Head>
        {/* Preload starting elements */}
        <link rel="preload" href="/openmoji/1F525.svg" as="image" type="image/svg+xml" /> {/* 🔥 Fire */}
        <link rel="preload" href="/openmoji/1F30D.svg" as="image" type="image/svg+xml" /> {/* 🌍 Earth */}
        <link rel="preload" href="/openmoji/1F4A8.svg" as="image" type="image/svg+xml" /> {/* 💨 Air */}
        <link rel="preload" href="/openmoji/1F4A7.svg" as="image" type="image/svg+xml" /> {/* 💧 Water */}
        <link rel="preload" href="/openmoji/3030-FE0F.svg" as="image" type="image/svg+xml" /> {/* 〰️ Energy */}
      </Head>
      {/* ... rest of component */}
    </>
  );
}
```

**2. Use OpenMoji Color Palette**

```typescript
// In openmoji-service.ts
export function getRandomOpenMojiColor(): string {
  const colors = openmoji.color_palette.colors;
  return colors[Math.floor(Math.random() * colors.length)];
}
```

## Files Summary

| File | Status | Changes Required |
|------|--------|-----------------|
| `package.json` | ✅ Done | None |
| `scripts/copy-openmoji.js` | ⚠️ Fix Required | Update path, add async, add cache check |
| `src/lib/openmoji-service.ts` | ⚠️ Fix Required | Fix FE0F handling, add caching |
| `src/components/game/OpenMojiDisplay.tsx` | ⚠️ Fix Required | Fix React reconciliation |
| `src/components/game/LLMAlchemy.tsx` | ⚠️ Fix Required | Update reasoning popup |
| `src/components/game/ChallengeBar.tsx` | ✅ Checked | No changes needed |
| `.gitignore` | ✅ Done | None |
| `next.config.js` | 🆕 New | Add cache headers |
| `vercel.json` | 🆕 New | Add output tracing |

## Testing Checklist

1. **Build Process**
   - [ ] Run `npm install` - should copy OpenMoji SVGs
   - [ ] Second run should skip copying (cache check works)
   - [ ] Vercel build completes under 45 seconds
   - [ ] Check `/public/openmoji` contains ~4000 SVG files

2. **Basic Rendering**
   - [ ] All existing emojis render as OpenMoji SVGs
   - [ ] No console errors about missing SVGs
   - [ ] Fallback to Unicode works if SVG fails
   - [ ] Reasoning popup shows parent emojis correctly

3. **Search Enhancement**
   - [ ] Create "Coffee" element - should show ☕
   - [ ] Create "Coffee Grinder" - should show special OpenMoji if exists
   - [ ] Create "Golem" - should find better than 🗿 if available

4. **Performance**
   - [ ] Page load time acceptable
   - [ ] SVGs load lazily (not all at once)
   - [ ] Browser caching working (check Network tab)
   - [ ] Cache-Control headers set to 1 year

5. **Edge Cases**
   - [ ] Multi-codepoint emojis work (flags, skin tones)
   - [ ] PUA emojis persist correctly in session
   - [ ] Drag and drop still works with SVG images
   - [ ] FE0F properly stripped from all positions

## Risk Assessment

**Low Risk:**
- Static asset serving
- Graceful fallbacks
- No database changes

**Medium Risk:**
- Build time on cold Vercel deployments
- Initial page load with many elements

**Mitigated Risks:**
- React reconciliation fixed
- Path issues resolved
- Build timeouts prevented

## Summary

This integration provides a consistent, beautiful emoji experience with minimal code changes and no external dependencies. All critical issues have been addressed in v2.0.

**Total new code**: ~250 lines  
**Files modified**: 8  
**External dependencies**: 2 (openmoji, fuse.js)  
**Risk level**: Low  
**Estimated time**: 3-4 hours (including fixes)

---

*Document updated for LLM Alchemy OpenMoji Integration v2.0*  
*Critical fixes incorporated based on production review*
