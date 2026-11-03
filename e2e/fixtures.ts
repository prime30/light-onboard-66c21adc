import { test as base, expect, type FrameLocator, type Frame, type Page, type Route } from "@playwright/test";

// The app only posts to allowlisted parents; dev builds allow this origin
// (src/data/allowed-origins.ts), so it stands in for the Shopify theme.
export const PARENT_ORIGIN = "http://localhost:9292";
export const APP_ORIGIN = "http://localhost:8099";
export const STORE_ORIGIN = "https://dropdeadextensions.com";

export type FakeReply = { status?: number; body: unknown };
type FakeHandler = FakeReply | ((body: Record<string, unknown>) => FakeReply);

export type ParentMessage = { type: string; data?: Record<string, unknown> };

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
};

const harnessHtml = (appPath: string) => `<!doctype html>
<html><body style="margin:0">
<iframe id="app" src="${APP_ORIGIN}${appPath}" style="border:0;width:100vw;height:100vh"></iframe>
<script>
  addEventListener("message", (e) => { if (e.origin === "${APP_ORIGIN}") window.__ddRecord(e.data); });
  window.__send = (m) => document.getElementById("app").contentWindow.postMessage(m, "${APP_ORIGIN}");
</script>
</body></html>`;

export class Harness {
  private fakes = new Map<string, FakeHandler>();
  private bodies = new Map<string, Record<string, unknown>[]>();
  // Kept on the Node side so the log survives the top window navigating away.
  private parentMessages: ParentMessage[] = [];
  /** Store URLs the app tried to load (top-window navigations such as Multipass). */
  readonly storeNavigations: string[] = [];

  constructor(readonly page: Page) {}

  /** Fake one edge function. Unfaked functions answer 200 { success: true, data: {} }. */
  fake(fn: string, reply: FakeHandler) {
    this.fakes.set(fn, reply);
  }

  /** Request bodies the app sent to an edge function, in order. */
  calls(fn: string) {
    return this.bodies.get(fn) ?? [];
  }

  /** Load the app at `appPath` inside an iframe on the fake theme page. */
  async open(appPath: string): Promise<FrameLocator> {
    await this.page.goto(`${PARENT_ORIGIN}/?app=${encodeURIComponent(appPath)}`, { waitUntil: "domcontentloaded" });
    return this.app;
  }

  get app(): FrameLocator {
    return this.page.frameLocator("#app");
  }

  appFrame(): Frame {
    const frame = this.page.frames().find((f) => f.url().startsWith(APP_ORIGIN));
    if (!frame) throw new Error("app frame not loaded");
    return frame;
  }

  /** Messages the app posted to the parent page. */
  messages(): ParentMessage[] {
    return [...this.parentMessages];
  }

  messageTypes() {
    return this.parentMessages.map((m) => m.type);
  }

  /** Post a message to the app as the theme would. */
  send(message: ParentMessage) {
    return this.page.evaluate((m) => (window as unknown as { __send: (x: unknown) => void }).__send(m), message);
  }

  async install() {
    await this.page.exposeFunction("__ddRecord", (m: ParentMessage) => {
      this.parentMessages.push(m);
    });
    await this.page.route("**/*", (route) => this.handle(route));
  }

  private async handle(route: Route) {
    const req = route.request();
    const url = new URL(req.url());

    if (url.origin === APP_ORIGIN) return route.continue();

    if (url.origin === PARENT_ORIGIN) {
      return route.fulfill({ contentType: "text/html", body: harnessHtml(url.searchParams.get("app") ?? "/") });
    }

    if (url.hostname === "dropdeadextensions.com" && req.isNavigationRequest()) {
      this.storeNavigations.push(req.url());
      return route.fulfill({ contentType: "text/html", body: "<html><body>store page</body></html>" });
    }

    const fnMatch = url.pathname.match(/\/functions\/v1\/([^/?]+)/);
    if (fnMatch) {
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
      const fn = fnMatch[1];
      let body: Record<string, unknown> = {};
      try {
        body = (req.postDataJSON() as Record<string, unknown>) ?? {};
      } catch {
        body = {};
      }
      this.bodies.set(fn, [...this.calls(fn), body]);
      const handler = this.fakes.get(fn);
      const reply = typeof handler === "function" ? handler(body) : handler ?? { body: { success: true, data: {} } };
      return route.fulfill({
        status: reply.status ?? 200,
        headers: CORS,
        contentType: "application/json",
        body: JSON.stringify(reply.body),
      });
    }

    if (url.hostname.endsWith(".supabase.co")) {
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
      return route.fulfill({ status: 200, headers: CORS, contentType: "application/json", body: "[]" });
    }

    // Fonts keep text wrapping true to life. Images are skipped: they are
    // large, slow every page load, and no assertion depends on them.
    const fontHost = ["cdn.shopify.com", "fonts.googleapis.com", "fonts.gstatic.com"].includes(url.hostname);
    if (fontHost && ["font", "stylesheet"].includes(req.resourceType())) return route.continue();

    // Analytics and everything else never reach the network from a test.
    return route.abort();
  }
}

export const test = base.extend<{ harness: Harness }>({
  harness: async ({ page }, provide) => {
    const harness = new Harness(page);
    await harness.install();
    await provide(harness);
  },
});

export { expect };

/** The screen container that owns the page heading (excludes the header's tabs and X). */
export function screenOf(app: FrameLocator, heading: string | RegExp) {
  return app.getByRole("heading", { level: 1, name: heading }).locator("xpath=ancestor::div[.//button][1]");
}

/** Button labels inside the screen that owns `heading`, top to bottom. */
export async function screenButtons(app: FrameLocator, heading: string | RegExp) {
  await expect(app.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  return (await screenOf(app, heading).locator("button").allInnerTexts()).map((t) => t.trim()).filter(Boolean);
}
