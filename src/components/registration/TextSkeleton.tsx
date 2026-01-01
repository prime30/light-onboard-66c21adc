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
