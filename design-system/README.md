# Design System Package

A minimal, portable design system built with Tailwind CSS + shadcn/ui.

## Quick Start

### 1. Copy Files

```bash
# Copy fonts to your project
cp -r design-system/fonts/* public/fonts/

# Copy styles (merge with existing)
cp design-system/styles/index.css src/index.css
cp design-system/styles/tailwind.config.ts tailwind.config.ts

# Copy components
cp -r design-system/components/* src/components/ui/

# Copy utilities
cp design-system/lib/utils.ts src/lib/utils.ts
```

### 2. Install Dependencies

```bash
npm install class-variance-authority clsx tailwind-merge tailwindcss-animate
npm install @radix-ui/react-dialog @radix-ui/react-tooltip @radix-ui/react-toast @radix-ui/react-separator @radix-ui/react-slot
npm install lucide-react sonner next-themes
```

### 3. Set Up Providers

In your `App.tsx` or layout:

```tsx
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        {/* Your app */}
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}
```

## What's Included

### Fonts
- **Termina** (9 weights): Display/headline font
- **Aeonik Pro** (6 weights + italics): Body/UI font

### CSS Variables
- Complete light/dark theme tokens
- Standardized radius system (3, 5, 10, 20, 30, 40, 9999px)
- Form element sizing
- Shadow presets

### Animations
- Modal enter/exit
- Step transitions (left/right)
- Stagger fade-in (1-7)
- Premium button effects
- Haptic feedback
- Glass morphism

### Components
- Button (with pill variants)
- Input, Label
- Card
- Badge
- Dialog
- Toast/Sonner
- Tooltip
- Separator
- Skeleton

## File Structure

```
design-system/
├── README.md                 # This file
├── DESIGN-SYSTEM.md         # Full documentation
├── fonts/                   # Font files (→ public/fonts/)
├── styles/
│   ├── index.css           # CSS variables + animations
│   └── tailwind.config.ts  # Tailwind configuration
├── components/
│   ├── button.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── card.tsx
│   ├── badge.tsx
│   ├── dialog.tsx
│   ├── toast.tsx
│   ├── toaster.tsx
│   ├── sonner.tsx
│   ├── separator.tsx
│   ├── skeleton.tsx
│   └── tooltip.tsx
└── lib/
    └── utils.ts            # cn() utility
```

## Usage Examples

### Typography

```tsx
<h1 className="font-termina text-4xl font-bold">Headline</h1>
<p className="font-aeonik text-base">Body text</p>
```

### Buttons

```tsx
<Button>Default</Button>
<Button variant="outline" size="pill">Pill CTA</Button>
<Button className="btn-premium">Premium Effect</Button>
```

### Animations

```tsx
<div className="animate-stagger-1">First item</div>
<div className="animate-stagger-2">Second item</div>
<div className="animate-modal-enter">Modal content</div>
```

### Cards

```tsx
<Card className="glass-card">
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

---

See `DESIGN-SYSTEM.md` for complete documentation.
