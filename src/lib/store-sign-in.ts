export function currentStorePath(): string {
  const safe = (p: string) => (/^\/(?![\/\\])/.test(p) && !/[\\\s]/.test(p) ? p : "/");
  try {
    const loc = window.top?.location;
    if (loc && (loc.host === "dropdeadextensions.com" || loc.host.endsWith(".dropdeadextensions.com"))) {
      const p = loc.pathname + loc.search;
      if (!p.startsWith("/apps/apply")) return safe(p);
    }
  } catch { /* cross-origin */ }
  try {
    const ref = new URL(document.referrer);
    if (ref.hostname === "dropdeadextensions.com" || ref.hostname.endsWith(".dropdeadextensions.com")) return safe(ref.pathname + ref.search);
  } catch { /* no referrer */ }
  return "/";
}

// Real (top-level) sign-in on the store's own login page. Used when the
// background sign-in fails but the password is verified correct: a full page
// submit lets the customer pass any bot check the store shows.
const STORE_LOGIN_URL = "https://dropdeadextensions.com/account/login";
export function submitStoreLogin(email: string, password: string) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = STORE_LOGIN_URL;
  form.target = "_top";
  form.acceptCharset = "UTF-8";
  const fields: Record<string, string> = {
    form_type: "customer_login",
    utf8: "\u2713",
    "customer[email]": email,
    "customer[password]": password,
    // Shopify's customer_login form reads return_to; anything else lands on /account.
    return_to: currentStorePath(),
  };
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

// Open a backend-minted Multipass URL in the top window. Only the store's own
// Multipass login path is accepted, so a bad response can never redirect off-site.
export function openMultipassUrl(url: string): boolean {
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return false;
  }
  const host = target.hostname;
  const storeHost = host === "dropdeadextensions.com" || host.endsWith(".dropdeadextensions.com") || host.endsWith(".myshopify.com");
  if (target.protocol !== "https:" || !storeHost || !target.pathname.startsWith("/account/login/multipass/")) return false;
  try {
    if (window.top) window.top.location.href = url;
    else window.location.href = url;
  } catch {
    window.location.href = url;
  }
  return true;
}

export type MultipassSignInResult = "navigating" | "limited" | "invalid" | "unactivated" | "unavailable";

// Multipass sign-in: the backend verifies the password (the only password
// check per sign-in), then mints a signed store URL that logs the customer in
// directly. No storefront form, so no bot/human check can block it.
// "unavailable" means Multipass could not answer (not configured, upstream
// error), so the password is still unchecked and callers can fall back.
export async function multipassSignIn(email: string, password: string, metadata: Record<string, unknown> = {}): Promise<MultipassSignInResult> {
  try {
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/multipass-login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ email, password, return_to: currentStorePath(), ...metadata }),
    });
    const json = (await res.json().catch(() => null)) as
      | { success?: boolean; kind?: string; data?: { multipassUrl?: string } }
      | null;
    const url = json?.data?.multipassUrl;
    if (res.status === 429 || json?.kind === "rate_limited") return "limited";
    if (json?.kind === "invalid_credentials") return "invalid";
    if (json?.kind === "unactivated") return "unactivated";
    if (!json?.success || !url) return "unavailable";
    return openMultipassUrl(url) ? "navigating" : "unavailable";
  } catch {
    return "unavailable";
  }
}

// Finish a verified-correct sign-in: prefer Multipass (no human check),
// fall back to the store's own login form. A rejection here comes right after
// the password was set or verified, so the store form gets the final say.
export async function finishSigningIn(email: string, password: string, metadata: Record<string, unknown> = {}): Promise<boolean> {
  const ok = await multipassSignIn(email, password, metadata);
  if (ok === "limited") return false;
  if (ok !== "navigating") submitStoreLogin(email, password);
  return true;
}

