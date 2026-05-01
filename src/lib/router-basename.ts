/**
 * Runtime basename detection for the SPA router.
 *
 * The app can be served from three contexts:
 *   1. apply.dropdeadextensions.com / Lovable preview  → mounted at "/"
 *   2. dropdeadextensions.com/apps/apply               → mounted under
 *      "/apps/apply" (Shopify App Proxy)
 *   3. Any future proxy path                           → auto-detected
 *
 * Rather than building twice (and instead of a hardcoded base), we strip
 * known SPA route segments from the current pathname and treat whatever is
 * left as the basename. This lets a single build serve at root or under any
 * subpath without configuration.
 */

// Top-level route paths declared in src/App.tsx — kept in sync manually.
// If you add a new top-level route, add its first segment here.
const KNOWN_ROUTE_SEGMENTS = new Set<string>([
  "auth",
  "login",
  "already-logged-in",
  "reset-password",
  "activate-account",
  "not-eligible",
  "reviews",
  "blog",
  "sso-preview",
  "admin",
]);

/**
 * Returns the router basename for the current page load. Examples:
 *   "/"                                  → ""
 *   "/auth"                              → ""
 *   "/apps/apply"                        → "/apps/apply"
 *   "/apps/apply/auth"                   → "/apps/apply"
 *   "/apps/apply/admin/settings"         → "/apps/apply"
 */
export function getRouterBasename(): string {
  if (typeof window === "undefined") return "";
  const segments = window.location.pathname.split("/").filter(Boolean);
  const firstKnownIdx = segments.findIndex((seg) => KNOWN_ROUTE_SEGMENTS.has(seg));

  // No known route segment → either root ("/") or a deep proxy mount with no
  // route appended yet. Treat the entire path as basename in that case.
  const prefixSegments =
    firstKnownIdx === -1 ? segments : segments.slice(0, firstKnownIdx);

  if (prefixSegments.length === 0) return "";
  return "/" + prefixSegments.join("/");
}

/**
 * Prefixes an in-app absolute path with the current basename. Use this for
 * full-page navigations via `window.location.href` (React Router's navigate
 * already respects the basename). Pass-through for paths that already
 * include the basename or for external URLs.
 */
export function withBasename(path: string): string {
  if (!path.startsWith("/")) return path;
  const base = getRouterBasename();
  if (!base) return path;
  if (path === base || path.startsWith(base + "/")) return path;
  return base + path;
}
