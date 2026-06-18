// Captures incomplete registrations and syncs them to Klaviyo so a
// "Finish your registration" flow can recover them. Called from the
// frontend the moment a valid email is entered, again on step changes,
// and finally from create-customer on success to mark completion.
//
// Klaviyo strategy:
//   - profile-import upserts a profile with custom properties:
//       registration_started_at, registration_last_step,
//       registration_account_type, registration_completed,
//       registration_completed_at
//   - /api/events fires one of:
//       "Started Registration"  (any non-complete tick)
//       "Completed Registration" (only from create-customer success path)
//
// Klaviyo flow config (manual, in dashboard):
//   - Trigger metric: "Started Registration"
//   - Flow filter: profile property `registration_completed` is not true
//     → Klaviyo re-evaluates flow filters at every step, so completing
//       registration silently drops users from the remaining sequence.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KLAVIYO_REVISION = "2025-04-15";
const KLAVIYO_BASE = "https://a.klaviyo.com/api";

type Phase = "started" | "step" | "completed";

interface Payload {
  email?: string;
  phase?: Phase;
  accountType?: string | null;
  lastStep?: string | null;
  lastField?: string | null;
  validationErrorFields?: string[] | null;
  device?: { type?: string | null; width?: number | null; height?: number | null } | null;
  firstName?: string | null;
  lastName?: string | null;
  phoneE164?: string | null;
  preferredMethods?: string[] | null;
  monthlyOrderVolume?: string | null;
  autoApproved?: boolean | null;
}


function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function klaviyo(
  path: string,
  apiKey: string,
  body: unknown,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const res = await fetch(`${KLAVIYO_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Klaviyo-API-Key ${apiKey}`,
      revision: KLAVIYO_REVISION,
      accept: "application/vnd.api+json",
      "content-type": "application/vnd.api+json",
    },
    body: JSON.stringify(body),
  });
  let parsed: unknown = null;
  try {
    parsed = await res.json();
  } catch {
    parsed = null;
  }
  return { ok: res.ok, status: res.status, body: parsed };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const email = (payload.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return json(200, { skipped: "invalid_email" });

  const phase: Phase = payload.phase ?? "started";
  const accountType = payload.accountType ?? null;
  const lastStep = payload.lastStep ?? null;
  const lastField = payload.lastField ?? null;
  const validationErrorFields = Array.isArray(payload.validationErrorFields)
    ? payload.validationErrorFields.filter((s): s is string => typeof s === "string" && s.length > 0 && s.length < 80).slice(0, 25)
    : [];
  const device = payload.device ?? null;
  const deviceType = device?.type && ["mobile", "tablet", "desktop"].includes(device.type) ? device.type : null;
  const viewportWidth = typeof device?.width === "number" && device.width > 0 && device.width < 10000 ? Math.round(device.width) : null;
  const viewportHeight = typeof device?.height === "number" && device.height > 0 && device.height < 10000 ? Math.round(device.height) : null;
  const firstName = payload.firstName ?? null;
  const lastName = payload.lastName ?? null;
  const phoneE164 = payload.phoneE164 ?? null;
  const preferredMethods = Array.isArray(payload.preferredMethods)
    ? payload.preferredMethods
        .filter((s): s is string => typeof s === "string" && s.length > 0 && s.length < 60)
        .slice(0, 10)
    : [];
  const primaryMethod = preferredMethods[0] ?? null;
  const VOLUME_OPTIONS = ["1", "2-5", "6-10", "10+"] as const;
  const monthlyOrderVolume =
    typeof payload.monthlyOrderVolume === "string" &&
    (VOLUME_OPTIONS as readonly string[]).includes(payload.monthlyOrderVolume)
      ? payload.monthlyOrderVolume
      : null;
  const isHighVolume = monthlyOrderVolume === "6-10" || monthlyOrderVolume === "10+";
  const volumeCohort = monthlyOrderVolume
    ? isHighVolume
      ? "high_volume"
      : monthlyOrderVolume === "2-5"
        ? "growing"
        : "starter"
    : null;
  const isCompleted = phase === "completed";
  const autoApproved = isCompleted && payload.autoApproved === true;

  // Capture lightweight request metadata for audit.
  const userAgent = req.headers.get("user-agent") ?? null;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("cf-connecting-ip") ??
    null;

  // ----------------- Upsert lead row in Supabase -----------------
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    console.error("track-registration-lead: missing Supabase env");
    return json(500, { error: "Server misconfigured" });
  }

  try {
    const upsertBody: Record<string, unknown> = {
      email,
      account_type: accountType,
      last_step: lastStep,
      user_agent: userAgent,
      ip_address: ip,
    };
    // Only write completed_at on the explicit completion phase. Setting it
    // (even to null) on step pings would clobber the timestamp because the
    // success-step ping fires AFTER create-customer marks completion.
    if (isCompleted) upsertBody.completed_at = new Date().toISOString();
    if (lastField) upsertBody.last_field = lastField;
    if (deviceType) upsertBody.device_type = deviceType;
    if (viewportWidth) upsertBody.viewport_width = viewportWidth;
    if (viewportHeight) upsertBody.viewport_height = viewportHeight;
    if (monthlyOrderVolume) upsertBody.monthly_order_volume = monthlyOrderVolume;

    // ---- Prefix-typing dedupe ----
    // Users typing their email blur the field mid-type ("@yahoo.c", "@yahoo.co",
    // "@yahoo.com") and each variant matches our loose regex, creating phantom
    // "started/bounced" rows. If the same IP produced a lead in the last 15 min
    // whose email is a prefix of this one (or vice versa), treat them as the
    // same lead: rename the existing row to the longer email and merge fields,
    // instead of inserting a new row.
    let renamedFromEmail: string | null = null;
    if (ip && !isCompleted) {
      try {
        const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        const listRes = await fetch(
          `${supabaseUrl}/rest/v1/registration_leads?ip_address=eq.${encodeURIComponent(ip)}&created_at=gte.${encodeURIComponent(since)}&completed_at=is.null&select=email,created_at&order=created_at.desc&limit=20`,
          { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
        );
        if (listRes.ok) {
          const rows = (await listRes.json()) as Array<{ email: string }>;
          // Find the longest existing email that has a prefix relationship with `email`.
          let match: string | null = null;
          for (const r of rows) {
            const e = (r.email ?? "").toLowerCase();
            if (!e || e === email) continue;
            if (email.startsWith(e) || e.startsWith(email)) {
              if (!match || e.length > match.length) match = e;
            }
          }
          if (match) {
            // Rename the existing row to the longer email (the more complete one wins).
            const winnerEmail = match.length >= email.length ? match : email;
            const loserEmail = winnerEmail === match ? email : match;
            renamedFromEmail = match;
            const patchBody: Record<string, unknown> = { ...upsertBody, email: winnerEmail };
            const patchRes = await fetch(
              `${supabaseUrl}/rest/v1/registration_leads?email=eq.${encodeURIComponent(match)}`,
              {
                method: "PATCH",
                headers: {
                  apikey: serviceKey,
                  Authorization: `Bearer ${serviceKey}`,
                  "Content-Type": "application/json",
                  Prefer: "return=minimal",
                },
                body: JSON.stringify(patchBody),
              },
            );
            if (!patchRes.ok) {
              console.warn("track-registration-lead: prefix-merge patch failed", patchRes.status, await patchRes.text());
              renamedFromEmail = null; // fall through to normal upsert
            } else if (winnerEmail !== loserEmail && winnerEmail === email) {
              // We renamed the prefix row up to the new email; nothing else to do.
            }
          }
        }
      } catch (err) {
        console.warn("track-registration-lead: prefix-merge lookup threw", err);
      }
    }

    if (!renamedFromEmail) {
      const upsertRes = await fetch(
        `${supabaseUrl}/rest/v1/registration_leads?on_conflict=email`,
        {
          method: "POST",
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates,return=minimal",
          },
          body: JSON.stringify(upsertBody),
        },
      );
      if (!upsertRes.ok) {
        console.warn(
          "track-registration-lead: upsert failed",
          upsertRes.status,
          await upsertRes.text(),
        );
      }
    }

    // Increment per-field validation error counters (best-effort, post-upsert so row exists).
    if (validationErrorFields.length > 0) {
      try {
        const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/increment_registration_validation_errors`, {
          method: "POST",
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ _email: email, _fields: validationErrorFields }),
        });
        if (!rpcRes.ok) {
          console.warn("track-registration-lead: increment errors failed", rpcRes.status, await rpcRes.text());
        }
      } catch (err) {
        console.warn("track-registration-lead: increment errors threw", err);
      }
    }
  } catch (err) {
    console.warn("track-registration-lead: upsert threw", err);
  }


  // ----------------- Sync to Klaviyo -----------------
  const klaviyoKey = Deno.env.get("KLAVIYO_PRIVATE_API_KEY");
  if (!klaviyoKey) {
    // Lead is captured even without Klaviyo configured.
    return json(200, { ok: true, klaviyoSynced: false });
  }

  // 1) Upsert profile with the latest known properties.
  const profileAttrs: Record<string, unknown> = {
    email,
    properties: {
      registration_started_at: new Date().toISOString(),
      registration_last_step: lastStep,
      registration_account_type: accountType,
      registration_completed: isCompleted,
      registration_completed_at: isCompleted ? new Date().toISOString() : null,
      registration_auto_approved: isCompleted ? autoApproved : null,
      registration_status: isCompleted ? (autoApproved ? "approved" : "pending") : null,
      registration_source: "apply.dropdeadextensions.com",
      ...(preferredMethods.length > 0
        ? { preferred_methods: preferredMethods, primary_method: primaryMethod }
        : {}),
      ...(monthlyOrderVolume
        ? {
            monthly_order_volume: monthlyOrderVolume,
            volume_cohort: volumeCohort,
            is_high_volume: isHighVolume,
          }
        : {}),
    },
  };
  if (firstName) profileAttrs.first_name = firstName;
  if (lastName) profileAttrs.last_name = lastName;
  if (phoneE164) profileAttrs.phone_number = phoneE164;

  const profileRes = await klaviyo("/profile-import", klaviyoKey, {
    data: { type: "profile", attributes: profileAttrs },
  });
  if (!profileRes.ok) {
    console.warn("Klaviyo profile-import failed", profileRes.status, profileRes.body);
  }

  // 2) Fire the appropriate event.
  const metricName = isCompleted ? "Completed Registration" : "Started Registration";
  const eventRes = await klaviyo("/events", klaviyoKey, {
    data: {
      type: "event",
      attributes: {
        properties: {
          account_type: accountType,
          last_step: lastStep,
          phase,
          ...(isCompleted ? { auto_approved: autoApproved, status: autoApproved ? "approved" : "pending" } : {}),
          ...(preferredMethods.length > 0
            ? { preferred_methods: preferredMethods, primary_method: primaryMethod }
            : {}),
          ...(monthlyOrderVolume
            ? {
                monthly_order_volume: monthlyOrderVolume,
                volume_cohort: volumeCohort,
                is_high_volume: isHighVolume,
              }
            : {}),
        },
        metric: {
          data: { type: "metric", attributes: { name: metricName } },
        },
        profile: {
          data: { type: "profile", attributes: { email } },
        },
      },
    },
  });
  if (!eventRes.ok) {
    console.warn("Klaviyo event create failed", eventRes.status, eventRes.body);
  }

  // Mark sync time (best-effort).
  try {
    await fetch(
      `${supabaseUrl}/rest/v1/registration_leads?email=eq.${encodeURIComponent(email)}`,
      {
        method: "PATCH",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ klaviyo_synced_at: new Date().toISOString() }),
      },
    );
  } catch {
    // ignore
  }

  return json(200, {
    ok: true,
    phase,
    klaviyoSynced: profileRes.ok && eventRes.ok,
  });
});
