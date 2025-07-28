# LLM Alchemy: Refactoring & Redesign Preparation Plan

**Objective:** To refactor the codebase to be more modular, maintainable, and scalable, creating a solid foundation for the upcoming OpenMoji-style visual redesign.

---

## **Phase 1: Foundational Cleanup (Low Risk, High Reward)**

This phase focuses on cleaning up existing code, reducing duplication, and improving security without making major architectural changes.

### **Step 1.1: Consolidate & Secure Supabase Clients**

*   **Goal:** Create secure, separated entry points for Supabase clients that prevent RSC boundary violations and secret leakage.
*   **Security Requirements:**
    - Prevent server-only imports (like `next/headers`) from being bundled in client code
    - Ensure service role keys never leak to the browser
    - Maintain clear separation between browser and server contexts

*   **Implementation:**
    1.  Create a new directory structure: `src/lib/supabase/`
    2.  Create **three separate files**:
        *   `browser.ts`: Client-side only (no server imports, no service role keys)
        *   `server.ts`: Server-side only (with cookies/headers handling)
        *   `helpers.ts`: Runtime-agnostic pure functions (SQL builders, row mappers)
    3.  Create `index.ts` barrel file that safely re-exports only browser-safe symbols
    4.  Add ESLint rule to prevent wrong-side imports:
        ```json
        {
          "rules": {
            "import/no-restricted-paths": [
              "error",
              {
                "zones": [
                  {
                    "target": "./src/components",
                    "from": "./src/lib/supabase/server"
                  },
                  {
                    "target": "./src/app",
                    "from": "./src/lib/supabase/server"
                  }
                ]
              }
            ]
          }
        }
        ```
    5.  **Migration Strategy:**
        - Use codemod/find-replace to update imports from `@/lib/supabase-client` to `@/lib/supabase/browser`
        - Keep deprecated re-export in old location with console warning for one sprint
        - Delete old files only after migration is complete

### **Step 1.2: Centralize & Secure Type Definitions** ✅ **COMPLETED**

*   **Goal:** Create a single source of truth for all data types with proper naming to avoid collisions.
*   **Implementation:**
    1.  **Directory Structure:** ✅
        ```
        src/types/
        ├── db.generated.ts     # Created (type generation pending)
        ├── game.types.ts       # GameElement, GameState, etc. (domain-prefixed)
        ├── user.types.ts       # User-related interfaces
        ├── challenge.types.ts  # Challenge system types
        └── index.ts           # Barrel export file
        ```
    2.  **Naming Convention:** ✅ Domain prefixes maintained (GameElement, GameState, etc.)
    3.  **Database Types:** ⏳ File created, generation command can be run when needed
    4.  **Migration:** ✅ Updated all imports to use centralized types from `@/types`
    5.  **ESLint Protection:** ✅ `import/no-cycle` rule already in place

**Migration Results:**
- ✅ Types properly separated into domain-specific files
- ✅ All imports updated: helpers.ts, ChallengeBar.tsx, SupabaseProvider.tsx
- ✅ Deprecated types file shows console warning and re-exports for backwards compatibility
- ✅ No circular dependencies (ESLint protected)
- ✅ All existing functionality preserved

### **Step 1.3: Safety & Quality Measures**

*   **Required Safeguards:**
    1.  **ESLint Configuration:**
        - `import/no-restricted-paths` to prevent server imports in client code
        - `import/no-cycle` to prevent circular dependencies
    2.  **Vercel Build Verification** (Optional):
        - Since we deploy to Vercel, we can rely on their build process to catch issues
        - Alternatively, add a simple check in package.json scripts
    3.  **Type Safety:**
        - Ensure all database operations use generated types
        - Remove duplicate manual type definitions

*   **Migration Checklist:**
    - [ ] `browser.ts` contains no `next/headers`, `cookies`, or service role keys
    - [ ] `server.ts` is properly restricted from client bundles
    - [ ] All components updated to use new import paths
    - [ ] ESLint rules pass without errors
    - [ ] Database types regeneration script works
    - [ ] Deprecated imports show console warnings
    - [ ] All existing functionality still works

---

## **Phase 2: The Great Component Refactor (Medium Risk, High Reward)**

This phase tackles the monolithic `LLMAlchemy.tsx` component, which is the most critical step for enabling the redesign.

### **Step 2.1: Isolate State Management with a Reducer**

*   **Goal:** Extract the complex game state logic from the `LLMAlchemy.tsx` component. This can be done with almost no visual changes, making it a safe first step.
*   **Implementation:**
    1.  Create a new custom hook, `useGameState.ts`, that uses React's `useReducer` hook.
    2.  The reducer will manage all state transitions: adding elements, handling combinations, resetting progress, etc.
    3.  The `LLMAlchemy.tsx` component will then call `const { state, dispatch } = useGameState();` to manage its data.
    4.  Pure game logic (e.g., checking for valid combinations) will be moved to a new `src/lib/game-logic.ts` file and called from the reducer.

### **Step 2.2: Extract Presentational Components**

*   **Goal:** Break down the UI of `LLMAlchemy.tsx` into smaller, reusable components.
*   **Implementation:** Create the following new components:
    *   `GameHeader.tsx`: The top bar with titles, buttons, and the game mode toggle.
    *   `ElementListView.tsx`: The scrollable list of discovered elements.
    *   `MixingAreaView.tsx`: The drag-and-drop area.
    *   `Modals/UnlockModal.tsx` and `Modals/AchievementsModal.tsx`: The modals, extracted into their own files.
    *   Each of these components will receive state and dispatch functions as props from the main game component.

### **Step 2.3: Isolate Side Effects into Hooks**

*   **Goal:** Move non-UI logic like audio and animations into their own dedicated hooks.
*   **Implementation:**
    1.  Create `useGameAudio.ts`: This hook will contain all the Web Audio API logic for playing sounds. Components will simply call `play('pop')`.
    2.  Create `useGameAnimations.ts`: This hook will manage the state and logic for triggering CSS animations.

---

## **Phase 3: Modernize Styling Workflow (Low Risk, Medium Reward)**

*   **Goal:** Adopt a hybrid styling approach that is both powerful and maintainable, perfect for the redesign.
*   **Implementation:**
    1.  **Keep Tailwind for Utilities:** Continue to use Tailwind CSS for the majority of styling (layout, colors, spacing, etc.).
    2.  **Use CSS Modules for Encapsulation:** For components that require complex, scoped styles (like custom keyframe animations or overrides for the OpenMoji SVGs), create a `[ComponentName].module.css` file.
    3.  This approach provides the best of both worlds: the speed of utility-first CSS and the safety of scoped component styles.

---

## **Phase 4: Improve Developer Experience & Quality (Ongoing)**

These are smaller tasks that can be incorporated throughout the process to improve overall quality.

*   **ESLint & Prettier:** Set up configuration files in the root of the project to automatically enforce a consistent code style and catch common errors.
*   **Testing:** Introduce basic tests for the new `game-logic.ts` file and the `useGameState` hook to ensure core functionality remains stable during the refactor.
*   **Storybook:** Set up Storybook to develop and showcase the new presentational components in isolation. This will be invaluable for the OpenMoji redesign, as it allows you to perfect the look and feel of each component independently.
