import { test, expect, type Harness } from "../fixtures";

const LOGIN_CHUNK = /\/assets\/LoginPage-[\w-]+\.js$/;

const reports = (harness: Harness) =>
  harness.calls("notify-error") as { source: string; context: Record<string, unknown> }[];

test("current build, file keeps failing: two reloads, then the error screen", async ({ harness }) => {
  harness.blockAppAsset(LOGIN_CHUNK);
  const app = await harness.open("/login");

  await expect(app.getByRole("heading", { name: "Something went wrong" })).toBeVisible({ timeout: 20_000 });
  expect(harness.appDocuments).toHaveLength(3);
  expect(reports(harness).map((r) => r.source)).toEqual([
    "client-chunk-reload",
    "client-chunk-reload",
    "client-error-boundary",
  ]);
  const last = reports(harness)[2].context;
  expect(last.buildLive).toBe(true);
  expect(last.build).toMatch(/^index-[\w-]+\.js$/);
  expect(last.reloadsInWindow).toBe(2);
});

test("stale tab after a Publish: one reload, then the error screen", async ({ harness }) => {
  harness.blockAppAsset(LOGIN_CHUNK);
  harness.publishNewerBuild();
  const app = await harness.open("/login");

  await expect(app.getByRole("heading", { name: "Something went wrong" })).toBeVisible({ timeout: 20_000 });
  expect(harness.appDocuments).toHaveLength(2);
  expect(reports(harness).map((r) => r.source)).toEqual(["client-chunk-reload", "client-error-boundary"]);
  expect(reports(harness)[0].context.buildLive).toBe(false);
});

test.describe("crawler", () => {
  test.use({ userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" });

  test("chunk failures are not reported", async ({ harness }) => {
    harness.blockAppAsset(LOGIN_CHUNK);
    const app = await harness.open("/login");

    await expect(app.getByRole("heading", { name: "Something went wrong" })).toBeVisible({ timeout: 20_000 });
    expect(reports(harness)).toHaveLength(0);
  });
});
