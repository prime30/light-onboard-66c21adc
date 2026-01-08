import { useState, useEffect, useRef } from "react";

export function useFontLoaded() {
  // Start false to show skeletons initially
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const MAX_WAIT_MS = 2000;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      setFontsLoaded(true);
    };

    const maxTimer = window.setTimeout(() => {
      finish();
    }, MAX_WAIT_MS);

    // If no Font Loading API, rely on the max timer.
    if (typeof document === "undefined" || !document.fonts) {
      return () => {
        clearTimeout(maxTimer);
      };
    }

    // Wait for fonts; don't rely on document.fonts.check (Safari can be optimistic)
    document.fonts.ready
      .then(() => {
        clearTimeout(maxTimer);
        finish();
      })
      .catch(() => {
        clearTimeout(maxTimer);
        finish();
      });

    return () => {
      clearTimeout(maxTimer);
    };
  }, []);

  return fontsLoaded;
}

// Skeleton text component for loading state
export function TextSkeleton({
  className = "",
  width = "100%",
  height = "1em",
  variant = "default",
}: {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: "default" | "light";
}) {
  const bgStyle =
    variant === "light"
      ? "linear-gradient(90deg, hsl(var(--background) / 0.15) 25%, hsl(var(--background) / 0.3) 50%, hsl(var(--background) / 0.15) 75%)"
      : "linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--muted-foreground) / 0.1) 50%, hsl(var(--muted)) 75%)";

  return (
    <span
      className={`inline-block rounded animate-shimmer ${className}`}
      style={{
        width,
        height,
        background: bgStyle,
        backgroundSize: "200% 100%",
      }}
      aria-hidden="true"
    />
  );
}
