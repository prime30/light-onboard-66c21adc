// Black-box harness for edge functions: captures the handler passed to
// Deno.serve, replaces fetch with scripted fakes, and lets a test await the
// background work the function hands to EdgeRuntime.waitUntil.

export const SB_URL = "https://sb.test";
export const SERVICE_KEY = "service-role-key";
export const STORE = "store.test";
export const MULTIPASS_SECRET = "multipass-secret-for-tests";

export const BASE_ENV: Record<string, string> = {
  SUPABASE_URL: SB_URL,
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
  SUPABASE_ANON_KEY: "anon-key",
  SHOPIFY_STORE_DOMAIN: STORE,
  SHOPIFY_ADMIN_ACCESS_TOKEN: "admin-token",
  SHOPIFY_STOREFRONT_PRIVATE_TOKEN: "private-storefront-token",
  SHOPIFY_MULTIPASS_SECRET: MULTIPASS_SECRET,
};

export type Call = { method: string; url: URL; body: unknown; headers: Headers };
type Reply = Response | Record<string, unknown> | unknown[] | string | null;
type Handler = (call: Call) => Reply | Promise<Reply>;

const json = (body: unknown, status = 200) =>
  [101, 204, 205, 304].includes(status)
    ? new Response(null, { status })
    : new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const reply = {
  json,
  status: (status: number, body: unknown = {}) => json(body, status),
};

export class FakeNet {
  private routes: { method: string; pattern: RegExp; handler: Handler }[] = [];
  readonly calls: Call[] = [];
  readonly unmatched: string[] = [];

  /** Later routes win, so a test can override a default. A plain object or array reply is JSON 200. */
  on(method: string, pattern: RegExp, handler: Handler | Reply): this {
    this.routes.unshift({
      method,
      pattern,
      handler: typeof handler === "function" ? (handler as Handler) : () => handler as Reply,
    });
    return this;
  }

  to(method: string, pattern: RegExp): Call[] {
    return this.calls.filter((c) => c.method === method && pattern.test(c.url.href));
  }

  fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const req = new Request(input, init);
    const text = req.method === "GET" || req.method === "HEAD" ? "" : await req.text();
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : null;
    } catch { /* form bodies stay as text */ }
    const call: Call = { method: req.method, url: new URL(req.url), body, headers: req.headers };
    this.calls.push(call);
    const route = this.routes.find((r) => (r.method === "*" || r.method === req.method) && r.pattern.test(req.url));
    if (!route) {
      this.unmatched.push(`${req.method} ${req.url}`);
      throw new TypeError(`fetch failed: unfaked ${req.method} ${req.url}`);
    }
    const out = await route.handler(call);
    if (out instanceof Response) return out;
    if (typeof out === "string") return new Response(out, { status: 200 });
    return json(out ?? null);
  };
}

/** ILIKE pattern as PostgREST reads it: `%` or `*` any run, `_` one char, backslash escapes. */
function likeToRegExp(pattern: string): RegExp {
  let out = "";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "\\" && i + 1 < pattern.length) out += pattern[++i].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    else if (c === "%" || c === "*") out += ".*";
    else if (c === "_") out += ".";
    else out += c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${out}$`, "i");
}

/**
 * A tiny PostgREST table: eq/gte/ilike filters, order, limit on GET; insert with
 * return=representation on POST; PATCH by filter.
 */
export class FakeTable {
  rows: Record<string, unknown>[] = [];
  private seq = 0;

  constructor(readonly name: string) {}

  install(net: FakeNet) {
    const pattern = new RegExp(`/rest/v1/${this.name}(\\?|$)`);
    net.on("GET", pattern, ({ url }) => this.select(url));
    net.on("POST", pattern, ({ body }) => {
      const inserted = (Array.isArray(body) ? body : [body]).map((r) => this.insert(r as Record<string, unknown>));
      return reply.json(inserted, 201);
    });
    net.on("PATCH", pattern, ({ url, body }) => {
      for (const row of this.matching(url)) Object.assign(row, body);
      return reply.status(204, null);
    });
    return this;
  }

  insert(row: Record<string, unknown>) {
    const full = { id: `${this.name}-${++this.seq}`, created_at: new Date().toISOString(), ...row };
    this.rows.push(full);
    return full;
  }

  private matching(url: URL) {
    let rows = [...this.rows];
    for (const [key, value] of url.searchParams) {
      if (["select", "order", "limit"].includes(key)) continue;
      const [op, ...rest] = value.split(".");
      const target = rest.join(".");
      rows = rows.filter((r) => {
        const v = String(r[key] ?? "");
        if (op === "eq") return v === target;
        if (op === "gte") return v >= target;
        if (op === "ilike") return likeToRegExp(target).test(v);
        return true;
      });
    }
    return rows;
  }

  private select(url: URL) {
    let rows = this.matching(url);
    const order = url.searchParams.get("order");
    if (order) {
      const [col, dir] = order.split(".");
      rows.sort((a, b) => String(a[col]).localeCompare(String(b[col])) * (dir === "desc" ? -1 : 1));
    }
    const limit = Number(url.searchParams.get("limit"));
    if (limit > 0) rows = rows.slice(0, limit);
    return rows;
  }
}

type ServeHandler = (req: Request) => Response | Promise<Response>;

export type Loaded = {
  call: (body: unknown, init?: { headers?: Record<string, string> }) => Promise<Response>;
  /** Waits for everything passed to EdgeRuntime.waitUntil so far. */
  settle: () => Promise<void>;
};

/**
 * Imports a fresh copy of supabase/functions/<name>/index.ts with `net` as
 * fetch. Restore with the returned `restore` (use in a finally).
 */
export async function loadFunction(
  name: string,
  net: FakeNet,
  env: Record<string, string | undefined> = {},
): Promise<Loaded & { restore: () => void }> {
  const merged = { ...BASE_ENV, ...env };
  const previousEnv = new Map<string, string | undefined>();
  for (const [k, v] of Object.entries(merged)) {
    previousEnv.set(k, Deno.env.get(k));
    if (v === undefined) Deno.env.delete(k);
    else Deno.env.set(k, v);
  }

  const g = globalThis as unknown as { fetch: typeof fetch; EdgeRuntime?: unknown };
  const originalFetch = g.fetch;
  const originalServe = Deno.serve;
  const pending: Promise<unknown>[] = [];
  g.fetch = net.fetch as typeof fetch;
  g.EdgeRuntime = { waitUntil: (p: Promise<unknown>) => pending.push(p) };

  let handler: ServeHandler | null = null;
  (Deno as unknown as { serve: unknown }).serve = (a: unknown, b?: unknown) => {
    handler = (typeof a === "function" ? a : b ?? (a as { handler: unknown }).handler) as ServeHandler;
    return { finished: Promise.resolve(), shutdown: () => Promise.resolve(), ref() {}, unref() {} };
  };
  try {
    await import(new URL(`../${name}/index.ts?instance=${crypto.randomUUID()}`, import.meta.url).href);
  } finally {
    (Deno as unknown as { serve: unknown }).serve = originalServe;
  }
  if (!handler) throw new Error(`${name} did not call Deno.serve`);
  const serve: ServeHandler = handler;

  return {
    call: (body, init) =>
      Promise.resolve(
        serve(
          new Request(`${SB_URL}/functions/v1/${name}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "cf-connecting-ip": "203.0.113.7", ...init?.headers },
            body: JSON.stringify(body),
          }),
        ),
      ),
    settle: async () => {
      while (pending.length) await Promise.allSettled(pending.splice(0));
    },
    restore: () => {
      g.fetch = originalFetch;
      delete g.EdgeRuntime;
      for (const [k, v] of previousEnv) {
        if (v === undefined) Deno.env.delete(k);
        else Deno.env.set(k, v);
      }
    },
  };
}

/** Runs `fn` against a fresh function instance and always restores globals. */
export async function withFunction(
  name: string,
  net: FakeNet,
  fn: (fx: Loaded) => Promise<void>,
  env: Record<string, string | undefined> = {},
) {
  const loaded = await loadFunction(name, net, env);
  try {
    await fn(loaded);
    await loaded.settle();
  } finally {
    loaded.restore();
  }
}

/** Decrypts a Multipass URL minted with MULTIPASS_SECRET and checks its signature. */
export async function readMultipass(url: string): Promise<Record<string, unknown>> {
  const match = url.match(new RegExp(`^https://${STORE.replace(".", "\\.")}/account/login/multipass/([\\w-]+)$`));
  if (!match) throw new Error(`not a multipass URL: ${url}`);
  const b64 = match[1].replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Uint8Array.from(atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4)), (c) => c.charCodeAt(0));
  const keyBytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(MULTIPASS_SECRET)));
  const payload = bytes.slice(0, bytes.length - 32);
  const signature = bytes.slice(bytes.length - 32);
  const hmacKey = await crypto.subtle.importKey("raw", keyBytes.slice(16, 32), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  if (!(await crypto.subtle.verify("HMAC", hmacKey, signature, payload))) throw new Error("multipass signature invalid");
  const aesKey = await crypto.subtle.importKey("raw", keyBytes.slice(0, 16), { name: "AES-CBC" }, false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-CBC", iv: payload.slice(0, 16) }, aesKey, payload.slice(16));
  return JSON.parse(new TextDecoder().decode(plain));
}

export const storefront = new RegExp(`^https://${STORE.replace(".", "\\.")}/api/[\\d-]+/graphql\\.json`);
export const admin = (path: string) => new RegExp(`^https://${STORE.replace(".", "\\.")}/admin/api/[\\d-]+/${path}`);
export const rest = (table: string) => new RegExp(`^${SB_URL.replace(/[./]/g, "\\$&")}/rest/v1/${table}(\\?|$)`);
export const fn = (name: string) => new RegExp(`^${SB_URL.replace(/[./]/g, "\\$&")}/functions/v1/${name}$`);
