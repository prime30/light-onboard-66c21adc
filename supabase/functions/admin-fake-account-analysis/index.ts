// Admin-only: ranks recently-created accounts by likelihood of being fake.
// Read-only over profiles + registration_leads + registration_submissions.
// Scoring + reasons are computed server-side so the UI just renders results.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "alex@dropdeadhair.com";

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com",
  "aol.com", "live.com", "msn.com", "me.com", "ymail.com", "proton.me", "protonmail.com",
]);

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "tempmail.com", "10minutemail.com",
  "trashmail.com", "yopmail.com", "sharklasers.com", "throwaway.email",
  "maildrop.cc", "getnada.com", "fakeinbox.com", "dispostable.com",
]);

interface ReqBody {
  email?: string;
  password?: string;
  days?: number;
  minScore?: number;
  limit?: number;
}

interface Profile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  account_type: string | null;
  phone_number: string | null;
  business_name: string | null;
  business_address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  license_number: string | null;
  school_name: string | null;
  has_tax_exemption: boolean | null;
  social_media_handle: string | null;
  birthday_month: string | null;
  application_status: string | null;
  created_at: string;
}

interface Lead {
  email: string;
  started_at: string;
  completed_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
  monthly_order_volume: string | null;
}

interface Submission {
  email: string;
  ip_address: string | null;
  shopify_customer_id: number | null;
  created_at: string;
}

type Signal = { code: string; label: string; weight: number };


// --- Admin auth (token or password) -----------------------------------------
async function _hmacB64u(key: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}
async function verifyAdminToken(token: string, secret: string): Promise<boolean> {
  if (!token || typeof token !== "string" || !token.includes(".")) return false;
  const [payload, sig] = token.split(".");
  const expected = await _hmacB64u(secret, payload);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return false;
  try {
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const pad = "===".slice((b64.length + 3) % 4);
    const j = JSON.parse(atob(b64 + pad));
    if (j.email !== ADMIN_EMAIL) return false;
    if (typeof j.exp !== "number" || j.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch { return false; }
}
async function issueAdminToken(email: string, secret: string, ttlSeconds = 60 * 60 * 8): Promise<{ token: string; expiresAt: number }> {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const b = btoa(JSON.stringify({ email, exp: expiresAt })).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const s = await _hmacB64u(secret, b);
  return { token: `${b}.${s}`, expiresAt };
}
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  let body: ReqBody;
  try { body = await req.json(); } catch { return json({ success: false, error: "Invalid JSON" }, 400); }

  const email = (body.email ?? "").trim().toLowerCase();
  const providedToken = typeof (body as { token?: unknown }).token === "string" ? (body as { token?: string }).token! : "";
  const adminPassword = Deno.env.get("ADMIN_PANEL_PASSWORD");
  if (!adminPassword) return json({ success: false, error: "Server misconfigured" }, 500);
  let _authed = false;
  let _authedEmail = email;
  if (providedToken) {
    _authed = await verifyAdminToken(providedToken, adminPassword);
    if (_authed) _authedEmail = ADMIN_EMAIL;
  } else {
    const password = body.password ?? "";
    _authed = email === ADMIN_EMAIL && password === adminPassword;
  }
  if (!_authed) return json({ success: false, error: "Invalid credentials" }, 401);
  const _adminEmail = _authedEmail;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ success: false, error: "Server config error" }, 500);

  const days = Math.min(Math.max(Number(body.days ?? 30), 1), 365);
  const minScore = Math.min(Math.max(Number(body.minScore ?? 30), 0), 100);
  const limit = Math.min(Math.max(Number(body.limit ?? 200), 1), 1000);

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const sinceIso = new Date(Date.now() - days * 86400_000).toISOString();

  const [{ data: profiles, error: pErr }, { data: leads }, { data: subs }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, first_name, last_name, account_type, phone_number, business_name, business_address, city, state, zip_code, license_number, school_name, has_tax_exemption, social_media_handle, birthday_month, application_status, created_at")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase
      .from("registration_leads")
      .select("email, started_at, completed_at, ip_address, user_agent, monthly_order_volume")
      .gte("started_at", sinceIso)
      .limit(5000),
    supabase
      .from("registration_submissions")
      .select("email, ip_address, shopify_customer_id, created_at")
      .gte("created_at", sinceIso)
      .limit(5000),
  ]);

  if (pErr) {
    console.error("profiles query failed:", pErr);
    return json({ success: false, error: "Failed to load profiles" }, 500);
  }

  const leadByEmail = new Map<string, Lead>();
  for (const l of (leads ?? []) as Lead[]) leadByEmail.set(l.email.toLowerCase(), l);

  const subByEmail = new Map<string, Submission>();
  for (const s of (subs ?? []) as Submission[]) subByEmail.set(s.email.toLowerCase(), s);

  // Phone + IP frequency maps (across all profiles in window) to spot clusters
  const phoneCount = new Map<string, number>();
  const ipCount = new Map<string, number>();
  for (const p of (profiles ?? []) as Profile[]) {
    const phone = normalizePhone(p.phone_number);
    if (phone) phoneCount.set(phone, (phoneCount.get(phone) ?? 0) + 1);
    const ip = subByEmail.get((p.email ?? "").toLowerCase())?.ip_address
      ?? leadByEmail.get((p.email ?? "").toLowerCase())?.ip_address ?? null;
    if (ip) ipCount.set(ip, (ipCount.get(ip) ?? 0) + 1);
  }

  const rows = ((profiles ?? []) as Profile[]).map((p) => {
    const lead = leadByEmail.get((p.email ?? "").toLowerCase()) ?? null;
    const sub = subByEmail.get((p.email ?? "").toLowerCase()) ?? null;
    const ip = sub?.ip_address ?? lead?.ip_address ?? null;
    const signals = scoreProfile(p, lead, ip, phoneCount, ipCount);
    const score = Math.min(100, signals.reduce((s, x) => s + x.weight, 0));
    return {
      id: p.id,
      email: p.email,
      name: [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || null,
      account_type: p.account_type,
      business_name: p.business_name,
      license_number: p.license_number,
      phone_number: p.phone_number,
      city: p.city,
      state: p.state,
      application_status: p.application_status,
      created_at: p.created_at,
      shopify_customer_id: sub?.shopify_customer_id ?? null,
      ip_address: ip,
      completed_in_seconds: lead?.completed_at && lead?.started_at
        ? Math.round((new Date(lead.completed_at).getTime() - new Date(lead.started_at).getTime()) / 1000)
        : null,
      monthly_order_volume: lead?.monthly_order_volume ?? null,
      score,
      signals,
    };
  })
  .filter((r) => r.score >= minScore)
  .sort((a, b) => b.score - a.score)
  .slice(0, limit);

  return json({
    success: true,
    rows,
    window_days: days,
    total_in_window: profiles?.length ?? 0,
  });
});

function scoreProfile(
  p: Profile,
  lead: Lead | null,
  ip: string | null,
  phoneCount: Map<string, number>,
  ipCount: Map<string, number>,
): Signal[] {
  const out: Signal[] = [];
  const acct = p.account_type ?? "";
  const isProBuyer = acct === "professional" || acct === "salon" || acct === "licensed_stylist";
  const isSalon = acct === "salon";

  const emailLower = (p.email ?? "").toLowerCase();
  const [local, domain] = emailLower.split("@");
  const first = (p.first_name ?? "").trim();
  const last = (p.last_name ?? "").trim();
  const fullName = `${first} ${last}`.trim();

  // Email: disposable domain
  if (domain && DISPOSABLE_DOMAINS.has(domain)) {
    out.push({ code: "disposable_email", label: "Disposable/temp email domain", weight: 40 });
  }

  // Email: random-looking local part (4+ consecutive digits or very long)
  if (local) {
    if (/\d{4,}/.test(local)) {
      out.push({ code: "email_digits", label: "Email contains a long digit string", weight: 10 });
    }
    if (local.length >= 20) {
      out.push({ code: "email_long", label: "Email local part is unusually long", weight: 5 });
    }
    // Name matches email exactly with no separator (e.g. firstlastfirstlast)
    if (first && local === first.toLowerCase()) {
      out.push({ code: "email_eq_first", label: "Email local part equals first name only", weight: 5 });
    }
  }

  // Free email + salon (a "salon owner" with no business email is mildly sus)
  if (isSalon && domain && FREE_EMAIL_DOMAINS.has(domain)) {
    out.push({ code: "salon_free_email", label: "Salon owner using a free personal email", weight: 10 });
  }

  // Name signals
  if (!first || !last) {
    out.push({ code: "name_missing", label: "Missing first or last name", weight: 15 });
  } else {
    if (first.length <= 1 || last.length <= 1) {
      out.push({ code: "name_tiny", label: "First or last name is a single character", weight: 20 });
    }
    if (/\d/.test(fullName)) {
      out.push({ code: "name_digits", label: "Name contains digits", weight: 20 });
    }
    if (first.toLowerCase() === last.toLowerCase()) {
      out.push({ code: "name_same", label: "First and last name are identical", weight: 15 });
    }
    if (fullName === fullName.toLowerCase() && !/\s/.test(fullName.trim())) {
      // single token no-space
      out.push({ code: "name_one_token", label: "Name has no space between first and last", weight: 5 });
    }
    if (/^([a-z])\1{2,}$/i.test(first) || /^([a-z])\1{2,}$/i.test(last)) {
      out.push({ code: "name_repeated_char", label: "Name is a repeated character (e.g. 'aaa')", weight: 25 });
    }
  }

  // Professional/salon without license
  if (isProBuyer && !p.license_number) {
    out.push({ code: "no_license", label: `${labelFor(acct)} with no license number`, weight: 25 });
  }
  if (p.license_number) {
    const lic = p.license_number.replace(/\s+/g, "");
    if (lic.length < 4) {
      out.push({ code: "license_short", label: "License number is suspiciously short", weight: 20 });
    } else if (/^(\d)\1+$/.test(lic) || /^(.)\1+$/.test(lic)) {
      out.push({ code: "license_repeated", label: "License number is a repeated character", weight: 25 });
    } else if (/^(1234|0000|1111|test|asdf|qwer)/i.test(lic)) {
      out.push({ code: "license_dummy", label: "License number looks like placeholder text", weight: 25 });
    }
  }

  // Salon: missing business info
  if (isSalon) {
    if (!p.business_name) out.push({ code: "no_business_name", label: "Salon missing business name", weight: 15 });
    if (!p.business_address) out.push({ code: "no_business_address", label: "Salon missing business address", weight: 15 });
    if (p.business_name && /^(test|asdf|qwer|none|n\/a|na|abc|home|salon)$/i.test(p.business_name.trim())) {
      out.push({ code: "business_name_dummy", label: "Business name looks like placeholder", weight: 20 });
    }
  }

  // Student: missing school
  if (acct === "student" && !p.school_name) {
    out.push({ code: "no_school", label: "Student with no school name", weight: 20 });
  }

  // No phone
  if (!p.phone_number) {
    out.push({ code: "no_phone", label: "No phone number on file", weight: 10 });
  }

  // Phone shared across multiple accounts (window)
  const phone = normalizePhone(p.phone_number);
  if (phone) {
    const n = phoneCount.get(phone) ?? 0;
    if (n >= 3) out.push({ code: "phone_cluster", label: `Phone shared with ${n - 1} other recent accounts`, weight: 25 });
    else if (n === 2) out.push({ code: "phone_dup", label: "Phone shared with 1 other recent account", weight: 15 });
  }

  // IP shared across many accounts (window)
  if (ip) {
    const n = ipCount.get(ip) ?? 0;
    if (n >= 5) out.push({ code: "ip_cluster_high", label: `IP shared with ${n - 1} other recent accounts`, weight: 25 });
    else if (n >= 3) out.push({ code: "ip_cluster", label: `IP shared with ${n - 1} other recent accounts`, weight: 15 });
  }

  // Burst completion (under 60s end-to-end)
  if (lead?.completed_at && lead?.started_at) {
    const dur = (new Date(lead.completed_at).getTime() - new Date(lead.started_at).getTime()) / 1000;
    if (dur > 0 && dur < 60) {
      out.push({ code: "completed_fast", label: `Completed registration in ${Math.round(dur)}s`, weight: 20 });
    } else if (dur >= 60 && dur < 120) {
      out.push({ code: "completed_quick", label: `Completed registration in ${Math.round(dur)}s`, weight: 10 });
    }
  }

  // Lowest volume bucket — not damning, but a soft signal in aggregate
  if (lead?.monthly_order_volume === "1-2" && isProBuyer && !p.license_number) {
    out.push({ code: "low_volume_no_license", label: "Lowest volume bucket and no license", weight: 5 });
  }

  return out;
}

function normalizePhone(p: string | null): string | null {
  if (!p) return null;
  const digits = p.replace(/\D+/g, "");
  if (!digits) return null;
  // strip leading country code 1 for US
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

function labelFor(acct: string): string {
  if (acct === "professional") return "Licensed stylist";
  if (acct === "licensed_stylist") return "Licensed stylist";
  if (acct === "salon") return "Salon";
  if (acct === "student") return "Student";
  return acct || "Account";
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
