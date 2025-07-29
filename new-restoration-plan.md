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

### 1. Re-implement "Energy" Mixing Rules
*   **Why:** The special, interesting logic for the "Energy" element was lost in the refactor.
*   **How:** In `useElementMixing.ts`, re-introduce the `if/else if` branches from the original `mixElements` function to handle the three "Energy" scenarios.
*   **Code Example (in `useElementMixing.ts`):**
    ```typescript
    // Inside the main mixElements function
    if (elem1.name === 'Energy' && !elem2.energized) {
      // Scenario 1: Energize elem2
    } else if (elem1.energized || elem2.energized) {
      // Scenario 2: Perform an energy-infused mix
    } else {
      // Scenario 3: Perform a normal mix
    }
    ```

### 2. Fix the Undo Functionality
*   **Why:** Undo is broken because it doesn't remember the state of the mixing area.
*   **How:** Modify the `LastCombination` interface in `useGameState.ts` to include a `mixingAreaSnapshot: MixingElement[]`. When a mix occurs, store a deep copy of the `mixingArea`. The undo function will then restore this snapshot.
*   **Code Example:**
    *   **In `useGameState.ts`:**
        ```typescript
        interface LastCombination {
          // ... other properties
          mixingAreaSnapshot: MixingElement[]; // Add this line
        }
        ```
    *   **In `useElementMixing.ts` (before a mix):**
        ```typescript
        const snapshot = [...mixingArea]; // Create a copy of the current mixing area
        setLastCombination({ ..., mixingAreaSnapshot: snapshot });
        ```

### 3. Unify Hover Effects & Reasoning Popups
*   **Why:** The hover effect is inconsistent because the logic is duplicated.
*   **How:** Create a single, reusable `useDelayedHover.ts` hook that encapsulates the 500ms timer logic. This hook will be used by both the `ElementListView` and `MixingAreaView`.
*   **Code Example:**
    *   **Create `useDelayedHover.ts`:** This new hook will manage the `setTimeout` and return handlers.
    *   **In `ElementListView.tsx` and `MixingAreaView.tsx`:**
        ```typescript
        const { handleMouseEnter, handleMouseLeave } = useDelayedHover({
          onHover: (element) => {
            // This will set a new state in the GameStateProvider
            setPopupInfo(element);
          },
          delay: 500
        });
        ```

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

## Phase 4: Verification & Future-Proofing

*Goal: Add a safety net to prevent future regressions.*

### 1. Implement an E2E Smoke Test Against Vercel Previews
*   **Why:** To automatically verify the core gameplay loop in a true production-like environment without relying on flaky local builds.
*   **How:**
    1.  Create a single Playwright test script that drags "Fire" onto "Water" and asserts that a new "Steam" element appears.
    2.  Modify `.github/workflows/ci.yml` to run this test against the preview URL generated by the Vercel deployment action.
