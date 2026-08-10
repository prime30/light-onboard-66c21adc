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
  // Instagram's public web profile info endpoint. Returns clean 200 JSON
  // with `data.user` for real accounts and 404 for missing ones. Requires
  // the public web app id header. Falls back to HTML parsing of the
  // profile URL if the JSON endpoint refuses us.
  const apiUrl = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(
    normalized,
  )}`;

  const commonHeaders: Record<string, string> = {
    "User-Agent": UA,
    "Accept-Language": "en-US,en;q=0.9",
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const apiRes = await fetch(apiUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        ...commonHeaders,
        Accept: "application/json,text/plain,*/*",
        "X-IG-App-ID": "936619743392459",
        Referer: url,
      },
    });
    clearTimeout(timeout);

    // Instagram is consistent about one thing: a username that does not exist
    // returns 404 from this endpoint. Everything else (200 with full user
    // payload, 200 with a bare {"status":"ok"} for accounts it won't serialize
    // for logged-out clients, or a 400 "Asset asset://... has been deleted"
    // serializer bug) means the username DID resolve to a real account.
    if (apiRes.status === 404) {
      return json({ ok: true, exists: false, normalized, url, reason: "not_found" });
    }

    const apiText = await apiRes.text();
    let parsed: { data?: { user?: { username?: string } | null }; status?: string } | null = null;
    try {
      parsed = JSON.parse(apiText);
    } catch {
      parsed = null;
    }

    if (apiRes.status === 200) {
      if (parsed?.data?.user && parsed.data.user.username) {
        return json({ ok: true, exists: true, normalized, url });
      }
      // Explicit null user means gone; a bare ok/empty payload means the
      // handle resolved but IG withheld the profile from a logged-out client.
      if (parsed && "data" in parsed && parsed.data && parsed.data.user === null) {
        return json({ ok: true, exists: false, normalized, url, reason: "not_found" });
      }
      if (parsed?.status === "ok" || (parsed && !("data" in parsed))) {
        return json({ ok: true, exists: true, normalized, url, reason: "withheld" });
      }
    }

    // Known serializer failure on real handles.
    if (apiRes.status === 400 && /asset:\/\/|has been deleted/i.test(apiText)) {
      return json({ ok: true, exists: true, normalized, url, reason: "serializer_bug" });
    }

    // The profile-info endpoint commonly rejects datacenter traffic with 401.
    // Instagram's lightweight page-data route still resolves usernames without
    // authentication: existing profiles return 200/201, while missing profiles
    // return 404. This gives us a deterministic fallback before parsing HTML.
    try {
      const controllerProbe = new AbortController();
      const timeoutProbe = setTimeout(() => controllerProbe.abort(), 6000);
      const probeRes = await fetch(`${url}?__a=1&__d=dis`, {
        method: "GET",
        redirect: "follow",
        signal: controllerProbe.signal,
        headers: {
          ...commonHeaders,
          Accept: "application/json,text/plain,*/*",
          "X-Requested-With": "XMLHttpRequest",
          Referer: "https://www.instagram.com/",
        },
      });
      clearTimeout(timeoutProbe);
      if (probeRes.status === 404) {
        return json({ ok: true, exists: false, normalized, url, reason: "page_data_not_found" });
      }
      if (probeRes.status === 200 || probeRes.status === 201) {
        return json({ ok: true, exists: true, normalized, url, reason: "page_data" });
      }
    } catch {
      // Continue to the HTML and mirror fallbacks.
    }

    // Fallback: fetch the profile page and inspect status / markers.
    const controller2 = new AbortController();
    const timeout2 = setTimeout(() => controller2.abort(), 6000);
    const htmlRes = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller2.signal,
      headers: {
        ...commonHeaders,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      },
    });
    clearTimeout(timeout2);
    if (htmlRes.status === 404) {
      return json({ ok: true, exists: false, normalized, url, reason: "not_found" });
    }
    const text = (await htmlRes.text()).toLowerCase();
    if (
      text.includes("page not found") ||
      text.includes("sorry, this page isn't available") ||
      text.includes('"user":null')
    ) {
      return json({ ok: true, exists: false, normalized, url, reason: "not_found" });
    }
    if (
      text.includes(`"username":"${normalized}"`) ||
      text.includes(`@${normalized}) • instagram`) ||
      text.includes(`(@${normalized})`) ||
      text.includes(`instagram.com/${normalized}/"`)
    ) {
      return json({ ok: true, exists: true, normalized, url });
    }
    // Instagram blocks datacenter IPs (401 on the API, 429 on the HTML page),
    // so add one positive-only mirror signal. A 200 there means the handle is
    // real; anything else is treated as "unknown", never as "missing".
    try {
      const controller3 = new AbortController();
      const timeout3 = setTimeout(() => controller3.abort(), 6000);
      const mirrorRes = await fetch(`https://imginn.com/${normalized}/`, {
        method: "GET",
        redirect: "follow",
        signal: controller3.signal,
        headers: { ...commonHeaders, Accept: "text/html,*/*;q=0.8" },
      });
      clearTimeout(timeout3);
      if (mirrorRes.status === 200) {
        const mirrorText = (await mirrorRes.text()).toLowerCase();
        if (mirrorText.includes(normalized)) {
          return json({ ok: true, exists: true, normalized, url, reason: "mirror" });
        }
      }
    } catch {
      // ignore mirror failures
    }

    console.log(
      `verify-instagram-handle: ambiguous ${normalized} api=${apiRes.status} html=${htmlRes.status}`,
    );
    return json({
      ok: true,
      exists: null,
      normalized,
      url,
      reason: "ambiguous",
      apiStatus: apiRes.status,
      htmlStatus: htmlRes.status,
    });
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
