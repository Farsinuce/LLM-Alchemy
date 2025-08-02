# OpenMoji UI Redesign: Comprehensive Plan

**Objective:** To completely overhaul the LLM Alchemy application's user interface to align with the OpenMoji style guide. This document provides a detailed plan for a developer to execute this visual redesign.

**Philosophy:** "Good enough" is good enough. We're aiming for a clean, friendly OpenMoji-inspired look without over-engineering or striving for perfection.

---

## 1. Core Design Principles (from `style-guide.txt`)

The entire redesign should be guided by these core principles to ensure consistency with the OpenMoji aesthetic:

-   **Outlines:** All UI elements (buttons, cards, modals, inputs) must have a **2px solid black border** with **rounded corners/ends**.
-   **Colors:** The UI must switch from a dark theme to a **light theme**, using the official OpenMoji color palette. Gradients and semi-transparent dark overlays must be removed.
-   **Simplicity:** The design should be **flat and 2D**. All complex shadows, glows, and 3D-like effects must be removed.
-   **Layout:** Use sufficient gaps (min. 2px) between elements to create a clean, friendly look.

---

## 2. Phase 1: Global Styles & Foundation (`src/app/globals.css`) ✅ COMPLETED

This is the most critical first step. All subsequent changes depend on this foundation.

**STATUS: ✅ COMPLETED**
- ✅ OpenMoji CSS variables added using Tailwind native colors
- ✅ Complete `.om-*` utility classes implemented
- ✅ Dark mode removed (OpenMoji is inherently light)
- ✅ Animation guidelines with reduced motion support added
- ✅ Legacy variables preserved to prevent breaking changes

### 2.1. New Color System (Tailwind Native)

**Migration Strategy:** To avoid breaking the entire app at once, we'll add the new OpenMoji variables alongside the existing ones. Components can then be migrated incrementally.

**Action:**
1.  **Keep existing variables temporarily** - Don't remove `--color-primary`, etc. yet
2.  Add new CSS variables using Tailwind's native color palette:

```css
@theme {
  /* Essential OpenMoji Colors - Using Tailwind native colors */
  /* Primary colors for main UI elements */
  --om-primary: theme('colors.sky.400');     /* Primary actions */
  --om-danger: theme('colors.red.400');      /* Errors, destructive actions */
  --om-success: theme('colors.lime.400');    /* Success states */
  --om-warning: theme('colors.yellow.300');  /* Warnings - low contrast, use carefully */
  
  /* Hover/active states - darker variants */
  --om-primary-dark: theme('colors.sky.500');
  --om-danger-dark: theme('colors.red.600');
  --om-success-dark: theme('colors.green.600');
  
  /* Base UI colors */
  --om-bg: theme('colors.white');
  --om-text: theme('colors.black');
  --om-border: theme('colors.black');
  --om-muted-bg: theme('colors.gray.300');
  --om-muted-text: theme('colors.gray.500');
  
  /* Standard measurements */
  --border-width: 2px;
  --border-radius: 0.5rem; /* 8px */
  --gap-min: 0.125rem; /* 2px minimum gap */
}
```

**Accessibility Note:** Yellow-300 has poor contrast on white backgrounds (WCAG ratio 1.29:1). Use it only for:
- Icon fills within black-bordered containers
- Small accent elements
- Never for text or large background areas

### 2.2. Body and Layout Styles

**Action:**
1.  Update the `body` styles to use the new light theme variables.
2.  **Dark Mode Decision:** While the OpenMoji aesthetic is inherently light and bright, we might keep a minimal high-contrast mode for accessibility / future dark mode.

```css
body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-source-sans-3), system-ui, sans-serif;
}

/* Remove the existing dark mode media query */
/* If accessibility mode is needed later, implement as a toggle, not automatic */
```

### 2.3. General UI Patterns

**Important:** These patterns apply to ALL UI elements throughout the app, ensuring consistency. When in doubt, stick to these patterns rather than creating custom styles.

```css
@layer components {
  /* ===== BUTTONS ===== */
  .om-btn {
    @apply px-4 py-2 font-bold text-center transition-colors;
    border: var(--border-width) solid var(--om-border);
    border-radius: var(--border-radius);
    background-color: var(--om-muted-bg);
    color: var(--om-text);
  }
  .om-btn:hover {
    background-color: theme('colors.gray.500');
  }
  .om-btn:active {
    background-color: theme('colors.gray.600');
  }
  .om-btn:disabled {
    @apply opacity-50 cursor-not-allowed;
  }
  .om-btn:focus-visible {
    outline: var(--border-width) solid var(--om-primary);
    outline-offset: 2px;
  }
  
  /* Button variants */
  .om-btn-primary {
    background-color: var(--om-primary);
  }
  .om-btn-primary:hover {
    background-color: var(--om-primary-dark);
  }
  
  .om-btn-danger {
    background-color: var(--om-danger);
  }
  .om-btn-danger:hover {
    background-color: var(--om-danger-dark);
  }
  
  /* ===== CARDS & CONTAINERS ===== */
  .om-card {
    background-color: var(--om-bg);
    border: var(--border-width) solid var(--om-border);
    border-radius: var(--border-radius);
    padding: 1.5rem;
  }
  
  .om-container {
    @apply om-card;
  }
  
  /* ===== INPUTS & FORM ELEMENTS ===== */
  .om-input {
    @apply w-full px-3 py-2;
    background: var(--om-bg);
    border: var(--border-width) solid var(--om-border);
    border-radius: var(--border-radius);
    color: var(--om-text);
  }
  .om-input:focus {
    outline: none;
    border-color: var(--om-primary);
  }
  .om-input:focus-visible {
    outline: var(--border-width) solid var(--om-primary);
    outline-offset: 2px;
  }
  
  .om-select {
    @apply om-input;
  }
  
  .om-textarea {
    @apply om-input;
    min-height: 4rem;
  }
  
  /* ===== MODALS ===== */
  .om-modal-backdrop {
    @apply fixed inset-0 flex items-center justify-center z-50 p-4;
    background-color: rgba(0, 0, 0, 0.2); /* Light overlay */
  }
  
  .om-modal-content {
    @apply om-card w-full max-w-md;
    max-height: 90vh;
    overflow-y: auto;
  }
  
  .om-modal-header {
    @apply font-bold text-lg mb-4 pb-4;
    border-bottom: var(--border-width) solid var(--om-border);
  }
  
  /* ===== PROGRESS BARS ===== */
  .om-progress-track {
    @apply w-full h-2;
    background-color: var(--om-muted-bg);
    border: var(--border-width) solid var(--om-border);
    border-radius: var(--border-radius);
  }
  .om-progress-fill {
    @apply h-full;
    background-color: var(--om-primary);
    border-radius: calc(var(--border-radius) - 2px);
  }
  
  /* ===== BADGES & CHIPS ===== */
  .om-badge {
    @apply inline-flex px-2 py-1 text-sm font-medium;
    border: var(--border-width) solid var(--om-border);
    border-radius: var(--border-radius);
    background-color: var(--om-muted-bg);
  }
  
  /* ===== DIVIDERS ===== */
  .om-divider {
    height: var(--border-width);
    background-color: var(--om-border);
    margin: 1rem 0;
  }
  
  /* ===== ELEMENT CARDS (game specific) ===== */
  .om-element {
    @apply relative cursor-pointer;
    border: var(--border-width) solid var(--om-border);
    border-radius: var(--border-radius);
    padding: 0.5rem;
    background-color: var(--element-color, var(--om-muted-bg));
  }
  .om-element:hover {
    transform: scale(1.05);
    transition: transform 0.2s ease-out;
  }
  
  /* ===== UTILITY CLASSES ===== */
  .om-text-muted {
    color: var(--om-muted-text);
  }
  
  .om-border-thick {
    border-width: 4px;
  }
}
```

### 2.4. Animation Guidelines

**Principle:** Keep it simple. Only essential feedback animations, no decorative ones.

```css
/* Minimal animations for feedback */
@media (prefers-reduced-motion: no-preference) {
  .om-btn, .om-element {
    transition: background-color 0.2s, transform 0.2s;
  }
}

/* Respect user preferences */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 3. Phase 2: Component-by-Component Redesign

After establishing the global styles, update each component to adopt the new design system.

### 3.1. Home Page (`src/app/page.tsx`) ✅ COMPLETED

**STATUS: ✅ COMPLETED**

This is the first component to migrate. All changes will be made in `src/app/page.tsx`.

-   ✅ **Main Container (`<main>`):** Removed `bg-surface-primary`. Now uses light body background.
-   ✅ **Title (`<h1>`):** Updated text to be black. The `Emoji` component works as is.
-   ✅ **Progress Display (`.bg-gray-800/50`):** Replaced with `.om-card` class. All text updated to black/dark gray with flat OpenMoji colors.
-   ✅ **Buttons:**
    -   ✅ Main "Continue Game" / "New Game" button updated to `.om-btn om-btn-primary`. Gradient removed.
    -   ⚠️ Other buttons still need migration (Register/Sign in, LLM Options buttons)
-   ✅ **Challenge Preview:** Updated to use `.om-card` with proper color scheme.
-   🔄 **Modals:** Started migration - LLM Options modal updated to use `.om-modal-backdrop` and `.om-modal-content`. Other modals still need updates.

**DEPLOYED:** Available at https://llm-alchemy-beta2.vercel.app/

### 3.2. Game Components ✅ COMPLETED

**STATUS: ✅ COMPLETED**

All major game components have been successfully migrated to the OpenMoji design system:

#### 3.2.1. GameHeader Component
- ✅ **Container:** Converted to light theme with `bg-white/90 backdrop-blur-sm` and proper black border
- ✅ **Buttons:** All buttons converted to use `om-btn` and `om-btn-primary` classes
- ✅ **Form Elements:** Input and select elements updated to use `om-input` and `om-select` classes
- ✅ **Text Colors:** All text updated to black/gray for proper light theme contrast
- ✅ **Game Mode Toggle:** Redesigned with flat styling and proper borders

#### 3.2.2. ElementListView Component  
- ✅ **Element Cards:** Added `om-element` class support with CSS custom property integration
- ✅ **Light Theme:** Background converted to light gray (`bg-gray-100`)
- ✅ **Borders:** All elements now have proper black borders as per OpenMoji guidelines

#### 3.2.3. MixingAreaView Component
- ✅ **Buttons:** Undo and Clear buttons converted to `om-btn` classes with proper variants
- ✅ **Background:** Updated to light theme background (`bg-gray-50`)
- ✅ **Text Colors:** Empty state text updated to proper black color

#### 3.2.4. ChallengeBar Component
- ✅ **Themed Backgrounds:** Daily challenges use yellow theme, weekly use orange theme
- ✅ **Text Colors:** All text converted to light theme colors (black, gray-600, etc.)
- ✅ **Game Mode Badges:** Updated to use light backgrounds (bg-blue-100, bg-purple-100)

#### 3.2.5. Modals & Overlays
- ✅ **UnlockModal:** Converted to use `om-modal-content` styling with proper light theme
- ✅ **AchievementsModal:** Applied `om-modal-backdrop` and `om-modal-content` classes
- ✅ **ReasoningPopup:** Updated to use `om-card` styling with white background

#### 3.2.6. Main Game Container (`LLMAlchemyRefactored.tsx`)
- ✅ **Container Background:** Updated to white background (`bg-white`)
- ✅ **Header Integration:** Uses refactored GameHeader component
- ✅ **Text Colors:** All text converted to black for proper contrast
- ✅ **Component Integration:** All nested components now use OpenMoji classes

### 3.3. Legacy Game View Documentation (`src/components/game/LLMAlchemy/LLMAlchemyRefactored.tsx`)

This was the most complex part of the redesign. Relevant file: `src/components/game/LLMAlchemy/LLMAlchemyRefactored.tsx`. Pay special attention to these runtime considerations:

-   **Main Container (`<div className="min-h-screen...">`):** Remove `bg-gray-900` and the gradient overlay. It should use the light background.
-   **Game Header (`<div className="relative z-10...">`):**
    -   Remove `bg-gray-800/80 backdrop-blur-sm shadow-lg`.
    -   It should be a simple container with a `2px` black bottom border.
    -   All text should be black.
    -   All buttons (`Back`, `Achievements`, `Sort`) and the `input`/`select` fields must be restyled using the `om-btn` and `om-input` classes.
    -   The "Game Mode Toggle" needs a complete redesign to a flat style with a 2px border.
-   **Element List View (`<div style={{ height: ... }}>`):**
    -   Remove `bg-gray-800/30 backdrop-blur-sm`.
    -   The element cards themselves must be updated:
        -   The background color should be the element's flat color.
        -   Add a `2px` solid black border.
        -   The `box-shadow` on hover should be replaced with a subtle scale transform or a thicker border.
-   **Divider (`<div className="h-1 bg-gray-600...">`):**
    -   Restyle to be a simple, thicker black line (`height: 2px`, `background: black`).
-   **Mixing Area (`<div ref={dropZoneRef}...>`):**
    -   Remove `bg-gray-800/30 backdrop-blur-sm`.
    -   The background should be a light color, perhaps a very light gray (`--om-gray-300`) to differentiate it from the element list.
    -   The "Drag elements here" text needs to be black or dark gray.
    -   The `FloatingEmojiBackground` may need to be toned down or removed if it feels too noisy with the new flat design.
-   **Mixing Elements:** The styles for elements in the mixing area need to be updated to match the new element card style (flat color + 2px black border). The `boxShadow` for energized/hovered states must be removed and replaced with a border-based indicator.
-   **Modals (`UnlockModal`, `AchievementsModal`, `ReasoningPopup`):**
    -   These must be updated to use the `.om-modal-content` style.
    -   The `UnlockModal`'s rarity-based colors should be used for the `background-color` of the modal card, with a solid black border. The glow effect must be removed.

### 3.3. Game-Layer Specific Considerations

**Runtime Dependencies to Handle:**

| Component | Current Implementation | OpenMoji Solution |
|-----------|----------------------|-------------------|
| **getContrastColor** | Dynamically calculates black/white text | Keep the function but return `var(--om-text)` consistently |
| **Drag/Energized Feedback** | Uses box-shadow effects | Replace with `.om-border-thick` class |
| **Progress Bars** | Translucent bars on dark background | Use `.om-progress-track` and `.om-progress-fill` classes |
| **Modal Backdrop** | 50% black overlay | Use `.om-modal-backdrop` class |
| **Element Rarity Colors** | Glow effects and shadows | Use solid background colors with black borders |
| **Floating Emoji Background** | Animated floating emojis | Keep if subtle, remove if too busy with flat design |

### 3.4. Component-Specific Guidelines

**General Pattern for ALL Components:**
1. Replace dark backgrounds with white/light gray
2. Replace gradients with flat colors
3. Replace shadows/glows with border variations
4. Ensure 2px black borders on all interactive elements

**Specific Components:**
-   **`ChallengeBar.tsx`:** Use `.om-card` for container, `.om-badge` for challenge items
-   **`AuthModal.tsx`:** Use `.om-modal-content`, `.om-input`, `.om-btn` classes
-   **All other modals:** Follow the same `.om-modal-*` pattern
-   **Toast/Notifications:** Use `.om-card` with appropriate color backgrounds

---

## 4. Developer Workflow & Implementation Strategy

### 4.1. Direct Migration Approach

Since there are no active players and downtime is acceptable, we'll do a direct migration without feature flags:

**Example Implementation:**
```tsx
export default function SomeComponent() {
  return (
    <div className="om-card">
      <button className="om-btn om-btn-primary">
        Click me
      </button>
    </div>
  );
}
```

**Testing via Vercel/GitHub Actions:**
- Deploy directly to: `https://llm-alchemy-beta2.vercel.app/`
- Test after each component migration

**Migration Order:**
1. Home page (`src/app/page.tsx`)
2. Home page modals
3. Game components (one at a time)

**Simple Rules:**
- Replace old classes with new `.om-*` classes directly
- Remove old dark theme classes completely
- Test on Vercel after each deployment
- Commit and push for Vercel auto-deployment

### 4.2. Minimum Viable Path

1. **Phase 1: Foundation ✅ COMPLETED**
   - Add Tailwind token variables & `.om-*` primitives to `globals.css`
   - Keep existing variables to prevent breakage

2. **Phase 2: Home Page (Current)**
   - Migrate `page.tsx` and its modals
   - Run Lighthouse accessibility audit (especially contrast ratios)
   - Deploy and test on Vercel

3. **Phase 3: Game View**
   - Tackle component by component:
     - Header and element list
     - Mixing area and interactions
     - Modals and polish

4. **Phase 4: Cleanup**
   - Delete old CSS variables
   - Let Tailwind tree-shaking remove unused utilities

### 4.3. Avoiding Over-Engineering

**Remember: "Good enough" is the goal!**

| Don't | Do Instead |
|-------|------------|
| Don't create a full design-token JSON pipeline | Use static CSS vars + Tailwind theme() |
| Don't build a Tailwind plugin for every color | Use the ~10 semantic vars we defined |
| Don't immediately purge all dark-theme classes | Let Tailwind tree-shaking handle it |
| Don't create complex theming system | Keep it simple with CSS variables |
| Don't create custom styles for each component | Reuse the `.om-*` classes everywhere possible |

### 4.4. Quick Implementation Checklist

For each component you migrate:
- [ ] Replace dark background with white/light
- [ ] Add 2px black borders to interactive elements
- [ ] Remove gradients, shadows, glows
- [ ] Use flat colors from our palette
- [ ] Apply appropriate `.om-*` classes
- [ ] Test hover/active states
- [ ] Verify accessibility (contrast, focus states)

### 4.5. Testing & Validation

- **Visual Check:** Does it look clean and friendly? Good enough!
- **Accessibility:** Basic WCAG AA compliance (especially yellow contrast)
- **Functionality:** Everything still works? Great!

### 4.6. Implementation Notes

-   **Direct Migration**: Replace old styles with new `.om-*` classes directly. Since there are no active players, we can update the live site immediately.
-   **Remove Old Classes**: When applying a new `.om-*` class, we must remove old conflicting utility classes (e.g., `bg-gray-800/50`, `shadow-lg`, `backdrop-blur-sm`).
-   **JavaScript Styles**: Remember to update JS-driven styles. The main ones are `getContrastColor()` (should always return black) and replacing `box-shadow` effects with border styles for drag/hover feedback. (be careful if touching the element drag ghost code)
-   **Reuse Patterns**: For any UI elements not explicitly mentioned, reuse the general `.om-*` patterns. Avoid writing one-off custom styles.
