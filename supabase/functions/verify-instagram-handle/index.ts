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

    if (apiRes.status === 404) {
      return json({ ok: true, exists: false, normalized, url, reason: "not_found" });
    }
    if (apiRes.status === 200) {
      try {
        const body = (await apiRes.json()) as {
          data?: { user?: { username?: string } | null };
        };
        if (body?.data?.user && body.data.user.username) {
          return json({ ok: true, exists: true, normalized, url });
        }
        return json({ ok: true, exists: false, normalized, url, reason: "not_found" });
      } catch {
        // fall through to HTML fallback
      }
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
    if (text.includes(`"username":"${normalized}"`)) {
      return json({ ok: true, exists: true, normalized, url });
    }
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
