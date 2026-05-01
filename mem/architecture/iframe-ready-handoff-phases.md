---
name: IFRAME_READY handoff phases
description: Two-stage IFRAME_READY signal — early HTML ping for boot skeleton, double-rAF React-painted ping for hydrated handoff
type: feature
---
The iframe sends IFRAME_READY in TWO distinct stages so the parent theme
overlay can hand off without a blank flash:

**Stage 1 — Boot skeleton handoff (in `index.html`)**
Inline `<script>` in `<head>` fires immediately:
- `phase: "head-initial"` — sent before body parses
- `phase: "skeleton-heartbeat"` — every 250ms, up to 20 attempts (5s)
- `phase: "window-load"` — once on window load
By the time these fire, the inline boot skeleton in `<div id="root">` is
about to paint or has painted. Parent theme can hide its overlay here.

**Stage 2 — React-painted handoff (in `src/hooks/use-iframe-comm.ts`)**
React-mounted hook fires inside double-`requestAnimationFrame`:
- `phase: "react-painted"` — sent AFTER the browser commits the first paint
  of the React tree (first rAF queues, second rAF runs after paint)
This is the safest signal: the React skeleton or hydrated form is
guaranteed to be on-screen before this fires. Parent overlays that prefer
to wait for the React layer (vs. trusting the static boot skeleton) should
use this phase.

**Skeleton coordination (no blank flash):**
- `index.html` boot skeleton (lines ~137–195) and
  `src/components/registration/AuthBootFallback.tsx` are intentionally
  shape-matched — same right-panel block sequence (118/66%/88%/56/56/grid/120),
  same shimmer animation. The React mount swaps a populated DOM for an
  identical-shaped one — no empty intermediate state.
- `FormSkeleton.tsx` is a per-step skeleton inside the lazy step boundary,
  not part of the boot handoff.

**Never** revert IFRAME_READY to a fixed `setTimeout` — it races first paint.
