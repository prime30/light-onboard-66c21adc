// Lightweight Instagram handle verifier.
//
// We can't call the Instagram Graph API without an app token, and Meta blocks
// programmatic follow / lookup APIs anyway. What we CAN do is fetch the
// public profile URL and detect whether Instagram serves a real profile
// page or a "Page Not Found" response. This is enough to keep users from
// submitting typos and to render a confirmed profile link back to them.
//
// Behavior:
//   POST { handle: string } -> { ok, exists, normalized, url, reason? }
//   - Strips leading @ and whitespace, lowercases for normalization.
//   - Enforces IG handle format: [A-Za-z0-9._]{1,30}.
//   - Fetches https://www.instagram.com/{handle}/ with a browser UA.
//   - Treats 404 / login-wall "not found" markers as missing.
//   - Treats 2xx with profile markers as exists.
//   - Treats network/edge failures as "unknown" (exists=null) so we don't
//     hard-fail signup when Instagram rate-limits us.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const HANDLE_RE = /^[A-Za-z0-9._]{1,30}$/;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  let body: { handle?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const raw = String(body.handle ?? "").trim().replace(/^@+/, "");
  if (!raw) return json({ ok: false, error: "handle_required" }, 400);
  if (!HANDLE_RE.test(raw)) {
    return json({ ok: false, error: "invalid_format", reason: "format" });
  }

  const normalized = raw.toLowerCase();
  const url = `https://www.instagram.com/${normalized}/`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": UA,
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    clearTimeout(timeout);

    if (res.status === 404) {
      return json({ ok: true, exists: false, normalized, url, reason: "not_found" });
    }

    // Instagram sometimes returns 200 with a login wall. Read a chunk of
    // HTML and look for markers.
    const text = (await res.text()).toLowerCase();
    const notFoundMarkers = [
      "sorry, this page isn't available",
      "the link you followed may be broken",
      '"user":null',
      "page not found",
    ];
    const profileMarkers = [
      `"username":"${normalized}"`,
      `instagram.com/${normalized}`,
      "profilepage_",
      "og:title",
    ];

    const looksMissing = notFoundMarkers.some((m) => text.includes(m));
    if (looksMissing) {
      return json({ ok: true, exists: false, normalized, url, reason: "not_found" });
    }
    const looksExists =
      res.ok && profileMarkers.some((m) => text.includes(m));
    if (looksExists) {
      return json({ ok: true, exists: true, normalized, url });
    }

    // Ambiguous (e.g. login wall with no markers) - don't block the user.
    return json({ ok: true, exists: null, normalized, url, reason: "ambiguous" });
  } catch (err) {
    // Network / abort - fail open so signup isn't blocked by IG rate limits.
    return json({
      ok: true,
      exists: null,
      normalized,
      url,
      reason: "fetch_failed",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});
