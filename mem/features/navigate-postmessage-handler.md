---
name: NAVIGATE postMessage handler
description: Parent theme can route inside the SPA without iframe reload via NAVIGATE/NAVIGATE_COMPLETE postMessages
type: feature
---
The SPA exposes a NAVIGATE postMessage handler so the parent Shopify theme can
switch routes (e.g. /login → /auth) without reloading the iframe document —
eliminating the boot-shell flash on cross-path opens.

**Contract**
- Parent posts: `{ type: "NAVIGATE", data: { path: "/auth" } }`
- SPA calls react-router `navigate(path)` (basename-aware)
- After the new location commits, SPA posts `{ type: "NAVIGATE_COMPLETE", data: { path } }`
- If already on the requested path, SPA posts `NAVIGATE_COMPLETE` with `{ alreadyThere: true }` immediately

**Implementation**
- Message types added in `src/hooks/use-iframe-comm.ts` (`NAVIGATE` parent→child, `NAVIGATE_COMPLETE` child→parent)
- Bridge component `src/components/IframeNavigationBridge.tsx` uses `useNavigate` + `useLocation` + `useGlobalApp().subscribeToType`
- Mounted in `src/App.tsx` inside the router context, after `GlobalAppProvider`
- Only active when `isInIframe`; ignores non-string / non-absolute paths
- Origin is enforced upstream by `useIframeComm`'s `allowedOrigins` allowlist

**Why not iframe.src=**
Changing `iframe.src` always triggers a document reload + boot shell. Internal
`navigate()` keeps React mounted, so cross-path transitions are seamless.
