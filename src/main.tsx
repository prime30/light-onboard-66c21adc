import { createRoot } from "react-dom/client";
import { router } from "./App.tsx";
import "./index.css";
import { RouterProvider } from "react-router";

/**
 * Gate React mount on fonts ready to eliminate FOUC (font swap flash).
 *
 * The CSS-only boot skeleton in index.html stays visible until React mounts.
 * By waiting for document.fonts.ready, the very first React paint already
 * uses Die Grotesk B + Termina — no system-font → real-font swap.
 *
 * Safety cap at 1200ms so a slow/failed font load never blocks boot forever.
 * Matches useFontLoaded's MAX_WAIT_MS philosophy.
 */
const MAX_FONT_WAIT_MS = 1200;

function mount() {
  createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />);
}

function waitForFontsThenMount() {
  if (typeof document === "undefined" || !document.fonts) {
    mount();
    return;
  }

  let mounted = false;
  const safeMount = () => {
    if (mounted) return;
    mounted = true;
    mount();
  };

  const timer = window.setTimeout(safeMount, MAX_FONT_WAIT_MS);

  document.fonts.ready
    .then(() => {
      window.clearTimeout(timer);
      safeMount();
    })
    .catch(() => {
      window.clearTimeout(timer);
      safeMount();
    });
}

waitForFontsThenMount();
