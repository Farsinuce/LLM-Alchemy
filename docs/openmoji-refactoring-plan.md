# OpenMoji UI Refactoring Plan

## 1. Objective
The primary goal of this task is to ensure **100% consistent emoji styling** across the entire LLM Alchemy application. All emojis, whether in dynamic game elements or static UI components, must be rendered using the [OpenMoji](https://openmoji.org/) SVG set to maintain a cohesive visual identity.

## 2. The Problem: Inconsistent Rendering
Currently, our emoji rendering is handled in two different ways:

1.  **Game Elements (✅ Good):** When a new element is discovered, the `resolveEmoji()` service (`src/lib/openmoji-service.ts`) is called. This service intelligently finds the best OpenMoji SVG, and the result is displayed using the `<OpenMojiDisplay/>` component. This works perfectly.

2.  **Static UI Emojis (❌ Bad):** Emojis used in static UI components (buttons, titles, etc.) are either:
    *   Hardcoded directly as Unicode characters (e.g., `<span>🏆</span>`).
    *   Manually converted using a helper function (`getStaticOpenMoji('🏆')`).

This manual approach is inconsistent, error-prone, and requires developers to remember which method to use. It has led to several parts of the UI rendering emojis in the browser's native style instead of the intended OpenMoji style.

## 3. Proposed Solution: A Unified `<Emoji/>` Component
To solve this, we will create a single, intelligent, and reusable React component that will become the standard way to display any static UI emoji.

**Component Name:** `<Emoji />`
**Location:** `src/components/ui/Emoji.tsx`

This component will abstract away all the conversion logic. A developer will simply need to wrap a Unicode emoji in this component to have it automatically rendered as an OpenMoji SVG.

**Example Usage:**
```tsx
// Before
<span>🏆</span> 
// or
<img src={getStaticOpenMoji('🏆')} />

// After
<Emoji>🏆</Emoji>
```

## 4. Technical Context & Clarifications

### Existing Infrastructure
The codebase already contains the necessary utility function:
```typescript
// src/lib/openmoji-service.ts
export function getStaticOpenMoji(emoji: string): string {
  const hexcode = unicodeToHexSequence(emoji);
  return `/openmoji/${hexcode}.svg`;
}
```

The problem isn't the lack of conversion capability - it's that developers must remember to use this function instead of hardcoding Unicode emojis.

### System Architecture
This refactoring maintains clear separation between two emoji systems:

1. **Dynamic Game Elements** (unchanged):
   - LLM provides Unicode emoji + emojiTags + confidence
   - `resolveEmoji()` performs complex fuzzy matching against OpenMoji database
   - Results stored as `openmojiHex` and displayed via `<OpenMojiDisplay/>`
   - Handles uncertain/dynamic emojis requiring intelligent matching

2. **Static UI Emojis** (our target):
   - Known Unicode emojis defined at development time
   - Simple Unicode → Hex conversion via `getStaticOpenMoji()`
   - Displayed via new `<Emoji/>` component
   - No fuzzy matching required

**No conflicts will occur** - the systems serve different purposes and operate independently.

## 5. Implementation Steps

### Step 1: Create the `<Emoji />` Component
-   Create a new file at `src/components/ui/Emoji.tsx`.
-   The component will accept a Unicode emoji string as its `children`.
-   **Reuse existing infrastructure**: Call `getStaticOpenMoji()` internally rather than duplicating logic.
-   It will render an `<img>` tag pointing to the correct SVG path (e.g., `/openmoji/1F3C6.svg`).
-   It should be memoized (`React.memo`) for performance.
-   It should handle basic props like `className`, `size`, and standard HTML attributes.

**Component Specification:**
```tsx
interface EmojiProps {
  children: string;  // Unicode emoji
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  alt?: string;
}

const Emoji: React.FC<EmojiProps> = ({ children, size = 'md', className, alt, ...props }) => {
  const src = getStaticOpenMoji(children);
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';
  
  return (
    <img 
      src={src} 
      alt={alt || children}
      className={`inline-block ${sizeClass} ${className || ''}`}
      onError={(e) => {
        // Fallback to Unicode if OpenMoji not available
        const target = e.currentTarget;
        target.style.display = 'none';
        target.insertAdjacentText('afterend', children);
      }}
      {...props}
    />
  );
};
```

### Step 2: Refactor Existing UI to Use `<Emoji />`
Search the codebase for all instances of hardcoded Unicode emojis and `getStaticOpenMoji()` calls within `.tsx` files and replace them with the new `<Emoji />` component.

**Key files to refactor:**
-   `src/app/page.tsx` (Progress display, upgrade button, auth buttons, LLM options)
-   `src/components/auth/AuthModal.tsx` (Upgrade benefits icon)
-   `src/components/game/ChallengeBar.tsx` (Challenge type icons)
-   `src/components/game/LLMAlchemy/LLMAlchemyRefactored.tsx` (Sort buttons, achievement button)
-   `src/components/game/LLMAlchemy/components/AchievementsModal.tsx` (Modal title icon, empty state icon, achievement list emojis)
-   `src/components/game/LLMAlchemy/components/GameHeader.tsx` (Achievements button)
-   `src/components/game/LLMAlchemy/components/MixingAreaView.tsx` (Undo button)
-   `src/components/game/LLMAlchemy/components/ReasoningPopup.tsx` (Energy indicator)
-   `src/components/game/LLMAlchemy/components/UnlockModal.tsx` (Achievement and end-element indicators)
-   `src/lib/achievements.ts`: This is a `.ts` file, not a component. The `emoji` property in the `Achievement` objects should remain a string. The rendering will be handled in the `AchievementsModal.tsx` component where the emoji is displayed.

## 6. Expected Outcome
-   All static UI emojis throughout the application will render in the OpenMoji style.
-   The codebase will be cleaner, more maintainable, and easier for future developers to work with.
-   There will be a single, standardized way to display UI emojis, eliminating guesswork and potential for style inconsistencies.
