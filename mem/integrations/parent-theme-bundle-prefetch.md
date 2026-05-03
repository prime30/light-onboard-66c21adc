---
name: Parent theme bundle prefetch
description: Vite emits /prefetch.js (parent warms HTTP cache) AND /_headers with Link: preload (covers direct iframe loads). Self-versioning.
type: integration
---
Two complementary cold-start optimizations, both auto-generated at build
time by the `parent-prefetch-manifest` plugin in `vite.config.ts`.

## 1. /prefetch.js — parent-side warming

Add ONCE to `theme.liquid`, near the bottom of `<body>`:

```liquid
<script src="https://apply.dropdeadextensions.com/prefetch.js" defer crossorigin="anonymous"></script>
```

Behavior on the storefront:
- Idempotently guards on `window.__APPLY_PREFETCHED__`.
- Skips if `window.__customerLoggedIn === true` (theme should set this for
  logged-in customers — they never see the iframe).
- During `requestIdleCallback` (1.5s setTimeout fallback), injects
  `<link rel="prefetch" as="script|style" crossorigin>` for the iframe's
  hashed entry chunk + vendor chunks + entry CSS.

**CRITICAL — URL match for cache hits**: Chrome partitions HTTP cache by
(top-level site, frame site, URL). The iframe is mounted same-site at
`https://dropdeadextensions.com/apps/apply/...` via App Proxy. Vite uses
`base: "./"`, so iframe bundle requests resolve to
`https://dropdeadextensions.com/apps/apply/assets/<hash>.js`. The
prefetch URLs MUST use that exact origin+path — NOT the
`apply.dropdeadextensions.com` origin — or the cache lookup misses
silently. The plugin emits `proxyBase = "https://dropdeadextensions.com/apps/apply"`
for this reason. If the proxy mount path ever changes, update both.

## 2. /_headers — Link: preload on iframe HTML

Auto-generated alongside `prefetch.js` with the SAME hashed URLs.
Netlify reads `_headers` natively. For Vercel, port to `vercel.json`
headers config.

The `/*` entry adds `Link: </assets/index-abc.js>; rel=preload; as=script; crossorigin`
to every HTML response, so the browser starts fetching bundles as soon
as response headers arrive — before HTML body finishes downloading.
Covers direct iframe visits, retries, popups, contexts the parent
doesn't control.

## Versioning

Both files reference hashed filenames baked in at build time:
- `_headers` is always in sync with the served HTML (atomic deploy).
- `prefetch.js` has `Cache-Control: max-age=300` (5 min). After a deploy,
  the parent theme keeps the old `prefetch.js` for up to 5 min and
  prefetches stale URLs (which 404 — harmless, just a missed
  optimization for one session).

## Cache headers

- `/assets/*` → `max-age=31536000, immutable` (Vite hashed filenames)
- `/prefetch.js` → `max-age=300, must-revalidate`
- `/*` (HTML) → `no-cache` + Link: preload directives
- All include `Access-Control-Allow-Origin: *` so the cross-origin
  storefront parent can load them.
