/**
 * Posts an APPLICATION_SUBMITTED breadcrumb to the parent Shopify theme
 * after a successful pro-account registration.
 *
 * The parent theme (dd-registration-overlay.js) listens for this message
 * and writes a first-party `dd_applied=1` cookie (48h TTL) on the theme
 * origin, which Liquid uses to gate the "Discount unlocked" banner on the
 * Color Ring PDP.
 *
 * Why postMessage (and not a cookie set here):
 *   apply.dropdeadextensions.com is a different eTLD+1 from the theme
 *   origin, so any cookie written here is invisible to Liquid. Only the
 *   parent origin can write a cookie readable by the theme.
 */

const FALLBACK_ORIGINS = [
  "https://drop-dead-2428.myshopify.com",
  "https://dropdeadextensions.com",
];

function getParentOrigins(): string[] {
  const envValue = (import.meta.env as unknown as Record<string, string | undefined>)["VITE_SHOPIFY_PARENT_ORIGINS"];
  if (envValue) {
    const parsed = envValue
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parsed.length > 0) return parsed;
  }
  return FALLBACK_ORIGINS;
}

let alreadyEmitted = false;

/**
 * Emit the APPLICATION_SUBMITTED breadcrumb exactly once per page lifetime.
 * Safe to call from a React effect — re-renders will not double-fire.
 */
export function emitApplicationSubmitted(): void {
  if (alreadyEmitted) return;
  alreadyEmitted = true;

  // Standalone visit (not iframed) — nothing to do.
  if (typeof window === "undefined" || window.parent === window) {
    return;
  }

  const origins = getParentOrigins();
  for (const origin of origins) {
    try {
      window.parent.postMessage({ type: "APPLICATION_SUBMITTED" }, origin);
    } catch {
      // Origin mismatch or cross-origin restriction — browser drops silently.
      // Intentional: only the matching origin's message is delivered.
    }
  }
}
