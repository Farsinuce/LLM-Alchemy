# The Final, Enhanced Restoration Plan

*This definitive plan incorporates all our analysis, your feedback, and your friend's expert suggestions. It is designed to be a comprehensive guide for creating a stable, maintainable, and polished game.*

## Phase 1: Stabilize the Foundation

*Goal: Fix all build-breaking errors and establish a single, reliable source of truth for game state.*

### 1. Fix Compilation Blockers
*   **Why:** The code is not currently in a runnable state. This is the absolute first priority.
*   **How:** Run `tsc --noEmit && eslint --max-warnings=0`. Fix every reported error, paying special attention to invalid object spreads (`...{element}`) and type mismatches.
*   **Code Example:**
    *   **Find:** Running `tsc --noEmit` in the terminal will report errors like `Property 'element' does not exist on type...`
    *   **Fix:** An incorrect line like `const newState = { ...{element} };` will be corrected to `const newState = { ...element };`.

### 2. Centralize All Shared State
*   **Why:** The "split-brain" state problem is the root cause of most UI bugs.
*   **How:** Remove the local `useState` hooks for `isMixing`, `hoveredElement`, `touchDragging`, and `dimmedElements` from `LLMAlchemyRefactored.tsx`. All components must be refactored to use the hooks from `GameStateProvider` exclusively.
*   **Code Example:**
    *   **Before (in `LLMAlchemyRefactored.tsx`):**
        ```typescript
        const [isMixing, setIsMixing] = useState(false);
        ```
    *   **After (in `LLMAlchemyRefactored.tsx`):**
        ```typescript
        // The component now gets isMixing from a central hook
        const { isMixing, setIsMixing } = useElementInteractionState(); // Or a similar hook
        ```

### 3. Repair Collision & Drag-and-Drop Logic
*   **Why:** The game's physics are broken because the refactoring separated the collision logic from its dependencies.
*   **How:** Copy the original, working helper functions (`checkCollision`, `hasCollisionAt`, `findBestPosition`, `resolveCollisions`) from the legacy `LLMAlchemy.tsx` into `src/lib/game-logic.ts`. Update the `useElementInteraction.ts` hook to correctly call these functions.
*   **Code Example:**
    *   **In `useElementInteraction.ts`:**
        ```typescript
        // After (Simplified): We call the robust, centralized logic
        const newPos = GameLogic.resolveCollisions(
          x - offset,
          y - offset,
          mixingArea, // The current state of the mixing area
          dropZoneRef.current, // A reference to the mixing area DOM element
          draggedElement.current.mixIndex
        );
        ```

### 4. Isolate the Legacy Monolith
*   **Why:** To prevent the old, buggy component from being used accidentally while keeping it for reference, as you requested.
*   **How:** Rename `src/components/game/LLMAlchemy.tsx` to `src/components/game/LLMAlchemy.legacy.tsx`. Then, add this path to the `exclude` array in `tsconfig.json` to prevent the TypeScript compiler from including it in the build.

## Phase 2: Restore Core Gameplay Mechanics

*Goal: Bring back the "fun" by fixing the features that most directly impact the player's experience.*

### 1. ✅ Re-implement "Energy" Mixing Rules - COMPLETED
*   **Status:** The Energy mixing rules have been successfully restored in the refactored code.
*   **Implementation:** Located in `useElementMixing.ts` (lines 467-494) with proper type definitions and visual feedback.
*   **Features Working:**
    *   **Energize Element:** Energy + non-energized element → Updates target to `energized: true`, removes Energy
    *   **Energy-Infused Mix:** Energized element + any element → Calls `/api/generate` with energy enhancement
    *   **Normal Mix:** Standard mixing without energy
    *   **Visual Feedback:** Energized elements display golden glow and shake animation
    *   **Type Safety:** `MixingElement` interface includes `energized: boolean` property

### 2. ✅ Fix the Undo Functionality - COMPLETED
*   **Status:** The undo functionality has been successfully implemented in the refactored code.
*   **Implementation:** Located in `useElementMixing.ts` and `LLMAlchemyRefactored.tsx` with proper state restoration.
*   **Features Working:**
    *   **Mixing Area Snapshot:** Creates `mixingAreaSnapshot = [...mixingArea]` before mixing
    *   **State Storage:** `LastCombination` includes `mixingAreaState: MixingElement[]` property
    *   **Full Restoration:** Undo restores mixing area, removes created elements, clears combinations
    *   **Achievement Rollback:** Properly removes gained achievements and end elements
    *   **UI Integration:** Undo button appears when `undoAvailable` is true

### 3. ✅ Unify Hover Effects & Reasoning Popups - COMPLETED
*   **Status:** The hover logic has been successfully unified and refactored for consistency.
*   **Implementation:** Created `useDelayedHover.ts` hook and integrated it into `ElementListView.tsx`.
*   **Features Working:**
    *   **Unified Logic:** Single reusable hook manages 500ms hover delay across all components
    *   **Touch Detection:** Automatically prevents hover effects on touch devices
    *   **Proper Cleanup:** Timeout management with automatic cleanup on unmount
    *   **Consistent Behavior:** Identical hover functionality across element list and mixing areas
    *   **Code Reduction:** Eliminated duplicate hover logic, reducing complexity and maintenance burden

## Phase 3: Polish and Performance

*Goal: Optimize the experience to ensure it feels smooth, responsive, and professional.*

### 1. Restore Mixing & Clearing Animations
*   **Why:** The lack of animations makes the game feel clunky.
*   **How:** Ensure the `isMixing` state from the provider correctly triggers the loading spinner overlay. The "Clear" button's `onClick` handler must call the `animateRemoval` function from `useGameAnimations`.
*   **Code Example (in `LLMAlchemyRefactored.tsx`):**
    ```typescript
    const handleClear = () => {
      // First, trigger the animation, then clear the state in the callback
      animateRemoval(mixingArea, () => {
        clearMixingArea();
      });
    };
    ```

### 2. Optimize State & Renders (Friend's Suggestion)
*   **Why:** Storing mutable objects like `Set` directly in `useReducer` state can cause frequent, unnecessary re-renders.
*   **How:** In `useGameState.ts`, store `dimmedElements` and `animatingElements` in a `useRef`. The reducer will mutate the `.current` value of the ref, and a separate state counter will trigger re-renders only when the sets change.

### 3. Throttle Intensive Calculations (Friend's Suggestion)
*   **Why:** Running collision checks on every pixel of a drag movement can cause lag on mobile.
*   **How:** In `useElementInteraction.ts`, wrap the `resolveCollisions` call inside a `requestAnimationFrame` callback to ensure it runs at most once per frame.

### 4. Consolidate to Pointer Events & Clean Up CSS (Friend's Suggestion)
*   **Why:** Using modern `onPointerDown` events simplifies code and works for both mouse and touch. Old, touch-specific CSS can cause conflicts.
*   **How:** Refactor drag/touch handlers in `useElementInteraction.ts` to use `onPointerDown`, `onPointerMove`, and `onPointerUp`. Afterwards, search for and remove redundant CSS like `touchAction:` and `WebkitTouchCallout:`.

### 3.5: Fix Drag-and-Drop State Cleanup
*   **Why:** A cancelled or invalid drag operation (e.g., releasing an element outside the mixing area) leaves the UI in a broken state: dimmed elements remain dimmed, and hover effects trigger incorrectly.
*   **How:** Investigate the `onDragEnd` handlers in `LLMAlchemyRefactored.tsx`. Ensure that state cleanup functions (`clearDimmedElements`, `setIsDragging(false)`, `setHoveredElement(null)`) are called reliably in all scenarios, especially when a drag operation does not result in a valid drop.

## Phase 4: Verification & Future-Proofing

*Goal: Add a safety net to prevent future regressions.*

### 1. Implement an E2E Smoke Test Against Vercel Previews
*   **Why:** To automatically verify the core gameplay loop in a true production-like environment without relying on flaky local builds.
*   **How:**
    1.  Create a single Playwright test script that drags "Fire" onto "Water" and asserts that a new "Steam" element appears.
    2.  Modify `.github/workflows/ci.yml` to run this test against the preview URL generated by the Vercel deployment action.
