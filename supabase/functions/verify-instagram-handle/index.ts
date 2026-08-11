// Instagram handle verifier.
//
// We can't call the Instagram Graph API without an app token, and Meta blocks
// programmatic follow / lookup APIs anyway. We therefore rely on Instagram's
// public web_profile_info endpoint, which returns a 200 JSON payload with
// data.user for real handles and a 404 for non-existent handles.
//
// Important: Instagram aggressively blocks datacenter traffic. If the request
// is rate-limited (401/403/429/empty 200) we MUST NOT guess. We return
// `exists: null` (unknown) so the user can still submit the form and the account
// is reviewed manually. Returning `exists: true` for ambiguous responses is how
// fake handles were falsely passing verification.
//
// Behavior:
//   POST { handle: string } -> { ok, exists, normalized, url, reason? }
//   - Strips leading @ and whitespace, lowercases for normalization.
//   - Enforces IG handle format: [A-Za-z0-9._]{1,30}.
//   - Fetches the web_profile_info endpoint with a browser UA and required headers.
//   - 200 + data.user.username -> exists
//   - 404 -> not exists
//   - 200 + data.user === null -> not exists
//   - 400 "has been deleted" serializer bug -> exists (real private account)
//   - anything else (rate limits, blocks) -> unknown (exists: null)
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
  const apiUrl = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(
    normalized,
  )}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const apiRes = await fetch(apiUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": UA,
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "application/json,text/plain,*/*",
        "X-IG-App-ID": "936619743392459",
        Referer: url,
      },
    });
    clearTimeout(timeout);

    const apiText = await apiRes.text();
    let parsed: { data?: { user?: { username?: string } | null }; status?: string } | null = null;
    try {
      parsed = JSON.parse(apiText);
    } catch {
      parsed = null;
    }

    // Known profile info responses, ordered from most to least confident.

    // 1. Instagram says the handle does not exist.
    if (apiRes.status === 404) {
      return json({ ok: true, exists: false, normalized, url, reason: "not_found" });
    }

    // 2. Real, public account with a username in the payload.
    if (apiRes.status === 200 && parsed?.data?.user && parsed.data.user.username) {
      return json({ ok: true, exists: true, normalized, url, reason: "profile" });
    }

    // 3. Real, private or restricted account where IG returns data.user: null.
    // This is a definitive "no public profile" but the handle resolved.
    if (apiRes.status === 200 && parsed && "data" in parsed && parsed.data && parsed.data.user === null) {
      return json({ ok: true, exists: false, normalized, url, reason: "user_null" });
    }

    // 4. Known serializer failure on real handles (private/business accounts).
    if (apiRes.status === 400 && /asset:\/\/|has been deleted/i.test(apiText)) {
      return json({ ok: true, exists: true, normalized, url, reason: "serializer_bug" });
    }

    // 5. Anything else (401/403/429/empty 200/redirect HTML) is ambiguous.
    // Do NOT guess; fail open so signup isn't blocked by IG rate limits.
    console.log(
      `verify-instagram-handle: ambiguous ${normalized} status=${apiRes.status} body=${apiText.slice(0, 200)}`,
    );
    return json({
      ok: true,
      exists: null,
      normalized,
      url,
      reason: "ambiguous",
      apiStatus: apiRes.status,
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
