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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
      landing: href ? href.replace(/(reset|activate)\/[^/]+\/[^/?&#]+/gi, "$1/<id>/<token>") : null,
      hasEmailHint: !!emailHint,
      deviceType,
      inAppBrowser,
      userAgent: userAgent?.slice(0, 200) ?? null,
      width,
    })
  );

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
