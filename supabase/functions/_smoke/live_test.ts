// Live smoke test: invokes the deployed customer-gate edge function which
// uses the LATEST SHOPIFY_ADMIN_ACCESS_TOKEN secret on the runtime.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.test("customer-gate edge function reaches Shopify Admin API", async () => {
  const url = "https://qsunfiextzzdxnsyrkkc.supabase.co/functions/v1/customer-gate";
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? "",
    },
    body: JSON.stringify({ email: "smoketest-no-such-user@example.invalid" }),
  });
  const text = await r.text();
  console.log("status:", r.status);
  console.log("body:", text.slice(0, 500));
  // 200 = Shopify call succeeded (user just doesn't exist)
  // 500/401 with "Invalid API key" = scope/token still bad
  assertEquals(r.status, 200);
});
