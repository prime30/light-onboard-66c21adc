import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/**
 * FadeText — thin wrapper that applies semantic tag + className.
 *
 * With `font-display: block` on all @font-face rules, the browser
 * natively hides text until fonts load — no shimmer overlay needed.
 */
export const FadeText = forwardRef<
  HTMLElement,
  {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "light";
  as?: "span" | "div" | "p" | "h1" | "h2" | "h3";
  }
>(({ children, className, variant: _variant = "default", as: Tag = "span" }, ref) => {
  return <Tag ref={ref as any} className={cn(className)}>{children}</Tag>;
});

FadeText.displayName = "FadeText";
