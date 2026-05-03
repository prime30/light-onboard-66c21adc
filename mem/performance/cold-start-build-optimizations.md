---
name: Cold start build optimizations
description: Vite manualChunks (react/motion vendor), fetchpriority=high on entry, Supabase preconnect, no JS-side font wait
type: feature
---
Cold-start optimizations layered into the build (`vite.config.ts`) and
`index.html`. Do not remove without measuring impact:

- **`manualChunks`**: `react-vendor` (react, react-dom, react-router) and
  `motion-vendor` (framer-motion) are split out so deploys that only
  touch app code don't bust those long-lived caches.
- **`fetchpriority="high"` on entry script**: a small `boot-fetchpriority`
  Vite plugin rewrites the injected `<script type="module">` to add
  `fetchpriority="high"`. Helps the iframe prioritize the JS over images.
- **`<link rel="preconnect">` to Supabase project URL** in `index.html`
  warms TLS so the first edge function call is one RTT faster.
- **Immediate React mount** in `src/main.tsx` (see
  font-loading-fouc-prevention.md).

Vite already auto-injects `<link rel="modulepreload">` for the entry's
static imports during HTML transformation, so we don't manually emit
those.
