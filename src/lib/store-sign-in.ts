import { isSafeReturnUrl } from "@/lib/sso-context";

// Must match isSameSitePath() in supabase/functions/multipass-login/index.ts:
// the server rejects any return_to that fails its check with 400.
const isStorePath = (p: string) => /^\/(?![/\\])/.test(p) && !/[\\\s]/.test(p);
// The storefront itself. Syndicate and apply are subdomains but not the store.
const isStoreHost = (host: string) => host === "dropdeadextensions.com" || host === "www.dropdeadextensions.com";

// The page underneath the pop-up (same site), so sign-in lands back there and
// keeps the cart. Only same-site paths are returned.
export function currentStorePath(): string {
  const safe = (p: string) => (isStorePath(p) ? p : "/");
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

// Where the theme wants the customer after signing in: the Syndicate IDP
// broker (/apps/idp/...), a gated page, or checkout. The theme passes it as
// the iframe's return_url and in SSO_CONTEXT.returnUrl.
let postLoginReturn = "";
export function setPostLoginReturn(raw: unknown) {
  if (typeof raw === "string" && isSafeReturnUrl(raw)) postLoginReturn = raw;
}

// A store path Multipass can return to, or an absolute off-store URL that
// only the store login form can reach (checkout_url). Falls back to the page
// underneath the pop-up.
export function signInTarget(): string {
  if (postLoginReturn.startsWith("/")) {
    if (isStorePath(postLoginReturn)) return postLoginReturn;
  } else if (postLoginReturn) {
    try {
      const url = new URL(postLoginReturn);
      if (!isStoreHost(url.hostname)) return url.href;
      const path = url.pathname + url.search + url.hash;
      if (isStorePath(path)) return path;
    } catch { /* fall through */ }
  }
  return currentStorePath();
}

// Store path for a Multipass link minted elsewhere (reset-password).
export function multipassReturnPath(): string {
  const target = signInTarget();
  return target.startsWith("/") ? target : currentStorePath();
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
  const target = signInTarget();
  const offStore = !target.startsWith("/");
  const fields: Record<string, string> = {
    form_type: "customer_login",
    utf8: "\u2713",
    "customer[email]": email,
    "customer[password]": password,
    // Shopify's customer_login form reads return_to for paths and checkout_url
    // for absolute URLs; anything else lands on /account.
    return_to: offStore ? "/" : target,
  };
  if (offStore) fields.checkout_url = target;
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
  const href = onStoreDomain(target);
  try {
    if (window.top) window.top.location.href = href;
    else window.location.href = href;
  } catch {
    window.location.href = href;
  }
  return true;
}

// The storefront reroutes navigations to other hosts (the .myshopify.com link
// the backend mints) through its /url interstitial, then 301s back to its own
// domain. The same path on the store's domain skips both hops.
function onStoreDomain(target: URL): string {
  if (!target.hostname.endsWith(".myshopify.com")) return target.href;
  try {
    const top = window.top?.location;
    if (top && isStoreHost(top.hostname)) return `${top.origin}${target.pathname}${target.search}`;
  } catch { /* cross-origin top */ }
  return target.href;
}

export type MultipassAnswer =
  | { kind: "ok"; url: string }
  | { kind: "limited" | "invalid" | "unactivated" | "unavailable" };

export type MultipassSignInResult = "navigating" | "limited" | "invalid" | "unactivated" | "unavailable";

// Multipass sign-in: the backend verifies the password (the only password
// check per sign-in), then mints a signed store URL that logs the customer in
// directly. No storefront form, so no bot/human check can block it.
// "unavailable" means Multipass could not answer (not configured, upstream
// error, or an off-store target a Multipass link cannot return to), so the
// password is still unchecked and callers can fall back.
export async function multipassSignIn(email: string, password: string, metadata: Record<string, unknown> = {}): Promise<MultipassSignInResult> {
  const answer = await requestMultipassUrl(email, password, metadata);
  if (answer.kind !== "ok") return answer.kind;
  return openMultipassUrl(answer.url) ? "navigating" : "unavailable";
}

// The password check and store link without opening it, so a caller can
// update the screen (or finish another check) before the page changes.
export async function requestMultipassUrl(email: string, password: string, metadata: Record<string, unknown> = {}): Promise<MultipassAnswer> {
  const target = signInTarget();
  if (!target.startsWith("/")) return { kind: "unavailable" };
  try {
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/multipass-login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ email, password, return_to: target, ...metadata }),
    });
    const json = (await res.json().catch(() => null)) as
      | { success?: boolean; kind?: string; data?: { multipassUrl?: string } }
      | null;
    const url = json?.data?.multipassUrl;
    if (res.status === 429 || json?.kind === "rate_limited") return { kind: "limited" };
    if (json?.kind === "invalid_credentials") return { kind: "invalid" };
    if (json?.kind === "unactivated") return { kind: "unactivated" };
    if (!json?.success || !url) return { kind: "unavailable" };
    return { kind: "ok", url };
  } catch {
    return { kind: "unavailable" };
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

