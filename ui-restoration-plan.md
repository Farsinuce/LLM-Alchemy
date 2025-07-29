# UI Restoration Plan: LLM Alchemy Refactoring Phase 3

## Overview
This plan addresses the UI features and animations that were lost during the Phase 2 refactoring. The goal is to restore all sophisticated interactions while maintaining the clean modular architecture.

## Current Status (July 29, 2025) - After Rollback

### What Was Rolled Back
- State management additions (dimmedElements, animatingElements, isUndoing)
- CSS animations that were added
- Component structure updates
- All changes that led to TypeScript errors

### Critical Issues - MUST FIX IMMEDIATELY
1. **Build Error on Vercel** ❌ NOT FIXED - Vercel build is failing due to a TypeScript error.
   - **Error from Vercel log:** `Type '{ fromMixingArea: true; mixIndex: any; id: string; name: string; emoji: string; x: number; y: number; }' is missing the following properties from type 'MixingElement': index, energized, color, unlockOrder`
   - **File:** `src/components/game/LLMAlchemy/LLMAlchemyRefactored.tsx`
   - **Line:** 970
   - **Priority:** IMMEDIATE

### Missing Features - MUST IMPLEMENT
1. **500ms hover delay for reasoning popups** - This is a key UX feature
2. **Element dimming during drag** - Visual feedback for previously mixed elements
3. **Failed combinations tracking** - Verify it works and is passed to LLM
4. **Staggered animations for element removal** - Polish for mixing area
5. **CSS-delayed load animations** - For a smoother initial element load

### Lessons Learned
- Over-engineered by adding unnecessary state properties
- Lost focus on actual user-visible features
- Created TypeScript conflicts that broke the build
- Didn't test incrementally

## Simplified Implementation Plan

### Step 1: Fix Build Error (IMMEDIATE) ✅ SOLUTION IDENTIFIED
**File:** `src/components/game/LLMAlchemy/LLMAlchemyRefactored.tsx`
**Issue:** TypeScript type error on line 970. The object being created for `draggedElement.current` is missing required properties from the `MixingElement` type.

**Root Cause Analysis:**
After examining the old `LLMAlchemy.tsx` file, we found the correct pattern for creating `MixingElement` objects. The old file's `handleDragStart` function shows the proper structure:

```typescript
// From old LLMAlchemy.tsx (WORKING CODE):
draggedElement.current = { 
  ...element, 
  fromMixingArea, 
  mixIndex: index,
  x: 0,
  y: 0,
  index: 0,
  energized: false
} as MixingElement;
```

**The Fix:**
The solution is to explicitly provide all required `MixingElement` properties, following the pattern from the old file:

```typescript
// Current problematic code:
onMixingElementMouseDown={(e, element) => {
  draggedElement.current = {
    ...element,
    fromMixingArea: true,
    mixIndex: element.index
  };
  setIsDragging(true);
  playSound('press');
}}

// Fixed code (based on old LLMAlchemy.tsx):
onMixingElementMouseDown={(e, element) => {
  draggedElement.current = {
    ...element,
    fromMixingArea: true,
    mixIndex: element.index,
    x: 0,
    y: 0,
    index: 0,
    energized: false
  } as MixingElement;
  setIsDragging(true);
  playSound('press');
}}
```

**Implementation Status:** Ready to implement. The old file provides the exact blueprint for the fix.

### Step 2: Implement 500ms Hover Delay (HIGH PRIORITY)
**File:** `src/components/game/LLMAlchemy/components/ElementListView.tsx`
**Implementation:**
```typescript
const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

const handleMouseEnter = (element: Element) => {
  // Clear any existing timeout
  if (hoverTimeoutRef.current) {
    clearTimeout(hoverTimeoutRef.current);
  }
  
  // Set new timeout for 500ms
  hoverTimeoutRef.current = setTimeout(() => {
    if (element.reasoning) {
      setHoveredElementForReasoning(element);
    }
  }, 500);
};

const handleMouseLeave = () => {
  // Clear timeout
  if (hoverTimeoutRef.current) {
    clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = null;
  }
  setHoveredElementForReasoning(null);
};
```

### Step 3: Implement Element Dimming (MEDIUM PRIORITY)
**Simple approach:** Add opacity to previously mixed elements
```typescript
// In ElementListView.tsx
const isPreviouslyMixed = (elementName: string) => {
  return Object.keys(combinations).some(key => 
    key.includes(elementName)
  );
};

// Apply class conditionally
className={`element-card ${isPreviouslyMixed(element.name) ? 'opacity-30' : ''}`}
```

### Step 4: Verify Failed Combinations (MEDIUM PRIORITY)
1. Check if `failedCombinations` array exists in state
2. Verify it's being populated when combinations fail
3. Ensure it's passed to the LLM prompt builder

## Testing Approach
1. Fix TypeScript error
2. Run `npm run build` locally to verify
3. Test each feature visually in the browser
4. Deploy only after confirming build passes

## What NOT to Do
- ❌ Don't add complex state management
- ❌ Don't create new hooks unless absolutely necessary
- ❌ Don't refactor working code
- ❌ Don't implement "nice to have" features until "must haves" work
- ❌ Don't make multiple changes at once

### Missing Features - MUST IMPLEMENT
1. **500ms hover delay for reasoning popups** - This is a key UX feature
2. **Element dimming during drag** - Visual feedback for previously mixed elements
3. **Failed combinations tracking** - Verify it works and is passed to LLM

### Lessons Learned
- Over-engineered by adding unnecessary state properties
- Lost focus on actual user-visible features
- Created TypeScript conflicts that broke the build
- Didn't test incrementally

## Simplified Implementation Plan

### Step 1: Fix Build Error (IMMEDIATE)
**File:** `src/components/game/LLMAlchemy/LLMAlchemyRefactored.tsx`
**Issue:** Touch event handler type mismatch on line 933
**Fix:** Ensure event handlers match React's expected types
```typescript
// Change from: (e: TouchEvent) => Promise<void>
// To: (e: React.TouchEvent<HTMLDivElement>) => void
```

### Step 2: Implement 500ms Hover Delay (HIGH PRIORITY)
**File:** `src/components/game/LLMAlchemy/components/ElementListView.tsx`
**Implementation:**
```typescript
const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

const handleMouseEnter = (element: Element) => {
  // Clear any existing timeout
  if (hoverTimeoutRef.current) {
    clearTimeout(hoverTimeoutRef.current);
  }
  
  // Set new timeout for 500ms
  hoverTimeoutRef.current = setTimeout(() => {
    if (element.reasoning) {
      setHoveredElementForReasoning(element);
    }
  }, 500);
};

const handleMouseLeave = () => {
  // Clear timeout
  if (hoverTimeoutRef.current) {
    clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = null;
  }
  setHoveredElementForReasoning(null);
};
```

### Step 3: Implement Element Dimming (MEDIUM PRIORITY)
**Simple approach:** Add opacity to previously mixed elements
```typescript
// In ElementListView.tsx
const isPreviouslyMixed = (elementName: string) => {
  return Object.keys(combinations).some(key => 
    key.includes(elementName)
  );
};

// Apply class conditionally
className={`element-card ${isPreviouslyMixed(element.name) ? 'opacity-30' : ''}`}
```

### Step 4: Verify Failed Combinations (MEDIUM PRIORITY)
1. Check if `failedCombinations` array exists in state
2. Verify it's being populated when combinations fail
3. Ensure it's passed to the LLM prompt builder

## Testing Approach
1. Fix TypeScript error
2. Run `npm run build` locally to verify
3. Test each feature visually in the browser
4. Deploy only after confirming build passes

## What NOT to Do
- ❌ Don't add complex state management
- ❌ Don't create new hooks unless absolutely necessary
- ❌ Don't refactor working code
- ❌ Don't implement "nice to have" features until "must haves" work
- ❌ Don't make multiple changes at once

## Recommended Technical Approach

This section outlines the recommended technical strategies for implementing the restoration plan, ensuring adherence to modern React best practices.

*   **State Management (`useGameState.ts` & `useElementInteraction.ts`)**
    *   **State Primitives:** For `dimmedElements` and `animatingElements`, we will use the `Set<string>` data structure within the `useReducer` state. Sets provide highly efficient `add`, `delete`, and `has` operations (O(1) average time complexity), which is ideal for this use case.
    *   **Interaction Logic:** In the `useElementInteraction.ts` hook, the 500ms hover delay will be managed using a `useRef` to hold the `setTimeout` identifier. This prevents unnecessary re-renders and ensures proper cleanup. For touch interactions, we will track the touch start time and position in local state to differentiate between a "tap" and a "drag".

*   **Animation System (`useGameAnimations.ts` & `animations.css`)**
    *   **Staggered Animations:** The `animateRemoval` function in `useGameAnimations.ts` will iterate over elements and trigger the `element-remove-staggered` animation with a cascading `setTimeout` (e.g., `index * 50ms`).
    *   **Performant Load Animations:** The `playElementLoadAnimation` hook will calculate delays and set them as a CSS custom property (`--animation-delay`) on each element's style. The `animations.css` file will then use this variable (`animation-delay: var(--animation-delay, 0ms);`), offloading the timing to the browser's rendering engine for better performance.

*   **Component Integration (`ElementListView.tsx`, `MixingAreaView.tsx`, etc.)**
    *   **Conditional Styling:** We will use a utility like `clsx` or template literals to conditionally apply animation and state classes (`element-dimmed`, `animate-element-load-delayed`).
    *   **Mixing Area Effects:** The `backdrop-blur-sm` effect will be applied to a dedicated backdrop `div` based on the `isMixing` state. The floating emoji background will be implemented using a small number of absolutely positioned `div`s updated within a `requestAnimationFrame` loop for smooth animation.

*   **Failed Combinations Logic (`useElementMixing.ts`)**
    *   **LLM Context Enhancement:** The `performMix` function in `useElementMixing.ts` will be updated. When the LLM API returns a `null` result, it will dispatch an action to add the combination key to the `failedCombinations` array in the global state. This array will be managed as a queue to keep the prompt concise.

## Missing Features Identified

### 1. Failed Combinations Tracking
- `failedCombinations` state for better LLM context
- Prevents repeated failed combinations

### 2. Element Dimming During Drag
- `dimmedElements` state dims previously mixed elements
- Provides visual feedback about tried combinations

### 3. Sophisticated Animation State Management
- Staggered animations for element removal
- CSS-delayed load animations with calculated timing
- Granular control over animation states

### 4. Challenge System Integration
- Complete challenge system with state management
- UI integration and completion detection

### 5. Hover/Click Interactions for Reasoning
- 500ms delay on hover before showing reasoning popup
- Proper timeout cleanup
- Distinction between hover and click triggers

### 6. Mixing Area Polish
- Blur backdrop effect during mixing
- Staggered removal animations
- Enhanced visual feedback

## Implementation Phases

### Phase 1: Enhanced State Management
**Priority: HIGH**

#### 1.1 Update GameStateProvider Context
File: `src/components/game/LLMAlchemy/contexts/GameStateProvider.tsx`

Add missing state:
```typescript
failedCombinations: string[]
dimmedElements: Set<string>
isStateRestored: boolean
animatingElements: Set<string>
isUndoing: boolean
currentChallenges: Challenge[]
```

#### 1.2 Create useElementInteraction Hook Enhancement
File: `src/components/game/LLMAlchemy/hooks/useElementInteraction.ts`

Add sophisticated interaction handling:
```typescript
interface ElementInteractionState {
  hoveredElement: string | null
  hoverTimeoutRef: NodeJS.Timeout | null
  touchStartTime: number | null
  touchStartPos: { x: number; y: number } | null
  isDragging: boolean
  touchDragging: MixingElement | null
}

// Methods:
- handleElementMouseEnter(element, event) - with 500ms delay
- handleElementMouseLeave() - with proper cleanup
- handleElementClick(element, event) - for reasoning popup
- getPreviouslyMixedElements(elementName) - for dimming
```

### Phase 2: Animation System Overhaul
**Priority: HIGH**

#### 2.1 Enhance useGameAnimations Hook
File: `src/components/game/LLMAlchemy/hooks/useGameAnimations.ts`

Add missing animation features:
```typescript
// Enhanced state
animatingElements: Set<string> // For staggered removal
isPlayingLoadAnimation: boolean
animatedElements: Set<string>

// New methods:
- animateRemoval(elements: MixingElement[], onComplete: () => void)
  - Stagger animations by 50ms per element
  - Total duration = elements.length * 50 + 300ms
  
- playElementLoadAnimation(elements: Element[])
  - Filter elements with unlockOrder > 4
  - Sort by unlockOrder
  - CSS delay = unlockOrder * 25ms
  - Total duration = (elements * 25) + 300 + 200ms buffer
```

#### 2.2 Update CSS Animations
File: `src/styles/animations.css`

Add missing animations:
```css
/* Staggered removal animation */
@keyframes element-remove-staggered {
  0% { transform: scale(1); opacity: 1; }
  30% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(0); opacity: 0; }
}

/* Load animation with CSS variable delay */
@keyframes element-load-delayed {
  0% { transform: scale(0); opacity: 0; }
  70% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

.animate-element-load-delayed {
  animation: element-load-delayed 0.3s ease-out;
  animation-fill-mode: both;
  animation-delay: var(--animation-delay, 0ms);
}
```

### Phase 3: Component Updates
**Priority: MEDIUM**

#### 3.1 ElementListView Component
File: `src/components/game/LLMAlchemy/components/ElementListView.tsx`

Enhancements needed:
- Add dimming logic based on `dimmedElements` set
- Implement proper hover delay (500ms) for reasoning popup
- Add CSS animation classes with dynamic delays
- Show question mark badge ONLY when element has reasoning
- Apply `element-dimmed` class when element is in dimmedElements set

#### 3.2 MixingAreaView Component
File: `src/components/game/LLMAlchemy/components/MixingAreaView.tsx`

Required changes:
- Add blur backdrop during mixing: `backdrop-blur-sm` class
- Implement staggered removal animations
- Add floating emoji background (opacity 0.5-1%)
- Enhance visual feedback for element interactions
- Add proper z-index layering

#### 3.3 UnlockModal Component
File: `src/components/game/LLMAlchemy/components/UnlockModal.tsx`

Fixes needed:
- Remove any continue button logic
- Add auto-close timer (3s for new, 2s for existing)
- Enhance rarity styling with proper glow effects
- Add achievement display when contextual achievement exists
- Implement proper animation sequencing

### Phase 4: Failed Combinations & LLM Context
**Priority: MEDIUM**

#### 4.1 Update useElementMixing Hook
File: `src/components/game/LLMAlchemy/hooks/useElementMixing.ts`

Add failed combination tracking:
```typescript
// Track failed combinations
if (!result.result) {
  const failedKey = `${elem1.name}+${elem2.name}${elem3 ? '+Energy' : ''}`
  setFailedCombinations(prev => [...prev.slice(-4), failedKey])
}

// Pass failed combinations to LLM prompt
const failedText = failedCombinations.length > 0 
  ? failedCombinations.slice(-5).join(', ')
  : 'none'
```

### Phase 5: Challenge System Integration
**Priority: LOW**

#### 5.1 Create useChallenges Hook
File: `src/components/game/LLMAlchemy/hooks/useChallenges.ts`

New hook for challenge management:
```typescript
export const useChallenges = () => {
  const [currentChallenges, setCurrentChallenges] = useState<Challenge[]>([])
  
  // Fetch challenges every minute
  useEffect(() => {
    fetchChallenges()
    const interval = setInterval(fetchChallenges, 60000)
    return () => clearInterval(interval)
  }, [])
  
  const checkChallengeCompletion = async (element: Element) => {
    // Check if element completes any challenges
    // Handle API calls and state updates
  }
  
  return { currentChallenges, checkChallengeCompletion }
}
```

### Phase 6: Touch & Drag Enhancements
**Priority: LOW**

#### 6.1 Sophisticated Touch Handling
Add to interaction handling:
- Distinguish between tap (< 300ms, < 10px movement) and drag
- Proper touch position tracking
- Haptic feedback on mobile devices
- Enhanced visual feedback during drag

### Phase 7: Visual Polish
**Priority: LOW**

#### 7.1 Mixing Area Effects
- Background gradient based on game mode
- Floating emoji animation system (1-3 emojis, 0.5-1% opacity)
- Proper blur effect during mixing
- Enhanced drop zone visual feedback

#### 7.2 Element Visual Feedback
- Hover outline color based on rarity
- Dimming for previously mixed elements
- Proper loading animation sequencing
- Enhanced energized element effects

## Implementation Strategy

### Efficiency Guidelines:
1. **Start with highest impact features** - animations and visual feedback
2. **Reuse existing patterns** - don't reinvent what works
3. **Test incrementally** - verify each phase before moving on
4. **Keep it simple** - avoid over-engineering

### Implementation Order:
1. **State management** (Phase 1) - Foundation for everything else
2. **Animation system** (Phase 2) - Most visible improvements
3. **Component updates** (Phase 3) - Apply the improvements
4. **Failed combinations** (Phase 4) - Better LLM context
5. **Challenge system** (Phase 5) - Nice to have
6. **Touch/Polish** (Phases 6-7) - Final touches

## Success Criteria

### Must Have:
- ✅ Element dimming during drag operations
- ✅ 500ms hover delay for reasoning popups
- ✅ Staggered animations for element removal
- ✅ Proper load animations with timing
- ✅ Failed combinations tracking
- ✅ Blur effect during mixing

### Nice to Have:
- ✅ Challenge system integration
- ✅ Enhanced touch handling
- ✅ Floating emoji background
- ✅ Advanced visual polish

## Notes
- Maintain clean modular architecture
- Don't break existing functionality
- Focus on user experience improvements
- Keep performance in mind for mobile devices
