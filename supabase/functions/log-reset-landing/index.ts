// Records what actually arrives on the password-reset screen.
//
// Until now, a reset link that lost (or had mangled) its `reset_url` param on
// the way through an email client was invisible: nothing was logged unless the
// customer submitted the form. Outlook / Gmail link wrappers can truncate or
// re-encode the URL, which strands the customer before any submit happens.
//
// This function is fire-and-forget from the SPA. It always console-logs the
// landing shape, and when an email hint is present it also records a durable
// failure row so the admin Stranded Accounts view and the weekly health check
// can see it.

const FUNCTION_VERSION = "VISITS-20261028";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "X-Function-Version",
  "X-Function-Version": FUNCTION_VERSION,
};

// The landing href usually carries the reset URL URL-encoded inside a query
// param (`reset_url=https%3A%2F%2F...%2Faccount%2Freset%2F<id>%2F<token>`), or
// double-encoded after an email link wrapper, so the separators can be `/`,
// `%2F` or `%252F`. A bare `token=` param is a credential too.
const SEP = "(\\/|%2F|%252F)";
const ACCOUNT_LINK_RE = new RegExp(`(reset|activate)${SEP}[^/?&#%\\s]+${SEP}[^/?&#%\\s]+`, "gi");
const TOKEN_PARAM_RE = /([?&]token=)[^&#\s]*/gi;

function redactLanding(href: string): string {
  return href
    .replace(ACCOUNT_LINK_RE, "$1$2<id>$3<token>")
    .replace(TOKEN_PARAM_RE, "$1<token>");
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function str(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

async function recordResetFailure(opts: {
  email: string | null;
  reason: string;
  code?: string | null;
  deviceType?: string | null;
  inAppBrowser?: string | null;
  userAgent?: string | null;
  width?: number | null;
}): Promise<void> {
  const email = (opts.email || "").toLowerCase();
  if (!email) return;

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return;

  try {
    const res = await fetch(`${url}/rest/v1/rpc/record_reset_failure`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        _email: email,
        _reason: opts.reason.slice(0, 60),
        _code: (opts.code || "").slice(0, 60) || null,
        _device_type: opts.deviceType?.slice(0, 20) ?? null,
        _in_app_browser: opts.inAppBrowser?.slice(0, 30) ?? null,
        _user_agent: opts.userAgent?.slice(0, 400) ?? null,
        _viewport_width:
          typeof opts.width === "number" && opts.width > 0 && opts.width < 10000
            ? Math.round(opts.width)
            : null,
      }),
    });
    if (!res.ok) {
      console.error("RESET_LANDING_RECORD_FAILED", res.status, (await res.text()).slice(0, 300));
    }
  } catch (err) {
    console.error("RESET_LANDING_RECORD_ERROR", err instanceof Error ? err.message : String(err));
  }
}

// Permanent record of every reset/activation link visit, including links
// Shopify emailed directly (Shopify admin "send reset email" or the store's
// own forgot-password page), which never pass through recover-password.
// Source is inferred: if our app emailed this address in the 24h before the
// visit it was probably our email, otherwise Shopify sent it directly.
async function recordVisit(opts: { flow: string; resolved: boolean; resetUrl: string | null; emailHint: string | null; userAgent: string | null }): Promise<void> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return;
  const h = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  try {
    const m = opts.resetUrl?.match(/\/account\/(reset|activate)\/(\d+)\/([^/?#]+)/i);
    let email = (opts.emailHint || "").toLowerCase() || null;
    if (!email && m) {
      const shop = Deno.env.get("SHOPIFY_SHOP_DOMAIN") ?? Deno.env.get("SHOPIFY_STORE_DOMAIN");
      const token = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN");
      const ver = Deno.env.get("SHOPIFY_ADMIN_API_VERSION") ?? "2024-10";
      if (shop && token) {
        const r = await fetch(`https://${shop}/admin/api/${ver}/customers/${m[2]}.json?fields=email`, { headers: { "X-Shopify-Access-Token": token } });
        if (r.ok) email = ((await r.json())?.customer?.email || "").toLowerCase() || null;
      }
    }
    if (!email) { console.log("RESET_VISIT_NO_EMAIL", JSON.stringify({ flow: opts.flow, hasLink: !!m })); return; }
    // Fingerprint (not the token) so repeat visits of the same link group together.
    let fp = "none";
    if (m) {
      const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(m[3]));
      fp = Array.from(new Uint8Array(d)).slice(0, 5).map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    let source = "sent_by_shopify";
    const sr = await fetch(`${url}/rest/v1/reset_email_sends?select=last_sent_at,prev_sent_at&email=eq.${encodeURIComponent(email)}`, { headers: h });
    if (sr.ok) {
      const row = (await sr.json())[0];
      const now = Date.now();
      const recent = (t?: string | null) => !!t && now - Date.parse(t) >= 0 && now - Date.parse(t) <= 24 * 3600 * 1000;
      if (row && (recent(row.last_sent_at) || recent(row.prev_sent_at))) source = "sent_by_app";
    }
    const ins = await fetch(`${url}/rest/v1/sign_in_events`, {
      method: "POST", headers: { ...h, Prefer: "return=minimal" },
      body: JSON.stringify({ email, source: "reset_link_visit", outcome: opts.flow === "activation" ? "activation_link_opened" : "reset_link_opened", code: opts.resolved ? source : `${source}:broken_link`, evidence: `link:${fp}`, user_agent: opts.userAgent?.slice(0, 400) ?? null }),
    });
    if (!ins.ok) console.error("RESET_VISIT_RECORD_FAILED", ins.status, (await ins.text()).slice(0, 200));
  } catch (err) {
    console.error("RESET_VISIT_RECORD_ERROR", err instanceof Error ? err.message : String(err));
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const flow = str(body.flow, 20) || "reset";
  const resolved = body.resolved === true;
  const href = str(body.href, 600);
  const resetUrl = str(body.resetUrl, 400);
  const emailHint = str(body.emailHint, 254);
  const device = (body.device ?? {}) as Record<string, unknown>;
  const deviceType = str(device.type, 20);
  const inAppBrowser = str(device.inAppBrowser, 30);
  const userAgent = str(device.userAgent, 400) || req.headers.get("user-agent");
  const width = typeof device.width === "number" ? device.width : null;

  // The token is a credential: log its length and shape, never the value.
  let tokenShape: string | null = null;
  if (resetUrl) {
    const match = resetUrl.match(/\/account\/(reset|activate)\/([^/]+)\/([^/?#]+)/i);
    tokenShape = match
      ? `${match[1]}:id=${match[2].length}chars:token=${match[3].length}chars`
      : "unparseable";
  }

  console.log(
    resolved ? "RESET_LANDING_OK" : "RESET_LANDING_MISSING_PARAMS",
    JSON.stringify({
      flow,
      resolved,
      hasResetUrl: !!resetUrl,
      tokenShape,
      // href minus any token value, so the wrapper mangling is visible.
      landing: href ? redactLanding(href) : null,
      hasEmailHint: !!emailHint,
      deviceType,
      inAppBrowser,
      userAgent: userAgent?.slice(0, 200) ?? null,
      width,
    })
  );

  await recordVisit({ flow, resolved, resetUrl, emailHint, userAgent });

  if (!resolved) {
    await recordResetFailure({
      email: emailHint,
      reason: flow === "activation" ? "landing_missing_activation_link" : "landing_missing_reset_link",
      code: tokenShape,
      deviceType,
      inAppBrowser,
      userAgent,
      width,
    });
  }

  return json(200, { ok: true });
});
