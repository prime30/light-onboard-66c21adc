# Design System Documentation

Complete reference for the design system tokens, components, and utilities.

---

## Table of Contents

1. [Typography](#typography)
2. [Colors](#colors)
3. [Border Radius](#border-radius)
4. [Shadows](#shadows)
5. [Sizing](#sizing)
6. [Animations](#animations)
7. [Utility Classes](#utility-classes)
8. [Components](#components)

---

## Typography

### Font Families

| Token | Font | Usage |
|-------|------|-------|
| `font-sans` | Aeonik Pro | Default body text |
| `font-aeonik` | Aeonik Pro | Body, UI elements |
| `font-termina` | Termina | Headlines, display |
| `font-display` | Aeonik Pro | Alternate display |

### Termina Weights

| Weight | Class | File |
|--------|-------|------|
| 100 | `font-thin` | termina-thin.otf |
| 200 | `font-extralight` | termina-extralight.otf |
| 300 | `font-light` | termina-light.otf |
| 400 | `font-normal` | termina-regular.otf |
| 500 | `font-medium` | termina-medium.otf |
| 600 | `font-semibold` | termina-demi.otf |
| 700 | `font-bold` | termina-bold.otf |
| 800 | `font-extrabold` | termina-heavy.otf |
| 900 | `font-black` | termina-black.otf |

### Aeonik Pro Weights

| Weight | Class | File |
|--------|-------|------|
| 300 | `font-light` | aeonik-pro-light.otf |
| 400 | `font-normal` | aeonik-pro-regular.otf |
| 400 italic | `font-normal italic` | aeonik-pro-regular-italic.otf |
| 500 | `font-medium` | aeonik-pro-medium.otf |
| 500 italic | `font-medium italic` | aeonik-pro-medium-italic.otf |
| 600 | `font-semibold` | aeonik-pro-semibold.otf |
| 600 italic | `font-semibold italic` | aeonik-pro-semibold-italic.otf |
| 700 | `font-bold` | aeonik-pro-bold.otf |
| 900 | `font-black` | aeonik-pro-black.otf |

### Usage

```tsx
// Headlines
<h1 className="font-termina text-4xl font-bold tracking-tight">
  Display Headline
</h1>

// Body
<p className="font-aeonik text-base leading-relaxed">
  Body text content...
</p>

// UI labels
<span className="font-aeonik text-sm font-medium uppercase tracking-wide">
  Label
</span>
```

---

## Colors

All colors use HSL format via CSS variables for easy theming.

### Core Tokens

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--background` | `0 0% 100%` | `0 0% 5%` | Page background |
| `--foreground` | `0 0% 8%` | `0 0% 98%` | Primary text |
| `--card` | `0 0% 100%` | `0 0% 8%` | Card background |
| `--card-foreground` | `0 0% 8%` | `0 0% 98%` | Card text |
| `--popover` | `0 0% 100%` | `0 0% 8%` | Popover background |
| `--popover-foreground` | `0 0% 8%` | `0 0% 98%` | Popover text |

### Interactive Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--primary` | `0 0% 8%` | `0 0% 98%` | Primary buttons/actions |
| `--primary-foreground` | `0 0% 100%` | `0 0% 5%` | Text on primary |
| `--secondary` | `0 0% 96%` | `0 0% 12%` | Secondary elements |
| `--secondary-foreground` | `0 0% 20%` | `0 0% 90%` | Text on secondary |
| `--muted` | `0 0% 96.22%` | `0 0% 15%` | Muted backgrounds |
| `--muted-foreground` | `0 0% 45%` | `0 0% 55%` | Muted text |
| `--accent` | `0 0% 92%` | `0 0% 18%` | Accent backgrounds |
| `--accent-foreground` | `0 0% 8%` | `0 0% 98%` | Text on accent |

### Status Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--status-amber` | `38 92% 50%` | Warnings, pending |
| `--status-green` | `142 71% 45%` | Success, valid |
| `--status-red` | `0 84% 60%` | Error, invalid |
| `--destructive` | `0 84% 60%` | Destructive actions |

### Accent Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--accent-red` | `0 72% 51%` | Red accent |
| `--accent-red-soft` | `0 60% 60%` | Soft red accent |

### Border & Input

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--border` | `0 0% 90%` | `0 0% 15%` | Default borders |
| `--input` | `0 0% 90%` | `0 0% 15%` | Input borders |
| `--ring` | `0 0% 8%` | `0 0% 98%` | Focus rings |

### Usage

```tsx
// Using Tailwind classes
<div className="bg-background text-foreground">
  <button className="bg-primary text-primary-foreground">
    Primary Button
  </button>
</div>

// Status colors
<span className="text-status-green">Valid</span>
<span className="text-status-amber">Pending</span>
<span className="text-status-red">Error</span>
```

---

## Border Radius

Standardized radius system: 3, 5, 10, 20, 30, 40, 9999px

| Token | Value | CSS Variable | Usage |
|-------|-------|--------------|-------|
| `rounded-xs` | 3px | `--radius-xs` | Tiny badges |
| `rounded-sm` | 5px | `--radius-sm` | Small badges |
| `rounded-md` | 10px | `--radius-md` | Inputs, cards |
| `rounded-lg` | 20px | `--radius-lg` | Large cards |
| `rounded-xl` | 30px | `--radius-xl` | Modals |
| `rounded-2xl` | 40px | `--radius-2xl` | Hero sections |
| `rounded-full` | 9999px | `--radius-full` | Pills, circles |
| `rounded-form` | 10px | `--radius-form` | Form elements |
| `rounded-form-sm` | 10px | `--radius-form-sm` | Small form elements |

### Usage

```tsx
<Badge className="rounded-xs">Tiny</Badge>
<Input className="rounded-form" />
<Card className="rounded-lg">Card Content</Card>
<Button size="pill">Pill Button</Button>
```

---

## Shadows

| Token | CSS Variable | Usage |
|-------|--------------|-------|
| `shadow-soft` | - | Subtle elevation |
| `shadow-card` | - | Card default |
| `shadow-elevated` | - | High elevation |
| `shadow-input-focus` | `--shadow-input-focus` | Focused inputs |
| `shadow-card-hover` | `--shadow-card-hover` | Hovered cards |
| `shadow-pill` | `--shadow-pill` | Pill buttons |
| `shadow-pill-hover` | `--shadow-pill-hover` | Hovered pills |
| `shadow-toast` | `--shadow-toast` | Toast notifications |
| `shadow-modal` | `--shadow-modal` | Modal dialogs |

### CSS Variable Values

```css
--shadow-input-focus: inset 0 0 20px rgba(0,0,0,0.03);
--shadow-card-hover: 0 8px 30px -12px rgba(0,0,0,0.12);
--shadow-pill: 0 4px 20px -4px rgba(0,0,0,0.08);
--shadow-pill-hover: 0 8px 30px -8px rgba(0,0,0,0.12);
--shadow-toast: 0 8px 32px rgba(0,0,0,0.12);
--shadow-modal: 0 8px 32px rgba(0,0,0,0.3);
```

---

## Sizing

### Form Elements

| Token | Value | CSS Variable | Usage |
|-------|-------|--------------|-------|
| `h-input` | 50px | `--input-height` | Standard inputs |
| `h-input-prominent` | 60px | `--input-height-prominent` | Prominent inputs |
| `h-button` | 55px | `--button-height` | Standard buttons |

---

## Animations

### Modal Animations

| Class | Effect | Duration |
|-------|--------|----------|
| `animate-modal-enter` | Slide up + fade (mobile) / scale + fade (desktop) | 0.6s |
| `animate-modal-exit` | Slide down (mobile) / fade out (desktop) | 0.45s |

### Fade Animations

| Class | Effect | Duration |
|-------|--------|----------|
| `animate-fade-in` | Simple fade in | 0.6s |
| `animate-rise-fade-in` | Fade in + rise from below | 0.7s |

### Slide Animations

| Class | Effect | Duration |
|-------|--------|----------|
| `animate-slide-up` | Slide up + fade | 0.6s |
| `animate-slide-in-right` | Slide in from right | 0.5s |
| `animate-slide-out-left` | Slide out to left | 0.6s |
| `animate-slide-up-fade` | Gentle slide up + fade | 0.7s |
| `animate-slide-down-fade` | Slide down + fade | 0.7s |

### Step Transitions

| Class | Effect | Duration |
|-------|--------|----------|
| `animate-step-enter-right` | Enter from right with blur | 0.7s |
| `animate-step-enter-left` | Enter from left with blur | 0.7s |
| `animate-step-exit-left` | Exit to left with blur | 0.25s |
| `animate-step-exit-right` | Exit to right with blur | 0.25s |

### Stagger Animations

Apply sequential delays to child elements:

| Class | Delay |
|-------|-------|
| `animate-stagger-1` | 0.08s |
| `animate-stagger-2` | 0.18s |
| `animate-stagger-3` | 0.28s |
| `animate-stagger-4` | 0.38s |
| `animate-stagger-5` | 0.48s |
| `animate-stagger-6` | 0.58s |
| `animate-stagger-7` | 0.68s |

### Scale & Bounce

| Class | Effect | Duration |
|-------|--------|----------|
| `animate-scale-in` | Scale up + fade | 0.4s |
| `animate-bounce-in` | Bounce entrance | 0.8s |
| `animate-haptic-pop` | Bouncy pop entrance | 0.7s |
| `animate-badge-pop` | Badge pop entrance | 0.5s |

### Tailwind Config Animations

| Class | Effect |
|-------|--------|
| `animate-accordion-down` | Accordion open |
| `animate-accordion-up` | Accordion close |
| `animate-shimmer` | Loading shimmer |
| `animate-bounce-subtle` | Gentle bounce |
| `animate-scroll-wheel` | Scroll indicator |

---

## Utility Classes

### Button Effects

| Class | Effect |
|-------|--------|
| `btn-premium` | Shine sweep on hover + lift |
| `btn-lift` | Lift on hover |
| `haptic-press` | Scale down on click |

### Input Styling

| Class | Effect |
|-------|--------|
| `input-ultra` | Gradient border on focus + glow |
| `input-glow` | Focus glow effect |
| `focus-shadow-input` | Inner shadow on focus |
| `floating-label` | Floating label animation |

### Visual Effects

| Class | Effect |
|-------|--------|
| `glass-card` | Frosted glass effect |
| `grain-overlay` | Subtle grain texture |
| `text-shimmer` | Animated text gradient |
| `magnetic-container` | Magnetic hover effect |

### Validation

| Class | Effect |
|-------|--------|
| `shake-subtle` | Validation shake |

---

## Components

### Button

```tsx
import { Button } from "@/components/ui/button";

// Variants: default, destructive, outline, secondary, ghost, link
// Sizes: default, sm, lg, icon, pill, pill-sm, pill-lg, pill-icon

<Button>Default</Button>
<Button variant="outline">Outline</Button>
<Button size="pill">Pill CTA</Button>
<Button size="pill-lg" className="btn-premium">Premium</Button>
```

### Input

```tsx
import { Input } from "@/components/ui/input";

<Input placeholder="Email" className="h-input rounded-form" />
```

### Card

```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>

// Glass variant
<Card className="glass-card">...</Card>
```

### Badge

```tsx
import { Badge } from "@/components/ui/badge";

// Variants: default, secondary, destructive, outline
// Sizes: default (5px), sm (3px), lg (10px), pill (full)

<Badge>Default</Badge>
<Badge size="pill">Pill</Badge>
```

### Dialog

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    Content here
  </DialogContent>
</Dialog>
```

### Toast (Sonner)

```tsx
import { toast } from "sonner";

toast("Event created");
toast.success("Saved successfully");
toast.error("Something went wrong");
```

### Tooltip

```tsx
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

<Tooltip>
  <TooltipTrigger>Hover me</TooltipTrigger>
  <TooltipContent>Tooltip text</TooltipContent>
</Tooltip>
```

---

## Theming

### Adding Dark Mode

```tsx
import { ThemeProvider } from "next-themes";

<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  <App />
</ThemeProvider>
```

### Customizing Colors

Edit CSS variables in `index.css`:

```css
:root {
  /* Change primary to blue */
  --primary: 220 80% 50%;
  --primary-foreground: 0 0% 100%;
}

.dark {
  --primary: 220 80% 60%;
  --primary-foreground: 0 0% 5%;
}
```

### Adding New Colors

1. Add CSS variable in `index.css`:
```css
:root {
  --brand-purple: 270 70% 50%;
}
```

2. Add to `tailwind.config.ts`:
```ts
colors: {
  brand: {
    purple: "hsl(var(--brand-purple))",
  },
}
```

3. Use in components:
```tsx
<div className="bg-brand-purple">...</div>
```

---

## Accessibility

### Reduced Motion

All animations respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Focus States

All interactive elements have visible focus rings using `--ring` color.

### Color Contrast

Status colors are designed for WCAG AA compliance in both light and dark modes.
