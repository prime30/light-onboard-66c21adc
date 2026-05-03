---
name: Font loading FOUC prevention
description: FOUC mitigated at network/CSS layer (preload + font-display:block); React mounts immediately, no JS-side font wait
type: feature
---
React mounts immediately in `src/main.tsx` — do NOT re-add a
`document.fonts.ready` gate. FOUC is handled at the network/CSS layer:

- `index.html` preloads `die-grotesk-b-regular.woff2` and
  `die-grotesk-b-medium.woff2` from the Shopify CDN with
  `fetchpriority="high"` and `crossorigin`, so they download in parallel
  with the JS bundle.
- `@font-face` uses `font-display: block`, which gives the browser a
  brief invisible-text window for real fonts rather than swapping
  mid-render.
- The CSS-only boot skeleton uses system fonts; there is no real text in
  the skeleton that would visibly swap.

Previously we wrapped the React mount in a `document.fonts.ready` promise
with a 400ms safety cap. That added up to 400ms of pure cold-start stall
on slow networks for zero perceptible benefit. Removed.
