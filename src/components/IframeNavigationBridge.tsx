import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router";
import { useGlobalApp } from "@/contexts/GlobalAppProvider";

// Map first path segment → dynamic import of its lazy chunk. Triggering the
// import warms the module cache so React.lazy's Suspense fence resolves
// synchronously when navigate() commits — no skeleton flash.
const ROUTE_PREFETCHERS: Record<string, () => Promise<unknown>> = {
  login: () => import("@/pages/LoginPage"),
  "reset-password": () => import("@/pages/ResetPasswordPage"),
  "activate-account": () => import("@/pages/ActivateAccountPage"),
  "already-logged-in": () => import("@/pages/AlreadyLoggedInPage"),
  "not-eligible": () => import("@/pages/NotEligiblePage"),
  reviews: () => import("@/pages/Reviews"),
  "blog/resale-license": () => import("@/pages/BlogResaleLicense"),
};

function prefetchRoute(path: string) {
  const clean = path.split("?")[0].split("#")[0].replace(/^\/+/, "");
  // Try longest match first (e.g. "blog/resale-license") then first segment.
  const candidates = [clean, clean.split("/")[0]];
  for (const key of candidates) {
    const loader = ROUTE_PREFETCHERS[key];
    if (loader) {
      void loader().catch(() => {});
      return;
    }
  }
}

/**
 * Listens for { type: "NAVIGATE", path } postMessages from the parent theme
 * and routes the SPA via React Router (no iframe document reload). After the
 * new route's location commits, fires { type: "NAVIGATE_COMPLETE", path } so
 * the parent can hide its overlay / coordinate animations.
 *
 * Eliminates the boot-shell flash when the parent switches the user between
 * cross-path entries (e.g. /login → /auth) while the iframe is already open.
 *
 * Must render INSIDE the router (so useNavigate works) and AFTER
 * GlobalAppProvider (so useGlobalApp resolves).
 */
export const IframeNavigationBridge = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { subscribeToType, sendMessage, isInIframe } = useGlobalApp();

  // Track the path the parent asked us to navigate to so we can confirm
  // completion exactly once when the location commits to it.
  const pendingPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isInIframe) return;
    const unsubscribe = subscribeToType("NAVIGATE", (message) => {
      const data = message.data as { path?: string } | undefined;
      const path = typeof data?.path === "string" ? data.path : null;
      if (!path || !path.startsWith("/")) {
        console.warn("[IframeNavigationBridge] Ignoring NAVIGATE without valid path", data);
        return;
      }

      // Already on the requested path — confirm immediately, no nav needed.
      const current = location.pathname + location.search + location.hash;
      if (current === path) {
        sendMessage("NAVIGATE_COMPLETE", { path, alreadyThere: true });
        return;
      }

      // Kick off the chunk fetch in parallel with navigate(). If it lands
      // before Suspense fences, the route mounts synchronously — no skeleton.
      prefetchRoute(path);
      pendingPathRef.current = path;
      navigate(path);
    });
    return unsubscribe;
  }, [isInIframe, subscribeToType, sendMessage, navigate, location]);

  // Fire NAVIGATE_COMPLETE once the location actually matches the pending path.
  useEffect(() => {
    const pending = pendingPathRef.current;
    if (!pending) return;
    const current = location.pathname + location.search + location.hash;
    if (current === pending) {
      pendingPathRef.current = null;
      sendMessage("NAVIGATE_COMPLETE", { path: pending });
    }
  }, [location, sendMessage]);

  return null;
};
