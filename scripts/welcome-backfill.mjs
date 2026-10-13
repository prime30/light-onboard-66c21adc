// Driver for backfill-welcome-offers (PRO25). Reads admin creds from .env.local
// without printing them.
//   node scripts/welcome-backfill.mjs list                       dry run of the ring_last_30d cohort
//   node scripts/welcome-backfill.mjs apply [batchSize] [max]    issue codes to the cohort (skips customers with a live PRO25)
//   node scripts/welcome-backfill.mjs deactivate CODE1,CODE2     rollback specific codes
//   node scripts/welcome-backfill.mjs deactivate-since <ISO>     rollback every PRO25 code created since <ISO>
//   node scripts/welcome-backfill.mjs retrack <createdBeforeISO> [createdAfterISO]
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; }),
);
const URL = "https://qsunfiextzzdxnsyrkkc.supabase.co/functions/v1/backfill-welcome-offers";

async function call(body) {
  const res = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: env.ADMIN_PANEL_EMAIL, password: env.ADMIN_PANEL_PASSWORD, ...body }),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, version: res.headers.get("x-function-version"), json };
}

const [cmd = "list", a1, a2] = process.argv.slice(2);

if (cmd === "list" || cmd === "apply") {
  const list = await call({ mode: "list", cohort: "ring_last_30d" });
  if (!list.json.success) { console.log(list.status, list.version, list.json.error); process.exit(1); }
  const todo = list.json.customers.filter((c) => !c.hasLivePro25).map((c) => String(c.numericId));
  console.log(JSON.stringify({ version: list.version, ringRows: list.json.ringRows, cohort: list.json.count, alreadyLive: list.json.alreadyLive, toIssue: todo.length }));
  if (cmd === "list") process.exit(0);

  const batch = Math.min(Number(a1) || 10, 100);
  const max = Number(a2) || todo.length;
  const tally = { minted: 0, already_live: 0, already_issued: 0, pending: 0, no_customer: 0, rejected: 0, method50_issued: 0, error: 0 };
  const errors = [];
  for (let i = 0; i < Math.min(todo.length, max); i += batch) {
    const ids = todo.slice(i, Math.min(i + batch, max));
    const t0 = Date.now();
    const r = await call({ mode: "apply", customerIds: ids });
    if (!r.json.success) { console.log("batch failed", r.status, r.json.error); break; }
    for (const [k, v] of Object.entries(r.json.tally)) tally[k] += v;
    for (const x of r.json.results) if (x.outcome === "error") errors.push({ id: x.customerId, error: x.error });
    console.log(`batch ${i / batch + 1}: ${ids.length} in ${((Date.now() - t0) / 1000).toFixed(1)}s`, JSON.stringify(r.json.tally));
  }
  const attempted = Math.min(todo.length, max);
  const sum = Object.values(tally).reduce((s, v) => s + v, 0);
  console.log(JSON.stringify({ attempted, sum, balanced: sum === attempted, tally, errors: errors.slice(0, 20) }, null, 1));
} else if (cmd === "deactivate" || cmd === "deactivate-since") {
  let total = 0;
  for (;;) {
    const body = cmd === "deactivate" ? { mode: "deactivate", codes: (a1 ?? "").split(",").filter(Boolean) } : { mode: "deactivate", createdAfter: a1 };
    const r = await call(body);
    if (!r.json.success) { console.log(r.status, r.json.error); break; }
    total += r.json.deactivated;
    console.log(JSON.stringify({ processed: r.json.processed, deactivated: r.json.deactivated, failed: r.json.failed, failures: r.json.results.filter((x) => !x.success) }));
    if (cmd === "deactivate" || !r.json.more || r.json.deactivated === 0) break;
  }
  console.log("total deactivated", total);
} else if (cmd === "retrack") {
  let offset = 0;
  let sent = 0;
  for (;;) {
    const r = await call({ mode: "retrack", createdBefore: a1, createdAfter: a2, offset });
    if (!r.json.success) { console.log(r.status, r.json.error); break; }
    sent += r.json.sent;
    console.log(JSON.stringify({ processed: r.json.processed, sent: r.json.sent, skipped: r.json.skipped }));
    if (r.json.nextOffset == null) break;
    offset = r.json.nextOffset;
  }
  console.log("total sent", sent);
} else {
  console.log("unknown command", cmd);
}
