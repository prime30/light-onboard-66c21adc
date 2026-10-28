import { afterEach, describe, expect, it, vi } from "vitest";
import { finishSigningIn, multipassSignIn, openMultipassUrl } from "./store-sign-in";

afterEach(() => vi.unstubAllGlobals());
describe("Post-reset sign-in", () => {
  it("does not bypass rate caps with another store login attempt", async () => {
    vi.stubGlobal("window", { top: { location: { host: "dropdeadextensions.com", pathname: "/", search: "" } } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 429, json: async () => ({ success: false }) }));
    expect(await finishSigningIn("customer@example.com", "New password 123")).toBe(false);
  });
  it("uses exactly the newly submitted password and preserves the store page", async () => {
    const location = { host: "dropdeadextensions.com", pathname: "/products/hair", search: "?variant=123", href: "" };
    vi.stubGlobal("window", { top: { location }, location });
    const request = vi.fn().mockResolvedValue({ json: async () => ({ success: true, data: { multipassUrl: "https://dropdeadextensions.com/account/login/multipass/synthetic" } }) });
    vi.stubGlobal("fetch", request);
    await finishSigningIn("customer@example.com", "Just set password 123", { context: "password_reset", passwordSource: "new_password" });
    const sent = JSON.parse(request.mock.calls[0][1].body);
    expect(sent.password).toBe("Just set password 123");
    expect(sent.context).toBe("password_reset");
    expect(sent.return_to).toBe("/products/hair?variant=123");
    expect(location.href).toBe("https://dropdeadextensions.com/account/login/multipass/synthetic");
  });
  it("falls back to a top-level store form with the same password when Multipass is unavailable", async () => {
    vi.stubGlobal("window", { top: { location: { host: "dropdeadextensions.com", pathname: "/cart", search: "" } } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({ success: false }) }));
    const fields: Array<{ name: string; value: string }> = [];
    const form = { appendChild: (input: { name: string; value: string }) => fields.push(input), submit: vi.fn(), target: "", action: "" };
    vi.stubGlobal("document", { createElement: (tag: string) => tag === "form" ? form : {}, body: { appendChild: vi.fn() }, referrer: "" });
    await finishSigningIn("customer@example.com", "New password 123");
    expect(fields.find((field) => field.name === "customer[password]")?.value).toBe("New password 123");
    expect(fields.find((field) => field.name === "return_to")?.value).toBe("/cart");
    expect(fields.some((field) => field.name === "return_url")).toBe(false);
    expect(form.target).toBe("_top");
    expect(form.submit).toHaveBeenCalledOnce();
  });
});
describe("Sign-in form Multipass", () => {
  const answer = (status: number, body: unknown) => vi.fn().mockResolvedValue({ status, json: async () => body });
  it("checks the password and mints in one request, then opens the store link", async () => {
    const location = { host: "dropdeadextensions.com", pathname: "/collections/all", search: "", href: "" };
    vi.stubGlobal("window", { top: { location }, location });
    const request = answer(200, { success: true, data: { multipassUrl: "https://dropdeadextensions.com/account/login/multipass/t" } });
    vi.stubGlobal("fetch", request);
    expect(await multipassSignIn("customer@example.com", "pw", { context: "sign_in" })).toBe("navigating");
    expect(request).toHaveBeenCalledOnce();
    expect(JSON.parse(request.mock.calls[0][1].body).context).toBe("sign_in");
    expect(location.href).toBe("https://dropdeadextensions.com/account/login/multipass/t");
  });
  it("reports why the store refused instead of falling back", async () => {
    vi.stubGlobal("window", { top: { location: { host: "dropdeadextensions.com", pathname: "/", search: "" } } });
    vi.stubGlobal("fetch", answer(401, { success: false, kind: "invalid_credentials" }));
    expect(await multipassSignIn("customer@example.com", "pw")).toBe("invalid");
    vi.stubGlobal("fetch", answer(403, { success: false, kind: "unactivated" }));
    expect(await multipassSignIn("customer@example.com", "pw")).toBe("unactivated");
    vi.stubGlobal("fetch", answer(429, { success: false, kind: "rate_limited" }));
    expect(await multipassSignIn("customer@example.com", "pw")).toBe("limited");
    vi.stubGlobal("fetch", answer(500, { success: false, kind: "multipass_not_configured" }));
    expect(await multipassSignIn("customer@example.com", "pw")).toBe("unavailable");
  });
});
describe("Theme return target", () => {
  const fresh = async () => {
    vi.resetModules();
    return import("./store-sign-in");
  };
  const minted = { status: 200, json: async () => ({ success: true, data: { multipassUrl: "https://dropdeadextensions.com/account/login/multipass/t" } }) };
  it("returns a Syndicate sign-in to the IDP broker, not the page under the pop-up", async () => {
    const mod = await fresh();
    const location = { host: "dropdeadextensions.com", pathname: "/", search: "", href: "" };
    vi.stubGlobal("window", { top: { location }, location });
    const request = vi.fn().mockResolvedValue(minted);
    vi.stubGlobal("fetch", request);
    mod.setPostLoginReturn("/apps/idp/moas/broker/login/shopify/idp/proxy");
    expect(await mod.multipassSignIn("customer@example.com", "pw", { context: "sign_in" })).toBe("navigating");
    expect(JSON.parse(request.mock.calls[0][1].body).return_to).toBe("/apps/idp/moas/broker/login/shopify/idp/proxy");
  });
  it("turns an absolute store URL into its path", async () => {
    const mod = await fresh();
    vi.stubGlobal("window", { top: { location: { host: "dropdeadextensions.com", pathname: "/", search: "" } } });
    mod.setPostLoginReturn("https://dropdeadextensions.com/pages/pricing?x=1");
    expect(mod.signInTarget()).toBe("/pages/pricing?x=1");
  });
  it("ignores targets outside the allowlist", async () => {
    const mod = await fresh();
    vi.stubGlobal("window", { top: { location: { host: "dropdeadextensions.com", pathname: "/cart", search: "" } } });
    mod.setPostLoginReturn("https://evil.example.com/");
    mod.setPostLoginReturn("//evil.example.com/");
    expect(mod.signInTarget()).toBe("/cart");
  });
  it("sends an off-store target through the store form instead of Multipass", async () => {
    const mod = await fresh();
    vi.stubGlobal("window", { top: { location: { host: "dropdeadextensions.com", pathname: "/", search: "" } } });
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    mod.setPostLoginReturn("https://syndicate.dropdeadextensions.com/c/welcome");
    expect(await mod.multipassSignIn("customer@example.com", "pw")).toBe("unavailable");
    expect(request).not.toHaveBeenCalled();
    expect(mod.multipassReturnPath()).toBe("/");
    const fields: Array<{ name: string; value: string }> = [];
    const form = { appendChild: (input: { name: string; value: string }) => fields.push(input), submit: vi.fn(), target: "", action: "" };
    vi.stubGlobal("document", { createElement: (tag: string) => tag === "form" ? form : {}, body: { appendChild: vi.fn() }, referrer: "" });
    mod.submitStoreLogin("customer@example.com", "pw");
    expect(fields.find((f) => f.name === "checkout_url")?.value).toBe("https://syndicate.dropdeadextensions.com/c/welcome");
    expect(fields.find((f) => f.name === "return_to")?.value).toBe("/");
  });
});
describe("Post-reset Multipass link", () => {
  it("opens the store's Multipass sign-in in the top window", () => {
    const location = { href: "" };
    vi.stubGlobal("window", { top: { location }, location });
    expect(openMultipassUrl("https://dropdeadextensions.com/account/login/multipass/abc")).toBe(true);
    expect(location.href).toBe("https://dropdeadextensions.com/account/login/multipass/abc");
  });
  it("opens a .myshopify.com link on the store's own domain", () => {
    const location = { href: "", hostname: "dropdeadextensions.com", origin: "https://dropdeadextensions.com" };
    vi.stubGlobal("window", { top: { location }, location });
    expect(openMultipassUrl("https://drop-dead-2428.myshopify.com/account/login/multipass/abc")).toBe(true);
    expect(location.href).toBe("https://dropdeadextensions.com/account/login/multipass/abc");
  });
  it("keeps the .myshopify.com link when the top window is not the store", () => {
    const location = { href: "", hostname: "id-preview.lovable.app", origin: "https://id-preview.lovable.app" };
    vi.stubGlobal("window", { top: { location }, location });
    expect(openMultipassUrl("https://drop-dead-2428.myshopify.com/account/login/multipass/abc")).toBe(true);
    expect(location.href).toBe("https://drop-dead-2428.myshopify.com/account/login/multipass/abc");
  });
  it("refuses links that are not the store's Multipass path", () => {
    const location = { href: "" };
    vi.stubGlobal("window", { top: { location }, location });
    expect(openMultipassUrl("https://evil.example.com/account/login/multipass/abc")).toBe(false);
    expect(openMultipassUrl("https://dropdeadextensions.com/account/login")).toBe(false);
    expect(openMultipassUrl("http://dropdeadextensions.com/account/login/multipass/abc")).toBe(false);
    expect(location.href).toBe("");
  });
});
