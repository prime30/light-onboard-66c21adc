import { cn } from "@/lib/utils";

/**
 * FadeText — thin wrapper that applies semantic tag + className.
 *
 * With `font-display: block` on all @font-face rules, the browser
 * natively hides text until fonts load — no shimmer overlay needed.
 */
export function FadeText({
  children,
  className,
  variant: _variant = "default",
  as: Tag = "span",
}: {
  children: React.ReactNode;
  className?: string;
  /** kept for API compat — no longer affects rendering */
  variant?: "default" | "light";
  /** HTML tag wrapper — defaults to span for inline use */
  as?: "span" | "div" | "p" | "h1" | "h2" | "h3";
}) {
  return <Tag className={cn(className)}>{children}</Tag>;
}
