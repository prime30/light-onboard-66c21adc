import { cn } from "@/lib/utils";
import { useGlobalApp } from "@/contexts";

/**
 * FadeText — zero-layout-shift skeleton → content transition.
 *
 * The real children are **always** rendered (so they define the exact
 * box-model dimensions), but start invisible. A shimmer skeleton is
 * overlaid on top. When `fontsLoaded` flips to `true` the skeleton
 * fades out and the content fades in — no DOM swap, no reflow.
 */
export function FadeText({
  children,
  className,
  variant = "default",
  as: Tag = "span",
}: {
  children: React.ReactNode;
  className?: string;
  /** "light" for dark backgrounds, "default" for light backgrounds */
  variant?: "default" | "light";
  /** HTML tag wrapper — defaults to span for inline use */
  as?: "span" | "div" | "p" | "h1" | "h2" | "h3";
}) {
  const { fontsLoaded } = useGlobalApp();

  const shimmerBg =
    variant === "light"
      ? "linear-gradient(90deg, hsl(var(--background) / 0.12) 25%, hsl(var(--background) / 0.24) 50%, hsl(var(--background) / 0.12) 75%)"
      : "linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--muted-foreground) / 0.08) 50%, hsl(var(--muted)) 75%)";

  return (
    <Tag className={cn("relative inline-block", className)}>
      {/* Real content — always in DOM for exact sizing */}
      <span
        className={cn(
          "transition-opacity duration-300 ease-out",
          fontsLoaded ? "opacity-100" : "opacity-0"
        )}
      >
        {children}
      </span>

      {/* Skeleton overlay — same bounding box, fades out */}
      {!fontsLoaded && (
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded animate-shimmer transition-opacity duration-300 ease-out"
          style={{
            background: shimmerBg,
            backgroundSize: "200% 100%",
          }}
        />
      )}
    </Tag>
  );
}
