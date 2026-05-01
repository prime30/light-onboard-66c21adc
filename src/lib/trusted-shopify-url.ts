/**
 * Validates that a Shopify-issued URL (reset_password_url / account_activation_url)
 * actually points to our trusted storefront/Shopify origins. Anything that
 * doesn't parse, uses a non-https scheme, or resolves to an unknown host is
 * rejected to prevent open-redirect / phishing chains.
 */
const TRUSTED_HOST_SUFFIXES = [
  "dropdeadextensions.com",
  "myshopify.com",
  "shopifypreview.com",
  "shop.app",
];

export function isTrustedShopifyUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase();
  return TRUSTED_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`)
  );
}
