# The Final, Enhanced Restoration Plan

*This definitive plan incorporates all our analysis, your feedback, and your friend's expert suggestions. It is designed to be a comprehensive guide for creating a stable, maintainable, and polished game.*

## Phase 1: Stabilize the Foundation

*Goal: Fix all build-breaking errors and establish a single, reliable source of truth for game state.*

### 1. ✅ Fix Compilation Blockers - COMPLETED
*   **Status:** All compilation errors have been resolved. Code compiles and runs successfully.
*   **Implementation:** Fixed TypeScript errors, invalid object spreads, and type mismatches.
*   **Result:** Development server runs without errors, no TypeScript compilation blockers remain.

### 2. ✅ Centralize All Shared State - COMPLETED
*   **Status:** All shared state has been successfully centralized via `useElementInteractionState()`.
*   **Implementation:** All UI interaction state (`isMixing`, `isDragging`, `hoveredElement`, `touchDragging`, `dimmedElements`) is now managed through the centralized GameStateProvider.
*   **Result:** Complete separation of concerns - no local state conflicts, consistent state management across all components.

### 3. ✅ Repair Collision & Drag-and-Drop Logic - COMPLETED
*   **Status:** All collision and drag-and-drop logic has been successfully implemented.
*   **Implementation:** Working collision functions (`checkCollision`, `hasCollisionAt`, `findBestPosition`, `resolveCollisions`) are in `src/lib/game-logic.ts`.
*   **Features Working:**
    *   **Collision Detection:** Elements properly detect overlaps and boundaries
    *   **Position Resolution:** New elements find optimal non-colliding positions
    *   **Drag & Drop:** Both mouse and touch interactions work correctly
    *   **Integration:** Used throughout `LLMAlchemyRefactored.tsx` for element placement

### 4. ✅ Isolate the Legacy Monolith - COMPLETED
*   **Status:** The legacy component has been successfully isolated from the build system.
*   **Implementation:** Renamed `src/components/game/LLMAlchemy.tsx` to `src/components/game/LLMAlchemy.legacy.tsx` and added it to the `exclude` array in `tsconfig.json`.
*   **Result:** Legacy code is preserved for reference but completely excluded from TypeScript compilation and builds.

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

### 1. ✅ Restore Mixing & Clearing Animations - COMPLETED
*   **Status:** The "Clear" button and its animations have been successfully implemented.
*   **Implementation:** The `onClick` handler for the "Clear" button now calls the `animateRemoval` function from `useGameAnimations`, ensuring a smooth visual transition before clearing the state.
*   **Result:** The game feels more polished and responsive, addressing the "clunky" feel of the previous implementation.

### 2. ✅ Fix Drag-and-Drop State Cleanup - COMPLETED
*   **Status:** The drag-and-drop state cleanup has been successfully implemented.
*   **Implementation:** Added global cleanup handlers for `mouseup` and `dragend` events that ensure state is properly reset when drag operations are cancelled or end outside valid drop zones.
*   **Result:** UI no longer gets stuck in a broken state - dimmed elements are properly cleared, and hover effects work correctly after cancelled drags.

### 3. ✅ Optimize Performance and Event Handling - COMPLETED
*   **Status:** Performance optimizations for mobile touch interactions have been successfully implemented.
*   **Implementation:** Throttled touch move updates using `requestAnimationFrame` to ensure smooth performance on mobile devices.
*   **Result:** Touch dragging now runs at optimal frame rates without causing lag on mobile devices.

### 4. ❌ Optimize State & Renders (Friend's Suggestion) - SKIPPED
*   **Reason for Skipping:** This suggestion was based on a misunderstanding of how the `dimmedElements` and `animatingElements` Sets are used. They are essential for triggering re-renders to apply conditional CSS classes. Moving them to `useRef` would break the UI's visual feedback system.

## Phase 4: Verification & Future-Proofing

*Goal: Add a safety net to prevent future regressions.*

### 1. Implement an E2E Smoke Test Against Vercel Previews
*   **Why:** To automatically verify the core gameplay loop in a true production-like environment without relying on flaky local builds.
*   **How:**
    1.  Create a single Playwright test script that drags "Fire" onto "Water" and asserts that a new "Steam" element appears.
    2.  Modify `.github/workflows/ci.yml` to run this test against the preview URL generated by the Vercel deployment action.
