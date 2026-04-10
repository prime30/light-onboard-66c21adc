import { useEffect } from "react";

/**
 * Keeps --app-height in sync with the true visible viewport height.
 *
 * Why window.visualViewport instead of window.innerHeight / resize:
 *  - On iOS Safari (and Chrome Android), opening the soft keyboard fires
 *    visualViewport "resize", NOT window "resize".
 *  - window.innerHeight stays fixed at the iframe / document height even
 *    while the keyboard is covering the lower portion of the screen.
 *  - visualViewport.height shrinks to exactly the visible area above the
 *    keyboard, which is what we need to size the layout correctly.
 *
 * After the layout re-measures (via --app-height), we also explicitly scroll
 * the currently-focused input into view so it is never hidden behind the
 * keyboard bar or the sticky footer.
 */
export function useSafariViewportFix() {
  useEffect(() => {
    const updateHeight = () => {
      const height = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--app-height", `${height}px`);
    };

    const scrollFocusedIntoView = () => {
      const el = document.activeElement;
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement
      ) {
        // Defer until after the layout reflow caused by --app-height change
        setTimeout(() => {
          el.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }, 60);
      }
    };

    const handleViewportResize = () => {
      updateHeight();
      scrollFocusedIntoView();
    };

    updateHeight();

    const vp = window.visualViewport;
    if (vp) {
      vp.addEventListener("resize", handleViewportResize);
      // scroll fires when the viewport pans (iOS pans the visual viewport
      // over fixed/sticky elements) — keep height in sync
      vp.addEventListener("scroll", updateHeight);
    }

    // Fallback for browsers without visualViewport support
    window.addEventListener("resize", updateHeight);
    window.addEventListener("orientationchange", updateHeight);

    return () => {
      if (vp) {
        vp.removeEventListener("resize", handleViewportResize);
        vp.removeEventListener("scroll", updateHeight);
      }
      window.removeEventListener("resize", updateHeight);
      window.removeEventListener("orientationchange", updateHeight);
    };
  }, []);
}
