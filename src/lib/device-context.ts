// Small, reusable snapshot of the visitor's device / browser context.
// Used by the reset + activation flows so failures can be attributed to a
// device class or a social in-app webview (Instagram, Facebook, TikTok, ...),
// which is where most silent password-reset dead ends come from.

import { detectInAppBrowser } from "./in-app-browser";

export interface DeviceContext {
  type: "mobile" | "tablet" | "desktop" | "unknown";
  width: number | null;
  height: number | null;
  inAppBrowser: string | null;
  userAgent: string | null;
}

export function getDeviceContext(): DeviceContext {
  if (typeof window === "undefined") {
    return { type: "unknown", width: null, height: null, inAppBrowser: null, userAgent: null };
  }

  const width = window.innerWidth || null;
  const height = window.innerHeight || null;
  const type: DeviceContext["type"] = !width
    ? "unknown"
    : width < 640
      ? "mobile"
      : width < 1024
        ? "tablet"
        : "desktop";

  return {
    type,
    width,
    height,
    inAppBrowser: detectInAppBrowser(),
    userAgent: navigator.userAgent?.slice(0, 400) ?? null,
  };
}
