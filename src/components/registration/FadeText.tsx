import React from "react";
import { cn } from "@/lib/utils";

/**
 * FadeText — thin wrapper that applies semantic tag + className.
 *
 * With `font-display: block` on all @font-face rules, the browser
 * natively hides text until fonts load — no shimmer overlay needed.
 */
type FadeTextProps = {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "light";
  as?: "span" | "div" | "p" | "h1" | "h2" | "h3";
};

export const FadeText = ({ children, className, variant = "default", as: Tag = "span" }: FadeTextProps) => {
  const variantClasses = variant === "light" ? "text-inherit" : "";
  return <Tag className={cn(variantClasses, className)}>{children}</Tag>;
};
