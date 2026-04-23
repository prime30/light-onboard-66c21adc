/**
 * SSO Context Handshake
 *
 * Handles cross-origin context from the dropdeadextensions.com Shopify theme,
 * allowing partner-aware branding (e.g., "The Syndicate") on the login shell
 * when users arrive from third-party surfaces like Circle SSO.
 *
 * Contract docs: see commit message / handoff for the theme-side spec.
 *
 * Security:
 * - Origin pinned to https://dropdeadextensions.com for postMessage receipt
 * - Source slug must match /^[a-z0-9-]{1,32}$/ before any DOM/URL use
 * - displayName/tagline are textContent-only (never innerHTML)
 * - returnUrl is validated against an allowlist before any navigation
 */

export const SSO_PARENT_ORIGIN = "https://dropdeadextensions.com";
export const SSO_SLUG_REGEX = /^[a-z0-9-]{1,32}$/;

const RETURN_URL_ORIGIN_ALLOWLIST = [
  "https://dropdeadextensions.com",
  "https://syndicate.dropdeadextensions.com",
  "https://apply.dropdeadextensions.com",
];

export interface SsoContext {
  source: string;
  returnUrl: string;
  displayName: string;
}

export interface PartnerPresentation {
  label: string;
  tagline: string;
  /** Optional partner logo URL (served from /public). */
  logo: string | null;
  /** Optional accent color (used as CSS custom property --sso-accent). */
  accent: string | null;
}

/**
 * Built-in partner presentation map. Unknown slugs fall back to the generic
 * shell, optionally enriched with the parent-supplied displayName.
 */
export const PARTNER_PRESENTATION: Record<string, PartnerPresentation> = {
  syndicate: {
    label: "The Syndicate",
    tagline: "Log in to continue to The Syndicate",
    logo: null,
    accent: null,
  },
  circle: {
    label: "The Syndicate",
    tagline: "Log in to continue to The Syndicate",
    logo: null,
    accent: null,
  },
  checkout: {
    label: "Checkout",
    tagline: "Log in to complete your checkout",
    logo: null,
    accent: null,
  },
  "pdp-review": {
    label: "Your review",
    tagline: "Log in to publish your review",
    logo: null,
    accent: null,
  },
};

/**
 * Resolve effective copy for a context. Built-in presentation wins; falls back
 * to parent-supplied displayName for forward-compatibility with new slugs.
 */
export function resolveSsoPresentation(ctx: SsoContext | null): {
  label: string;
  tagline: string;
  logo: string | null;
  accent: string | null;
} | null {
  if (!ctx || !ctx.source) return null;
  const cfg = PARTNER_PRESENTATION[ctx.source];
  const label = cfg?.label || ctx.displayName || "";
  const tagline = cfg?.tagline || (label ? `Log in to continue to ${label}` : "");
  if (!tagline) return null;
  return {
    label,
    tagline,
    logo: cfg?.logo ?? null,
    accent: cfg?.accent ?? null,
  };
}

/**
 * Read SSO context from URL query params. Primary channel — arrives with the
 * HTTP request so first paint can already be branded (no FOUC).
 */
export function readSsoContextFromUrl(): SsoContext | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const source = (params.get("sso") || "").toLowerCase();
  if (!SSO_SLUG_REGEX.test(source)) return null;
  return {
    source,
    returnUrl: params.get("return_url") || "",
    displayName: params.get("display_name") || "",
  };
}

/**
 * Validate that an SSO_CONTEXT payload is well-formed and safe to apply.
 * Returns a normalized context or null.
 */
export function parseSsoContextPayload(payload: unknown): SsoContext | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;
  const sourceRaw = typeof data.source === "string" ? data.source.toLowerCase() : "";
  if (!SSO_SLUG_REGEX.test(sourceRaw)) return null;
  return {
    source: sourceRaw,
    returnUrl: typeof data.returnUrl === "string" ? data.returnUrl : "",
    displayName: typeof data.displayName === "string" ? data.displayName : "",
  };
}

/**
 * Apply (or clear) document-level side effects: data attribute on <html> for
 * CSS theming, optional accent custom property, and a window-scoped return URL
 * stash for the parent-managed redirect after USER_LOGIN.
 */
export function applySsoDocumentEffects(ctx: SsoContext | null): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (!ctx) {
    root.removeAttribute("data-sso-source");
    root.style.removeProperty("--sso-accent");
    return;
  }
  root.setAttribute("data-sso-source", ctx.source);
  const presentation = resolveSsoPresentation(ctx);
  if (presentation?.accent) {
    root.style.setProperty("--sso-accent", presentation.accent);
  } else {
    root.style.removeProperty("--sso-accent");
  }
  if (ctx.returnUrl && typeof window !== "undefined") {
    (window as unknown as { __ddSsoReturnUrl?: string }).__ddSsoReturnUrl = ctx.returnUrl;
  }
}

/**
 * Validate a returnUrl against the open-redirect allowlist. Use this before
 * ever navigating window.location to a parent-supplied URL.
 */
export function isSafeReturnUrl(url: string): boolean {
  if (!url) return false;
  // Same-origin path: must start with a single "/", reject "//" and protocol-relative.
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    return RETURN_URL_ORIGIN_ALLOWLIST.includes(parsed.origin);
  } catch {
    return false;
  }
}
