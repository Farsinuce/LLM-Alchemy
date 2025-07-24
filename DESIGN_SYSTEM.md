# LLM Alchemy Design System

This document outlines the design system implemented for consistent UI styling across the application.

## Overview

We've implemented a lightweight design system using Tailwind CSS with custom configuration and utility classes. The system focuses on:
- Consistent colors and theming
- Standardized button variants
- Typography hierarchy
- Reusable component patterns

## Files Changed

- `tailwind.config.js` - Custom color palette and design tokens
- `src/app/globals.css` - Utility classes for common patterns
- `src/app/page.tsx` - ✅ Fully refactored to use new design system
- `src/components/auth/AuthModal.tsx` - ✅ Fully refactored to use new design system
- `src/components/game/LLMAlchemy.tsx` - 🔄 Partially updated (modal backdrop, sort buttons, floating action button)

## Color System

### Primary Colors
- `primary` - Purple (#8b5cf6) - Main brand color
- `secondary` - Blue (#3b82f6) - Secondary actions
- `surface-primary` - Dark gray (#111827) - Main background
- `surface-secondary` - Medium gray (#1f2937) - Cards, modals
- `surface-tertiary` - Light gray (#374151) - Interactive elements

### Semantic Colors
- `danger` - Red (#ef4444) - Destructive actions
- `success` - Green (#10b981) - Success states
- `warning` - Amber (#f59e0b) - Warning states

### Game-Specific Colors
- `science` - Blue (#3b82f6) - Science mode
- `creative` - Purple (#8b5cf6) - Creative mode
- `rarity-*` - Colors for different element rarities

## Button System

### Base Classes
```html
<!-- Standard button -->
<button className="btn">Button</button>

<!-- Small button -->
<button className="btn btn-sm">Small Button</button>

<!-- Large button -->
<button className="btn btn-lg">Large Button</button>
```

### Button Variants
```html
<!-- Primary action -->
<button className="btn btn-primary">Primary</button>

<!-- Secondary action -->
<button className="btn btn-secondary">Secondary</button>

<!-- Surface/neutral -->
<button className="btn btn-surface">Surface</button>

<!-- Destructive -->
<button className="btn btn-danger">Delete</button>

<!-- Success -->
<button className="btn btn-success">Confirm</button>

<!-- Ghost/transparent -->
<button className="btn btn-ghost">Ghost</button>

<!-- Game modes -->
<button className="btn btn-science">Science</button>
<button className="btn btn-creative">Creative</button>
```

## Typography

```html
<!-- Headings -->
<h1 className="text-heading">Main Heading</h1>
<h2 className="text-subheading">Sub Heading</h2>

<!-- Body text -->
<p className="text-body">Regular content</p>

<!-- Supporting text -->
<span className="text-caption">Small details</span>
<span className="text-muted">Muted text</span>

<!-- Responsive text -->
<span className="text-responsive-lg">Responsive large</span>
```

## Layout Components

### Cards
```html
<!-- Basic card -->
<div className="card p-4">Card content</div>

<!-- Elevated card -->
<div className="card-elevated p-6">Elevated card</div>
```

### Modals
```html
<!-- Modal structure -->
<div className="modal-backdrop">
  <div className="modal-content">
    Modal content
  </div>
</div>
```

### Forms
```html
<!-- Input field -->
<input className="input" placeholder="Enter text" />

<!-- Small input -->
<input className="input input-sm" placeholder="Small input" />
```

## Status Indicators

```html
<!-- Status badges -->
<div className="status-online p-2 rounded">Online</div>
<div className="status-warning p-2 rounded">Warning</div>
<div className="status-error p-2 rounded">Error</div>
```

## Game Elements

```html
<!-- Element card -->
<div className="element-card element-card-md" style={{backgroundColor: color}}>
  <div className="element-emoji">🔥</div>
  <div className="element-name">Fire</div>
</div>

<!-- Game mode toggle -->
<div className="game-mode-toggle">
  <div className="game-mode-slider bg-science"></div>
  <span className="game-mode-text left-3">Science</span>
  <span className="game-mode-text right-3">Creative</span>
</div>
```

## Loading States

```html
<!-- Loading spinner -->
<div className="loading-spinner h-8 w-8"></div>

<!-- Loading button -->
<button className="btn btn-primary btn-loading">Processing...</button>
```

## Implementation Guidelines

### DO
- Use design system classes for consistency
- Combine utility classes with design system classes when needed
- Keep dynamic styles (like element colors) as inline styles
- Use semantic color names (primary, danger) over specific colors (purple-600)

### DON'T
- Create new color values without adding them to the config
- Mix multiple button variant classes
- Over-abstract simple components
- Replace all existing styles at once (do it progressively)

## Migration Strategy

1. **New features** - Use design system from day one
2. **Existing components** - Refactor when working on them
3. **High-visibility areas** - Prioritize for consistency
4. **Complex components** - Keep existing patterns if they work well

## Future Enhancements

- Dark/light mode support using CSS custom properties
- Component-specific utility classes as needed
- Animation utilities for common patterns
- Form validation styling patterns

---

*Remember: This is a lightweight system. Only abstract patterns that are truly repeated across the application.*
