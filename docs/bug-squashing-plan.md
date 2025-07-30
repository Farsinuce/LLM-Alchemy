# Bug Squashing & UX Restoration Plan

**Date**: July 30, 2025
**Status**: Analysis Complete, Implementation Plan Finalized

This document outlines the detailed plan to address the bugs and UX regressions identified after the recent refactoring of the LLM Alchemy game. Each section includes an analysis of the root cause and a specific, actionable plan for the fix.

---

### Bug 1: Missing "Energy" Element and Energizing Mechanics in Science Mode

**Problem**: The "Energy" element is completely missing from Science mode, along with its core gameplay mechanic of energizing other elements to create 3-way combinations.

**Analysis**: The refactored code is missing several key features from the legacy implementation:
1. Energy element is filtered out in sorting and not displayed
2. The `energized` state on mixing elements is not implemented
3. The mixing logic doesn't handle Energy being dropped on elements to energize them
4. The 3-way combination logic for energized elements is missing
5. Visual indicators for energized elements (shake animation, golden border) are missing

**Plan**:
1.  **Add energized state to MixingElement type**:
    *   **Why**: Elements in the mixing area need to track if they're energized
    *   **How**: The `MixingElement` interface already has an `energized: boolean` field, so we just need to use it properly

2.  **Fix Energy element display in `LLMAlchemyRefactored.tsx`**:
    *   **Why**: Energy needs to be always visible and separated from regular elements
    *   **How**: 
        ```typescript
        const energyElement = gameMode === 'science' ? elements.find(e => e.name === 'Energy') : undefined;
        const sortedElements = GameLogic.sortElements(elements.filter(e => e.name !== 'Energy'), sortMode as 'unlock' | 'alpha', searchTerm);
        ```

3.  **Update `ElementListView.tsx`**:
    *   **Why**: To render Energy element separately with divider
    *   **How**: Add `energyElement` and `gameMode` props, render Energy before other elements with a divider

4.  **Implement energizing logic in mixing**:
    *   **Why**: This is the core Energy mechanic - dropping Energy on elements energizes them
    *   **How**: In `handleTouchEnd` and `onDrop` handlers:
        - Check if dropped element is Energy and target is not energized
        - If so, energize the target element and remove Energy from mixing area
        - Update the visual state of energized elements

5.  **Update `useElementMixing` hook**:
    *   **Why**: To handle 3-way combinations when mixing with energized elements
    *   **How**: 
        - Check if either element is energized before mixing
        - If so, pass `hasEnergy: true` to the combination generation
        - Update the combination key to include "+Energy" for energized mixes

6.  **Add visual indicators**:
    *   **Why**: Players need to see which elements are energized
    *   **How**: 
        - Add shake animation class when `element.energized` is true
        - Add golden border/glow effect for energized elements
        - The styles already exist in the code, just need to apply them

---

### Bug 2: Mixing Area Elements Are Not Movable

**Problem**: Once an element is placed in the mixing area, it cannot be dragged or moved again.

**Analysis**: The `onDrop` handler in `LLMAlchemyRefactored.tsx` is not correctly handling the case where an element is dragged *from* the mixing area. It assumes all drops are new elements. The `draggedElement.current.fromMixingArea` flag is set, but the logic to update the element's position is missing.

**Plan**:
1.  **Fix `onDrop` in `LLMAlchemyRefactored.tsx`**:
    *   **Why**: To correctly handle the two distinct drop scenarios: a new element from the list, and an existing element being moved within the mixing area.
    *   **How**: Modify the `onDrop` handler. After calculating the drop coordinates, add a conditional check:
        ```typescript
        if (draggedElement.current.fromMixingArea) {
          // Element is being moved within the area
          const newPos = GameLogic.resolveCollisions(x - offset, y - offset, mixingArea, dropZoneRef.current!, draggedElement.current.mixIndex);
          updateMixingElement(draggedElement.current.mixIndex!, { x: newPos.x, y: newPos.y });
        } else {
          // New element is being added
          const newPos = GameLogic.resolveCollisions(x - offset, y - offset, mixingArea, dropZoneRef.current!);
          const newElement = { /* ... */ };
          addToMixingArea(newElement);
        }
        ```

2.  **Verify Touch Handlers**:
    *   **Why**: To ensure the fix works on mobile devices.
    *   **How**: Review the `handleTouchEnd` function to ensure it contains the same conditional logic based on `touchDragging.fromMixingArea`.

---

### Bug 3: Incorrect Undo Button Placement

**Problem**: The "Undo" button is in the main header. It should be in the top-left of the mixing area.

**Analysis**: There are actually TWO undo buttons in the code - one fully implemented in the header (LLMAlchemyRefactored.tsx) and one placeholder in MixingAreaView. This is a duplication issue.

**Plan**:
1.  **Remove Duplicate from Header**:
    *   **Why**: The MixingAreaView already has the correct placement for the Undo button, we just need to remove the duplicate from the header.
    *   **How**:
        *   Remove the Undo button JSX from the header section in `LLMAlchemyRefactored.tsx`
        *   Move the undo logic (the async onClick handler) to MixingAreaView by passing it as the `onUndo` prop
        *   The MixingAreaView already has the correct positioning (`top-4 left-4`), so no CSS changes needed

---

### Bug 4: TypeError on Mixing

**Problem**: `TypeError: can't access property "hexcode", e is undefined` when mixing.

**Analysis**: The error occurs in `OpenMojiDisplay.tsx` because it's receiving an `undefined` element. This happens in `useElementMixing.ts` inside `performMix`. If a combination is found in the cache (`combinations[mixKey]`), the code attempts to find the `existingElement`. If the lookup fails, `onShowUnlock` is called with an `undefined` value.

**Plan**:
1.  **Add Guard Clause in `useElementMixing.ts`**:
    *   **Why**: To prevent `onShowUnlock` from ever being called with an invalid element. This is the root cause.
    *   **How**: In the `performMix` function, after looking up the `existingElement`, add a check:
        ```typescript
        if (cachedResult.result) {
          const existingElement = elements.find(e => e.name === cachedResult.result) || endElements.find(e => e.name === cachedResult.result);
          if (existingElement) { // <-- This is the fix
            onShowUnlock({ ...existingElement, isNew: false });
            // ... rest of the logic
          }
        }
        ```

2.  **Defensive Check in `UnlockModal.tsx`**:
    *   **Why**: As a secondary safeguard to prevent the UI from crashing even if bad data is passed.
    *   **How**: At the top of the `UnlockModal` component, add:
        ```jsx
        if (!showUnlock) return null;
        ```

---

### Bug 5: Sort Control UI

**Problem**: The sort control is a dropdown, not a toggle button.

**Analysis**: `GameHeader.tsx` uses a `<select>` element instead of a `<button>`.

**Plan**:
1.  **Modify `GameHeader.tsx`**:
    *   **Why**: To match the intended UI design.
    *   **How**:
        *   Replace the `<select>` and `<option>` elements with a single `<button>`.
        *   The button's `onClick` handler will call `setSortMode(sortMode === 'unlock' ? 'alpha' : 'unlock')`.
        *   The button's text will be dynamic: `{sortMode === 'unlock' ? 'A-Z' : '1-2-3'}`.

---

### Bug 6: Clunky "Clear" Animation

**Problem**: The "Clear" animation is jarring.

**Analysis**: The `animateRemoval` function in `useGameAnimations.ts` sets a timeout to clear the elements from the state. This timeout is not perfectly synchronized with the CSS animation duration, causing the elements to reappear for a frame before being removed.

**Plan**:
1.  **Synchronize Timers in `useGameAnimations.ts`**:
    *   **Why**: To ensure the state update happens at the exact moment the CSS animation finishes.
    *   **How**: The `element-pop-out` animation in `animations.css` has a duration of `0.3s`. The `totalDuration` in `animateRemoval` should be `elements.length * 50 + 300`. This seems correct, but I will add a `forwards` fill mode to the animation to ensure it holds its final state.
2.  **Update CSS in `animations.css`**:
    *   **Why**: To ensure the animation holds its final frame (`opacity: 0`).
    *   **How**: Change the animation definition to:
        ```css
        @keyframes element-pop-out {
          from { transform: scale(1); opacity: 1; }
          to { transform: scale(0); opacity: 0; }
        }
        .animate-element-pop-out {
          animation: element-pop-out 0.3s ease-out forwards;
        }
        ```

---

### Bug 7: Broken Hover Reasoning Modal

**Problem**: The reasoning modal blinks on desktop hover.

**Analysis**: The `useDelayedHover` hook is already implemented correctly with a 500ms delay. The issue is likely that the reasoning popup interferes with the hover detection - when the popup appears, it might steal the mouse events or cause the element to lose hover state.

**Plan**:
1.  **Fix Popup Positioning**:
    *   **Why**: The popup needs to not interfere with the element's hover state.
    *   **How**: In `ReasoningPopup` component, add `pointer-events: none` to the popup container. This ensures the popup doesn't steal mouse events from the element underneath, preventing the unwanted `mouseleave` trigger.

---

### Bug 8: Delayed Unlock Animation

**Problem**: The unlock animation feels slow.

**Analysis**: The animation waits for the entire `generateCombination` function, including the API call, to complete.

**Plan**:
1.  **Implement Two-Stage Animation in `useElementMixing.ts`**:
    *   **Why**: To provide immediate feedback while waiting for the LLM.
    *   **How**:
        *   In `performMix`, as soon as the mix is initiated, call a new function like `onShowMixingAnimation(true)`. This will render a generic "Mixing..." overlay.
        *   When the `generateCombination` promise resolves, call `onShowMixingAnimation(false)` and then immediately call `onShowUnlock` with the new element data. This will transition from the loading state to the reveal animation seamlessly.

---

### Bug 9: Mobile UX Improvements

**Problem**: Drag-and-drop is difficult on mobile devices due to a long-press requirement.

**Analysis**: The `onTouchStart` handlers in `LLMAlchemyRefactored.tsx` use `setTimeout` (150ms for element list, 100ms for mixing area) to initiate dragging. This creates an unresponsive "long press" requirement that frustrates users.

**Plan**:
1.  **Implement Distance-Based Drag Detection**:
    *   **Why**: This allows instant dragging while preserving tap functionality for showing reasoning popups.
    *   **How**: 
        *   Remove the `setTimeout` calls from `onElementTouchStart` handlers
        *   Add a `touchmove` event listener that tracks movement distance from the initial touch point
        *   When movement exceeds a threshold (5-10 pixels), immediately initiate the drag by setting `touchDragging`
        *   In `handleTouchEnd`, the existing distance calculation can determine if it was a tap (< threshold) or drag (>= threshold)
        *   This provides instant drag feedback while keeping tap functionality intact
2.  **Increase Divider Touch Target**:
    *   **Why**: The thin divider is hard to grab on a touch screen.
    *   **How**: In `LLMAlchemyRefactored.tsx`, wrap the divider `div` in another `div` with significant vertical padding (e.g., `py-2`) to increase its touch area without changing its visual appearance.
