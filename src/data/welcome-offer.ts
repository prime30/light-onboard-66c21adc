// Display copy for the $25 pro welcome code. The real terms are enforced by
// Shopify and set in supabase/functions/generate-discount/index.ts
// (DISCOUNT_AMOUNT, DISCOUNT_MIN_SUBTOTAL, CODE_PREFIX, OFFER_KIND); keep
// these in sync with it.
export const WELCOME_OFFER_AMOUNT = 25;
export const WELCOME_OFFER_MIN_SUBTOTAL = 100;
export const WELCOME_OFFER_KIND = "pro25";

export const WELCOME_OFFER_CODE_PREFIX = "PRO25-";

// The theme shows $25 copy only for kind "pro25"; older 30% ring codes get null.
export function welcomeOfferKind(code: string): string | null {
  return code.startsWith(WELCOME_OFFER_CODE_PREFIX) ? WELCOME_OFFER_KIND : null;
}

export type WelcomeOfferStatus = "loading" | "ready" | "failed";

export function formatWelcomeOfferExpiry(endsAt: string | null | undefined): string | null {
  if (!endsAt) return null;
  const date = new Date(endsAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
