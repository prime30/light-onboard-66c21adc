import { afterEach, describe, expect, it, vi } from "vitest";
import { finishSigningIn, openMultipassUrl } from "./store-sign-in";

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
    expect(form.target).toBe("_top");
    expect(form.submit).toHaveBeenCalledOnce();
  });
});
describe("Post-reset Multipass link", () => {
  it("opens the store's Multipass sign-in in the top window", () => {
    const location = { href: "" };
    vi.stubGlobal("window", { top: { location }, location });
    expect(openMultipassUrl("https://dropdeadextensions.com/account/login/multipass/abc")).toBe(true);
    expect(location.href).toBe("https://dropdeadextensions.com/account/login/multipass/abc");
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
