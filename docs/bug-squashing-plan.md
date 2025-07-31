# LLM Alchemy - Comprehensive Bug Squashing & Restoration Plan (v3)

## 1. Introduction

This document outlines a comprehensive plan to address persistent bugs, regressions from recent refactoring, and newly identified issues in the LLM Alchemy game. This version incorporates detailed user feedback and analysis of the legacy codebase (`LLMAlchemy.legacy.tsx`) to ensure all fixes are thorough and align with the project's original vision.

The core focus is on restoring functionality, improving user experience (especially on mobile), and ensuring the game's stability and visual polish.

---

## 2. Regressions & Unfixed Bugs (Analysis & Plan)

These are issues from the initial bug list that were either not fixed correctly or were misunderstood.

### Bug 1: Energy Element Layout
- **Problem**: The Energy element is currently displayed on its own line, separated from other elements by a horizontal rule.
- **User Expectation**: The Energy element should appear on the same line as the other elements but always be positioned as the first item in the list, regardless of the current sorting mode. It should have a subtle vertical line separator to distinguish it as "special".
- **Technical Plan**:
    1. Modify `ElementListView.tsx`.
    2. The main `sortedElements` array will continue to exclude 'Energy'.
    3. In the render method, conditionally render the `energyElement` first with a vertical separator (using a border-right CSS class), then map over the `sortedElements` array.
    4. Remove the `<hr />` and the separate rendering logic that created the horizontal separation.
    5. Add styling: `border-r border-gray-600 pr-2 mr-2` to the Energy element wrapper.

### Bug 2: Immovable Mixing Area Elements
- **Problem**: A critical regression where elements, once placed in the mixing area, cannot be moved or repositioned.
- **Root Cause Analysis**: The drag-and-drop logic in the refactored component is not updating element positions correctly when dragging within the mixing area.
- **Technical Plan** (Keep it simple):
    1. In `LLMAlchemyRefactored.tsx`, ensure the `onDrop` handler checks if the element being dropped is already in the mixing area.
    2. If `draggedElement.current.fromMixingArea` is true, update the position of the existing element using `updateMixingElement` instead of adding a new one.
    3. Verify that `onDragStart` correctly sets `fromMixingArea: true` and `mixIndex` for elements dragged from within the mixing area.
    4. No over-engineering - just ensure the position update works.

### Bug 8: Unlock Animation Delay
- **Problem**: The unlock modal appears too late after a successful mix.
- **Root Cause Analysis**: There's a delay between when the new element is created and when the unlock modal appears.
- **Technical Plan**:
    1. In `useElementMixing.ts`, trace the `performMix` function.
    2. Ensure `onShowUnlock` is called immediately after the element is added to state.
    3. Be careful when removing any `setTimeout` - verify it's not related to Supabase save operations or Vercel deployment logic.
    4. The modal should appear simultaneously with the new element appearing in the list.

---

## 3. New Bugs & Feature Requests (Analysis & Plan)

### A. Self-Mixing Elements
- **Problem**: Elements cannot be mixed with themselves (e.g., Water + Water).
- **Technical Plan**:
    1. In `validateMixing` function in `game-logic.ts`, remove the check `if (elem1.name === elem2.name) return false;`.
    2. Allow self-mixing to proceed to the LLM.

### B. Mobile Dimming for Previously Combined Elements
- **Problem**: The dimming feature doesn't work on mobile devices.
- **Technical Plan**:
    1. In `LLMAlchemyRefactored.tsx`, locate the `onElementTouchStart` handler.
    2. Copy the dimming logic from `onElementDragStart` that calculates `previouslyMixed`.
    3. Apply `setDimmedElements(otherElements)` for the touch event to enable dimming on mobile.

### C. Mobile Viewport Height
- **Problem**: On mobile, the game container exceeds the screen height, causing unwanted page scrolling.
- **Technical Plan**:
    1. Apply CSS to the main container in `LLMAlchemyRefactored.tsx`.
    2. Use `min-h-screen max-h-screen` instead of `min-h-screen`.
    3. Ensure `overflow-hidden` is applied to prevent page scrolling.
    4. **Important**: Test thoroughly on desktop to ensure this doesn't break the desktop layout.

### D. Simplified Sort Button Icons
- **Problem**: Sort button text is too verbose.
- **Technical Plan**:
    1. In the sort dropdown/button in `LLMAlchemyRefactored.tsx`:
    2. For desktop (sm: and up): Use "🔢 1-2-3" for discovery sort and "🔤 A-Z" for alphabetical.
    3. For mobile (below sm:): Use condensed "🔢" and "🔤" only.
    4. Implement using responsive spans: `<span className="hidden sm:inline">1-2-3</span>`

### E. Responsive Header on Narrow Screens
- **Problem**: Header UI wraps poorly on very narrow screens.
- **Technical Plan**:
    1. For very narrow screens, this will be handled as part of the mobile landscape solution (see Bug M).
    2. The hamburger menu implementation will encompass this requirement.

### F. Improved "Clear" Animation
- **Problem**: Current clear animation is unsatisfying.
- **Technical Plan**:
    1. In `src/styles/animations.css`, create new keyframes:
        ```css
        @keyframes clear-zoom-fade {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
          100% { opacity: 0; transform: scale(0); }
        }
        ```
    2. Update `animateRemoval` in `useGameAnimations.ts` to use this new animation.
    3. Maintain the staggered delay for visual appeal.

### G. Custom Fonts
- **Problem**: Missing "Source Sans 3" font.
- **Technical Plan**:
    1. In `src/app/layout.tsx`, import font from Google Fonts.
    2. Apply "Source Sans 3" (regular 400) to all text elements in the game.
    3. Apply different weight to titles and headers (h1 = black 900, h2 = bold , h3 = Medium 500).
    4. Update the font family declarations in Tailwind config if needed.

### H. Missing Visuals from Legacy
- **Problem**: Missing background gradient and rarity hover effects.
- **Technical Plan**:
    1. **Background Gradient**: Add dynamic background based on game mode in main container.
        - Science: `bg-gradient-to-br from-blue-900/20 via-gray-900 to-blue-900/20`
        - Creative: `bg-gradient-to-br from-purple-900/20 via-gray-900 to-purple-900/20`
    2. **Rarity Hover**: Ensure `getRarityHoverColor` is applied to element hover states in both `ElementListView` and mixing area elements.

### I. Simplified Reasoning Popup
- **Problem**: Reasoning popup shows too much information.
- **Technical Plan**:
    1. In `ReasoningPopup.tsx`:
    2. Display only: parent emojis joined by "+" (or "〰️" if energy was used) + reasoning text.
    3. Format: "🔥+💧" or "🔥〰️💧" followed by the reasoning on a new line.
    4. Remove all other information.

### J. Large Floating Emoji Animation
- **Problem**: Missing subtle background floating emojis.
- **Technical Plan**:
    1. In `LLMAlchemyRefactored.tsx`, implement floating emoji system:
    2. State: `const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([])`.
    3. Use `useEffect` with `setInterval` to update positions.
    4. Render 1-3 emojis at 1% opacity, moving slowly across the mixing area.
    5. Each emoji has a 5-second lifespan before fading out and being replaced.

### K. TypeError on `hexcode`
- **Problem**: `TypeError: can't access property "hexcode", e is undefined`.
- **Technical Plan**:
    1. Add null checks before rendering `OpenMojiDisplay` in all components.
    2. Use conditional rendering: `{element && <OpenMojiDisplay ... />}`.
    3. Add this check in `ElementListView`, `MixingAreaView`, and anywhere else `OpenMojiDisplay` is used.

### L. OpenMoji "Coal" Fuzzy Search Bug
- **Problem**: Fuzzy search produces poor matches (Coal → Collaboration).
- **Technical Plan** (LLM Confidence Score approach):
    1. Update `llm-prompts.ts` to include `"emojiConfidence": 0.0-1.0` in the response schema.
    2. Update `/api/generate/route.ts` to parse this field.
    3. In `openmoji-service.ts`:
        - Accept `confidenceScore` parameter.
        - If score > 0.8, bypass fuzzy search and use LLM's Unicode directly.
        - If score ≤ 0.8, use existing fuzzy search for better match.

### M. Mobile Landscape Mode
- **Problem**: Game unusable in landscape orientation.
- **Technical Plan**:
    1. Detect landscape: `@media (orientation: landscape) and (max-height: 600px)`.
    2. Create hamburger menu component for all header controls.
    3. Switch layout from vertical to horizontal split:
        - Left side: Element list (scrollable)
        - Right side: Mixing area
    4. Hide header behind hamburger menu icon.
    5. This also solves Bug E for narrow screens.

### N. Element List Scrolling (NEW)
- **Problem**: Element list needs to be scrollable, especially on mobile, with reserved space for finger scrolling.
- **Technical Plan**:
    1. In `ElementListView.tsx`:
    2. Add padding-right to the container: `pr-4` to reserve space for scrolling.
    3. Ensure the flex-wrap container has: `overflow-y-auto` and proper height constraints.
    4. Elements should wrap before consuming the full width, leaving the right edge clear for touch scrolling.
    5. The scrollbar should be styled appropriately for mobile (thin, semi-transparent).

---

## 4. Implementation Order

### Phase 1: Critical Regressions (Highest Priority)
1. **Bug 2**: Fix immovable mixing area elements ✅ COMPLETED (fixed drag cleanup for desktop)
2. **Bug 8**: Fix unlock animation timing ✅ COMPLETED (unlock modal now appears immediately)
3. **Bug 1**: Fix Energy element layout with vertical separator ✅ COMPLETED

### Phase 2: Essential Functionality
1. **Bug A**: Enable self-mixing ✅ COMPLETED
2. **Bug B**: Fix mobile dimming ❌ STILL NOT WORKING - Method didn't work, skipping for now
3. **Bug K**: Fix TypeError crashes ✅ COMPLETED

### Phase 3: Visual Polish
1. **Bug F**: Improve clear animation ❌ NOT WORKING AS INTENDED
2. **Bug G**: Add custom fonts ❌ NOT DONE
3. **Bug H**: Restore visual effects ❌ PARTIALLY DONE (Rarity stroke element color not working)
4. **Bug I**: Simplify reasoning popup ✅ COMPLETED
5. **Bug J**: Add floating emojis ❌ NOT WORKING

### Phase 4: Mobile Experience
1. **Bug C**: Fix mobile viewport ❌ PARTIALLY DONE (could work better)
2. **Bug D**: Update sort buttons ✅ COMPLETED
3. **Bug N**: Fix element list scrolling ❌ NOT DONE
4. **Bug L**: Improve emoji matching ❌ NOT DONE

### Phase 5: Advanced Mobile
1. **Bug M**: Implement landscape mode (includes Bug E solution) ❌ NOT DONE

---

## 5. Testing Strategy

1. **Desktop Testing**: Chrome, Firefox, Safari
2. **Mobile Testing**: iOS Safari, Android Chrome
3. **Orientation Testing**: Portrait and landscape modes
4. **Performance Testing**: Ensure animations don't lag on mobile
5. **Regression Testing**: Verify all fixes don't break other features

---

## 6. Success Criteria

- All elements in mixing area can be moved freely
- Unlock animations appear immediately
- Energy element displays inline with vertical separator
- Self-mixing works (Water + Water → Pool)
- Mobile experience is smooth and responsive
- No TypeErrors in console
- Visual polish matches original game
- Landscape mode is functional
