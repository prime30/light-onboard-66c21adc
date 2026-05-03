---
name: Parent theme bundle prefetch
description: Vite emits /prefetch.js — parent Shopify theme loads it on every page to warm HTTP cache for SPA bundle before iframe opens
type: integration
---
A Vite plugin (`parent-prefetch-manifest` in `vite.config.ts`) emits
`dist/prefetch.js` at build time. The script contains the **hashed**
URLs of the entry chunk + its static imports (e.g. `react-vendor`).

**Parent theme integration** — add ONCE to `theme.liquid`, ideally near
the bottom of `<body>`:

```liquid
<script src="https://apply.dropdeadextensions.com/prefetch.js" defer crossorigin="anonymous"></script>
```

What it does on the storefront:
1. Idempotently guards on `window.__APPLY_PREFETCHED__`.
2. Schedules `requestIdleCallback` (or 1.5s setTimeout fallback).
3. Injects `<link rel="prefetch" as="script" crossorigin>` for each
   bundle URL into the parent document head.
4. Browser fetches the bundle into the HTTP cache during idle time.

When the user opens the apply iframe, the JS bundle is served from disk
cache — saves ~500ms+ on first open per session.

**Versioning**: Hash-busted automatically. After a deploy, the parent
theme keeps requesting the OLD `prefetch.js` (which Netlify/Vercel still
serves from cache for ~minutes), and the URLs inside reference the OLD
hashed chunks. When the parent eventually re-fetches `prefetch.js`, it
gets the new URLs. Worst case: prefetch is a no-op for one session after
deploy. No errors, just a missed optimization.

**Cache headers**: `prefetch.js` itself should be served with a SHORT
`Cache-Control: max-age=300` (5 min) so themes pick up new bundle URLs
quickly. The hashed JS chunks it references should be `immutable`
long-cached as Vite already does.
