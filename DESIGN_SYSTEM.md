# Design System Documentation

This document describes the design system used throughout the application. All design tokens are centralized in `lib/design-system.ts` and exposed as CSS variables in `app/globals.css`.

## Overview

The design system provides a consistent set of design tokens for:
- Colors (primary, secondary, accent, status colors, neutrals)
- Spacing scale
- Typography
- Border radius
- Shadows
- Glass effects
- Transitions

## Usage

### CSS Variables

All design tokens are available as CSS variables that can be used directly in Tailwind classes or CSS:

```tsx
// Using in Tailwind classes
<div className="bg-[var(--color-primary-500)] text-[var(--color-foreground)]">
  Content
</div>

// Using in CSS
.my-class {
  background-color: var(--color-primary-500);
  color: var(--color-foreground);
}
```

### Design Tokens File

For programmatic access to design tokens in TypeScript/JavaScript:

```tsx
import { colors, spacing, typography } from '@/lib/design-system';

// Access colors
const primaryColor = colors.primary[500]; // '#6366f1'

// Access spacing
const padding = spacing[4]; // '1rem'

// Access typography
const fontSize = typography.fontSize.lg; // '1.125rem'
```

### Utility Functions

Helper functions are available in `lib/design-system-utils.ts`:

```tsx
import { getColor, getColorVar, getSpacingVar } from '@/lib/design-system-utils';

// Get color value
const color = getColor('primary', 500); // '#6366f1'

// Get CSS variable
const cssVar = getColorVar('primary', 500); // 'var(--color-primary-500)'

// Get spacing variable
const spacingVar = getSpacingVar(4); // 'var(--spacing-4)'
```

## Color System

### Primary Colors (Indigo)
- Used for main actions, links, and primary UI elements
- Available shades: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900
- CSS variables: `--color-primary-{shade}`

### Secondary Colors (Pink)
- Used for secondary actions and accents
- Available shades: 50-900
- CSS variables: `--color-secondary-{shade}`

### Accent Colors (Blue)
- Used for accent elements and highlights
- Available shades: 50-900
- CSS variables: `--color-accent-{shade}`

### Status Colors

#### Success (Emerald)
- Used for success messages and positive actions
- CSS variables: `--color-success-{shade}`

#### Error (Red)
- Used for error messages and destructive actions
- CSS variables: `--color-error-{shade}`

#### Warning (Amber)
- Used for warning messages
- CSS variables: `--color-warning-{shade}`

#### Info (Blue)
- Used for informational messages
- CSS variables: `--color-info-{shade}`

### Neutral Colors

#### Gray Scale
- General purpose neutral colors
- CSS variables: `--color-gray-{shade}`

#### Slate Scale
- Alternative neutral palette
- CSS variables: `--color-slate-{shade}`

### Base Colors
- `--color-background`: Background color (changes with theme)
- `--color-foreground`: Text color (changes with theme)

## Spacing Scale

The spacing scale follows a consistent 4px base unit:

- `--spacing-0`: 0
- `--spacing-1`: 0.25rem (4px)
- `--spacing-2`: 0.5rem (8px)
- `--spacing-3`: 0.75rem (12px)
- `--spacing-4`: 1rem (16px)
- `--spacing-5`: 1.25rem (20px)
- `--spacing-6`: 1.5rem (24px)
- `--spacing-8`: 2rem (32px)
- `--spacing-10`: 2.5rem (40px)
- `--spacing-12`: 3rem (48px)
- `--spacing-16`: 4rem (64px)
- `--spacing-20`: 5rem (80px)
- `--spacing-24`: 6rem (96px)
- `--spacing-32`: 8rem (128px)

## Typography

### Font Families
- `--font-geist-sans`: Primary sans-serif font
- Fallback: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

### Font Sizes
- `--font-size-xs`: 0.75rem (12px)
- `--font-size-sm`: 0.875rem (14px)
- `--font-size-base`: 1rem (16px)
- `--font-size-lg`: 1.125rem (18px)
- `--font-size-xl`: 1.25rem (20px)
- `--font-size-2xl`: 1.5rem (24px)
- `--font-size-3xl`: 1.875rem (30px)
- `--font-size-4xl`: 2.25rem (36px)
- `--font-size-5xl`: 3rem (48px)
- `--font-size-6xl`: 3.75rem (60px)
- `--font-size-7xl`: 4.5rem (72px)

### Font Weights
- Light: 300
- Normal: 400
- Medium: 500
- Semibold: 600
- Bold: 700

## Border Radius

- `--radius-none`: 0
- `--radius-sm`: 0.125rem (2px)
- `--radius-base`: 0.25rem (4px)
- `--radius-md`: 0.375rem (6px)
- `--radius-lg`: 0.5rem (8px)
- `--radius-xl`: 0.75rem (12px)
- `--radius-2xl`: 1rem (16px)
- `--radius-3xl`: 1.5rem (24px)
- `--radius-full`: 9999px

## Shadows

- `--shadow-sm`: Small shadow
- `--shadow-base`: Base shadow
- `--shadow-md`: Medium shadow
- `--shadow-lg`: Large shadow
- `--shadow-xl`: Extra large shadow
- `--shadow-2xl`: 2X large shadow
- `--shadow-inner`: Inner shadow
- `--shadow-none`: No shadow

## Glass Effects

The glass effect is a frosted glass aesthetic:

- `--glass-bg`: Glass background color (changes with theme)
- `--glass-border`: Glass border color (changes with theme)
- `--glass-shadow`: Glass shadow (changes with theme)

### Utility Classes

Use the `.glass` class for glass effect:

```tsx
<div className="glass">
  Content with glass effect
</div>
```

Use `.glass-hover` for hover effects:

```tsx
<div className="glass glass-hover">
  Content with glass effect and hover animation
</div>
```

## Utility Classes

Pre-defined utility classes are available in `globals.css`:

### Color Utilities
- `.bg-primary`, `.bg-primary-light`, `.bg-primary-dark`
- `.text-primary`, `.text-primary-hover`
- `.border-primary`
- `.bg-secondary`, `.bg-secondary-light`
- `.text-secondary`, `.text-secondary-hover`
- `.bg-accent`, `.text-accent`
- `.bg-success`, `.text-success`
- `.bg-error`, `.text-error`

### Component Utilities
- `.btn-primary`: Primary button style
- `.btn-secondary`: Secondary button style
- `.input-base`: Base input style
- `.card`: Card container style
- `.card-hover`: Card with hover effect

### Animation Utilities
- `.animate-fade-in`: Fade in animation
- `.animate-slide-up`: Slide up animation

## Best Practices

1. **Always use design tokens**: Never hardcode colors, spacing, or other design values
2. **Use CSS variables in Tailwind**: Prefer `bg-[var(--color-primary-500)]` over hardcoded colors
3. **Use utility classes when available**: Use `.btn-primary` instead of recreating button styles
4. **Maintain consistency**: Use the same color shades for similar purposes across components
5. **Update tokens centrally**: When changing design values, update `lib/design-system.ts` and `globals.css`

## Migration Guide

To migrate existing components to use the design system:

1. Replace hardcoded colors with CSS variables:
   ```tsx
   // Before
   className="bg-indigo-500 text-gray-600"
   
   // After
   className="bg-[var(--color-primary-500)] text-[var(--color-gray-600)]"
   ```

2. Replace hardcoded spacing with spacing variables:
   ```tsx
   // Before
   className="p-4"
   
   // After (if you need to use variables)
   style={{ padding: 'var(--spacing-4)' }}
   // Or keep using Tailwind classes like p-4, which is fine
   ```

3. Use utility classes where available:
   ```tsx
   // Before
   className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
   
   // After
   className="btn-primary"
   ```

## Examples

### Button Component
```tsx
<button className="btn-primary">
  Primary Button
</button>

<button className="btn-secondary">
  Secondary Button
</button>
```

### Card Component
```tsx
<div className="card">
  <h3>Card Title</h3>
  <p>Card content</p>
</div>

<div className="card-hover">
  <h3>Hoverable Card</h3>
  <p>Card content</p>
</div>
```

### Input Component
```tsx
<input
  type="text"
  className="input-base"
  placeholder="Enter text..."
/>
```

### Custom Styling
```tsx
<div className="bg-[var(--color-primary-500)] text-[var(--color-foreground)] p-[var(--spacing-4)] rounded-[var(--radius-lg)]">
  Custom styled content
</div>
```

